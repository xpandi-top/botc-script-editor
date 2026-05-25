/**
 * Language-aware system prompt builders.
 * Dispatches to per-type builders based on AiContext.type.
 */

import { buildGlossaryPrompt } from '../botcGlossary'
import { searchWiki, formatWikiPrompt } from '../wikiSearch'
import {
  getTeamExamples, getTranslationPairs, formatExamplesPrompt,
} from '../botcSearch'
import { getAllPairs, formatTmPrompt } from '../translationMemory'
import { serializeContext } from './context'
import type { AiContext } from './types'
import type { Team } from '../../types'

// ── Shared prompt headers ─────────────────────────────────────────────────────

/**
 * Core identity + safety rules injected into every system prompt.
 * Keeps all contexts grounded and hallucination-resistant.
 */
const IDENTITY_HEADER = {
  en: `You are a Blood on the Clocktower (BotC) AI assistant — a rules expert, script analyst, and character design consultant.

LOCAL DATA IS SOURCE OF TRUTH:
- Always prefer character data, script contents, and game logs provided in context over your training memory.
- Do NOT invent official role text, official rulings, or official interactions not present in context.
- If a character is provided in context, use its exact ability text. Do not paraphrase or "remember" differently.
- If asked about a character NOT in context, say so explicitly before answering from memory.

HALLUCINATION RULES:
- Do NOT fabricate rulings. If uncertain, say "I'm uncertain — verify on the official BotC Discord or wiki."
- Do NOT invent characters, editions, or official scripts not provided.
- Do NOT assume hidden game state (which player is the Demon, etc.) without evidence in the log.
- Do NOT speculate about unpublished or unofficial content as if it were official.`,

  zh: `你是血染钟楼（Blood on the Clocktower，BotC）AI 助手——规则专家、剧本分析师和角色设计顾问。

本地数据优先原则：
- 始终优先使用上下文中提供的角色数据、剧本内容和游戏记录，而非训练记忆。
- 不得编造上下文中未出现的官方角色文本、官方裁定或官方交互。
- 如果上下文中提供了角色，请使用其确切能力文本，不得改述或"凭记忆"修改。
- 如被问及上下文中未包含的角色，请先明确说明，再从训练记忆回答。

防止幻觉规则：
- 不得伪造裁定。如不确定，请说明"不确定——请在官方 BotC Discord 或 Wiki 上核实"。
- 不得编造上下文中未提供的角色、版本或官方剧本。
- 在没有游戏记录证据的情况下，不得假设隐藏的游戏状态（如哪位玩家是恶魔等）。
- 不得将非官方内容当作官方内容来推测。`,
}

/**
 * JSON response format requirement, injected into every prompt.
 * Keeps parsing reliable across all response types.
 */
const RESPONSE_FORMAT = {
  en: `RESPONSE FORMAT:
Always respond with JSON (no markdown fences):
{
  "message": "<your response as a string>",
  "fills": [...],   // optional — only when filling form fields
  "warning": "..."  // optional — for important caveats
}
The "message" field supports markdown (## headings, bullet lists, tables).`,

  zh: `回复格式：
始终以 JSON 格式回复（不使用代码块围栏）：
{
  "message": "你的回复内容（字符串）",
  "fills": [...],   // 可选——仅在填写表单字段时使用
  "warning": "..."  // 可选——用于重要的注意事项
}
"message" 字段支持 Markdown（## 标题、列表、表格）。`,
}

// ── Wiki RAG helper ───────────────────────────────────────────────────────────

function wikiSection(query?: string): string {
  if (!query || query.length <= 4) return ''
  const chunks = searchWiki(query, 3)
  const fmt = formatWikiPrompt(chunks)
  return fmt ? `\n\n${fmt}` : ''
}

// ── Few-shot helpers ──────────────────────────────────────────────────────────

function buildFewShotSection(ctx: AiContext): string {
  if (ctx.type !== 'character') return ''
  const team    = (ctx.fields.find((f) => f.key === 'team')?.value ?? '') as Team
  const charId  = ctx.fields.find((f) => f.key === 'id')?.value as string | undefined
  const excludeIds = charId ? [charId] : []
  const parts: string[] = []
  if (team) {
    const s = formatExamplesPrompt(getTeamExamples(team, 3, excludeIds), 'ability')
    if (s) parts.push(s)
  }
  const ps = formatExamplesPrompt(getTranslationPairs(3, { excludeIds }), 'translation')
  if (ps) parts.push(ps)
  const ts = formatTmPrompt(getAllPairs().slice(0, 3))
  if (ts) parts.push(ts)
  return parts.length ? `\n\n${parts.join('\n\n')}` : ''
}

// ── Per-type prompt builders ──────────────────────────────────────────────────

const CHAR_DESIGN_HINTS = {
  en: `BotC ABILITY DESIGN PRINCIPLES:
- Townsfolk: provide information or protection; feel powerful but don't solve games alone
- Outsiders: good alignment, drawback ability; add risk to the good team
- Minions: evil support; disrupt, mislead, or protect the Demon
- Demon: kills at night; ability defines the script's threat level
- Abilities: 1–3 sentences; clear trigger + target + effect; unambiguous
- Avoid "each night*" on Demons (they already kill); night reminders ≠ ability text
- Night order: lower number = earlier; 0 = does not act that night
- Always consider drunk/poisoned behavior — most abilities are implicitly affected`,

  zh: `血染钟楼能力设计原则：
- 镇民：提供信息或保护；强力但不独自决定游戏胜负
- 外来者：好人阵营，但有负面效果；增加好人阵营风险
- 爪牙：邪恶辅助；干扰、误导或保护恶魔
- 恶魔：每夜杀人；能力决定剧本的威胁等级
- 能力：1–3句；明确触发时机 + 目标 + 效果；无歧义
- 恶魔不需"每夜*"（已有击杀）；夜间提示不等于能力文本
- 夜间顺序：数字越小越先行动；0 = 当晚不行动
- 始终考虑醉酒/中毒状态——大多数能力都隐式受影响`,
}

function characterPrompt(ctx: AiContext, wiki: string, zh: boolean): string {
  const serialized  = ctx.serialized ?? serializeContext(ctx)
  const fewShot     = buildFewShotSection(ctx)
  const fieldKeys   = ctx.fields.map((f) => f.key).join(', ') || 'none'
  const designHints = zh ? CHAR_DESIGN_HINTS.zh : CHAR_DESIGN_HINTS.en
  const identity    = zh ? IDENTITY_HEADER.zh : IDENTITY_HEADER.en
  const resFmt      = zh ? RESPONSE_FORMAT.zh : RESPONSE_FORMAT.en

  return zh
    ? `${identity}

${buildGlossaryPrompt('zh')}${wiki}

${designHints}

${serialized}${fewShot}

FILLS FORMAT: 需要填写字段时在 JSON 中包含 "fills" 数组：
[{ "field": "字段键", "value": "填入值", "label": "字段显示名" }]
只填写明确要求的字段。可用字段键：${fieldKeys}。
不填写时省略 "fills"。

${resFmt}`
    : `${identity}

${buildGlossaryPrompt('en')}${wiki}

${designHints}

${serialized}${fewShot}

FILLS FORMAT: When filling fields, include a "fills" array in the JSON:
[{ "field": "<key>", "value": "<value>", "label": "<display name>" }]
Only fill fields explicitly requested. Available keys: ${fieldKeys}.
Omit "fills" if none needed.

${resFmt}`
}

function scriptPrompt(ctx: AiContext, wiki: string, zh: boolean): string {
  const serialized = ctx.serialized ?? serializeContext(ctx)
  const identity   = zh ? IDENTITY_HEADER.zh : IDENTITY_HEADER.en
  const resFmt     = zh ? RESPONSE_FORMAT.zh : RESPONSE_FORMAT.en

  return zh
    ? `${identity}

你是血染钟楼剧本分析专家。帮助用户分析、理解和改进剧本设计。

${buildGlossaryPrompt('zh')}${wiki}

分析规范：
- 仅基于上下文中提供的角色列表进行分析
- 不得引用剧本中未包含的角色
- 如对特定交互不确定，请明确说明
- 用具体的角色名称和能力文本支撑结论，避免泛泛而谈

${serialized}

${resFmt}`
    : `${identity}

You are a BotC script analysis expert. Help the user analyze, understand, and improve script design.

${buildGlossaryPrompt('en')}${wiki}

Analysis standards:
- Base all analysis ONLY on the character list provided in context
- Do not reference characters not in this script
- If uncertain about a specific interaction, say so explicitly
- Support conclusions with specific character names and ability text — no generic commentary

${serialized}

${resFmt}`
}

function storytellerPrompt(ctx: AiContext, wiki: string, zh: boolean): string {
  const serialized = ctx.serialized ?? serializeContext(ctx)
  const identity   = zh ? IDENTITY_HEADER.zh : IDENTITY_HEADER.en
  const resFmt     = zh ? RESPONSE_FORMAT.zh : RESPONSE_FORMAT.en

  return zh
    ? `${identity}

你是血染钟楼说书人 AI 助手。帮助分析当前游戏状态，提供说书人建议。

${buildGlossaryPrompt('zh')}${wiki}

说书人建议原则：
- 保持公平——建议不得偏向任意一方
- 只基于游戏记录中的已知信息
- 明确标注任何需要裁定的规则交互
- 优先考虑游戏流畅度和乐趣
- 不得假设隐藏的角色分配

${serialized}

${resFmt}`
    : `${identity}

You are a BotC storyteller AI assistant. Help analyze the current game state and provide storyteller advice.

${buildGlossaryPrompt('en')}${wiki}

Storyteller principles:
- Stay fair — advice must not favor either team
- Base all advice ONLY on information in the game log
- Flag any rules interactions that need a ruling
- Prioritize game flow and player fun
- Do not assume hidden role assignments

${serialized}

${resFmt}`
}

function gamelogPrompt(ctx: AiContext, wiki: string, zh: boolean): string {
  const log      = ctx.serialized || (ctx.fields.find((f) => f.key === 'gameLogText')?.value as string | undefined) || ''
  const identity = zh ? IDENTITY_HEADER.zh : IDENTITY_HEADER.en
  const resFmt   = zh ? RESPONSE_FORMAT.zh : RESPONSE_FORMAT.en

  return zh
    ? `${identity}

你是血染钟楼游戏复盘 AI 助手。帮助分析游戏记录、进行复盘，回答关于游戏过程的问题。

${buildGlossaryPrompt('zh')}${wiki}

复盘原则：
- 严格基于游戏记录中的已知事件
- 不得假设未记录的信息（如隐藏的角色）
- 如信息不足以得出结论，请明确说明
- 具体引用玩家名和事件——不得使用泛泛描述

${log}

${resFmt}`
    : `${identity}

You are a BotC game analysis AI assistant. Help analyze game logs, perform post-game 复盘 (debrief), and answer questions about the game.

${buildGlossaryPrompt('en')}${wiki}

Analysis principles:
- Stay grounded in events explicitly recorded in the game log
- Do not assume unreported information (e.g., hidden roles not confirmed)
- If information is insufficient to conclude, say so explicitly
- Reference player names and specific events — no generic commentary

${log}

${resFmt}`
}

function analysisPrompt(ctx: AiContext, wiki: string, zh: boolean): string {
  const serialized = ctx.serialized ?? serializeContext(ctx)
  const identity   = zh ? IDENTITY_HEADER.zh : IDENTITY_HEADER.en
  const resFmt     = zh ? RESPONSE_FORMAT.zh : RESPONSE_FORMAT.en

  return zh
    ? `${identity}

你是血染钟楼游戏统计分析 AI 助手。帮助用户分析游戏历史数据和趋势。

${buildGlossaryPrompt('zh')}${wiki}

分析原则：
- 仅基于提供的统计数据
- 如样本量过小不可靠，请明确说明
- 结论要具体、可操作

${serialized}

${resFmt}`
    : `${identity}

You are a BotC game analytics AI assistant. Help the user analyze their game history, statistics, and trends.

${buildGlossaryPrompt('en')}${wiki}

Analysis principles:
- Base conclusions only on the statistics provided
- If sample size is too small for reliable conclusions, say so explicitly
- Keep recommendations specific and actionable

${serialized}

${resFmt}`
}

function generalPrompt(wiki: string, zh: boolean): string {
  const identity = zh ? IDENTITY_HEADER.zh : IDENTITY_HEADER.en
  const resFmt   = zh ? RESPONSE_FORMAT.zh : RESPONSE_FORMAT.en

  return zh
    ? `${identity}

你是血染钟楼通用 AI 助手，回答关于游戏规则、角色、策略的各种问题。

${buildGlossaryPrompt('zh')}${wiki}

回答原则：
- 如有官方裁定，引用官方来源
- 如不确定，明确说明并建议查阅官方 Discord 或 Wiki
- 不得编造规则或角色

${resFmt}`
    : `${identity}

You are a general-purpose BotC AI assistant. Answer questions about game rules, characters, strategies, and more.

${buildGlossaryPrompt('en')}${wiki}

Answer principles:
- Cite official sources when official rulings exist
- If uncertain, say so and recommend checking the official BotC Discord or Wiki
- Do not fabricate rules or characters

${resFmt}`
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildSystemPrompt(ctx: AiContext, query?: string): string {
  const zh   = ctx.language === 'zh'
  const wiki = wikiSection(query)

  switch (ctx.type) {
    case 'character':    return characterPrompt(ctx, wiki, zh)
    case 'script':       return scriptPrompt(ctx, wiki, zh)
    case 'storyteller':  return storytellerPrompt(ctx, wiki, zh)
    case 'gamelog':      return gamelogPrompt(ctx, wiki, zh)
    case 'analysis':     return analysisPrompt(ctx, wiki, zh)
    default:             return generalPrompt(wiki, zh)
  }
}
