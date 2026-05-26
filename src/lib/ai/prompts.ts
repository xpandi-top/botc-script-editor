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

// ── Core BotC rules — always injected into every prompt ──────────────────────
//
// These cover the mechanics most likely to be misunderstood or hallucinated.
// Wiki RAG supplements with detail; this provides the always-correct baseline.
// Sources: clocktower.online rules sheet + official almanac + BotC Discord FAQs
// EN wiki: https://wiki.bloodontheclocktower.com/
// ZH wiki: https://botc.wiki/  (unofficial community wiki, peer-reviewed)

const BOTC_CORE_RULES = {
  en: `BLOOD ON THE CLOCKTOWER — CORE RULES REFERENCE
(Always apply these; they override any training-memory misconception)

OVERVIEW:
- Social deduction game. Players sit in a circle. One Storyteller runs the game; all others are players.
- Teams: Good (Townsfolk + Outsiders) vs Evil (Minions + Demon). Players do NOT know each other's identities.
- Good wins if the Demon dies. Evil wins if only 2 players remain alive (at the end of a day, before execution).

CHARACTER TYPES:
- Townsfolk: Good alignment. Information or protective abilities. Most common type.
- Outsider: Good alignment. Drawback ability that hinders the good team.
- Minion: Evil alignment. Supports the Demon; knows who the Demon is from Night 1.
- Demon: Evil alignment. Kills at night. If the Demon dies, evil loses immediately.
- Traveller: Neutral or any alignment. Joins mid-game; has special rules (exile instead of execution).
- Fabled: Storyteller-only tokens that modify game rules. Not player characters.

NIGHT / DAY CYCLE:
- Night 1 (First Night): Storyteller wakes players in printed night-order to give info or make choices.
- Each subsequent Night (Other Nights): Demon kills; other characters act per their printed order.
- Day: Players discuss freely, then nominate and vote to execute one player.
- Repeat until good or evil wins.

DEMON INFO (Night 1, 7+ players):
- The Demon is told 3 characters NOT in the game (bluffs) and the identities of their Minions.
- Minions are told who the Demon is (and each other, in some editions).

NOMINATIONS & VOTING:
- Any living player may nominate once per day. A nominated player may only be nominated once per day.
- Votes are public. Dead players may vote once more during the entire game (ghost vote).
- A simple majority (more than half of living players) is required to execute.
- If multiple nominations reach the threshold, the highest-vote candidate is executed. Ties = no execution.
- The player with the most votes is "about to die" — they are executed only if no later nomination surpasses them.
- Storyteller calls votes; players raise hands simultaneously.

EXECUTION vs DEATH:
- Execution: decided by vote during the day. A player may be executed but survive (e.g., certain abilities).
- Death: losing the alive state. Most night kills are deaths, not executions.
- These are DIFFERENT events. Some abilities trigger only on death, others only on execution.

DRUNK & POISONED:
- A drunk or poisoned player has NO ability — their ability does not work.
- CRITICAL: The Storyteller STILL pretends the ability works and may give false information.
- A drunk player does not know they are drunk. The Storyteller never says "you are drunk."
- Drunk ≠ Poisoned mechanically, but both have the same effect: ability disabled.
- Examples: a drunk Empath receives false neighbour info; a poisoned Demon cannot kill.

DEAD PLAYERS:
- Dead players lose their ability immediately upon death.
- Dead players keep their vote token until used (one ghost vote remaining for the whole game).
- Dead players continue to participate in discussion and may give information.
- Dead players may be executed again (no mechanical effect, but confirms they are still dead).

TRAVELLERS:
- Travellers can be exiled by group decision (not a formal vote/nomination — anyone can call for exile).
- Exile is NOT an execution. Abilities that trigger on execution do NOT trigger on exile.
- A Traveller's alignment can be good or evil at the Storyteller's discretion.

MADNESS:
- Some characters require their player to act "mad" — claiming to be a certain character publicly.
- The Storyteller decides whether a player is being sufficiently mad. If not, the ST may punish them.
- Being mad is a real-world social behaviour, not a tracked game state.

REGISTERS AS / APPEARS TO BE:
- Some abilities say a character "registers as" a type or alignment.
- This affects abilities that ask "what type/alignment is this player?" — the answer reflects the registration.
- It does NOT change the player's actual alignment or character for win conditions.

WIN CONDITIONS:
- Good wins: The Demon dies (at any point — night or day).
- Evil wins: Only 2 players are alive at the start of the day phase (before any execution that day).
- Some characters (e.g. Saint, Mayor) add alternative win/loss conditions.
- The game ends immediately when a win condition is met.

STORYTELLER AUTHORITY:
- The Storyteller may choose HOW abilities resolve within the rules, but not WHETHER they apply.
- The Storyteller must always give true information about the rules themselves (even to drunk players).
- The Storyteller may give false in-game information (e.g., to drunk players, or via certain abilities).
- The Storyteller breaks ties and resolves ambiguous interactions.

OFFICIAL WIKI REFERENCES:
- English: https://wiki.bloodontheclocktower.com/
- Chinese community: https://botc.wiki/
- Official Discord (rulings): https://discord.gg/botc`,

  zh: `血染钟楼——核心规则参考
（以下内容始终适用；如与训练记忆有出入，以此为准）

游戏概述：
- 社交推理游戏。玩家围坐成圈。一名说书人主持游戏；其余所有人为玩家。
- 阵营：好人（镇民 + 外来者）vs 邪恶（爪牙 + 恶魔）。玩家不知道彼此的身份。
- 好人获胜条件：恶魔死亡。邪恶获胜条件：白天阶段开始时仅剩2名存活玩家（在处决发生前）。

角色类型：
- 镇民：好人阵营。提供信息或保护能力。数量最多。
- 外来者：好人阵营。具有对好人不利的缺陷能力。
- 爪牙：邪恶阵营。辅助恶魔；第一夜即知晓恶魔身份。
- 恶魔：邪恶阵营。每夜杀人。恶魔死亡则邪恶立刻失败。
- 旅行者：中立或任意阵营。中途加入游戏；有特殊规则（流放而非处决）。
- 传奇角色：仅说书人使用的提示牌，用于修改游戏规则。不是玩家角色。

夜晚/白天循环：
- 第一夜：说书人按照夜晚顺序表依次叫醒玩家，给予信息或让其做出选择。
- 其他夜晚：恶魔击杀；其他角色按印刷顺序行动。
- 白天：玩家自由讨论，然后提名并投票处决一名玩家。
- 重复循环直到好人或邪恶获胜。

恶魔信息（第一夜，7人及以上）：
- 恶魔被告知3个不在游戏中的角色（虚张声势）以及爪牙的身份。
- 爪牙被告知恶魔的身份（部分版本中也告知彼此）。

提名与投票：
- 每位存活玩家每天可提名一次。被提名玩家每天只能被提名一次。
- 投票公开进行。死亡玩家在整局游戏中可再投一次票（亡魂票）。
- 需要超过半数存活玩家投票方可处决。
- 若多名被提名玩家达到票数门槛，得票最多者被处决。平票则无人被处决。
- 目前得票最多者处于"即将死亡"状态——只有后续提名未超越其票数，其才会被处决。
- 说书人主持投票；玩家同时举手。

处决与死亡：
- 处决：通过白天投票决定。玩家可能被处决但仍然存活（如某些能力保护）。
- 死亡：失去存活状态。大多数夜间击杀属于死亡，而非处决。
- 两者是不同事件。某些能力仅在死亡时触发，另一些仅在处决时触发。

醉酒与中毒：
- 醉酒或中毒的玩家没有能力——其能力不起作用。
- 【重要】说书人仍会假装能力有效，并可能给出虚假信息。
- 醉酒玩家不知道自己醉酒。说书人绝不会说"你醉酒了"。
- 醉酒≠中毒（机制上略有差异），但效果相同：能力失效。
- 例：醉酒的占卜师会收到错误的邻座信息；中毒的恶魔无法击杀。

死亡玩家：
- 死亡玩家在死亡时立即失去能力。
- 死亡玩家保留其投票提示牌，直到使用（全局仅剩一次亡魂票）。
- 死亡玩家继续参与讨论，可提供信息。
- 死亡玩家可被再次处决（无机制效果，只是确认其仍处于死亡状态）。

旅行者：
- 旅行者可被群体决定流放（无需正式投票/提名——任何人均可发起）。
- 流放不是处决。触发"处决时"的能力不会因流放而触发。
- 旅行者的阵营可由说书人自行决定（好人或邪恶）。

疯狂：
- 部分角色要求其玩家公开表现"疯狂"——声称自己是某特定角色。
- 说书人判断玩家是否足够疯狂。若判定不够，说书人可予以惩罚。
- 疯狂是现实中的社交行为，而非可追踪的游戏状态。

"登记为"（Registers as）：
- 部分能力使角色"登记为"某类型或某阵营。
- 这影响询问"该玩家是什么类型/阵营"的能力——答案反映登记结果。
- 不改变玩家的实际阵营或角色（对胜负条件无影响）。

胜利条件：
- 好人获胜：恶魔死亡（任何时刻——夜间或白天均可）。
- 邪恶获胜：白天阶段开始时仅剩2名存活玩家（当天处决发生前）。
- 部分角色（如圣徒、市长）有额外的获胜/失败条件。
- 满足胜利条件时游戏立即结束。

说书人权限：
- 说书人可在规则范围内选择能力如何生效，但不能决定能力是否适用。
- 说书人必须始终如实告知玩家规则（即使对醉酒玩家也如此）。
- 说书人可给出错误的游戏内信息（如对醉酒玩家，或通过某些能力）。
- 说书人解决平局和模糊的交互裁定。

官方参考资料：
- 英文 Wiki：https://wiki.bloodontheclocktower.com/
- 中文社区 Wiki：https://botc.wiki/
- 官方 Discord（裁定）：https://discord.gg/botc`,
}

// ── Wiki RAG helper ───────────────────────────────────────────────────────────

function wikiSection(query?: string): string {
  if (!query || query.length <= 4) return ''
  // More chunks for rules-heavy queries
  const isRulesQuery = /rule|mechanic|how|win|vote|drunk|poison|dead|night|day|nomina|execut|规则|如何|获胜|投票|醉酒|中毒|死亡|夜晚|处决|提名/i.test(query)
  const n = isRulesQuery ? 5 : 3
  const chunks = searchWiki(query, n)
  const fmt = formatWikiPrompt(chunks, isRulesQuery ? 900 : 600)
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
  const coreRules   = zh ? BOTC_CORE_RULES.zh : BOTC_CORE_RULES.en
  const resFmt      = zh ? RESPONSE_FORMAT.zh : RESPONSE_FORMAT.en

  return zh
    ? `${identity}

${coreRules}

${buildGlossaryPrompt('zh')}${wiki}

${designHints}

${serialized}${fewShot}

FILLS FORMAT: 需要填写字段时在 JSON 中包含 "fills" 数组：
[{ "field": "字段键", "value": "填入值", "label": "字段显示名" }]
只填写明确要求的字段。可用字段键：${fieldKeys}。
不填写时省略 "fills"。

${resFmt}`
    : `${identity}

${coreRules}

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
  const coreRules  = zh ? BOTC_CORE_RULES.zh : BOTC_CORE_RULES.en
  const resFmt     = zh ? RESPONSE_FORMAT.zh : RESPONSE_FORMAT.en

  return zh
    ? `${identity}

${coreRules}

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

${coreRules}

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
  const coreRules  = zh ? BOTC_CORE_RULES.zh : BOTC_CORE_RULES.en
  const resFmt     = zh ? RESPONSE_FORMAT.zh : RESPONSE_FORMAT.en

  return zh
    ? `${identity}

${coreRules}

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

${coreRules}

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
  const log       = ctx.serialized || (ctx.fields.find((f) => f.key === 'gameLogText')?.value as string | undefined) || ''
  const identity  = zh ? IDENTITY_HEADER.zh : IDENTITY_HEADER.en
  const coreRules = zh ? BOTC_CORE_RULES.zh : BOTC_CORE_RULES.en
  const resFmt    = zh ? RESPONSE_FORMAT.zh : RESPONSE_FORMAT.en

  return zh
    ? `${identity}

${coreRules}

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

${coreRules}

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
  const coreRules  = zh ? BOTC_CORE_RULES.zh : BOTC_CORE_RULES.en
  const resFmt     = zh ? RESPONSE_FORMAT.zh : RESPONSE_FORMAT.en

  return zh
    ? `${identity}

${coreRules}

你是血染钟楼游戏统计分析 AI 助手。帮助用户分析游戏历史数据和趋势。

${buildGlossaryPrompt('zh')}${wiki}

分析原则：
- 仅基于提供的统计数据
- 如样本量过小不可靠，请明确说明
- 结论要具体、可操作

${serialized}

${resFmt}`
    : `${identity}

${coreRules}

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
  const identity  = zh ? IDENTITY_HEADER.zh : IDENTITY_HEADER.en
  const coreRules = zh ? BOTC_CORE_RULES.zh : BOTC_CORE_RULES.en
  const resFmt    = zh ? RESPONSE_FORMAT.zh : RESPONSE_FORMAT.en

  return zh
    ? `${identity}

${coreRules}

你是血染钟楼通用 AI 助手，回答关于游戏规则、角色、策略的各种问题。

${buildGlossaryPrompt('zh')}${wiki}

回答原则：
- 如有官方裁定，引用官方来源
- 如不确定，明确说明并建议查阅官方 Discord 或 Wiki（链接见上方核心规则末尾）
- 不得编造规则或角色
- 规则问题优先使用上方"核心规则参考"中的内容

${resFmt}`
    : `${identity}

${coreRules}

You are a general-purpose BotC AI assistant. Answer questions about game rules, characters, strategies, and more.

${buildGlossaryPrompt('en')}${wiki}

Answer principles:
- For rules questions, apply the CORE RULES REFERENCE above — it takes priority over training memory
- Cite official sources when official rulings exist
- If uncertain, say so and recommend checking the official BotC Discord or Wiki (links in core rules above)
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
