/**
 * Context builders — produce AiContext objects for each tab/form type.
 * No React imports here.
 */

import { getDisplayName, getAbilityText } from '../../catalog'
import type { Language } from '../../types'
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

export function buildCharacterContext(input: CharacterInput, language: Language): AiContext {
  const zh = language === 'zh'
  const fields: AiField[] = [
    { key: 'nameEn', label: zh ? '英文名' : 'Name (EN)', value: input.nameEn, editable: true },
    { key: 'nameZh', label: zh ? '中文名' : 'Name (ZH)', value: input.nameZh ?? '', editable: true },
    { key: 'abilityEn', label: zh ? '能力（英文）' : 'Ability (EN)', value: input.abilityEn, editable: true },
    { key: 'abilityZh', label: zh ? '能力（中文）' : 'Ability (ZH)', value: input.abilityZh ?? '', editable: true },
    { key: 'team', label: zh ? '阵营' : 'Team', value: input.team, editable: true },
    { key: 'edition', label: zh ? '版本' : 'Edition', value: input.edition, editable: true },
    { key: 'author', label: zh ? '作者' : 'Author', value: input.author, editable: true },
    { key: 'firstNightReminder', label: zh ? '第一夜提示' : 'First Night Reminder', value: input.firstNightReminder ?? '', editable: true },
    { key: 'otherNightReminder', label: zh ? '其余夜晚提示' : 'Other Night Reminder', value: input.otherNightReminder ?? '', editable: true },
    { key: 'firstNight', label: zh ? '第一夜顺序' : 'First Night Order', value: input.firstNight, editable: true },
    { key: 'otherNight', label: zh ? '其余夜晚顺序' : 'Other Night Order', value: input.otherNight, editable: true },
  ]
  if (input.isNew) {
    fields.unshift({ key: 'id', label: 'ID', value: input.id ?? '', editable: true })
  }
  const ctx: AiContext = {
    type: 'character',
    title: input.nameEn || (zh ? '新角色' : 'New Character'),
    language,
    fields,
  }
  ctx.serialized = serializeContext(ctx)
  return ctx
}

// ── buildScriptContext ────────────────────────────────────────────────────────

export function buildScriptContext(input: ScriptInput): AiContext {
  const { script, language } = input
  const zh = language === 'zh'
  const title = zh ? script.titleZh || script.title : script.title
  const charCount = script.characters.length

  // Gather character names for the script
  const charNames = script.characters
    .slice(0, 30)
    .map((id) => getDisplayName(id, language))
    .join(', ')

  const abilitySnippets = script.characters
    .slice(0, 10)
    .map((id) => `${getDisplayName(id, language)}: ${getAbilityText(id, language)}`)
    .join('\n')

  const fields: AiField[] = [
    { key: 'title', label: zh ? '剧本名' : 'Script Title', value: title },
    { key: 'author', label: zh ? '作者' : 'Author', value: script.author || '' },
    { key: 'edition', label: zh ? '版本' : 'Edition', value: script.edition || '' },
    { key: 'characterCount', label: zh ? '角色数量' : 'Character Count', value: charCount },
    { key: 'characters', label: zh ? '角色列表' : 'Characters', value: charNames },
    { key: 'abilitySnippets', label: zh ? '能力示例' : 'Ability Snippets', value: abilitySnippets },
  ]
  if (script.notes?.trim()) {
    fields.push({ key: 'notes', label: zh ? '备注' : 'Notes', value: script.notes })
  }
  const ctx: AiContext = {
    type: 'script',
    title,
    language,
    fields,
  }
  ctx.serialized = serializeContext(ctx)
  return ctx
}

// ── buildStorytellerContext ───────────────────────────────────────────────────

export function buildStorytellerContext(input: StorytellerInput): AiContext {
  const { scriptName, stName, currentDay, days, language } = input
  const zh = language === 'zh'

  const alive = currentDay.seats.filter((s) => s.alive !== false)
  const dead  = currentDay.seats.filter((s) => s.alive === false)

  const aliveStr = alive
    .map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`)
    .join(', ') || (zh ? '无' : 'none')
  const deadStr = dead
    .map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`)
    .join(', ') || (zh ? '无' : 'none')

  const recentVotes = currentDay.voteHistory
    .slice(-5)
    .map((v) => {
      const nom = currentDay.seats.find((s) => s.seat === v.actor)?.name || `#${v.actor}`
      const tgt = currentDay.seats.find((s) => s.seat === v.target)?.name || `#${v.target}`
      return `${nom}→${tgt} ${v.voteCount}/${v.requiredVotes} ${v.passed ? (zh ? '通过' : 'PASSED') : (zh ? '失败' : 'failed')}`
    })
    .join('; ')

  const fields: AiField[] = [
    { key: 'scriptName', label: zh ? '剧本' : 'Script', value: scriptName },
    { key: 'stName', label: zh ? '说书人' : 'Storyteller', value: stName || '' },
    { key: 'currentDay', label: zh ? '当前天数' : 'Current Day', value: currentDay.day },
    { key: 'totalDays', label: zh ? '总天数' : 'Total Days', value: days.length },
    { key: 'phase', label: zh ? '阶段' : 'Phase', value: currentDay.phase },
    { key: 'alive', label: zh ? '存活玩家' : 'Alive Players', value: aliveStr },
    { key: 'dead', label: zh ? '死亡玩家' : 'Dead Players', value: deadStr },
    { key: 'recentVotes', label: zh ? '最近投票' : 'Recent Votes', value: recentVotes || (zh ? '无' : 'none') },
  ]

  const ctx: AiContext = {
    type: 'storyteller',
    title: `${scriptName} — ${zh ? '第' : 'Day'} ${currentDay.day} ${zh ? '天' : ''}`,
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
  const zh = language === 'zh'
  const lines: string[] = []

  lines.push(zh ? `=== 游戏记录: ${scriptName} ===` : `=== Game Log: ${scriptName} ===`)
  if (stName) lines.push((zh ? '说书人: ' : 'Storyteller: ') + stName)
  lines.push((zh ? '天数: ' : 'Days played: ') + days.length)

  const lastDay = days[days.length - 1]
  if (lastDay) {
    const aliveSeats = lastDay.seats.filter((s) => s.alive !== false)
    const deadSeats  = lastDay.seats.filter((s) => s.alive === false)
    lines.push('')
    lines.push(zh ? '== 最终存活 ==' : '== Final Alive ==')
    lines.push(
      aliveSeats.map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`).join(', ') || (zh ? '无' : 'none'),
    )
    lines.push(zh ? '== 已死亡 ==' : '== Dead ==')
    lines.push(
      deadSeats.map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`).join(', ') || (zh ? '无' : 'none'),
    )
    if (lastDay.demonBluffs?.length) {
      lines.push(zh ? '恶魔虚张: ' : 'Demon bluffs: ')
      lines.push(lastDay.demonBluffs.map((id) => roleName(id, language)).join(', '))
    }
  }

  for (const day of days) {
    lines.push('')
    lines.push(zh ? `── 第 ${day.day} 天 ──` : `── Day ${day.day} ──`)
    const alive = day.seats.filter((s) => s.alive !== false).map((s) => s.name || `#${s.seat}`)
    lines.push((zh ? '存活: ' : 'Alive: ') + alive.join(', '))

    if (day.voteHistory.length) {
      lines.push(zh ? '投票:' : 'Votes:')
      for (const v of day.voteHistory) {
        const nominator = seatName(v.actor, day)
        const target    = seatName(v.target, day)
        const result    = v.passed ? (zh ? '通过' : 'PASSED') : (zh ? '失败' : 'failed')
        lines.push(`  ${nominator} → ${target}: ${v.voteCount}/${v.requiredVotes} ${result}${v.note ? ` (${v.note})` : ''}`)
      }
    }

    if (day.skillHistory.length) {
      lines.push(zh ? '能力使用:' : 'Skills used:')
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
      lines.push(zh ? '事件:' : 'Events:')
      for (const ev of meaningful.slice(0, 8)) {
        lines.push(`  [${ev.phase}] ${stripIconTokens(ev.detail)}`)
      }
    }
  }

  return lines.join('\n')
}

export function buildGameLogContext(input: GameLogInput): AiContext {
  const text = serializeGameLog(input)
  const zh   = input.language === 'zh'
  const total = input.days.reduce((s, d) => s + d.voteHistory.length, 0)

  const fields: AiField[] = [
    { key: 'scriptName', label: zh ? '剧本' : 'Script', value: input.scriptName },
    { key: 'dayCount', label: zh ? '天数' : 'Days', value: input.days.length },
    { key: 'voteCount', label: zh ? '投票数' : 'Votes', value: total },
    { key: 'gameLogText', label: zh ? '完整日志' : 'Full log', value: text },
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
  const zh = language === 'zh'
  const fields: AiField[] = [
    { key: 'recordCount', label: zh ? '游戏记录数' : 'Game Records', value: recordCount ?? 0 },
    { key: 'recentScripts', label: zh ? '近期剧本' : 'Recent Scripts', value: recentScripts?.join(', ') ?? '' },
  ]
  return {
    type: 'analysis',
    title: zh ? '游戏统计' : 'Game Analytics',
    language,
    fields,
    serialized: serializeContext({ type: 'analysis', title: zh ? '游戏统计' : 'Game Analytics', language, fields }),
  }
}

// ── buildGeneralContext ───────────────────────────────────────────────────────

export function buildGeneralContext(language: Language): AiContext {
  return {
    type: 'general',
    title: language === 'zh' ? '通用助手' : 'General',
    language,
    fields: [],
    serialized: '',
  }
}
