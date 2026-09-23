import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDayState, createSeats, createTimerDefaults } from '../components/StorytellerSub/constants'
import { syncClaimedNames, useDealRoster } from '../hooks/useDealRoster'
import { DEAL_SESSION_CHANGED_EVENT, GAME_DEAL_KEY, subscribeSeatClaims, createDealVoteSession } from '../lib/DealSession'
import { useStoryteller } from '../components/StorytellerSub/useStoryteller'
import { STORAGE_KEY } from '../components/StorytellerSub/constants'
import { newestNominations } from '../utils/nominationHistory'
import type { DealSeatClaim } from '../lib/DealSession'
import type { VoteRecord } from '../components/StorytellerSub/types'

vi.mock('../lib/DealSession', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/DealSession')>(),
  subscribeSeatClaims: vi.fn(() => vi.fn()),
  subscribeActiveDealVote: vi.fn(() => vi.fn()),
  subscribeDealVoteResponses: vi.fn(() => vi.fn()),
  createDealVoteSession: vi.fn(async (_session, input) => ({ ...input, voteId: 'new-vote', currentIndex: 0 })),
}))

const makeDays = () => [1, 2].map(day => createDayState(day, createSeats(2), createTimerDefaults()))
beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

describe('claimed player names', () => {
  it('updates every day, ignores empty/unclaimed names, and preserves private seat data', () => {
    const days = makeDays()
    days[0].seats[0].characterId = 'imp'
    days[0].seats[0].stTags = ['poisoned']
    const updated = syncClaimedNames(days, [
      { seatNumber: 1, claimedByToken: 'a', playerName: ' Alice ' },
      { seatNumber: 2, claimedByToken: null, playerName: 'Unused' },
    ])
    expect(updated.map(d => d.seats[0].name)).toEqual(['Alice', 'Alice'])
    expect(updated[0].seats[0]).toMatchObject({ characterId: 'imp', stTags: ['poisoned'] })
    expect(updated[0].seats[1].name).toBe('Player 2')
    expect(syncClaimedNames(updated, [{ seatNumber: 1, claimedByToken: 'a', playerName: ' ' }])).toBe(updated)
  })

  it('connects when the assignment dialog creates a session and ignores an old game after switching', () => {
    const listeners = new Map<string, (claims: DealSeatClaim[]) => void>()
    const unsubscribe = vi.fn()
    vi.mocked(subscribeSeatClaims).mockImplementation((id, cb) => { listeners.set(id, cb); return unsubscribe })
    const { result, rerender } = renderHook(({ gameId }) => {
      const [days, setDays] = useState(makeDays)
      const session = useDealRoster(gameId, setDays)
      return { days, session }
    }, { initialProps: { gameId: 'game-a' } })
    expect(result.current.session).toBeNull()
    act(() => {
      localStorage.setItem(GAME_DEAL_KEY('game-a'), JSON.stringify({ sessionId: 'session-a', hostToken: 'host' }))
      window.dispatchEvent(new Event(DEAL_SESSION_CHANGED_EVENT))
    })
    expect(result.current.session?.sessionId).toBe('session-a')
    act(() => listeners.get('session-a')!([{ seatNumber: 1, claimedByToken: 'a', playerName: 'Alice' }]))
    expect(result.current.days.map(d => d.seats[0].name)).toEqual(['Alice', 'Alice'])
    rerender({ gameId: 'game-b' })
    expect(unsubscribe).toHaveBeenCalled()
    expect(result.current.session).toBeNull()
    act(() => listeners.get('session-a')!([{ seatNumber: 1, claimedByToken: 'a', playerName: 'Wrong game' }]))
    expect(result.current.days[0].seats[0].name).toBe('Alice')
  })
})

it('orders nominations by time, never by vote count, without mutating storage', () => {
  const votes = [{ id: '100', voteCount: 8 }, { id: '300', voteCount: 1 }, { id: '200', voteCount: 5 }] as VoteRecord[]
  expect(newestNominations(votes).map(v => v.id)).toEqual(['300', '200', '100'])
  expect(votes.map(v => v.id)).toEqual(['100', '300', '200'])
})

it('sends synchronized names and a 10-second remote vote instead of the 30-second speech timer', async () => {
  const days = makeDays()
  days[1].phase = 'nomination'
  days[1].voteDraft.actor = 1
  days[1].voteDraft.target = 2
  days[1].nominationTargetSeconds = 30
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ gameId: 'vote-game', days, selectedDayId: days[1].id }))
  localStorage.setItem(GAME_DEAL_KEY('vote-game'), JSON.stringify({ sessionId: 'vote-session', hostToken: 'host' }))
  vi.mocked(subscribeSeatClaims).mockImplementation((_id, callback) => {
    callback([{ seatNumber: 1, claimedByToken: 'a', playerName: 'Alice' }])
    return vi.fn()
  })
  const { result } = renderHook(() => useStoryteller({ language: 'en', scriptOptions: [] }))
  expect(result.current.days.map(d => d.seats[0].name)).toEqual(['Alice', 'Alice'])
  await act(() => result.current.startRemoteDealVote())
  expect(createDealVoteSession).toHaveBeenCalledWith('vote-session', expect.objectContaining({ perPlayerSeconds: 10, seatLabels: { '1': '#1 Alice', '2': '#2 Player 2' } }))
  expect(result.current.currentDay.votingState?.perPlayerSeconds).toBe(10)
  expect(result.current.currentDay.nominationTargetSeconds).toBe(30)
})
