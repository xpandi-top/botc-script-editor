import { describe, it, expect } from 'vitest'
import { computeYesCount, computeVotePassed, filterNoVoteSeats, formatSeatLabel, getCurrentDealVoter, remoteResponsesToVoteMap, summarizeDealVote, timeoutDealVoteResponse } from '../utils/votes'
import { buildVotingOrder, createSeats } from '../components/StorytellerSub/constants'
import type { VoteDraft, VotingState } from '../components/StorytellerSub/types'

function makeDraft(overrides: Partial<VoteDraft> = {}): Pick<VoteDraft, 'voters' | 'voteCountOverride'> {
  return { voters: [], voteCountOverride: null, ...overrides }
}

function makeVotingState(voteMap: Record<number, boolean>): VotingState {
  return { votingOrder: Object.keys(voteMap).map(Number), votingIndex: 0, perPlayerSeconds: 30, votes: voteMap }
}

// ── computeYesCount ──────────────────────────────────────────────────────────

describe('computeYesCount', () => {
  it('uses voters.length when no override and no votingState', () => {
    expect(computeYesCount(makeDraft({ voters: [1, 2, 3] }), null)).toBe(3)
  })

  it('returns 0 when voters empty and no state', () => {
    expect(computeYesCount(makeDraft(), null)).toBe(0)
  })

  it('uses votingState yes-count when votingState present', () => {
    const state = makeVotingState({ 1: true, 2: false, 3: true, 4: true })
    expect(computeYesCount(makeDraft({ voters: [1, 2, 3, 4] }), state)).toBe(3)
  })

  it('votingState all false → 0', () => {
    const state = makeVotingState({ 1: false, 2: false })
    expect(computeYesCount(makeDraft({ voters: [1, 2] }), state)).toBe(0)
  })

  it('voteCountOverride takes priority over votingState', () => {
    const state = makeVotingState({ 1: true, 2: true, 3: true })
    expect(computeYesCount(makeDraft({ voteCountOverride: 7 }), state)).toBe(7)
  })

  it('voteCountOverride takes priority over voters array', () => {
    expect(computeYesCount(makeDraft({ voters: [1, 2, 3], voteCountOverride: 1 }), null)).toBe(1)
  })

  it('voteCountOverride 0 overrides non-zero voter count', () => {
    expect(computeYesCount(makeDraft({ voters: [1, 2, 3], voteCountOverride: 0 }), null)).toBe(0)
  })
})

// ── computeVotePassed ────────────────────────────────────────────────────────

describe('computeVotePassed', () => {
  it.each([
    // [description, yesCount, threshold, manualPassed, expected]
    ['meets threshold → pass',              5, 5, null,  true ],
    ['exceeds threshold → pass',            6, 5, null,  true ],
    ['below threshold → fail',              4, 5, null,  false],
    ['zero vs threshold 1 → fail',          0, 1, null,  false],
    ['manualPassed true overrides fail',    2, 5, true,  true ],
    ['manualPassed false overrides pass',   5, 5, false, false],
    ['manualPassed null uses system',       5, 5, null,  true ],
  ])('%s', (_, yes, threshold, manual, expected) => {
    expect(computeVotePassed(yes, threshold, manual)).toBe(expected)
  })

  it('threshold 1, yesCount 1 → pass', () => {
    expect(computeVotePassed(1, 1, null)).toBe(true)
  })

  it('large game: 8 alive, threshold 4, yesCount 4 → pass', () => {
    expect(computeVotePassed(4, 4, null)).toBe(true)
  })

  it('large game: 8 alive, threshold 4, yesCount 3 → fail', () => {
    expect(computeVotePassed(3, 4, null)).toBe(false)
  })
})

// ── integration: computeYesCount + computeVotePassed ────────────────────────

describe('vote pass/fail integration', () => {
  it('bulk mode: 3 voters, threshold 2 → pass', () => {
    const yes = computeYesCount(makeDraft({ voters: [1, 2, 3] }), null)
    expect(computeVotePassed(yes, 2, null)).toBe(true)
  })

  it('live voting: 2/4 yes, threshold 3 → fail', () => {
    const state = makeVotingState({ 1: true, 2: false, 3: true, 4: false })
    const yes = computeYesCount(makeDraft(), state)
    expect(computeVotePassed(yes, 3, null)).toBe(false)
  })

  it('override forces pass regardless of voter count', () => {
    const yes = computeYesCount(makeDraft({ voters: [], voteCountOverride: 10 }), null)
    expect(computeVotePassed(yes, 5, null)).toBe(true)
  })

  it('manualPassed false forces fail even with override above threshold', () => {
    const yes = computeYesCount(makeDraft({ voteCountOverride: 10 }), null)
    expect(computeVotePassed(yes, 5, false)).toBe(false)
  })
})

// ── experimental linked deal voting ─────────────────────────────────────────

describe('linked deal voting helpers', () => {
  it('voting order starts after nominee and wraps nominee last', () => {
    const seats = createSeats(8)
    expect(buildVotingOrder(seats, 6)).toEqual([7, 8, 1, 2, 3, 4, 5, 6])
  })

  it('current voter eligibility excludes no-vote seats', () => {
    const order = [7, 8, 1, 2, 3, 4, 5, 6]
    expect(filterNoVoteSeats(order, [8, 3])).toEqual([7, 1, 2, 4, 5, 6])
  })

  it('timeout defaults to disagree', () => {
    expect(timeoutDealVoteResponse()).toBe('disagree')
  })

  it('remote responses map into local votingState vote booleans', () => {
    expect(remoteResponsesToVoteMap([
      { seat: 1, response: 'agree' },
      { seat: 2, response: 'disagree' },
      { seat: 3, response: 'agree' },
    ])).toEqual({ 1: true, 2: false, 3: true })
  })

  it('remote vote count still respects manual override', () => {
    const state = makeVotingState(remoteResponsesToVoteMap([
      { seat: 1, response: 'agree' },
      { seat: 2, response: 'disagree' },
    ]))
    const yes = computeYesCount(makeDraft({ voteCountOverride: 7 }), state)
    expect(yes).toBe(7)
  })

  it('summarizes agree, disagree, and pending seats with labels', () => {
    const summary = summarizeDealVote(
      { votingOrder: [1, 2, 3, 4], seatLabels: { 1: '#1 Ada', 2: '#2 Ben', 3: '#3 Cy', 4: '#4 Di' } },
      [
        { seat: 1, response: 'agree' },
        { seat: 3, response: 'disagree' },
      ],
    )
    expect(summary.agreeSeats).toEqual([1])
    expect(summary.disagreeSeats).toEqual([3])
    expect(summary.pendingSeats).toEqual([2, 4])
    expect(summary.agreeLabels).toEqual(['#1 Ada'])
    expect(summary.disagreeLabels).toEqual(['#3 Cy'])
    expect(summary.pendingLabels).toEqual(['#2 Ben', '#4 Di'])
  })

  it('seat labels fall back to #seat for older vote docs', () => {
    expect(formatSeatLabel(7, undefined)).toBe('#7')
    expect(formatSeatLabel(8, { 8: '' })).toBe('#8')
  })

  it('gets current deal voter from voting index', () => {
    expect(getCurrentDealVoter({ votingOrder: [7, 8, 1], currentIndex: 1 })).toBe(8)
    expect(getCurrentDealVoter({ votingOrder: [7, 8, 1], currentIndex: 3 })).toBeNull()
  })
})
