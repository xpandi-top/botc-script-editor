import { describe, expect, it } from 'vitest'
import { createDayState, createSeats, createTimerDefaults } from '../components/StorytellerSub/constants'
import { buildAudienceSnapshot } from '../components/StorytellerSub/presentation'
import { canViewSecrets } from '../utils/seatAlignment'

describe('audience data isolation', () => {
  it('includes every day in order, with historical names and no private historical fields', () => {
    const first = createDayState(1, createSeats(2), createTimerDefaults())
    const second = createDayState(2, createSeats(2), createTimerDefaults())
    const third = createDayState(3, createSeats(2), createTimerDefaults())
    first.seats[0].name = 'Original player'
    first.seats[0].note = 'SECRET_PAST_NOTE'
    first.seats[0].stTags = ['SECRET_PAST_TAG']
    first.voteHistory = [{ id: 'same-id', actor: 1, target: 2, voters: [1], voteCount: 1, requiredVotes: 1, passed: true, overridden: false, note: 'SECRET_PAST_VOTE' }]
    second.voteHistory = [{ ...first.voteHistory[0], voteCount: 0, passed: false, failed: true, isExile: true }]
    const source = { day: third, days: [third, first, second], language: 'en' as const, title: '', timerSeconds: 0, timerRunning: false, requiredVotes: 1, yesCount: 0, currentVoterSeat: null }
    const snapshot = buildAudienceSnapshot(source)
    expect(snapshot.nominationHistory.map(d => d.day)).toEqual([1, 2, 3])
    expect(snapshot.nominationHistory[0].votes[0]).toMatchObject({ actorName: 'Original player', passed: true })
    expect(snapshot.nominationHistory[1].votes[0]).toMatchObject({ actorName: 'Player 1', failed: true, isExile: true })
    expect(snapshot.nominationHistory[2].votes).toEqual([])
    expect(JSON.stringify(snapshot)).not.toContain('SECRET')
    expect(source.days.map(d => d.day)).toEqual([3, 1, 2])
    first.voteHistory = []
    expect(buildAudienceSnapshot(source).nominationHistory[0].votes).toEqual([])
  })

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
    const snapshot = buildAudienceSnapshot({ day, days: [day], language: 'en', title: 'Test script', timerSeconds: 30, timerRunning: false, requiredVotes: 1, yesCount: 0, currentVoterSeat: null })
    expect(JSON.stringify(snapshot)).not.toMatch(/SECRET|teamTag|stTags|userCharacterId|demonBluffs|skillHistory|eventLog/)
    expect(snapshot.seats[0]).toMatchObject({ alive: false, hasNoVote: true, customTags: ['public tag'], characterId: null })
    expect(snapshot.seats[1]).toMatchObject({ isTraveler: true, characterId: 'beggar' })
    expect(snapshot.nominationHistory[0].votes[0]).toMatchObject({ voteCount: 1, requiredVotes: 1, passed: true })
    expect(snapshot.nomination).toBeNull()
  })

  it('synchronizes votes and the host timer without exposing the draft notes', () => {
    const day = createDayState(2, createSeats(3), createTimerDefaults())
    day.phase = 'nomination'
    day.nominationStep = 'voting'
    day.voteDraft.actor = 1
    day.voteDraft.target = 2
    day.votingState = { votingOrder: [1, 2, 3], votingIndex: 2, perPlayerSeconds: 4, votes: { 1: true, 2: false } }
    const snapshot = buildAudienceSnapshot({ day, days: [day], language: 'zh', title: '', timerSeconds: 4, timerRunning: true, requiredVotes: 2, yesCount: 1, currentVoterSeat: 3 })
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
