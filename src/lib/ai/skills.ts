/**
 * Skill definitions — pure data, NO React imports.
 * Icons are string identifiers mapped to MUI components in the UI layer.
 */

import type { AiContext, AiContextType } from './types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SkillDef = {
  id: string
  icon: string            // icon identifier string, NOT ReactNode
  label: string
  labelZh: string
  desc: string
  descZh: string
  forContexts: AiContextType[]
  chip?: boolean
  prompt: (ctx: AiContext) => string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function field(ctx: AiContext, key: string): unknown {
  return ctx.fields.find((f) => f.key === key)?.value
}

// ── Skill definitions ─────────────────────────────────────────────────────────

export const SKILLS: SkillDef[] = [
  // ── Character skills ─────────────────────────────────────────────────────────
  {
    id: 'translate-zh',
    icon: 'translate',
    label: 'Translate to ZH',
    labelZh: '翻译为中文',
    desc: 'Translate the English ability text into Chinese.',
    descZh: '将英文能力文本翻译成中文。',
    forContexts: ['character'],
    chip: true,
    prompt: (ctx) => {
      const ab = field(ctx, 'abilityEn')
      return ab
        ? `Translate this ability text to Chinese and fill the abilityZh field:\n"${ab}"`
        : 'Translate the ability text to Chinese and fill abilityZh.'
    },
  },
  {
    id: 'translate-en',
    icon: 'translate',
    label: 'Translate to EN',
    labelZh: '翻译为英文',
    desc: 'Translate the Chinese ability text into English.',
    descZh: '将中文能力文本翻译成英文。',
    forContexts: ['character'],
    chip: false,
    prompt: (ctx) => {
      const ab = field(ctx, 'abilityZh')
      return ab
        ? `Translate this Chinese ability text to English and fill the abilityEn field:\n"${ab}"`
        : 'Translate the Chinese ability text to English and fill abilityEn.'
    },
  },
  {
    id: 'suggest-ability',
    icon: 'lightbulb',
    label: 'Suggest ability',
    labelZh: '建议能力文本',
    desc: 'Generate a BotC-style ability text based on name and team.',
    descZh: '根据名字和阵营生成 BotC 风格的能力文本。',
    forContexts: ['character'],
    chip: true,
    prompt: (ctx) => {
      const name = field(ctx, 'nameEn') ?? 'this character'
      const team = field(ctx, 'team') ?? 'townsfolk'
      return `Suggest an ability text for a ${team} character named "${name}". Fill the abilityEn field.`
    },
  },
  {
    id: 'chinese-name',
    icon: 'abc',
    label: 'Chinese name',
    labelZh: '建议中文名',
    desc: 'Suggest a 2–4 character Chinese name matching the English name.',
    descZh: '建议匹配英文名含义的 2–4 字中文名。',
    forContexts: ['character'],
    chip: true,
    prompt: (ctx) => {
      const name    = field(ctx, 'nameEn') ?? 'this character'
      const ability = field(ctx, 'abilityEn') ?? ''
      return `Suggest a Chinese name for a BotC character named "${name}".${ability ? ` Ability: "${ability}"` : ''} Fill the nameZh field with a 2–4 character Chinese name.`
    },
  },
  {
    id: 'full-character',
    icon: 'autofix',
    label: 'Full character',
    labelZh: '生成完整角色',
    desc: 'Generate a complete character draft — name, ability, Chinese name, reminders.',
    descZh: '生成完整角色草稿：名字、能力、中文名、提示词。',
    forContexts: ['character'],
    chip: true,
    prompt: () =>
      'Generate a complete BotC character draft. Fill all fields: nameEn, nameZh, abilityEn, abilityZh, team, firstNightReminder, otherNightReminder.',
  },
  {
    id: 'night-reminders',
    icon: 'nights',
    label: 'Night reminders',
    labelZh: '夜间提示',
    desc: 'Suggest ST night reminders for first night and other nights.',
    descZh: '为说书人建议第一夜和其他夜晚的提示词。',
    forContexts: ['character'],
    chip: false,
    prompt: (ctx) => {
      const name    = field(ctx, 'nameEn') ?? 'this character'
      const ability = field(ctx, 'abilityEn') ?? ''
      return `Suggest concise ST night reminders for "${name}".${ability ? ` Ability: "${ability}"` : ''} Fill firstNightReminder and otherNightReminder fields.`
    },
  },
  {
    id: 'review-char',
    icon: 'info',
    label: 'Review character',
    labelZh: '检查角色设计',
    desc: 'Review the character for balance, clarity, and BotC conventions.',
    descZh: '检查角色设计的平衡性、清晰度和 BotC 设计规范。',
    forContexts: ['character'],
    chip: false,
    prompt: (ctx) => {
      const name    = field(ctx, 'nameEn') ?? 'this character'
      const team    = field(ctx, 'team') ?? ''
      const ability = field(ctx, 'abilityEn') ?? ''
      return `Review this BotC character for balance, clarity, and conventions:\nName: ${name}\nTeam: ${team}\nAbility: ${ability}\n\nProvide feedback as a message (no fills needed).`
    },
  },

  // ── Script skills ─────────────────────────────────────────────────────────────
  {
    id: 'analyze-script',
    icon: 'article',
    label: 'Analyze script',
    labelZh: '分析剧本',
    desc: 'Analyze the script composition: team balance, synergies, and threats.',
    descZh: '分析剧本构成：阵营平衡、协同效应和威胁。',
    forContexts: ['script'],
    chip: true,
    prompt: (ctx) => {
      const title = field(ctx, 'title') ?? 'this script'
      return `Analyze the BotC script "${title}": team balance, demon/minion threats, key townsfolk abilities, and overall difficulty for good/evil.`
    },
  },
  {
    id: 'script-strategy',
    icon: 'lightbulb',
    label: 'Script strategy',
    labelZh: '剧本策略',
    desc: 'Suggest strategy tips for players and storyteller.',
    descZh: '为玩家和说书人建议策略技巧。',
    forContexts: ['script'],
    chip: false,
    prompt: (ctx) => {
      const title = field(ctx, 'title') ?? 'this script'
      return `Provide strategy tips for the script "${title}": what should good and evil prioritize, which characters should be claimed or hidden?`
    },
  },
  {
    id: 'explain-chars',
    icon: 'info',
    label: 'Explain characters',
    labelZh: '解释角色',
    desc: 'Summarize and explain each character\'s role in this script.',
    descZh: '总结并解释每个角色在此剧本中的作用。',
    forContexts: ['script'],
    chip: false,
    prompt: () => 'Briefly explain each character in the script — what they do, and how they interact with others.',
  },
  {
    id: 'suggest-improvements',
    icon: 'autofix',
    label: 'Suggest improvements',
    labelZh: '建议改进',
    desc: 'Suggest changes to improve balance or fun.',
    descZh: '建议改进以提升平衡性或趣味性。',
    forContexts: ['script'],
    chip: false,
    prompt: (ctx) => {
      const title = field(ctx, 'title') ?? 'this script'
      return `Suggest improvements for the script "${title}". Consider swapping characters to improve balance, reduce confusion, or increase fun.`
    },
  },

  // ── Storyteller skills ────────────────────────────────────────────────────────
  {
    id: 'st-advice',
    icon: 'lightbulb',
    label: 'ST advice',
    labelZh: '说书人建议',
    desc: 'Get storyteller advice for the current game state.',
    descZh: '获取当前游戏状态的说书人建议。',
    forContexts: ['storyteller'],
    chip: true,
    prompt: (ctx) => {
      const day   = field(ctx, 'currentDay') ?? '?'
      const phase = field(ctx, 'phase') ?? '?'
      return `We are on Day ${day} (${phase} phase). Give me storyteller advice: what should I focus on now, and what information should I be revealing or withholding?`
    },
  },
  {
    id: 'predict-outcome',
    icon: 'analytics',
    label: 'Predict outcome',
    labelZh: '预测结果',
    desc: 'Predict the likely game outcome based on current state.',
    descZh: '根据当前状态预测可能的游戏结果。',
    forContexts: ['storyteller'],
    chip: true,
    prompt: () =>
      'Based on the current game state, predict the likely outcome. Who has the advantage — good or evil — and why?',
  },
  {
    id: 'who-to-watch',
    icon: 'info',
    label: 'Who to watch',
    labelZh: '关注玩家',
    desc: 'Identify key players the storyteller should watch.',
    descZh: '找出说书人应重点关注的玩家。',
    forContexts: ['storyteller'],
    chip: false,
    prompt: () =>
      'Which players should the storyteller be watching most closely right now, and why? Consider alliances, information, and ability interactions.',
  },

  // ── Game log skills ───────────────────────────────────────────────────────────
  {
    id: 'game-summary',
    icon: 'article',
    label: 'Game Summary',
    labelZh: '游戏总结',
    desc: 'Summarize the full game: script, days, outcome, and key moments.',
    descZh: '总结整局游戏：剧本、天数、结果、关键时刻。',
    forContexts: ['gamelog'],
    chip: true,
    prompt: () =>
      'Summarize this game. Include: script name, days played, who survived, who died and when, key vote results, and the final outcome. Write a concise narrative (3–6 sentences).',
  },
  {
    id: 'debrief',
    icon: 'reviews',
    label: '复盘 (Debrief)',
    labelZh: '复盘分析',
    desc: 'Analyze player decisions, deception, and pivotal turning points.',
    descZh: '分析玩家决策、欺骗行为和关键转折点。',
    forContexts: ['gamelog'],
    chip: true,
    prompt: () =>
      'Perform a thorough 复盘 (post-game debrief) analysis covering: (1) key information flow and who was deceived and when; (2) the most critical vote decisions and whether they were correct in hindsight; (3) which actions most influenced the final outcome; (4) what the good/evil sides could have done differently. Be specific and analytical.',
  },
  {
    id: 'timeline',
    icon: 'timeline',
    label: 'Timeline',
    labelZh: '时间线',
    desc: 'Chronological timeline of key events by day.',
    descZh: '按天整理的关键事件时间线。',
    forContexts: ['gamelog'],
    chip: false,
    prompt: () =>
      'Create a concise chronological timeline of the most important game events. Format as a bullet list grouped by day. Focus on: deaths, execution vote outcomes, ability uses, and information reveals.',
  },
  {
    id: 'player-stats',
    icon: 'barchart',
    label: 'Player Stats',
    labelZh: '玩家统计',
    desc: 'Per-player stats: role, nominations, votes, survival.',
    descZh: '每位玩家统计：角色、提名、投票、存活。',
    forContexts: ['gamelog'],
    chip: false,
    prompt: () =>
      'Generate per-player statistics from the game log. For each player list: their role (if known), whether they survived, nominations they made, times they were nominated, and any notable ability uses. Format as a structured table or list.',
  },

  // ── Analysis skills ───────────────────────────────────────────────────────────
  {
    id: 'game-insights',
    icon: 'analytics',
    label: 'Game Insights',
    labelZh: '游戏洞察',
    desc: 'Generate insights from your game history and statistics.',
    descZh: '从游戏历史和统计数据中生成洞察。',
    forContexts: ['analysis'],
    chip: true,
    prompt: (ctx) => {
      const count = field(ctx, 'recordCount') ?? 0
      const scripts = field(ctx, 'recentScripts') ?? ''
      return `Analyze my BotC game history (${count} records). Recent scripts: ${scripts}. What patterns do you see? What roles or scripts are popular? Any suggestions?`
    },
  },

  // ── General (available to all) ────────────────────────────────────────────────
  {
    id: 'rules-q',
    icon: 'menu_book',
    label: 'Rules question',
    labelZh: '规则问题',
    desc: 'Ask a rules question about Blood on the Clocktower.',
    descZh: '提问关于血染钟楼的规则问题。',
    forContexts: ['character', 'script', 'storyteller', 'gamelog', 'analysis', 'general'],
    chip: false,
    prompt: () => 'I have a rules question about Blood on the Clocktower.',
  },
]

// ── Accessors ─────────────────────────────────────────────────────────────────

export function getChipSkills(ctx: AiContext): SkillDef[] {
  return SKILLS.filter((s) => s.chip && s.forContexts.includes(ctx.type))
}

export function getSkillsFor(ctx: AiContext): SkillDef[] {
  return SKILLS.filter((s) => s.forContexts.includes(ctx.type))
}
