import { describe, it, expect } from 'vitest'
import { buildVotingOrder, createDayState, createSeats } from '../core/engine/factories'
import {
  applyVoteRecord,
  buildVoteRecord,
  canStartActorSpeech,
  canStartTargetSpeech,
  canStartVoting,
  castVote,
  openNominations,
  rejectNomination,
  startActorSpeech,
  startTargetSpeech,
  startVoting,
  type NominationTimers,
} from '../core/engine/nomination'
import type { DayState } from '../core/types/game'

const timers: NominationTimers = { nominationWaitSeconds: 10, nominationActorSeconds: 30, nominationTargetSeconds: 25, nominationVoteSeconds: 5 }
const TIMER_DEFAULTS = { ...timers, privateSeconds: 180, publicFreeSeconds: 300, publicRoundRobinSeconds: 30, nominationDelayMinutes: 2, alarmSound: '' }

function freshDay(playerCount = 5): DayState {
  return { ...createDayState(1, createSeats(playerCount), TIMER_DEFAULTS), phase: 'public' }
}

function nominated(actor: number, target: number): DayState {
  const d = openNominations(freshDay(), timers)
  return { ...d, nominationStep: 'nominationDecision', voteDraft: { ...d.voteDraft, actor, target } }
}

describe('core/engine/nomination — flow', () => {
  it('opens nominations with a fresh draft and wait timer', () => {
    const start = { ...freshDay(), voteDraft: { ...freshDay().voteDraft, actor: 3 }, nominationWaitSeconds: 0 }
    const d = openNominations(start, timers)
    expect(d).toMatchObject({ phase: 'nomination', nominationStep: 'waitingForNomination', nominationWaitSeconds: 10, votingState: null })
    expect(d.voteDraft.actor).toBeNull()
  })

  it('guards each step', () => {
    const waiting = openNominations(freshDay(), timers)
    expect(canStartActorSpeech(waiting)).toBe(false)
    expect(canStartTargetSpeech(waiting)).toBe(false)
    expect(canStartVoting(waiting)).toBe(false)

    const decided = nominated(1, 3)
    expect(canStartActorSpeech(decided)).toBe(true)
    expect(canStartTargetSpeech(decided)).toBe(false)
    expect(canStartVoting(decided)).toBe(true)

    const actor = startActorSpeech(decided, timers)
    expect(actor).toMatchObject({ nominationStep: 'actorSpeech', nominationActorSeconds: 30 })
    expect(canStartTargetSpeech(actor)).toBe(true)
    expect(canStartVoting(actor)).toBe(false)

    const noTarget = { ...decided, voteDraft: { ...decided.voteDraft, target: null } }
    expect(canStartVoting(noTarget)).toBe(false)
  })

  it('runs a clockwise vote starting after the nominee', () => {
    const target = startTargetSpeech(startActorSpeech(nominated(1, 3), timers), timers)
    expect(target).toMatchObject({ nominationStep: 'targetSpeech', nominationTargetSeconds: 25 })

    const order = buildVotingOrder(target.seats, 3)
    expect(order).toEqual([4, 5, 1, 2, 3])
    let d = startVoting(target, order, timers)
    expect(d.votingState).toEqual({ votingOrder: order, votingIndex: 0, perPlayerSeconds: 5, votes: {} })

    // out-of-turn votes are ignored
    expect(castVote(d, 1, true, timers)).toEqual({ day: d, completed: false })

    const answers: Record<number, boolean> = { 4: true, 5: false, 1: true, 2: true, 3: false }
    let completed = false
    for (const seat of order) {
      const r = castVote(d, seat, answers[seat], timers)
      d = r.day
      completed = r.completed
    }
    expect(completed).toBe(true)
    expect(d.nominationStep).toBe('votingDone')
    expect(d.votingState).toMatchObject({ votingIndex: 5, perPlayerSeconds: 0 })
    expect(d.voteDraft.voters.sort()).toEqual([1, 2, 4])

    // voting is closed now
    expect(castVote(d, 4, true, timers).completed).toBe(false)
  })
})

describe('core/engine/nomination — records', () => {
  it('records a failed nomination only when both seats were chosen', () => {
    const rejected = rejectNomination(nominated(2, 4), { requiredVotes: 3, now: 1000, timers })
    expect(rejected.nominationStep).toBe('waitingForNomination')
    expect(rejected.voteHistory).toEqual([
      { id: '1000', actor: 2, target: 4, voters: [], voteCount: 0, requiredVotes: 3, passed: false, note: '', overridden: false, failed: true },
    ])

    const empty = rejectNomination(openNominations(freshDay(), timers), { requiredVotes: 3, now: 1000, timers })
    expect(empty.voteHistory).toEqual([])
  })

  it('builds a vote record with weights, overrides and a trimmed note', () => {
    const draft = { ...nominated(1, 3).voteDraft, voters: [2, 4, 4, 5], voteWeights: { 5: 3 }, note: '  close one ' }
    expect(buildVoteRecord(draft, { requiredVotes: 3, passed: true, now: 7 })).toEqual({
      id: '7', actor: 1, target: 3, voters: [2, 4, 5], voteCount: 5, requiredVotes: 3, passed: true,
      note: 'close one', overridden: false, isExile: false, voteWeights: { 5: 3 },
    })

    const overridden = buildVoteRecord({ ...draft, voteCountOverride: 2, voteWeights: undefined }, { requiredVotes: 3, passed: false, now: 7 })
    expect(overridden).toMatchObject({ voteCount: 2, overridden: true })
    expect(overridden).not.toHaveProperty('voteWeights')

    expect(buildVoteRecord({ ...draft, actor: null }, { requiredVotes: 3, passed: true, now: 7 })).toBeNull()
  })

  it('applies a record: spends dead voters\' tokens, prepends history and resets', () => {
    const base = nominated(1, 3)
    const seats = base.seats.map((s) => (s.seat === 5 ? { ...s, alive: false, voteTokens: 4 } : s))
    const d = { ...base, seats, nominationStep: 'votingDone' as const }
    const draft = { ...d.voteDraft, voters: [2, 5], voteWeights: { 5: 3 } }
    const record = buildVoteRecord(draft, { requiredVotes: 3, passed: true, now: 9 })!
    const next = applyVoteRecord(d, record, draft, timers)

    expect(next.seats.find((s) => s.seat === 5)?.voteTokens).toBe(1)
    expect(next.seats.find((s) => s.seat === 2)).toEqual(d.seats.find((s) => s.seat === 2))
    expect(next.voteHistory[0]).toBe(record)
    expect(next).toMatchObject({ nominationStep: 'waitingForNomination', nominationWaitSeconds: 10, votingState: null })
    expect(next.voteDraft.voters).toEqual([])
  })
})
