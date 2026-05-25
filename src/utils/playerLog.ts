import type { DayState } from '../components/StorytellerSub/types'
import type { Language } from '../types'
import { getDisplayName } from '../catalog'
import { logDetail } from './logI18n'
import { makeT } from '../lib/t'

export type PlayerLogEntry = {
  id: string
  timestamp: number
  text: string
  kind: string
  phase: string
  visibility: 'public' | 'st-only'
}

export type PlayerLogDay = {
  day: number
  entries: PlayerLogEntry[]
}

/** Returns true if detail string references the given seat number. */
export function eventMentionsSeat(detail: string, seatNum: number): boolean {
  return new RegExp(`#${seatNum}(?:\\D|$)`).test(detail)
}

/**
 * Build per-day log entries for a single player seat.
 *
 * Visibility rules (consistent across all log views):
 * - votes          → always 'public'
 * - skills         → s.visibility ?? 'st-only'
 * - stateChange    → 'public'
 * - phaseTransition → 'public'
 * - tagChange      → 'st-only'
 * - other events   → e.visibility ?? 'st-only'
 *
 * @param days      All game days
 * @param seatNum   The seat number to filter entries for
 * @returns         Days with entries, sorted newest-day-first; empty days excluded
 */
export function buildPlayerLogEntries(days: DayState[], seatNum: number, language: Language = 'zh'): PlayerLogDay[] {
  const t = makeT(language)
  const sortedDays = [...days].sort((a, b) => b.day - a.day)

  return sortedDays.map((day) => {
    const entries: PlayerLogEntry[] = []

    // eventLog — skip duplicate vote/skill kinds (already in dedicated histories)
    for (const e of day.eventLog) {
      if (e.kind === 'vote' || e.kind === 'skill') continue
      if (!eventMentionsSeat(e.detail, seatNum)) continue

      const visibility: 'public' | 'st-only' =
        e.visibility ??
        (e.kind === 'stateChange' || e.kind === 'phaseTransition' ? 'public' : 'st-only')

      entries.push({
        id: `e-${day.day}-${e.id}`,
        timestamp: e.timestamp,
        text: e.detail,
        kind: e.kind,
        phase: e.phase,
        visibility,
      })
    }

    // voteHistory — always public
    for (const v of day.voteHistory) {
      if (v.actor !== seatNum && v.target !== seatNum) continue

      const voterList =
        v.voters.length > 0 ? ` [${v.voters.map((n) => `#${n}`).join(', ')}]` : ''
      const exileTag = v.isExile ? (t('exile_2')) : ''
      const base = `${logDetail.voteResult(language, v.actor, v.target, v.passed, v.voteCount, v.requiredVotes)}${exileTag}${voterList}`
      const text = v.note ? `${base} · ${v.note}` : base

      entries.push({
        id: `v-${day.day}-${v.id}`,
        timestamp: parseInt(v.id, 10) || 0,
        text,
        kind: 'vote',
        phase: 'nomination',
        visibility: 'public',
      })
    }

    // skillHistory — visibility from record, default st-only
    for (const s of day.skillHistory) {
      if (s.actor !== seatNum && !(s.targets ?? []).includes(seatNum)) continue

      const targets: number[] = s.targets ?? []
      const targetStr = targets.length === 1
        ? ` → #${targets[0]}`
        : targets.length > 1 ? ` → [${targets.map((t) => `#${t}`).join(', ')}]`
        : ''
      const roleName = s.roleId ? getDisplayName(s.roleId, language) : '?'
      const resultLabel = logDetail.skillResultLabel(language, s.result ?? null)
      const tNotes = Object.entries(s.targetNotes ?? {})
        .filter(([, v]) => v)
        .map(([k, v]) => `#${k}:"${v}"`)
        .join(' ')
      const text = [
        `#${s.actor} ${roleName}${targetStr}`,
        s.statement ? `· ${s.statement}` : '',
        resultLabel || '',
        tNotes ? `| ${tNotes}` : '',
        s.note ? `· ${s.note}` : '',
      ]
        .filter(Boolean)
        .join(' ')

      entries.push({
        id: `s-${day.day}-${s.id}`,
        timestamp: parseInt(s.id, 10) || 0,
        text,
        kind: 'skill',
        phase: s.activatedDuringPhase,
        visibility: s.visibility ?? 'st-only',
      })
    }

    entries.sort((a, b) => b.timestamp - a.timestamp)
    return { day: day.day, entries }
  }).filter((d) => d.entries.length > 0)
}

/**
 * Filter player log entries based on CURRENT game phase — mirrors Game Log:
 * - isNight = true  → show all entries (public + st-only visible to ST)
 * - isNight = false → show public entries only (private/public/nomination phases)
 *
 * Preserves day structure; removes days that become empty after filtering.
 */
export function filterPlayerLogByCurrentPhase(days: PlayerLogDay[], isNight: boolean): PlayerLogDay[] {
  if (isNight) return days
  return days
    .map(({ day, entries }) => ({
      day,
      entries: entries.filter((e) => e.visibility === 'public'),
    }))
    .filter((d) => d.entries.length > 0)
}
