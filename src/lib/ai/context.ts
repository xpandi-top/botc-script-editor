/**
 * Context builders — produce AiContext objects for each tab/form type.
 * No React imports here.
 */

import {
  getDisplayName, getAbilityTextForScript, getCharacterById,
  teamOrder, teamLabels, getEffectiveNightOrderFromRegistry, getNightReminder,
} from '../../catalog'
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
    lines.push(t('char_unsaved_note'))
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

function serializeStorytellerForPrompt(input: StorytellerInput): string {
  const { scriptName, stName, currentDay, days, language,
          scriptCharacters = [], pinnedRevisions, stFabledIds = [], stCustomRules } = input
  const t   = makeT(language)
  const zh  = language === 'zh'
  const lines: string[] = []

  lines.push(zh ? `=== 说书人游戏状态: ${scriptName} ===` : `=== Storyteller Game: ${scriptName} ===`)
  if (stName) lines.push((zh ? '说书人: ' : 'Storyteller: ') + stName)
  lines.push((zh ? '当前: 第' : 'Current: Day ') + `${currentDay.day}` + (zh ? '天' : '') + ` [${currentDay.phase}]`)
  lines.push((zh ? '总天数: ' : 'Total days played: ') + days.length)

  // ── Seat assignments ────────────────────────────────────────────────────────
  lines.push('')
  lines.push(zh ? '── 座位分配 ──' : '── Seat Assignments ──')
  for (const s of currentDay.seats) {
    const name   = s.name || `#${s.seat}`
    const char   = s.characterId ? getDisplayName(s.characterId, language) : (zh ? '未分配' : 'unassigned')
    const status = s.alive ? (zh ? '存活' : 'alive') : (zh ? '死亡' : 'dead')
    const tags   = [...(s.customTags ?? []), ...(s.stTags ?? [])].filter(Boolean)
    const tagStr = tags.length ? ` [${tags.join(', ')}]` : ''
    const noteStr = s.note ? ` note:"${s.note}"` : ''
    const traveler = s.isTraveler ? (zh ? ' (旅行者)' : ' (traveler)') : ''
    lines.push(`  #${s.seat} ${name}: ${char}${traveler} — ${status}${tagStr}${noteStr}`)
  }

  // ── Script roster: abilities + night reminders ──────────────────────────────
  const assignedCharIds = [...new Set(
    currentDay.seats.map((s) => s.characterId).filter(Boolean) as string[]
  )]
  // Include all script chars + fabled for full reference
  const rosterIds = [...new Set([...scriptCharacters, ...assignedCharIds, ...stFabledIds])]

  if (rosterIds.length) {
    lines.push('')
    lines.push(zh ? '── 角色能力参考 ──' : '── Character Abilities ──')
    for (const id of rosterIds) {
      const name    = getDisplayName(id, language)
      const ability = getAbilityTextForScript(id, language, pinnedRevisions)
      const entry   = getCharacterById(id)
      const team    = entry?.team ?? ''
      const teamStr = team ? ` (${zh ? teamLabels.zh[team as Team] ?? team : teamLabels.en[team as Team] ?? team})` : ''
      const firstR  = getNightReminder(id, language, 'first')
      const otherR  = getNightReminder(id, language, 'other')
      lines.push(`  ${name}${teamStr}: ${ability}`)
      if (firstR) lines.push(`    ${zh ? '第一夜提示' : '1st night reminder'}: ${firstR}`)
      if (otherR) lines.push(`    ${zh ? '其他夜提示' : 'Other nights reminder'}: ${otherR}`)
    }
  }

  // ── Night wake-up order (filtered to chars in this game) ───────────────────
  const nightOrderData = getEffectiveNightOrderFromRegistry()
  const gameCharSet    = new Set([...assignedCharIds, ...stFabledIds])

  const firstNightInGame = (nightOrderData.first_night ?? []).filter((id) => gameCharSet.has(id))
  const otherNightInGame = (nightOrderData.other_nights ?? []).filter((id) => gameCharSet.has(id))

  if (firstNightInGame.length || otherNightInGame.length) {
    lines.push('')
    lines.push(zh ? '── 夜间唤醒顺序 ──' : '── Night Wake-Up Order ──')
    if (firstNightInGame.length) {
      lines.push(zh ? '  第一夜:' : '  First Night:')
      firstNightInGame.forEach((id, i) => {
        const name   = getDisplayName(id, language)
        const remind = getNightReminder(id, language, 'first')
        lines.push(`    ${i + 1}. ${name}${remind ? ` — ${remind}` : ''}`)
      })
    }
    if (otherNightInGame.length) {
      lines.push(zh ? '  其他夜晚:' : '  Other Nights:')
      otherNightInGame.forEach((id, i) => {
        const name   = getDisplayName(id, language)
        const remind = getNightReminder(id, language, 'other')
        lines.push(`    ${i + 1}. ${name}${remind ? ` — ${remind}` : ''}`)
      })
    }
  }

  // ── Demon bluffs ───────────────────────────────────────────────────────────
  if (currentDay.demonBluffs?.length) {
    lines.push('')
    lines.push(zh ? '── 恶魔虚张声势 ──' : '── Demon Bluffs ──')
    lines.push('  ' + currentDay.demonBluffs.map((id) => getDisplayName(id, language)).join(', '))
  }

  // ── Fabled + custom rules ─────────────────────────────────────────────────
  if (stFabledIds.length) {
    lines.push('')
    lines.push(zh ? '── 传说角色 ──' : '── Fabled in Play ──')
    for (const id of stFabledIds) {
      const name    = getDisplayName(id, language)
      const ability = getAbilityTextForScript(id, language, pinnedRevisions)
      lines.push(`  ${name}: ${ability}`)
    }
  }
  if (stCustomRules?.trim()) {
    lines.push('')
    lines.push((zh ? '── 自定义规则 ──\n  ' : '── Custom Rules ──\n  ') + stCustomRules.trim())
  }

  // ── All days history ──────────────────────────────────────────────────────
  for (const day of days) {
    const isCurrent = day.day === currentDay.day
    lines.push('')
    lines.push(isCurrent
      ? (zh ? `── 第 ${day.day} 天（当前）──` : `── Day ${day.day} (current) ──`)
      : (zh ? `── 第 ${day.day} 天 ──` : `── Day ${day.day} ──`))

    // Alive list
    const alive = day.seats.filter((s) => s.alive !== false).map((s) => s.name || `#${s.seat}`)
    const dead  = day.seats.filter((s) => s.alive === false).map((s) => s.name || `#${s.seat}`)
    lines.push(`  ${zh ? '存活' : 'Alive'}: ${alive.join(', ') || t('none')}`)
    if (dead.length) lines.push(`  ${zh ? '死亡' : 'Dead'}: ${dead.join(', ')}`)

    // Votes
    if (day.voteHistory.length) {
      lines.push(`  ${zh ? '提名/投票' : 'Nominations/Votes'}:`)
      for (const v of day.voteHistory) {
        const nom = day.seats.find((s) => s.seat === v.actor)?.name || `#${v.actor}`
        const tgt = day.seats.find((s) => s.seat === v.target)?.name || `#${v.target}`
        const res = v.passed ? (zh ? '通过' : 'PASSED') : (zh ? '失败' : 'failed')
        const exile = v.isExile ? (zh ? ' [放逐]' : ' [exile]') : ''
        const note = v.note ? ` (${v.note})` : ''
        lines.push(`    ${nom} → ${tgt}: ${v.voteCount}/${v.requiredVotes} ${res}${exile}${note}`)
      }
    }

    // Abilities used
    if (day.skillHistory.length) {
      lines.push(`  ${zh ? '能力使用' : 'Abilities used'}:`)
      for (const sk of day.skillHistory) {
        const actor  = sk.actor !== null ? (day.seats.find((s) => s.seat === sk.actor)?.name || `#${sk.actor}`) : '?'
        const role   = getDisplayName(sk.roleId, language)
        const targets = sk.targets.length
          ? sk.targets.map((t) => day.seats.find((s) => s.seat === t)?.name || `#${t}`).join(', ')
          : ''
        const result  = sk.result ? ` [${sk.result}]` : ''
        const stmt    = sk.statement ? ` "${stripIconTokens(sk.statement)}"` : ''
        const note    = sk.note ? ` (${sk.note})` : ''
        const vis     = sk.visibility === 'st-only' ? (zh ? ' [仅ST]' : ' [ST-only]') : ''
        lines.push(`    ${role}(${actor})${targets ? ` → ${targets}` : ''}${result}${stmt}${note}${vis}`)
      }
    }

    // Event log (meaningful entries only)
    const events = day.eventLog.filter((e) =>
      e.kind !== 'phaseTransition' || /execut|死|win|胜|exile|放逐/i.test(e.detail)
    )
    if (events.length) {
      lines.push(`  ${zh ? '事件' : 'Events'}:`)
      for (const ev of events) {
        const vis = ev.visibility === 'st-only' ? (zh ? '[仅ST] ' : '[ST] ') : ''
        lines.push(`    [${ev.phase}] ${vis}${stripIconTokens(ev.detail)}`)
      }
    }
  }

  return lines.join('\n')
}

export function buildStorytellerContext(input: StorytellerInput): AiContext {
  const { scriptName, stName, currentDay, days, language } = input
  const t  = makeT(language)
  const zh = language === 'zh'

  const alive = currentDay.seats.filter((s) => s.alive !== false)
  const dead  = currentDay.seats.filter((s) => s.alive === false)
  const aliveStr = alive.map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`).join(', ') || t('none')
  const deadStr  = dead.map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`).join(', ') || t('none')

  const fields: AiField[] = [
    { key: 'scriptName',  label: t('script'),       value: scriptName },
    { key: 'stName',      label: t('storyteller'),   value: stName || '' },
    { key: 'currentDay',  label: t('current_day'),   value: currentDay.day },
    { key: 'totalDays',   label: t('total_days'),    value: days.length },
    { key: 'phase',       label: t('phase'),          value: currentDay.phase },
    { key: 'alive',       label: t('alive_players'), value: aliveStr },
    { key: 'dead',        label: t('dead_players'),  value: deadStr },
    { key: 'playerCount', label: t('player_count'),  value: currentDay.seats.length },
  ]

  return {
    type: 'storyteller',
    title: `${scriptName} — ${t('day')} ${currentDay.day}${zh ? '天' : ''}`,
    language,
    fields,
    serialized: serializeStorytellerForPrompt(input),
  }
}

// ── buildGameLogContext ───────────────────────────────────────────────────────

function seatName(seat: number, day: import('../../components/StorytellerSub/types').DayState): string {
  const s = day.seats.find((x) => x.seat === seat)
  return s?.name ? `${s.name}(#${seat})` : `#${seat}`
}

function serializeGameLog(input: GameLogInput): string {
  const { scriptName, stName, days, language, scriptCharacters = [], pinnedRevisions } = input
  const t  = makeT(language)
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
    lines.push(aliveSeats.map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`).join(', ') || t('none'))
    lines.push(t('dead_2'))
    lines.push(deadSeats.map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`).join(', ') || t('none'))
    if (lastDay.demonBluffs?.length) {
      lines.push(t('demon_bluffs_2'))
      lines.push(lastDay.demonBluffs.map((id) => roleName(id, language)).join(', '))
    }
  }

  // ── Character abilities reference (assigned + script chars) ───────────────
  const assignedIds = [...new Set(
    days.flatMap((d) => d.seats.map((s) => s.characterId)).filter(Boolean) as string[]
  )]
  const rosterIds = [...new Set([...scriptCharacters, ...assignedIds])]
  if (rosterIds.length) {
    lines.push('')
    lines.push(zh ? '── 角色能力参考 ──' : '── Character Abilities ──')
    for (const id of rosterIds) {
      const name    = getDisplayName(id, language)
      const ability = getAbilityTextForScript(id, language, pinnedRevisions)
      lines.push(`  ${name}: ${ability}`)
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
        const result    = v.passed ? t('passed') : t('failed')
        const exile     = v.isExile ? (zh ? ' [放逐]' : ' [exile]') : ''
        lines.push(`  ${nominator} → ${target}: ${v.voteCount}/${v.requiredVotes} ${result}${exile}${v.note ? ` (${v.note})` : ''}`)
      }
    }

    if (day.skillHistory.length) {
      lines.push(t('abilities_used'))
      for (const sk of day.skillHistory) {
        const actor  = sk.actor !== null ? seatName(sk.actor, day) : '?'
        const role   = getDisplayName(sk.roleId, language)
        const target = sk.targets.length ? sk.targets.map((t) => seatName(t, day)).join(', ') : ''
        const result = sk.result ? ` [${sk.result}]` : ''
        const stmt   = sk.statement ? ` "${stripIconTokens(sk.statement)}"` : ''
        const note   = sk.note ? ` (${sk.note})` : ''
        lines.push(`  ${role}(${actor})${target ? ` → ${target}` : ''}${result}${stmt}${note}`)
      }
    }

    const meaningful = day.eventLog.filter((e) =>
      e.kind !== 'phaseTransition' || /execut|死|win|胜|exile|放逐/i.test(e.detail)
    )
    if (meaningful.length) {
      lines.push(t('events'))
      for (const ev of meaningful) {
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

function serializeAnalysis(records: import('./types').AnalysisInput['records'], language: Language): string {
  const zh = language === 'zh'
  const recs = records ?? []
  const lines: string[] = []

  lines.push(zh ? `=== 游戏数据分析 ===` : `=== Game Analytics ===`)
  lines.push((zh ? '总局数: ' : 'Total games: ') + recs.length)

  if (recs.length === 0) {
    lines.push(zh ? '暂无游戏记录。' : 'No game records yet.')
    return lines.join('\n')
  }

  // ── Win/loss summary ──────────────────────────────────────────────────────
  const withWinner = recs.filter((r) => r.winner)
  const goodWins   = withWinner.filter((r) => r.winner === 'good').length
  const evilWins   = withWinner.filter((r) => r.winner === 'evil').length
  const stWins     = withWinner.filter((r) => r.winner === 'storyteller').length
  if (withWinner.length > 0) {
    lines.push('')
    lines.push(zh ? '── 胜负统计 ──' : '── Win/Loss ──')
    lines.push((zh ? '好人获胜: ' : 'Good wins: ') + `${goodWins} (${Math.round(goodWins / withWinner.length * 100)}%)`)
    lines.push((zh ? '邪恶获胜: ' : 'Evil wins: ') + `${evilWins} (${Math.round(evilWins / withWinner.length * 100)}%)`)
    if (stWins > 0) lines.push((zh ? '说书人判定: ' : 'Storyteller wins: ') + stWins)
  }

  // ── Script breakdown ──────────────────────────────────────────────────────
  const scriptCount: Record<string, { total: number; good: number; evil: number }> = {}
  for (const r of recs) {
    const key = r.scriptTitle || (zh ? '未命名' : 'Unnamed')
    if (!scriptCount[key]) scriptCount[key] = { total: 0, good: 0, evil: 0 }
    scriptCount[key].total++
    if (r.winner === 'good') scriptCount[key].good++
    if (r.winner === 'evil') scriptCount[key].evil++
  }
  const topScripts = Object.entries(scriptCount).sort((a, b) => b[1].total - a[1].total).slice(0, 10)
  if (topScripts.length) {
    lines.push('')
    lines.push(zh ? '── 剧本使用 ──' : '── Scripts Played ──')
    for (const [name, s] of topScripts) {
      const winStr = s.total > 0 ? ` (${zh ? '好人' : 'good'}:${s.good} ${zh ? '邪恶' : 'evil'}:${s.evil})` : ''
      lines.push(`  ${name}: ${s.total}${winStr}`)
    }
  }

  // ── Character usage (from setup.assignments) ──────────────────────────────
  const charUsage: Record<string, { total: number; goodWin: number; evilWin: number; team?: string }> = {}
  for (const r of recs) {
    if (!r.setup?.assignments) continue
    for (const [, charId] of Object.entries(r.setup.assignments)) {
      if (!charId) continue
      if (!charUsage[charId]) charUsage[charId] = { total: 0, goodWin: 0, evilWin: 0 }
      charUsage[charId].total++
      if (r.winner === 'good') charUsage[charId].goodWin++
      if (r.winner === 'evil') charUsage[charId].evilWin++
    }
  }
  const topChars = Object.entries(charUsage).sort((a, b) => b[1].total - a[1].total).slice(0, 15)
  if (topChars.length) {
    lines.push('')
    lines.push(zh ? '── 角色使用频率（Top 15）──' : '── Most Played Characters (Top 15) ──')
    for (const [id, u] of topChars) {
      const name = getDisplayName(id, language)
      const winStr = u.total > 0 ? ` (${zh ? '好人胜' : 'good win'}:${u.goodWin} ${zh ? '邪恶胜' : 'evil win'}:${u.evilWin})` : ''
      lines.push(`  ${name}: ${u.total}x${winStr}`)
    }
  }

  // ── Ratings average ───────────────────────────────────────────────────────
  const withBalanced = recs.filter((r) => r.balanced != null)
  const withFunGood  = recs.filter((r) => r.funGood != null)
  const withFunEvil  = recs.filter((r) => r.funEvil != null)
  if (withBalanced.length || withFunGood.length || withFunEvil.length) {
    const avg = (arr: typeof recs, key: keyof typeof recs[0]) =>
      arr.length ? (arr.reduce((s, r) => s + ((r[key] as number) ?? 0), 0) / arr.length).toFixed(1) : 'N/A'
    lines.push('')
    lines.push(zh ? '── 平均评分（1–5）──' : '── Average Ratings (1–5) ──')
    if (withBalanced.length) lines.push((zh ? '  游戏平衡性: ' : '  Balance: ') + avg(withBalanced, 'balanced'))
    if (withFunGood.length)  lines.push((zh ? '  好人趣味性: ' : '  Fun (Good side): ') + avg(withFunGood, 'funGood'))
    if (withFunEvil.length)  lines.push((zh ? '  邪恶趣味性: ' : '  Fun (Evil side): ') + avg(withFunEvil, 'funEvil'))
  }

  // ── Player size distribution ──────────────────────────────────────────────
  const playerCounts: Record<number, number> = {}
  for (const r of recs) {
    const n = r.setup?.playerCount
    if (n) playerCounts[n] = (playerCounts[n] ?? 0) + 1
  }
  const pcEntries = Object.entries(playerCounts).sort((a, b) => Number(b[1]) - Number(a[1]))
  if (pcEntries.length) {
    lines.push('')
    lines.push(zh ? '── 玩家人数分布 ──' : '── Player Count Distribution ──')
    lines.push('  ' + pcEntries.map(([n, c]) => `${n}p: ${c}x`).join(', '))
  }

  // ── Recent 8 games ────────────────────────────────────────────────────────
  const recent = [...recs].sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0)).slice(0, 8)
  lines.push('')
  lines.push(zh ? `── 最近 ${recent.length} 局 ──` : `── Recent ${recent.length} Games ──`)
  for (const r of recent) {
    const date   = r.endedAt ? new Date(r.endedAt).toLocaleDateString() : '?'
    const script = r.scriptTitle || (zh ? '未命名' : 'Unnamed')
    const result = r.winner
      ? (r.winner === 'good' ? (zh ? '好人胜' : 'Good win') : r.winner === 'evil' ? (zh ? '邪恶胜' : 'Evil win') : (zh ? '说书人判定' : 'ST win'))
      : (zh ? '结果未记录' : 'no result')
    const players = r.setup?.playerCount ? `${r.setup.playerCount}p` : ''
    const name = r.recordName ? ` "${r.recordName}"` : ''
    lines.push(`  ${date} ${script}${name} ${players} — ${result}`)
  }

  return lines.join('\n')
}

export function buildAnalysisContext(input: AnalysisInput): AiContext {
  const { language, records = [] } = input
  const t = makeT(language)
  const withWinner = records.filter((r) => r.winner)
  const goodWins   = withWinner.filter((r) => r.winner === 'good').length
  const evilWins   = withWinner.filter((r) => r.winner === 'evil').length

  const scriptCounts: Record<string, number> = {}
  for (const r of records) {
    const k = r.scriptTitle || ''
    if (k) scriptCounts[k] = (scriptCounts[k] ?? 0) + 1
  }
  const topScripts = Object.entries(scriptCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k)

  const fields: AiField[] = [
    { key: 'recordCount',   label: t('game_records'),    value: records.length },
    { key: 'goodWins',      label: t('good_wins'),       value: goodWins },
    { key: 'evilWins',      label: t('evil_wins'),       value: evilWins },
    { key: 'recentScripts', label: t('recent_scripts'),  value: topScripts.join(', ') },
  ]
  const serialized = serializeAnalysis(records, language)
  return {
    type: 'analysis',
    title: t('game_analytics'),
    language,
    fields,
    serialized,
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
