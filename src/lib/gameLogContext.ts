/**
 * gameLogContext.ts
 *
 * Serializes game state (DayState[], seats, script) into structured text
 * for injection into AI system prompts for 复盘 (debrief) and analysis.
 */

import type { DayState } from '../components/StorytellerSub/types'
import { getDisplayName } from '../catalog'
import type { Language } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type GameSummaryInput = {
  scriptName:  string
  stName?:     string
  days:        DayState[]
  language?:   Language
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function seatName(seat: number, day: DayState): string {
  const s = day.seats.find((x) => x.seat === seat)
  return s?.name ? `${s.name}(#${seat})` : `#${seat}`
}

function roleName(roleId: string | undefined, lang: Language): string {
  if (!roleId) return '?'
  const n = getDisplayName(roleId, lang)
  return n !== roleId ? n : roleId
}

function stripIconTokens(s: string): string {
  return s.replace(/\[icon:[^\]]+\]/g, '').replace(/\s+/g, ' ').trim()
}

// ── Serializer ────────────────────────────────────────────────────────────────

/**
 * Serialize full game to a compact plain-text log for AI context.
 * Aims for ~800-1200 words (fits in system prompt).
 */
export function serializeGameLog(input: GameSummaryInput): string {
  const { scriptName, stName, days, language = 'en' } = input
  const zh = language === 'zh'
  const lines: string[] = []

  // Header
  lines.push(zh ? `=== 游戏记录: ${scriptName} ===` : `=== Game Log: ${scriptName} ===`)
  if (stName) lines.push((zh ? '说书人: ' : 'Storyteller: ') + stName)
  lines.push((zh ? '天数: ' : 'Days played: ') + days.length)

  // Last day for final player state
  const lastDay = days[days.length - 1]
  if (lastDay) {
    const aliveSeats = lastDay.seats.filter((s) => s.alive !== false)
    const deadSeats  = lastDay.seats.filter((s) => s.alive === false)

    lines.push('')
    lines.push(zh ? '== 最终存活 ==' : '== Final Alive ==')
    lines.push(
      aliveSeats
        .map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`)
        .join(', ') || (zh ? '无' : 'none'),
    )
    lines.push(zh ? '== 已死亡 ==' : '== Dead ==')
    lines.push(
      deadSeats
        .map((s) => `${s.name || `#${s.seat}`} (${roleName(s.characterId ?? undefined, language)})`)
        .join(', ') || (zh ? '无' : 'none'),
    )

    if (lastDay.demonBluffs?.length) {
      lines.push(zh ? '恶魔虚张: ' : 'Demon bluffs: ')
      lines.push(lastDay.demonBluffs.map((id) => roleName(id, language)).join(', '))
    }
  }

  // Per-day chronicle
  for (const day of days) {
    lines.push('')
    lines.push(zh ? `── 第 ${day.day} 天 ──` : `── Day ${day.day} ──`)

    // Seat status at start of this day
    const alive = day.seats.filter((s) => s.alive !== false).map((s) => s.name || `#${s.seat}`)
    lines.push((zh ? '存活: ' : 'Alive: ') + alive.join(', '))

    // Votes
    if (day.voteHistory.length) {
      lines.push(zh ? '投票:' : 'Votes:')
      for (const v of day.voteHistory) {
        const nominator = seatName(v.actor, day)
        const target    = seatName(v.target, day)
        const result    = v.passed ? (zh ? '通过' : 'PASSED') : (zh ? '失败' : 'failed')
        lines.push(`  ${nominator} → ${target}: ${v.voteCount}/${v.requiredVotes} ${result}${v.note ? ` (${v.note})` : ''}`)
      }
    }

    // Skills (ST-only and public)
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

    // Key events (filter noise, keep meaningful ones)
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

/**
 * Build AgentContext-like object for the log modal.
 */
export function buildGameLogContext(input: GameSummaryInput) {
  const text  = serializeGameLog(input)
  const zh    = input.language === 'zh'
  const total = input.days.reduce((s, d) => s + d.voteHistory.length, 0)

  return {
    form:     'game-log' as const,
    title:    input.scriptName,
    language: input.language ?? 'en',
    fields:   [
      { key: 'scriptName',  label: zh ? '剧本' : 'Script',       value: input.scriptName },
      { key: 'dayCount',    label: zh ? '天数' : 'Days',          value: input.days.length },
      { key: 'voteCount',   label: zh ? '投票数' : 'Votes',       value: total },
      { key: 'gameLogText', label: zh ? '完整日志' : 'Full log',  value: text },
    ],
    // Full serialized log for prompt injection
    serialized: text,
  }
}

export type GameLogContext = ReturnType<typeof buildGameLogContext>
