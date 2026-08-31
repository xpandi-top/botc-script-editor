/**
 * Odyssey vote tokens.
 *
 * Official rules: a dead player has one ghost vote. Odyssey: a player gains a
 * token when they die, may hold several, and may spend any number on a single
 * nomination — which changes whether a nomination passes, so the arithmetic
 * here decides game outcomes.
 */

import { describe, expect, it } from 'vitest'
import { usesMultiVoteTokens } from '../catalog'
import {
  computeYesCount,
  maxVoteWeightFor,
  spendVoteTokens,
  voteTokensAfterLifeChange,
  voteTokensOf,
  voteWeightFor,
} from '../utils/votes'
import type { StorytellerSeat, VoteDraft } from '../components/StorytellerSub/types'

function seat(overrides: Partial<StorytellerSeat> & { seat: number }): StorytellerSeat {
  return {
    name: '', alive: true, isTraveler: false, isExecuted: false, hasNoVote: false,
    customTags: [], stTags: [], characterId: null, userCharacterId: null,
    teamTag: null, note: '',
    ...overrides,
  }
}

function draft(overrides: Partial<VoteDraft> = {}): VoteDraft {
  return {
    actor: 1, target: 2, voters: [], noVoters: [], note: '', manualPassed: null,
    nominationResult: 'succeed', isExile: false, voteCountOverride: null,
    ...overrides,
  }
}

describe('usesMultiVoteTokens', () => {
  it('is on for a roster containing Odyssey characters', () => {
    expect(usesMultiVoteTokens(['painter', 'washerwoman'])).toBe(true)
  })

  it('is off for an all-official roster', () => {
    expect(usesMultiVoteTokens(['washerwoman', 'chef', 'imp'])).toBe(false)
  })

  it('is off for an empty roster', () => {
    expect(usesMultiVoteTokens([])).toBe(false)
  })
})

describe('voteWeightFor', () => {
  it('defaults to one vote', () => {
    expect(voteWeightFor(draft(), 3)).toBe(1)
  })

  it('uses the recorded weight', () => {
    expect(voteWeightFor(draft({ voteWeights: { 3: 2 } }), 3)).toBe(2)
  })

  it('rejects negative, fractional and non-numeric weights', () => {
    expect(voteWeightFor(draft({ voteWeights: { 3: -5 } }), 3)).toBe(0)
    expect(voteWeightFor(draft({ voteWeights: { 3: 2.7 } }), 3)).toBe(2)
    expect(voteWeightFor(draft({ voteWeights: { 3: NaN } }), 3)).toBe(1)
  })
})

describe('computeYesCount', () => {
  it('counts one per voter by default — unchanged from official rules', () => {
    expect(computeYesCount(draft({ voters: [1, 2, 3] }), null)).toBe(3)
  })

  it('adds the extra votes a multi-token voter spends', () => {
    expect(computeYesCount(draft({ voters: [1, 2, 3], voteWeights: { 3: 3 } }), null)).toBe(5)
  })

  it('does not double-count a seat listed twice', () => {
    expect(computeYesCount(draft({ voters: [1, 1, 2], voteWeights: { 1: 2 } }), null)).toBe(3)
  })

  it('weights live per-player voting too', () => {
    const votingState = { votingOrder: [1, 2], votingIndex: 2, perPlayerSeconds: 0, votes: { 1: true, 2: false, 3: true } }
    expect(computeYesCount(draft({ voteWeights: { 3: 2 } }), votingState)).toBe(3)
  })

  it('still lets the manual override win', () => {
    expect(computeYesCount(draft({ voters: [1, 2], voteWeights: { 1: 9 } , voteCountOverride: 4 }), null)).toBe(4)
  })
})

describe('voteTokensAfterLifeChange', () => {
  it('grants a token on death', () => {
    expect(voteTokensAfterLifeChange({ alive: false, voteTokens: undefined }, true)).toBe(1)
    expect(voteTokensAfterLifeChange({ alive: false, voteTokens: 2 }, true)).toBe(3)
  })

  it('leaves tokens alone when nothing changed', () => {
    expect(voteTokensAfterLifeChange({ alive: false, voteTokens: 2 }, false)).toBe(2)
    expect(voteTokensAfterLifeChange({ alive: true, voteTokens: undefined }, true)).toBeUndefined()
  })

  it('does not confiscate tokens on resurrection', () => {
    expect(voteTokensAfterLifeChange({ alive: true, voteTokens: 2 }, false)).toBe(2)
  })
})

describe('spendVoteTokens', () => {
  const seats = [
    seat({ seat: 1, alive: true }),
    seat({ seat: 2, alive: false, voteTokens: 3 }),
    seat({ seat: 3, alive: false, voteTokens: 1 }),
  ]

  it('deducts what each dead voter spent', () => {
    const after = spendVoteTokens(seats, [2, 3], draft({ voteWeights: { 2: 2 } }))
    expect(voteTokensOf(after[1])).toBe(1)
    expect(voteTokensOf(after[2])).toBe(0)
  })

  it('leaves living voters untouched', () => {
    const after = spendVoteTokens(seats, [1], draft({ voteWeights: { 1: 3 } }))
    expect(after[0].voteTokens).toBeUndefined()
  })

  it('leaves non-voters untouched', () => {
    const after = spendVoteTokens(seats, [3], draft())
    expect(voteTokensOf(after[1])).toBe(3)
  })

  it('never spends more tokens than a seat holds', () => {
    const after = spendVoteTokens(seats, [3], draft({ voteWeights: { 3: 5 } }))
    expect(voteTokensOf(after[2])).toBe(0)
  })
})

describe('maxVoteWeightFor', () => {
  it('is one for the living', () => {
    expect(maxVoteWeightFor({ alive: true, voteTokens: 5 })).toBe(1)
  })

  it('is the token count for the dead', () => {
    expect(maxVoteWeightFor({ alive: false, voteTokens: 3 })).toBe(3)
    expect(maxVoteWeightFor({ alive: false, voteTokens: undefined })).toBe(0)
  })
})
