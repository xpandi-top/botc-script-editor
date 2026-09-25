/**
 * What a report's target showed when it was reported (src/lib/feedback/report.ts):
 * a character's names, ability, revision, tokens and night reminders in both
 * languages, or a script's title, author, origin and characters. With the
 * local edits that changed them, so a wrong text can be told apart from a
 * text the user edited on their device.
 */
import {
  characterById,
  getAbilityTextForScript,
  getCharacterReminders,
  getCharacterRemindersGlobal,
  getDisplayName,
  getLocalCharacterEdits,
  getNightReminder,
  getRevisionForScript,
  initialScripts,
  jinxes,
} from '../../catalog'
import { communityScriptSource } from '../../core/script/format'
import type { EditableScript } from '../../types'
import type { ReportRequest } from './report'

const both = <T>(read: (language: 'en' | 'zh') => T) => ({ en: read('en'), zh: read('zh') })

/** "Washerwoman / 洗衣妇 (washerwoman)" — both names, then the id. */
export function characterLabel(id: string): string {
  const en = getDisplayName(id, 'en')
  const zh = getDisplayName(id, 'zh')
  return `${en}${zh && zh !== en ? ` / ${zh}` : ''} (${id})`
}

export function characterSnapshot(id: string, pinnedRevisions?: Record<string, string>): Record<string, unknown> {
  const character = characterById[id]
  const edits = getLocalCharacterEdits(id)
  return {
    team: character?.team,
    edition: character?.edition,
    revision: getRevisionForScript(id, pinnedRevisions),
    ...(pinnedRevisions?.[id] ? { pinnedByScript: true } : {}),
    name: both((language) => getDisplayName(id, language)),
    ability: both((language) => getAbilityTextForScript(id, language, pinnedRevisions)),
    reminders: both((language) => getCharacterReminders(id, language)),
    remindersGlobal: both((language) => getCharacterRemindersGlobal(id, language)),
    firstNight: both((language) => getNightReminder(id, language, 'first') ?? null),
    otherNight: both((language) => getNightReminder(id, language, 'other') ?? null),
    jinxes: Object.values(jinxes).filter((jinx) => jinx.status === 'active' && jinx.characters.includes(id)).map((jinx) => jinx.id),
    ...(edits.length ? { localEdits: edits } : {}),
  }
}

const builtInSlugs = new Set(initialScripts.map((script) => script.slug))

/** Where a script comes from: shipped with the app (official or an imported community script), or the user's. */
export function scriptOriginKind(script: EditableScript): 'builtin' | 'community' | 'user' {
  if (!builtInSlugs.has(script.slug)) return 'user'
  return communityScriptSource(script.meta) ? 'community' : 'builtin'
}

export function scriptLabel(script: EditableScript): string {
  const zh = script.titleZh && script.titleZh !== script.title ? ` / ${script.titleZh}` : ''
  return `${script.title}${zh} (${script.slug})`
}

export function scriptSnapshot(script: EditableScript): Record<string, unknown> {
  const source = communityScriptSource(script.meta)
  return {
    origin: scriptOriginKind(script),
    sourceFile: script.sourceFile,
    title: { en: script.title, zh: script.titleZh },
    author: script.author,
    version: script.version,
    edition: script.edition,
    ...(source ? { source: { name: source.name, url: source.url, issue: source.issue } } : {}),
    characters: script.characters,
    ...(script.pinnedRevisions && Object.keys(script.pinnedRevisions).length ? { pinnedRevisions: script.pinnedRevisions } : {}),
    // Characters defined inside the script file, not in the catalog.
    ...(script.customCharacters.length ? { scriptCharacters: script.customCharacters.map((c) => c.id) } : {}),
  }
}

// ── Report requests ──────────────────────────────────────────────────────────

/** A report about a character, seen on its own or in a script (whose pinned revisions it shows). */
export function characterRequest(id: string, surface: string, options: { script?: string; pinnedRevisions?: Record<string, string>; parts?: string[] } = {}): ReportRequest {
  return {
    target: { type: 'character', id, ...(options.script ? { script: options.script } : {}) },
    surface,
    label: characterLabel(id),
    parts: options.parts,
    snapshot: characterSnapshot(id, options.pinnedRevisions),
  }
}

export function scriptRequest(script: EditableScript, surface: string, parts?: string[]): ReportRequest {
  return { target: { type: 'script', slug: script.slug }, surface, label: scriptLabel(script), parts, snapshot: scriptSnapshot(script) }
}

/** Settings or print options as a report carries them: images and long texts left out, long lists cut. */
export function plainOptions(options: object): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(options)) {
    if (typeof value === 'string' && (value.startsWith('data:') || value.length > 200)) out[key] = `(${value.startsWith('data:') ? 'image' : 'text'}, ${value.length} chars)`
    else if (Array.isArray(value) && value.length > 30) out[key] = { count: value.length, first: value.slice(0, 30) }
    else if (value && typeof value === 'object' && !Array.isArray(value)) out[key] = plainOptions(value)
    else out[key] = value
  }
  return out
}
