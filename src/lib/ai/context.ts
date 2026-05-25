/**
 * Context builders — produce AiContext objects for each tab/form type.
 * No React imports here.
 */

import { getDisplayName, getAbilityTextForScript, getCharacterById, teamOrder, teamLabels } from '../../catalog'
import { makeT } from '../t'
import type { Language, Team } from '../../types'
import type {
  AiContext, AiField,
  CharacterInput, ScriptInput, StorytellerInput, GameLogInput, AnalysisInput,
} from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleName(roleId: string | undefined, lang: Language): string {
  if (!roleId) return '?'
  const n = getDisplayName(roleId, lang)
  return n !== roleId ? n : roleId
}

function stripIconTokens(s: string): string {
  return s.replace(/\[icon:[^\]]+\]/g, '').replace(/\s+/g, ' ').trim()
}

// ── serializeContext ──────────────────────────────────────────────────────────

export function serializeContext(ctx: AiContext): string {
  const lines = ctx.fields.map((f) => {
    const val =
      f.value === '' || f.value === undefined || f.value === null
        ? '(empty)'
        : String(f.value)
    return `  ${f.key} [${f.label}]: ${val}`
  })
  return `Context: ${ctx.type} — "${ctx.title}"\nFields:\n${lines.join('\n')}`
}

// ── buildCharacterContext ─────────────────────────────────────────────────────

const TEAM_ROLE_HINTS: Record<string, { en: string; zh: string }> = {
  townsfolk: {
    en: 'Good team. Usually provides information or protection. Abilities generally help the good team win.',
    zh: '好人阵营。通常提供信息或保护。能力通常帮助好人胜利。',
  },
  outsider: {
    en: 'Good team but has a negative or drawback ability. Complicates the game for good players.',
    zh: '好人阵营，但能力有负面效果。增加好人阵营的复杂性。',
  },
  minion: {
    en: 'Evil team. Supports the Demon. Usually disrupts, misleads, or kills good players.',
    zh: '邪恶阵营。支持恶魔。通常干扰、误导或杀害好人。',
  },
  demon: {
    en: 'Evil team. Kills at night. Must survive to win. Usually the most powerful evil role.',
    zh: '邪恶阵营。每夜杀人。存活则胜利。通常是最强的邪恶角色。',
  },
  traveler: {
    en: 'Neutral role that can join mid-game. Has unique abilities and can be exiled separately.',
    zh: '中立旅行者，可中途加入。有独特能力，可被单独放逐。',
  },
  fabled: {
    en: 'Storyteller-controlled setup role. Modifies game rules or balance.',
    zh: '说书人控制的设置角色。修改游戏规则或平衡性。',
  },
}

function serializeCharacterForPrompt(input: CharacterInput, language: Language): string {
  const t = makeT(language)
  const zh = language === 'zh'
  const lines: string[] = []

  const title = input.nameEn || (t('new_character'))
  lines.push(zh ? `=== 角色: ${title} ===` : `=== Character: ${title} ===`)

  // Team role context
  if (input.team) {
    const hint = TEAM_ROLE_HINTS[input.team]
    if (hint) {
      lines.push((t('team_role')) + (zh ? hint.zh : hint.en))
    }
  }

  lines.push('')
  lines.push(t('current_fields'))

  const filled = (v: unknown) => v !== undefined && v !== null && v !== ''

  lines.push(`${t('name_en')}: ${filled(input.nameEn) ? input.nameEn : (t('empty'))}`)
  lines.push(`${t('name_zh')}: ${filled(input.nameZh) ? input.nameZh : (t('empty'))}`)
  lines.push(`${t('team_label')}: ${input.team || (t('empty'))}`)
  lines.push(`${t('edition_label')}: ${input.edition || (t('empty'))}`)

  lines.push('')
  lines.push(`${t('ability_en')}: ${filled(input.abilityEn) ? input.abilityEn : (t('empty'))}`)
  lines.push(`${t('ability_zh')}: ${filled(input.abilityZh) ? input.abilityZh : (t('empty'))}`)

  const hasNight = filled(input.firstNight) || filled(input.otherNight) ||
    filled(input.firstNightReminder) || filled(input.otherNightReminder)
  if (hasNight) {
    lines.push('')
    lines.push(t('night_info'))
    if (filled(input.firstNight))
      lines.push(`${t('first_night_order')}: ${input.firstNight}`)
    if (filled(input.firstNightReminder))
      lines.push(`${t('first_night_reminder_2')}: ${input.firstNightReminder}`)
    if (filled(input.otherNight))
      lines.push(`${t('other_night_order')}: ${input.otherNight}`)
    if (filled(input.otherNightReminder))
      lines.push(`${t('other_night_reminder_2')}: ${input.otherNightReminder}`)
  }

  if (input.isNew) {
    lines.push('')
    lines.push(t('note_this_is_a_new_character_not_yet_saved_to_the_database'))
  }

  return lines.join('\n')
}

export function buildCharacterContext(input: CharacterInput, language: Language): AiContext {
  const t = makeT(language)
  const fields: AiField[] = [
    { key: 'nameEn', label: t('name_en'), value: input.nameEn, editable: true },
    { key: 'nameZh', label: t('name_zh'), value: input.nameZh ?? '', editable: true },
    { key: 'abilityEn', label: t('ability_en'), value: input.abilityEn, editable: true },
    { key: 'abilityZh', label: t('ability_zh'), value: input.abilityZh ?? '', editable: true },
    { key: 'team', label: t('team_label'), value: input.team, editable: true },
    { key: 'edition', label: t('edition_label'), value: input.edition, editable: true },
    { key: 'author', label: t('author'), value: input.author, editable: true },
    { key: 'firstNightReminder', label: t('first_night_reminder_2'), value: input.firstNightReminder ?? '', editable: true },
    { key: 'otherNightReminder', label: t('other_night_reminder_2'), value: input.otherNightReminder ?? '', editable: true },
    { key: 'firstNight', label: t('first_night_order'), value: input.firstNight, editable: true },
    { key: 'otherNight', label: t('other_night_order'), value: input.otherNight, editable: true },
  ]
  if (input.isNew) {
    fields.unshift({ key: 'id', label: 'ID', value: input.id ?? '', editable: true })
  }
  const ctx: AiContext = {
    type: 'character',
    title: input.nameEn || (t('new_character')),
    language,
    fields,
  }
  ctx.serialized = serializeCharacterForPrompt(input, language)
  return ctx
}

// ── buildScriptContext ────────────────────────────────────────────────────────

const TEAM_LABEL: Record<Team, { en: string; zh: string }> = {
  townsfolk: { en: 'Townsfolk (good)', zh: '镇民（好人）' },
  outsider:  { en: 'Outsiders (good)', zh: '外来者（好人）' },
  minion:    { en: 'Minions (evil)', zh: '爪牙（邪恶）' },
  demon:     { en: 'Demon (evil)', zh: '恶魔（邪恶）' },
  traveler:  { en: 'Travelers', zh: '旅行者' },
  fabled:    { en: 'Fabled', zh: '传说' },
  loric:     { en: 'Loric', zh: '奇遇' },
}

// Typical 15-player composition for balance reference
const TYPICAL_COMPOSITION = {
  en: 'Typical 15p: 9 Townsfolk, 2 Outsiders, 2 Minions, 1 Demon (+ 1 Traveler optional)',
  zh: '典型15人配置: 9镇民, 2外来者, 2爪牙, 1恶魔 (+ 1旅行者可选)',
}

function serializeScriptForPrompt(input: ScriptInput): string {
  const { script, language } = input
  const t = makeT(language)
  const zh = language === 'zh'
  const title = zh ? script.titleZh || script.title : script.title
  const lines: string[] = []

  lines.push(zh ? `=== 剧本: ${title} ===` : `=== Script: ${title} ===`)
  if (script.author) lines.push((t('author_2')) + script.author)
  if (script.edition) lines.push((t('edition')) + script.edition)
  lines.push((t('total_characters')) + script.characters.length)
  lines.push(zh ? TYPICAL_COMPOSITION.zh : TYPICAL_COMPOSITION.en)

  // Group by team
  const grouped: Partial<Record<Team, string[]>> = {}
  for (const id of script.characters) {
    const entry = getCharacterById(id)
    const team: Team = (entry?.team as Team) ?? 'townsfolk'
    if (!grouped[team]) grouped[team] = []
    grouped[team]!.push(id)
  }

  for (const team of teamOrder) {
    const ids = grouped[team]
    if (!ids?.length) continue
    const label = zh ? TEAM_LABEL[team].zh : TEAM_LABEL[team].en
    lines.push('')
    lines.push(`── ${label} (${ids.length}) ──`)
    for (const id of ids) {
      const name    = getDisplayName(id, language)
      const ability = getAbilityTextForScript(id, language, script.pinnedRevisions)
      lines.push(`  ${name}: ${ability}`)
    }
  }

  if (script.notes?.trim()) {
    lines.push('')
    lines.push((t('notes')) + script.notes)
  }

  return lines.join('\n')
}

export function buildScriptContext(input: ScriptInput): AiContext {
  const { script, language } = input
  const t = makeT(language)
  const zh = language === 'zh'
  const title = zh ? script.titleZh || script.title : script.title
  const charCount = script.characters.length

  // Group by team for count summary
  const counts: Partial<Record<Team, number>> = {}
  for (const id of script.characters) {
    const entry = getCharacterById(id)
    const team: Team = (entry?.team as Team) ?? 'townsfolk'
    counts[team] = (counts[team] ?? 0) + 1
  }
  const teamSummary = teamOrder
    .filter((tm) => counts[tm])
    .map((tm) => `${counts[tm]} ${zh ? teamLabels.zh[tm] : teamLabels.en[tm]}`)
    .join(', ')

  const fields: AiField[] = [
    { key: 'title', label: t('script_title'), value: title },
    { key: 'author', label: t('author'), value: script.author || '' },
    { key: 'edition', label: t('edition_label'), value: script.edition || '' },
    { key: 'characterCount', label: t('character_count'), value: charCount },
    { key: 'teamBreakdown', label: t('team_breakdown'), value: teamSummary },
  ]
  if (script.notes?.trim()) {
    fields.push({ key: 'notes', label: t('notes'), value: script.notes })
  }
  const ctx: AiContext = {
    type: 'script',
    title,
    language,
    fields,
  }
  ctx.serialized = serializeScriptForPrompt(input)
  return ctx
}

// ── buildStorytellerContext ───────────────────────────────────────────────────

export function buildStorytellerContext(input: StorytellerInput): AiContext {
  const { scriptName, stName, currentDay, days, language } = input
  const t = makeT(language)
  const zh = language === 'zh'

  const alive = currentDay.seats.filter((s) => s.alive !== false)
  const dead  = currentDay.seats.filter((s) => s.alive === false)

  const aliveStr = alive
    .map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`)
    .join(', ') || (t('none'))
  const deadStr = dead
    .map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`)
    .join(', ') || (t('none'))

  const recentVotes = currentDay.voteHistory
    .slice(-5)
    .map((v) => {
      const nom = currentDay.seats.find((s) => s.seat === v.actor)?.name || `#${v.actor}`
      const tgt = currentDay.seats.find((s) => s.seat === v.target)?.name || `#${v.target}`
      return `${nom}→${tgt} ${v.voteCount}/${v.requiredVotes} ${v.passed ? (t('passed')) : (t('failed'))}`
    })
    .join('; ')

  const fields: AiField[] = [
    { key: 'scriptName', label: t('script'), value: scriptName },
    { key: 'stName', label: t('storyteller'), value: stName || '' },
    { key: 'currentDay', label: t('current_day'), value: currentDay.day },
    { key: 'totalDays', label: t('total_days'), value: days.length },
    { key: 'phase', label: t('phase'), value: currentDay.phase },
    { key: 'alive', label: t('alive_players'), value: aliveStr },
    { key: 'dead', label: t('dead_players'), value: deadStr },
    { key: 'recentVotes', label: t('recent_votes'), value: recentVotes || (t('none')) },
  ]

  const ctx: AiContext = {
    type: 'storyteller',
    title: `${scriptName} — ${t('day')} ${currentDay.day} ${zh ? '天' : ''}`,
    language,
    fields,
  }
  ctx.serialized = serializeContext(ctx)
  return ctx
}

// ── buildGameLogContext ───────────────────────────────────────────────────────

function seatName(seat: number, day: import('../../components/StorytellerSub/types').DayState): string {
  const s = day.seats.find((x) => x.seat === seat)
  return s?.name ? `${s.name}(#${seat})` : `#${seat}`
}

function serializeGameLog(input: GameLogInput): string {
  const { scriptName, stName, days, language } = input
  const t = makeT(language)
  const zh = language === 'zh'
  const lines: string[] = []

  lines.push(zh ? `=== 游戏记录: ${scriptName} ===` : `=== Game Log: ${scriptName} ===`)
  if (stName) lines.push((t('storyteller')) + stName)
  lines.push((t('days_played')) + days.length)

  const lastDay = days[days.length - 1]
  if (lastDay) {
    const aliveSeats = lastDay.seats.filter((s) => s.alive !== false)
    const deadSeats  = lastDay.seats.filter((s) => s.alive === false)
    lines.push('')
    lines.push(t('final_alive'))
    lines.push(
      aliveSeats.map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`).join(', ') || (t('none')),
    )
    lines.push(t('dead_2'))
    lines.push(
      deadSeats.map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`).join(', ') || (t('none')),
    )
    if (lastDay.demonBluffs?.length) {
      lines.push(t('demon_bluffs_2'))
      lines.push(lastDay.demonBluffs.map((id) => roleName(id, language)).join(', '))
    }
  }

  for (const day of days) {
    lines.push('')
    lines.push(zh ? `── 第 ${day.day} 天 ──` : `── Day ${day.day} ──`)
    const alive = day.seats.filter((s) => s.alive !== false).map((s) => s.name || `#${s.seat}`)
    lines.push((t('alive_2')) + alive.join(', '))

    if (day.voteHistory.length) {
      lines.push(t('votes'))
      for (const v of day.voteHistory) {
        const nominator = seatName(v.actor, day)
        const target    = seatName(v.target, day)
        const result    = v.passed ? (t('passed')) : (t('failed'))
        lines.push(`  ${nominator} → ${target}: ${v.voteCount}/${v.requiredVotes} ${result}${v.note ? ` (${v.note})` : ''}`)
      }
    }

    if (day.skillHistory.length) {
      lines.push(t('skills_used'))
      for (const sk of day.skillHistory) {
        const actor  = sk.actor !== null ? seatName(sk.actor, day) : '?'
        const role   = roleName(sk.roleId, language)
        const target = sk.targets.length
          ? sk.targets.map((t) => seatName(t, day)).join(', ')
          : ''
        const result = sk.result ? ` [${sk.result}]` : ''
        const stmt   = sk.statement ? ` "${stripIconTokens(sk.statement)}"` : ''
        lines.push(`  ${role}(${actor})${target ? ` → ${target}` : ''}${result}${stmt}`)
      }
    }

    const meaningful = day.eventLog.filter((e) =>
      e.kind !== 'phaseTransition' ||
      e.detail.toLowerCase().includes('execut') ||
      e.detail.toLowerCase().includes('死') ||
      e.detail.toLowerCase().includes('win') ||
      e.detail.toLowerCase().includes('胜'),
    )
    if (meaningful.length) {
      lines.push(t('events'))
      for (const ev of meaningful.slice(0, 8)) {
        lines.push(`  [${ev.phase}] ${stripIconTokens(ev.detail)}`)
      }
    }
  }

  return lines.join('\n')
}

export function buildGameLogContext(input: GameLogInput): AiContext {
  const text = serializeGameLog(input)
  const t    = makeT(input.language)
  const total = input.days.reduce((s, d) => s + d.voteHistory.length, 0)

  const fields: AiField[] = [
    { key: 'scriptName', label: t('script'), value: input.scriptName },
    { key: 'dayCount', label: t('days'), value: input.days.length },
    { key: 'voteCount', label: t('votes'), value: total },
    { key: 'gameLogText', label: t('full_log'), value: text },
  ]

  return {
    type: 'gamelog',
    title: input.scriptName,
    language: input.language,
    fields,
    serialized: text,
  }
}

// ── buildAnalysisContext ──────────────────────────────────────────────────────

export function buildAnalysisContext(input: AnalysisInput): AiContext {
  const { language, recordCount, recentScripts } = input
  const t = makeT(language)
  const fields: AiField[] = [
    { key: 'recordCount', label: t('game_records'), value: recordCount ?? 0 },
    { key: 'recentScripts', label: t('recent_scripts'), value: recentScripts?.join(', ') ?? '' },
  ]
  return {
    type: 'analysis',
    title: t('game_analytics'),
    language,
    fields,
    serialized: serializeContext({ type: 'analysis', title: t('game_analytics'), language, fields }),
  }
}

// ── buildGeneralContext ───────────────────────────────────────────────────────

export function buildGeneralContext(language: Language): AiContext {
  const t = makeT(language)
  return {
    type: 'general',
    title: t('general'),
    language,
    fields: [],
    serialized: '',
  }
}
