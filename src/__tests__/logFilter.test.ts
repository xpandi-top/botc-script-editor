import { describe, it, expect } from 'vitest'
import { buildAggregatedEntries, filterAndSortLog } from '../utils/logFilter'
import type { DayState, AggregatedLogEntry, LogFilterState } from '../components/StorytellerSub/types'

// ── Factories ─────────────────────────────────────────────────────────────────

function makeDay(day: number, overrides: Partial<DayState> = {}): DayState {
  return {
    id: `day-${day}`,
    day,
    phase: 'nomination',
    publicMode: 'free',
    nominationStep: 'waitingForNomination',
    privateSeconds: 0,
    publicFreeSeconds: 0,
    publicRoundRobinSeconds: 0,
    publicElapsedSeconds: 0,
    nominationWaitSeconds: 0,
    nominationActorSeconds: 0,
    nominationTargetSeconds: 0,
    currentSpeakerSeat: null,
    roundRobinSpokenSeats: [],
    seats: [],
    voteDraft: { actor: null, target: null, voters: [], noVoters: [], note: '', manualPassed: null, nominationResult: 'succeed', isExile: false, voteCountOverride: null },
    votingState: null,
    voteHistory: [],
    skillHistory: [],
    eventLog: [],
    nightVisitedSeats: [],
    gameEnded: false,
    demonBluffs: [],
    ...overrides,
  }
}

function makeVote(id: string, actor: number, target: number, passed: boolean, day = 1) {
  return { id, actor, target, voters: [actor], voteCount: 1, requiredVotes: 1, passed, note: '', overridden: false }
}

function makeSkill(id: string, actor: number, visibility: 'public' | 'st-only' = 'st-only') {
  return { id, actor, roleId: 'imp', targets: [], targetNotes: {}, statement: '', note: '', result: null as null, activatedDuringPhase: 'night', visibility }
}

function makeEvent(id: string, kind: 'stateChange' | 'tagChange' | 'phaseTransition', phase = 'night') {
  return { id, timestamp: Number(id), phase, kind, detail: `event-${id}` }
}

function makeFilter(overrides: Partial<LogFilterState> = {}): LogFilterState {
  return {
    types: new Set(['vote', 'skill', 'event']),
    dayFilter: 'all',
    sortAsc: false,
    visibility: 'all',
    ...overrides,
  }
}

// ── buildAggregatedEntries ────────────────────────────────────────────────────

describe('buildAggregatedEntries', () => {
  it('returns empty array for empty days', () => {
    expect(buildAggregatedEntries([])).toHaveLength(0)
  })

  it('returns empty array for day with no history', () => {
    expect(buildAggregatedEntries([makeDay(1)])).toHaveLength(0)
  })

  it('includes vote records with type=vote and visibility=public', () => {
    const day = makeDay(1, { voteHistory: [makeVote('1000', 1, 2, true)] })
    const entries = buildAggregatedEntries([day])
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ type: 'vote', visibility: 'public', day: 1 })
  })

  it('vote detail contains actor, target, PASS/FAIL, voteCount/required', () => {
    const day = makeDay(1, { voteHistory: [makeVote('1001', 3, 5, false)] })
    const [entry] = buildAggregatedEntries([day])
    expect(entry.detail).toContain('#3 → #5')
    expect(entry.detail).toContain('FAIL')
  })

  it('vote detail lists voters in brackets', () => {
    const vote = { ...makeVote('2000', 1, 2, true), voters: [1, 3, 5] }
    const day = makeDay(1, { voteHistory: [vote] })
    const [entry] = buildAggregatedEntries([day])
    expect(entry.detail).toContain('[#1, #3, #5]')
  })

  it('vote with no voters has no bracket section', () => {
    const vote = { ...makeVote('3000', 1, 2, true), voters: [] }
    const day = makeDay(1, { voteHistory: [vote] })
    const [entry] = buildAggregatedEntries([day])
    expect(entry.detail).not.toContain('[')
  })

  it('includes skill records with type=skill', () => {
    const day = makeDay(1, { skillHistory: [makeSkill('4000', 2, 'st-only')] })
    const [entry] = buildAggregatedEntries([day])
    expect(entry).toMatchObject({ type: 'skill', visibility: 'st-only', day: 1 })
  })

  it('skill visibility public when set explicitly', () => {
    const day = makeDay(1, { skillHistory: [makeSkill('5000', 2, 'public')] })
    const [entry] = buildAggregatedEntries([day])
    expect(entry.visibility).toBe('public')
  })

  it('stateChange event → type=event visibility=public', () => {
    const day = makeDay(1, { eventLog: [makeEvent('6000', 'stateChange')] })
    const [entry] = buildAggregatedEntries([day])
    expect(entry).toMatchObject({ type: 'event', visibility: 'public' })
  })

  it('tagChange event → type=event visibility=st-only', () => {
    const day = makeDay(1, { eventLog: [makeEvent('7000', 'tagChange')] })
    const [entry] = buildAggregatedEntries([day])
    expect(entry).toMatchObject({ type: 'event', visibility: 'st-only' })
  })

  it('phaseTransition event → visibility=public', () => {
    const day = makeDay(1, { eventLog: [makeEvent('8000', 'phaseTransition')] })
    const [entry] = buildAggregatedEntries([day])
    expect(entry.visibility).toBe('public')
  })

  it('eventLog entries with kind=vote or skill are skipped (already in voteHistory/skillHistory)', () => {
    const day = makeDay(1, {
      eventLog: [
        { id: '9000', timestamp: 9000, phase: 'nomination', kind: 'vote', detail: 'dup-vote' },
        { id: '9001', timestamp: 9001, phase: 'night', kind: 'skill', detail: 'dup-skill' },
      ],
    })
    expect(buildAggregatedEntries([day])).toHaveLength(0)
  })

  it('aggregates across multiple days', () => {
    const days = [
      makeDay(1, { voteHistory: [makeVote('10', 1, 2, true)] }),
      makeDay(2, { voteHistory: [makeVote('20', 3, 4, false)] }),
    ]
    const entries = buildAggregatedEntries(days)
    expect(entries).toHaveLength(2)
    expect(entries.map((e) => e.day)).toEqual(expect.arrayContaining([1, 2]))
  })
})

// ── filterAndSortLog ──────────────────────────────────────────────────────────

describe('filterAndSortLog', () => {
  const vote: AggregatedLogEntry  = { id: 'v1', day: 1, phase: 'nomination', timestamp: 100, type: 'vote',  visibility: 'public',  detail: 'vote'  }
  const skill: AggregatedLogEntry = { id: 's1', day: 1, phase: 'night',      timestamp: 200, type: 'skill', visibility: 'st-only', detail: 'skill' }
  const event: AggregatedLogEntry = { id: 'e1', day: 2, phase: 'public',     timestamp: 300, type: 'event', visibility: 'public',  detail: 'event' }
  const all = [vote, skill, event]

  it('returns all entries when filter is permissive', () => {
    expect(filterAndSortLog(all, makeFilter())).toHaveLength(3)
  })

  it('filters by type: vote only', () => {
    const result = filterAndSortLog(all, makeFilter({ types: new Set(['vote']) }))
    expect(result.every((e) => e.type === 'vote')).toBe(true)
    expect(result).toHaveLength(1)
  })

  it('filters by type: skill only', () => {
    const result = filterAndSortLog(all, makeFilter({ types: new Set(['skill']) }))
    expect(result.every((e) => e.type === 'skill')).toBe(true)
  })

  it('filters by type: empty set → no results', () => {
    expect(filterAndSortLog(all, makeFilter({ types: new Set([]) }))).toHaveLength(0)
  })

  it('filters by day', () => {
    const result = filterAndSortLog(all, makeFilter({ dayFilter: 1 }))
    expect(result.every((e) => e.day === 1)).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('dayFilter=all includes all days', () => {
    expect(filterAndSortLog(all, makeFilter({ dayFilter: 'all' }))).toHaveLength(3)
  })

  it('filters by visibility: public only', () => {
    const result = filterAndSortLog(all, makeFilter({ visibility: 'public' }))
    expect(result.every((e) => e.visibility === 'public')).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('filters by visibility: st-only', () => {
    const result = filterAndSortLog(all, makeFilter({ visibility: 'st-only' }))
    expect(result.every((e) => e.visibility === 'st-only')).toBe(true)
    expect(result).toHaveLength(1)
  })

  it('does not mutate input array', () => {
    const input = [...all]
    filterAndSortLog(input, makeFilter({ sortAsc: true }))
    expect(input).toHaveLength(3)
  })
})

// ── Sort behaviour ────────────────────────────────────────────────────────────

describe('filterAndSortLog — sort order', () => {
  // Two entries same day, different phases
  const night: AggregatedLogEntry  = { id: 'n', day: 1, phase: 'night',      timestamp: 10, type: 'event', visibility: 'public', detail: '' }
  const nomination: AggregatedLogEntry = { id: 'm', day: 1, phase: 'nomination', timestamp: 20, type: 'event', visibility: 'public', detail: '' }
  const day2: AggregatedLogEntry   = { id: 'd', day: 2, phase: 'night',      timestamp: 5,  type: 'event', visibility: 'public', detail: '' }

  it('sortAsc=false: higher day first', () => {
    const result = filterAndSortLog([night, day2], makeFilter())
    expect(result[0].day).toBe(2)
    expect(result[1].day).toBe(1)
  })

  it('sortAsc=true: lower day first', () => {
    const result = filterAndSortLog([night, day2], makeFilter({ sortAsc: true }))
    expect(result[0].day).toBe(1)
    expect(result[1].day).toBe(2)
  })

  it('same day: nomination phase comes after night (desc)', () => {
    const result = filterAndSortLog([night, nomination], makeFilter())
    expect(result[0].id).toBe('m') // nomination = 3 > night = 0 → nomination first in desc
  })

  it('same day + phase: higher timestamp first (desc)', () => {
    const a: AggregatedLogEntry = { id: 'a', day: 1, phase: 'night', timestamp: 50, type: 'event', visibility: 'public', detail: '' }
    const b: AggregatedLogEntry = { id: 'b', day: 1, phase: 'night', timestamp: 10, type: 'event', visibility: 'public', detail: '' }
    const result = filterAndSortLog([a, b], makeFilter())
    expect(result[0].id).toBe('a')
  })

  it('same day + phase: lower timestamp first (asc)', () => {
    const a: AggregatedLogEntry = { id: 'a', day: 1, phase: 'night', timestamp: 50, type: 'event', visibility: 'public', detail: '' }
    const b: AggregatedLogEntry = { id: 'b', day: 1, phase: 'night', timestamp: 10, type: 'event', visibility: 'public', detail: '' }
    const result = filterAndSortLog([a, b], makeFilter({ sortAsc: true }))
    expect(result[0].id).toBe('b')
  })
})
