/**
 * BOTC AI Agent — Gemini-powered assistance for character and script authoring.
 *
 * MVP features
 * ─────────────
 * 1. translateAbility   — EN ↔ ZH ability / flavor text
 * 2. suggestId          — slug ID from character name
 * 3. suggestChineseName — ZH name from EN name + context
 * 4. suggestAbility     — draft ability text from name + team + concept
 * 5. suggestCharacter   — full character draft from minimal description
 * 6. suggestScriptTheme — thematic notes / flavor for a script
 *
 * Each function returns a plain string result (or structured object for
 * suggestCharacter). All are async and throw GeminiError on failure.
 */

import { geminiAsk } from './gemini'
import {
  getTeamExamples, getTranslationPairs, findSimilarByTFIDF, formatExamplesPrompt,
} from './botcSearch'
import { findSimilarPairs, formatTmPrompt } from './translationMemory'
import type { Team } from '../types'

// ── System prompt shared across all tasks ───────────────────────────────────

const SYSTEM = `\
You are an expert assistant for the social deduction board game Blood on the Clocktower (BotC).
You know all official characters, game mechanics, night order, and design philosophy.
Be concise. Output ONLY what is asked — no preamble, no explanation, no markdown fences.`

// ── 1. Translation ───────────────────────────────────────────────────────────

/**
 * Translate ability / name text between EN and ZH.
 * Injects few-shot examples from catalog + translation memory.
 */
export async function translateText(
  text: string,
  targetLang: 'en' | 'zh',
): Promise<string> {
  const dir = targetLang === 'zh' ? 'into Simplified Chinese' : 'into English'

  // Few-shot: catalog pairs + user-confirmed TM pairs
  const catalogExamples = getTranslationPairs(3)
  const tmPairs         = findSimilarPairs(text, 2)
  const catalogSection  = formatExamplesPrompt(catalogExamples, 'translation')
  const tmSection       = formatTmPrompt(tmPairs)

  const fewShot = [catalogSection, tmSection].filter(Boolean).join('\n\n')

  return geminiAsk(
    `Translate the following BotC character text ${dir}. Keep game-specific terms accurate. Output translation only.${fewShot ? `\n\n${fewShot}` : ''}\n\nText to translate:\n${text}`,
    { system: SYSTEM, temperature: 0.3 },
  )
}

// ── 2. ID suggestion ─────────────────────────────────────────────────────────

/**
 * Suggest a slug ID from a character name.
 * Returns lowercase, hyphen-separated, no spaces.
 */
export async function suggestId(name: string): Promise<string> {
  const raw = await geminiAsk(
    `Suggest a short, unique slug ID for a BotC character named "${name}".
Rules: lowercase, letters/digits/hyphens only, 2–20 chars, no "custom_" prefix.
Output the slug only.`,
    { system: SYSTEM, temperature: 0.4 },
  )
  // Sanitise: keep only valid slug chars
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

// ── 3. Chinese name suggestion ───────────────────────────────────────────────

export type ChineseNameSuggestion = {
  name: string
  pinyin?: string
  note?: string
}

/**
 * Suggest a Chinese name for a BotC character.
 * Returns JSON: { name, pinyin, note }
 */
export async function suggestChineseName(
  nameEn: string,
  abilityEn?: string,
): Promise<ChineseNameSuggestion> {
  const abilityHint = abilityEn ? `\nAbility: ${abilityEn}` : ''
  const raw = await geminiAsk(
    `Suggest a Chinese name for a BotC character.
English name: ${nameEn}${abilityHint}

Respond with a JSON object only (no markdown):
{"name":"<2–4 char ZH name>","pinyin":"<pinyin>","note":"<short reasoning in English>"}`,
    { system: SYSTEM, temperature: 0.8 },
  )
  try {
    return JSON.parse(raw) as ChineseNameSuggestion
  } catch {
    // Fallback: return raw as name
    return { name: raw.trim() }
  }
}

// ── 4. Ability text suggestion ───────────────────────────────────────────────

export type AbilitySuggestion = {
  abilityEn: string
  abilityZh?: string
}

/**
 * Draft an ability text from name + team + optional concept note.
 * Injects few-shot examples from same team + TF-IDF similar chars.
 */
export async function suggestAbility(opts: {
  nameEn: string
  team: Team
  concept?: string
  generateZh?: boolean
  excludeIds?: string[]
}): Promise<AbilitySuggestion> {
  const conceptLine = opts.concept ? `\nDesign concept: ${opts.concept}` : ''
  const zhLine = opts.generateZh ? '\nAlso provide a Chinese translation as "abilityZh".' : ''

  // Few-shot: team examples + TF-IDF similar by concept
  const teamExamples = getTeamExamples(opts.team, 3, opts.excludeIds ?? [])
  const similarExamples = opts.concept
    ? findSimilarByTFIDF(opts.concept, 2, { team: opts.team, excludeIds: opts.excludeIds })
    : []
  // Deduplicate by id
  const seen = new Set(teamExamples.map((e) => e.id))
  const combined = [...teamExamples, ...similarExamples.filter((e) => !seen.has(e.id))]
  const fewShot = formatExamplesPrompt(combined, 'ability')

  const raw = await geminiAsk(
    `Write a BotC ability for a ${opts.team} character named "${opts.nameEn}".${conceptLine}
Follow official BotC ability writing style: present tense, second person ("You"), concise.${zhLine}
${fewShot ? `\n${fewShot}\n` : ''}
Respond with JSON only:
{"abilityEn":"<ability>","abilityZh":"<ZH ability or empty string>"}`,
    { system: SYSTEM, temperature: 0.9 },
  )
  try {
    return JSON.parse(raw) as AbilitySuggestion
  } catch {
    return { abilityEn: raw.trim() }
  }
}

// ── 5. Full character suggestion ─────────────────────────────────────────────

export type CharacterDraft = {
  nameEn: string
  nameZh?: string
  team: Team
  abilityEn: string
  abilityZh?: string
  id: string
  firstNightReminder?: string
  otherNightReminder?: string
  reminders?: string[]
  setup?: boolean
}

/**
 * Generate a full character draft from a short description.
 */
export async function suggestCharacter(description: string): Promise<CharacterDraft> {
  const raw = await geminiAsk(
    `Create a complete BotC custom character from this description: "${description}"

Respond with JSON only (no markdown):
{
  "nameEn": "<English name>",
  "nameZh": "<Chinese name>",
  "team": "<townsfolk|outsider|minion|demon|traveler>",
  "abilityEn": "<ability in BotC style>",
  "abilityZh": "<Chinese ability>",
  "id": "<slug id>",
  "firstNightReminder": "<ST reminder or empty>",
  "otherNightReminder": "<ST reminder or empty>",
  "reminders": ["<token1>", ...],
  "setup": false
}`,
    { system: SYSTEM, temperature: 1.0 },
  )
  try {
    return JSON.parse(raw) as CharacterDraft
  } catch {
    throw new Error('Agent returned invalid JSON: ' + raw.slice(0, 200))
  }
}

// ── 6. Script theme / flavor ─────────────────────────────────────────────────

export type ScriptThemeSuggestion = {
  title?: string
  titleZh?: string
  flavor: string
  designNotes: string
}

export async function suggestScriptTheme(
  characterNames: string[],
  existingTitle?: string,
): Promise<ScriptThemeSuggestion> {
  const charList = characterNames.slice(0, 20).join(', ')
  const titleHint = existingTitle ? `\nExisting script title: "${existingTitle}"` : ''

  const raw = await geminiAsk(
    `Suggest thematic flavor for a BotC custom script containing: ${charList}.${titleHint}

Respond with JSON only:
{
  "title": "<catchy EN script title or empty if existing is fine>",
  "titleZh": "<Chinese title>",
  "flavor": "<1–2 sentence thematic flavor>",
  "designNotes": "<brief ST design notes>"
}`,
    { system: SYSTEM, temperature: 1.0 },
  )
  try {
    return JSON.parse(raw) as ScriptThemeSuggestion
  } catch {
    return { flavor: raw.trim(), designNotes: '' }
  }
}
