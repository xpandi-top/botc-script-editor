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
  en: `BotC ability design principles:
- Townsfolk: provide information or protection; should feel powerful but not game-breaking
- Outsiders: good alignment but negative/drawback ability; add risk to the good team
- Minions: evil support; disrupt, mislead, or protect the Demon
- Demon: kills at night; ability defines the script's threat level
- Abilities should be 1–3 sentences; clear, concise, unambiguous
- Avoid "each night*" on Demons (they already kill); night reminders must match ability
- Night order: lower number = acts earlier; 0 = does not act that night`,

  zh: `血染钟楼能力设计原则：
- 镇民：提供信息或保护；强力但不破坏平衡
- 外来者：好人阵营但有负面效果；增加好人阵营风险
- 爪牙：邪恶辅助；干扰、误导或保护恶魔
- 恶魔：每夜杀人；能力决定剧本的威胁等级
- 能力文本1-3句；简洁清晰无歧义
- 恶魔不需"每夜*"（已有击杀）；夜间提示必须匹配能力
- 夜间顺序：数字越小越先行动；0 = 当晚不行动`,
}

function characterPrompt(ctx: AiContext, wiki: string, zh: boolean): string {
  const serialized = ctx.serialized ?? serializeContext(ctx)
  const fewShot    = buildFewShotSection(ctx)
  const fieldKeys  = ctx.fields.map((f) => f.key).join(', ') || 'none'
  const designHints = zh ? CHAR_DESIGN_HINTS.zh : CHAR_DESIGN_HINTS.en
  return zh
    ? `你是一个血染钟楼（BotC）自定义角色创作 AI 助手。
帮助用户创建、翻译和完善角色与剧本。

${buildGlossaryPrompt('zh')}${wiki}

${designHints}

${serialized}${fewShot}

需要填写字段时，请用以下 JSON 格式回复（不要用代码块围栏）：
{
  "message": "说明",
  "fills": [{ "field": "字段键", "value": "填入值", "label": "字段名" }],
  "warning": "可选警告"
}

不需要填写时省略 "fills"。始终包含 "message"。
可用字段键：${fieldKeys}。
只填写明确要求的字段。`
    : `You are an AI assistant for Blood on the Clocktower (BotC) custom character authoring.
Help the user create, translate, and refine characters and scripts.

${buildGlossaryPrompt('en')}${wiki}

${designHints}

${serialized}${fewShot}

When filling fields, respond with JSON in this exact format (no markdown fences):
{
  "message": "<explanation>",
  "fills": [{ "field": "<key>", "value": "<value>", "label": "<label>" }],
  "warning": "<optional>"
}

If no fills, omit "fills". Always include "message".
Field keys: ${fieldKeys}.
Only fill fields explicitly requested.`
}

function scriptPrompt(ctx: AiContext, wiki: string, zh: boolean): string {
  const serialized = ctx.serialized ?? serializeContext(ctx)
  return zh
    ? `你是一个血染钟楼（BotC）剧本分析 AI 助手。
帮助用户分析、理解和改进剧本设计。

${buildGlossaryPrompt('zh')}${wiki}

${serialized}

用中文回答。回复格式：{"message": "你的回答"}`
    : `You are an AI assistant for Blood on the Clocktower (BotC) script analysis.
Help the user analyze, understand, and improve script design.

${buildGlossaryPrompt('en')}${wiki}

${serialized}

Respond in English. Always respond as JSON: {"message": "<your response>"}`
}

function storytellerPrompt(ctx: AiContext, wiki: string, zh: boolean): string {
  const serialized = ctx.serialized ?? serializeContext(ctx)
  return zh
    ? `你是一个血染钟楼（BotC）说书人 AI 助手。
帮助分析当前游戏状态并提供说书人建议。

${buildGlossaryPrompt('zh')}${wiki}

${serialized}

用中文回答。始终以 JSON 格式回复：{"message": "你的回答"}`
    : `You are an AI assistant for Blood on the Clocktower (BotC) storyteller support.
Help analyze the current game state and provide storyteller advice.

${buildGlossaryPrompt('en')}${wiki}

${serialized}

Respond in English. Always respond as JSON: {"message": "<your response>"}`
}

function gamelogPrompt(ctx: AiContext, wiki: string, zh: boolean): string {
  const log = ctx.serialized || (ctx.fields.find((f) => f.key === 'gameLogText')?.value as string | undefined) || ''
  return zh
    ? `你是一个血染钟楼（BotC）游戏复盘 AI 助手。
帮助分析游戏记录、进行复盘，并回答关于游戏过程的问题。

${buildGlossaryPrompt('zh')}${wiki}

${log}

用中文回答。分析要具体、深入。
始终以 JSON 格式回复：{"message": "你的回答"}`
    : `You are an AI assistant for Blood on the Clocktower (BotC) game analysis.
Help analyze game logs, perform post-game debrief (复盘), and answer questions about the game.

${buildGlossaryPrompt('en')}${wiki}

${log}

Respond in English. Be specific and analytical.
Always respond as JSON: {"message": "<your response>"}`
}

function analysisPrompt(ctx: AiContext, wiki: string, zh: boolean): string {
  const serialized = ctx.serialized ?? serializeContext(ctx)
  return zh
    ? `你是一个血染钟楼（BotC）游戏统计分析 AI 助手。
帮助用户分析游戏历史数据和趋势。

${buildGlossaryPrompt('zh')}${wiki}

${serialized}

用中文回答。始终以 JSON 格式回复：{"message": "你的回答"}`
    : `You are an AI assistant for Blood on the Clocktower (BotC) game analytics.
Help the user analyze their game history, statistics, and trends.

${buildGlossaryPrompt('en')}${wiki}

${serialized}

Respond in English. Always respond as JSON: {"message": "<your response>"}`
}

function generalPrompt(wiki: string, zh: boolean): string {
  return zh
    ? `你是一个血染钟楼（BotC）AI 助手。
回答关于游戏规则、角色、策略的各种问题。

${buildGlossaryPrompt('zh')}${wiki}

始终以 JSON 格式回复：{"message": "你的回答"}`
    : `You are an AI assistant for Blood on the Clocktower (BotC).
Answer questions about game rules, characters, strategies, and more.

${buildGlossaryPrompt('en')}${wiki}

Always respond as JSON: {"message": "<your response>"}`
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
