import { describe, expect, it } from 'vitest'
import { createDayState, createSeats, createTimerDefaults } from '../components/StorytellerSub/constants'
import { buildAudienceSnapshot } from '../components/StorytellerSub/presentation'
import { canViewSecrets } from '../utils/seatAlignment'

describe('audience data isolation', () => {
  it('keeps public status and traveller identity, excluding all private data even at night', () => {
    const day = createDayState(2, createSeats(2), createTimerDefaults())
    Object.assign(day.seats[0], {
      characterId: 'SECRET_ACTUAL', userCharacterId: 'SECRET_PERCEIVED',
      stTags: ['SECRET_TAG'], note: 'SECRET_NOTE', teamTag: 'evil',
      customTags: ['public tag'], alive: false, hasNoVote: true,
      futureSecret: 'SECRET_FUTURE_FIELD',
    })
    Object.assign(day.seats[1], { isTraveler: true, characterId: 'beggar', teamTag: 'evil', stTags: ['SECRET_TRAVELLER_TAG'] })
    day.demonBluffs = ['SECRET_BLUFF']
    day.eventLog = [{ id: '1', timestamp: 1, phase: 'night', kind: 'stateChange', detail: 'SECRET_LOG', visibility: 'st-only' }]
    day.skillHistory = [{ id: '2', actor: 1, targets: [], roleId: 'SECRET_ROLE', targetNotes: {}, note: 'SECRET_ACTION', statement: '', result: null, activatedDuringPhase: 'night' }]
    day.voteHistory = [{ id: '3', actor: 1, target: 2, voters: [1], voteCount: 1, requiredVotes: 1, passed: true, overridden: false, note: 'SECRET_VOTE_NOTE' }]
    day.voteDraft.note = 'SECRET_DRAFT'
    const snapshot = buildAudienceSnapshot({ day, language: 'en', title: 'Test script', timerSeconds: 30, timerRunning: false, requiredVotes: 1, yesCount: 0, currentVoterSeat: null })
    expect(JSON.stringify(snapshot)).not.toMatch(/SECRET|teamTag|stTags|userCharacterId|demonBluffs|skillHistory|eventLog/)
    expect(snapshot.seats[0]).toMatchObject({ alive: false, hasNoVote: true, customTags: ['public tag'], characterId: null })
    expect(snapshot.seats[1]).toMatchObject({ isTraveler: true, characterId: 'beggar' })
    expect(snapshot.voteHistory[0]).toMatchObject({ voteCount: 1, requiredVotes: 1, passed: true })
    expect(snapshot.nomination).toBeNull()
  })

  it('synchronizes votes and the host timer without exposing the draft notes', () => {
    const day = createDayState(2, createSeats(3), createTimerDefaults())
    day.phase = 'nomination'
    day.nominationStep = 'voting'
    day.voteDraft.actor = 1
    day.voteDraft.target = 2
    day.votingState = { votingOrder: [1, 2, 3], votingIndex: 2, perPlayerSeconds: 4, votes: { 1: true, 2: false } }
    const snapshot = buildAudienceSnapshot({ day, language: 'zh', title: '', timerSeconds: 4, timerRunning: true, requiredVotes: 2, yesCount: 1, currentVoterSeat: 3 })
    expect(snapshot.nomination).toEqual({ actor: 1, target: 2, isExile: false, yesCount: 1, requiredVotes: 2 })
    expect(snapshot.seats.map(s => s.vote)).toEqual([true, false, null])
    expect(snapshot.currentVoterSeat).toBe(3)
    expect(snapshot.timerSeconds).toBe(4)
  })

  it('only overrides the existing night-only visibility when explicitly enabled', () => {
    for (const phase of ['night', 'private', 'public', 'nomination'] as const) {
      expect(canViewSecrets(phase, false)).toBe(false)
      expect(canViewSecrets(phase, true)).toBe(phase === 'night')
      expect(canViewSecrets(phase, false, true)).toBe(true)
      expect(canViewSecrets(phase, true, true)).toBe(true)
    }
  })
})
