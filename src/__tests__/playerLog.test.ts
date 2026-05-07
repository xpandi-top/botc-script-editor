import { describe, it, expect } from 'vitest'
import { buildPlayerLogEntries, eventMentionsSeat, filterPlayerLogByCurrentPhase } from '../utils/playerLog'
import type { PlayerLogEntry, PlayerLogDay } from '../utils/playerLog'
import type { DayState, EventLogEntry, VoteRecord, SkillRecord } from '../components/StorytellerSub/types'

// ── Factories ─────────────────────────────────────────────────────────────────

function makeDay(day: number, overrides: Partial<DayState> = {}): DayState {
  return {
    id: `day-${day}`,
    day,
    phase: 'nomination',
    publicMode: 'free',
    nominationStep: 'waitingForNomination',
    privateSeconds: 0, publicFreeSeconds: 0, publicRoundRobinSeconds: 0,
    publicElapsedSeconds: 0, nominationWaitSeconds: 0,
    nominationActorSeconds: 0, nominationTargetSeconds: 0,
    currentSpeakerSeat: null, roundRobinSpokenSeats: [],
    seats: [], voteDraft: {
      actor: null, target: null, voters: [], noVoters: [],
      note: '', manualPassed: null, nominationResult: 'succeed',
      isExile: false, voteCountOverride: null,
    },
    votingState: null, voteHistory: [], skillHistory: [],
    eventLog: [], nightVisitedSeats: [], gameEnded: false, demonBluffs: [],
    ...overrides,
  }
}

function makeEvent(
  id: string,
  detail: string,
  kind: EventLogEntry['kind'] = 'stateChange',
  phase = 'night',
  visibility?: 'public' | 'st-only',
): EventLogEntry {
  return { id, timestamp: Number(id), phase, kind, detail, ...(visibility ? { visibility } : {}) }
}

function makeVote(
  id: string,
  actor: number,
  target: number,
  passed = true,
  opts: Partial<VoteRecord> = {},
): VoteRecord {
  return {
    id, actor, target, voters: [actor], voteCount: 1, requiredVotes: 1,
    passed, note: '', overridden: false, ...opts,
  }
}

function makeSkill(
  id: string,
  actor: number,
  targets: number[] = [],
  visibility?: 'public' | 'st-only',
): SkillRecord {
  return {
    id, actor, roleId: 'imp', targets, targetNotes: {},
    statement: '', note: '', result: null,
    activatedDuringPhase: 'night',
    ...(visibility ? { visibility } : {}),
  }
}

// ── eventMentionsSeat ─────────────────────────────────────────────────────────

describe('eventMentionsSeat', () => {
  it('matches exact seat at end of string', () => {
    expect(eventMentionsSeat('Dead: #3', 3)).toBe(true)
  })

  it('matches seat followed by non-digit', () => {
    expect(eventMentionsSeat('#3 was poisoned', 3)).toBe(true)
  })

  it('does not match seat number embedded in larger number', () => {
    expect(eventMentionsSeat('#13 died', 3)).toBe(false)
    expect(eventMentionsSeat('#30 voted', 3)).toBe(false)
  })

  it('returns false when seat not mentioned', () => {
    expect(eventMentionsSeat('Day 2 began', 3)).toBe(false)
  })
})

// ── buildPlayerLogEntries — empty / no match ──────────────────────────────────

describe('buildPlayerLogEntries — empty', () => {
  it('returns empty for no days', () => {
    expect(buildPlayerLogEntries([], 1)).toHaveLength(0)
  })

  it('returns empty when no entries mention seat', () => {
    const day = makeDay(1, { eventLog: [makeEvent('1', '#2 did something')] })
    expect(buildPlayerLogEntries([day], 1)).toHaveLength(0)
  })

  it('excludes days that have no matching entries after filtering', () => {
    const day = makeDay(1, {
      eventLog: [makeEvent('1', '#5 state', 'stateChange')],
    })
    const result = buildPlayerLogEntries([day], 3) // seat 3 not mentioned
    expect(result).toHaveLength(0)
  })
})

// ── Visibility rules ──────────────────────────────────────────────────────────

describe('buildPlayerLogEntries — visibility rules', () => {
  it('stateChange event → public', () => {
    const day = makeDay(1, { eventLog: [makeEvent('100', '#1 state', 'stateChange', 'day')] })
    const [[, entry]] = buildPlayerLogEntries([day], 1).map((d) => [d.day, d.entries[0]])
    expect(entry.visibility).toBe('public')
  })

  it('phaseTransition event → public', () => {
    const day = makeDay(1, { eventLog: [makeEvent('101', '#1 transition', 'phaseTransition', 'night')] })
    const [{ entries }] = buildPlayerLogEntries([day], 1)
    expect(entries[0].visibility).toBe('public')
  })

  it('tagChange event → st-only', () => {
    const day = makeDay(1, { eventLog: [makeEvent('102', '#1 poisoned', 'tagChange', 'night')] })
    const [{ entries }] = buildPlayerLogEntries([day], 1)
    expect(entries[0].visibility).toBe('st-only')
  })

  it('event with explicit visibility=public overrides kind default', () => {
    const day = makeDay(1, {
      eventLog: [makeEvent('103', '#1 special', 'tagChange', 'night', 'public')],
    })
    const [{ entries }] = buildPlayerLogEntries([day], 1)
    expect(entries[0].visibility).toBe('public')
  })

  it('event with explicit visibility=st-only overrides kind default', () => {
    const day = makeDay(1, {
      eventLog: [makeEvent('104', '#1 state', 'stateChange', 'day', 'st-only')],
    })
    const [{ entries }] = buildPlayerLogEntries([day], 1)
    expect(entries[0].visibility).toBe('st-only')
  })

  it('vote → always public', () => {
    const day = makeDay(1, { voteHistory: [makeVote('200', 1, 2)] })
    const [{ entries }] = buildPlayerLogEntries([day], 1)
    expect(entries[0].visibility).toBe('public')
  })

  it('skill without visibility → defaults to st-only', () => {
    const day = makeDay(1, { skillHistory: [makeSkill('300', 1)] })
    const [{ entries }] = buildPlayerLogEntries([day], 1)
    expect(entries[0].visibility).toBe('st-only')
  })

  it('skill with explicit visibility=public → public', () => {
    const day = makeDay(1, { skillHistory: [makeSkill('301', 1, [], 'public')] })
    const [{ entries }] = buildPlayerLogEntries([day], 1)
    expect(entries[0].visibility).toBe('public')
  })

  it('skill with explicit visibility=st-only → st-only', () => {
    const day = makeDay(1, { skillHistory: [makeSkill('302', 1, [], 'st-only')] })
    const [{ entries }] = buildPlayerLogEntries([day], 1)
    expect(entries[0].visibility).toBe('st-only')
  })
})

// ── Night vs Day consistency ──────────────────────────────────────────────────

describe('buildPlayerLogEntries — night / day consistency', () => {
  it('night skills are st-only (not public) — same rule as day skills', () => {
    const night = makeDay(1, {
      skillHistory: [{ ...makeSkill('400', 1), activatedDuringPhase: 'night' }],
    })
    const day = makeDay(2, {
      skillHistory: [{ ...makeSkill('401', 1), activatedDuringPhase: 'public' }],
    })
    const result = buildPlayerLogEntries([night, day], 1)
    const nightDay = result.find((d) => d.day === 1)!
    const dayDay = result.find((d) => d.day === 2)!
    expect(nightDay.entries[0].visibility).toBe('st-only')
    expect(dayDay.entries[0].visibility).toBe('st-only')
  })

  it('night tagChange is st-only, day stateChange is public', () => {
    const day1 = makeDay(1, {
      eventLog: [makeEvent('500', '#1 tagged', 'tagChange', 'night')],
    })
    const day2 = makeDay(2, {
      eventLog: [makeEvent('501', '#1 state', 'stateChange', 'public')],
    })
    const result = buildPlayerLogEntries([day1, day2], 1)
    expect(result.find((d) => d.day === 1)!.entries[0].visibility).toBe('st-only')
    expect(result.find((d) => d.day === 2)!.entries[0].visibility).toBe('public')
  })

  it('mixed day: skill (st-only) and vote (public) both appear', () => {
    const day = makeDay(1, {
      voteHistory: [makeVote('600', 1, 2)],
      skillHistory: [makeSkill('601', 1)],
    })
    const [{ entries }] = buildPlayerLogEntries([day], 1)
    expect(entries).toHaveLength(2)
    const visibilities = entries.map((e) => e.visibility).sort()
    expect(visibilities).toEqual(['public', 'st-only'])
  })
})

// ── Seat matching ─────────────────────────────────────────────────────────────

describe('buildPlayerLogEntries — seat matching', () => {
  it('includes vote where seat is actor', () => {
    const day = makeDay(1, { voteHistory: [makeVote('700', 1, 2)] })
    expect(buildPlayerLogEntries([day], 1)[0].entries).toHaveLength(1)
  })

  it('includes vote where seat is target', () => {
    const day = makeDay(1, { voteHistory: [makeVote('701', 3, 1)] })
    expect(buildPlayerLogEntries([day], 1)[0].entries).toHaveLength(1)
  })

  it('excludes vote where seat is neither actor nor target', () => {
    const day = makeDay(1, { voteHistory: [makeVote('702', 2, 3)] })
    expect(buildPlayerLogEntries([day], 1)).toHaveLength(0)
  })

  it('includes skill where seat is actor', () => {
    const day = makeDay(1, { skillHistory: [makeSkill('800', 1, [2])] })
    expect(buildPlayerLogEntries([day], 1)[0].entries).toHaveLength(1)
  })

  it('includes skill where seat is a target', () => {
    const day = makeDay(1, { skillHistory: [makeSkill('801', 2, [1, 3])] })
    expect(buildPlayerLogEntries([day], 1)[0].entries).toHaveLength(1)
  })

  it('excludes skill where seat is neither actor nor target', () => {
    const day = makeDay(1, { skillHistory: [makeSkill('802', 2, [3])] })
    expect(buildPlayerLogEntries([day], 1)).toHaveLength(0)
  })
})

// ── Multi-day sorting ─────────────────────────────────────────────────────────

describe('buildPlayerLogEntries — sorting', () => {
  it('days sorted newest first', () => {
    const days = [
      makeDay(1, { voteHistory: [makeVote('10', 1, 2)] }),
      makeDay(3, { voteHistory: [makeVote('30', 1, 2)] }),
      makeDay(2, { voteHistory: [makeVote('20', 1, 2)] }),
    ]
    const result = buildPlayerLogEntries(days, 1)
    expect(result.map((d) => d.day)).toEqual([3, 2, 1])
  })

  it('entries within a day sorted newest-timestamp first', () => {
    const day = makeDay(1, {
      voteHistory: [makeVote('1000', 1, 2), makeVote('999', 1, 3)],
    })
    const [{ entries }] = buildPlayerLogEntries([day], 1)
    expect(entries[0].timestamp).toBe(1000)
    expect(entries[1].timestamp).toBe(999)
  })
})

// ── Deduplication: eventLog vote/skill kinds skipped ─────────────────────────

describe('buildPlayerLogEntries — deduplication', () => {
  it('eventLog entries with kind=vote are skipped', () => {
    const day = makeDay(1, {
      eventLog: [{ id: '1', timestamp: 1, phase: 'nomination', kind: 'vote', detail: '#1 voted' }],
    })
    expect(buildPlayerLogEntries([day], 1)).toHaveLength(0)
  })

  it('eventLog entries with kind=skill are skipped', () => {
    const day = makeDay(1, {
      eventLog: [{ id: '2', timestamp: 2, phase: 'night', kind: 'skill', detail: '#1 skill' }],
    })
    expect(buildPlayerLogEntries([day], 1)).toHaveLength(0)
  })
})

// ── filterPlayerLogByPhase ────────────────────────────────────────────────────

function makeEntry(id: string, phase: string, visibility: 'public' | 'st-only'): PlayerLogEntry {
  return { id, timestamp: Number(id), text: `entry-${id}`, kind: 'event', phase, visibility }
}

function makeLogDay(day: number, entries: PlayerLogEntry[]): PlayerLogDay {
  return { day, entries }
}

describe('filterPlayerLogByCurrentPhase', () => {
  it('returns empty for empty input (night)', () => {
    expect(filterPlayerLogByCurrentPhase([], true)).toHaveLength(0)
  })

  it('returns empty for empty input (day)', () => {
    expect(filterPlayerLogByCurrentPhase([], false)).toHaveLength(0)
  })

  // ── isNight = true: show everything ──────────────────────────────────────

  it('night mode: public entries shown', () => {
    const days = [makeLogDay(1, [makeEntry('1', 'night', 'public')])]
    expect(filterPlayerLogByCurrentPhase(days, true)[0].entries).toHaveLength(1)
  })

  it('night mode: st-only entries shown', () => {
    const days = [makeLogDay(1, [makeEntry('2', 'night', 'st-only')])]
    expect(filterPlayerLogByCurrentPhase(days, true)[0].entries).toHaveLength(1)
  })

  it('night mode: st-only entries from ANY logged phase shown', () => {
    const entries = [
      makeEntry('3', 'night', 'st-only'),
      makeEntry('4', 'private', 'st-only'),
      makeEntry('5', 'nomination', 'st-only'),
    ]
    const result = filterPlayerLogByCurrentPhase([makeLogDay(1, entries)], true)
    expect(result[0].entries).toHaveLength(3)
  })

  it('night mode: returns exact same array reference (no filtering)', () => {
    const days = [makeLogDay(1, [makeEntry('6', 'private', 'st-only')])]
    expect(filterPlayerLogByCurrentPhase(days, true)).toBe(days)
  })

  // ── isNight = false: public only ─────────────────────────────────────────

  it('day mode: public entries shown regardless of logged phase', () => {
    const entries = [
      makeEntry('10', 'night', 'public'),
      makeEntry('11', 'private', 'public'),
      makeEntry('12', 'nomination', 'public'),
    ]
    const result = filterPlayerLogByCurrentPhase([makeLogDay(1, entries)], false)
    expect(result[0].entries).toHaveLength(3)
  })

  it('day mode: st-only entries hidden regardless of logged phase', () => {
    const entries = [
      makeEntry('20', 'night', 'st-only'),
      makeEntry('21', 'private', 'st-only'),
      makeEntry('22', 'nomination', 'st-only'),
    ]
    expect(filterPlayerLogByCurrentPhase([makeLogDay(1, entries)], false)).toHaveLength(0)
  })

  it('day mode: mixed — keeps only public', () => {
    const entries = [
      makeEntry('30', 'night', 'public'),
      makeEntry('31', 'night', 'st-only'),
      makeEntry('32', 'private', 'public'),
      makeEntry('33', 'private', 'st-only'),
    ]
    const result = filterPlayerLogByCurrentPhase([makeLogDay(1, entries)], false)
    expect(result[0].entries).toHaveLength(2)
    expect(result[0].entries.every((e) => e.visibility === 'public')).toBe(true)
  })

  it('day mode: day with only st-only removed entirely', () => {
    const days = [
      makeLogDay(1, [makeEntry('40', 'night', 'st-only')]),
      makeLogDay(2, [makeEntry('41', 'nomination', 'public')]),
    ]
    const result = filterPlayerLogByCurrentPhase(days, false)
    expect(result).toHaveLength(1)
    expect(result[0].day).toBe(2)
  })

  it('day mode: does not mutate input', () => {
    const entries = [makeEntry('50', 'private', 'public'), makeEntry('51', 'private', 'st-only')]
    const day = makeLogDay(1, entries)
    filterPlayerLogByCurrentPhase([day], false)
    expect(day.entries).toHaveLength(2)
  })

  // ── Parametric: all phase × visibility × isNight combos ──────────────────

  it.each([
    // [isNight, entryVisibility, expected]
    [true,  'public',  true],
    [true,  'st-only', true],
    [false, 'public',  true],
    [false, 'st-only', false],
  ] as const)(
    'isNight=%s visibility=%s → included=%s',
    (isNight, visibility, expected) => {
      const result = filterPlayerLogByCurrentPhase(
        [makeLogDay(1, [makeEntry('99', 'night', visibility)])],
        isNight,
      )
      expect(result.length > 0 && result[0].entries.length > 0).toBe(expected)
    },
  )
})
