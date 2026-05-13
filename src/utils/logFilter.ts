import type { AggregatedLogEntry, LogFilterState, DayState } from '../components/StorytellerSub/types'
import type { Language } from '../types'
import { logDetail } from './logI18n'
import { getDisplayName } from '../catalog'

const PHASE_ORDER: Record<string, number> = { night: 0, private: 1, public: 2, nomination: 3 }

/**
 * Build the flat list of all aggregated log entries from all days.
 * Pure function — no filtering or sorting applied.
 * Pass `language` to get translated detail strings for vote / skill entries.
 */
export function buildAggregatedEntries(days: DayState[], language: Language = 'zh'): AggregatedLogEntry[] {
  const entries: AggregatedLogEntry[] = []

  for (const day of days) {
    // Vote records
    for (const v of day.voteHistory) {
      const voterList = v.voters.length > 0 ? ` [${v.voters.map((n: number) => `#${n}`).join(', ')}]` : ''
      entries.push({
        id: `v-${day.day}-${v.id}`,
        day: day.day,
        phase: 'nomination',
        timestamp: Number(v.id),
        type: 'vote',
        visibility: 'public',
        detail: `${logDetail.voteResult(language, v.actor, v.target, v.passed, v.voteCount, v.requiredVotes)}${voterList}${v.note ? ` · ${v.note}` : ''}`,
      })
    }

    // Skill records
    for (const s of day.skillHistory) {
      const tNotes = Object.entries(s.targetNotes || {})
        .filter(([, v]) => v)
        .map(([k, v]) => `#${k}:"${v}"`)
        .join(' ')
      const roleName = s.roleId ? getDisplayName(s.roleId, language) : '?'
      const resultLabel = logDetail.skillResultLabel(language, s.result ?? null)
      const targetStr = s.targets?.length
        ? s.targets.length === 1 ? ` → #${s.targets[0]}` : ` → [${s.targets.map((t: number) => `#${t}`).join(', ')}]`
        : ''
      const detail = `#${s.actor} ${roleName}${targetStr}${s.statement ? ` · ${s.statement}` : ''}${resultLabel ? ` ${resultLabel}` : ''}${tNotes ? ` | ${tNotes}` : ''}${s.note ? ` · ${s.note}` : ''}`
      entries.push({
        id: `s-${day.day}-${s.id}`,
        day: day.day,
        phase: s.activatedDuringPhase,
        timestamp: Number(s.id),
        type: 'skill',
        visibility: s.visibility ?? 'st-only',
        detail,
      })
    }

    // Event log entries (excluding vote/skill kinds already captured above)
    for (const e of day.eventLog) {
      if (e.kind === 'vote' || e.kind === 'skill') continue
      const vis: 'public' | 'st-only' =
        e.kind === 'stateChange' || e.kind === 'phaseTransition' ? 'public' : 'st-only'
      entries.push({
        id: `e-${day.day}-${e.id}`,
        day: day.day,
        phase: e.phase,
        timestamp: e.timestamp,
        type: 'event',
        visibility: vis,
        detail: e.detail,
      })
    }
  }

  return entries
}

/**
 * Apply filter + sort to a flat entry list.
 * Returns a new sorted, filtered array — does not mutate input.
 */
export function filterAndSortLog(
  entries: AggregatedLogEntry[],
  filter: LogFilterState,
): AggregatedLogEntry[] {
  let result = entries.filter((e) => filter.types.has(e.type))
  if (filter.dayFilter !== 'all') result = result.filter((e) => e.day === filter.dayFilter)
  if (filter.visibility !== 'all') result = result.filter((e) => e.visibility === filter.visibility)

  result.sort((a, b) => {
    if (a.day !== b.day) return filter.sortAsc ? a.day - b.day : b.day - a.day
    const phaseA = PHASE_ORDER[a.phase] ?? 99
    const phaseB = PHASE_ORDER[b.phase] ?? 99
    if (phaseA !== phaseB) return filter.sortAsc ? phaseA - phaseB : phaseB - phaseA
    return filter.sortAsc ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
  })

  return result
}
