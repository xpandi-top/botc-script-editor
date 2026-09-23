/**
 * DealGuestPage — seat self-claim guest flow tests.
 *
 * Covers picking an open seat, naming it, and the reveal-after-refresh
 * behavior once the ST has pushed a character onto an already-claimed seat.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'

import { I18nProvider } from '../context/I18nContext'
import { DealGuestPage } from '../components/DealGuestPage'
import { subscribeSeatClaims, subscribeActiveDealVote } from '../lib/DealSession'

let claimedSeatOnLoad: any = null

const SEATS = Array.from({ length: 5 }, (_, i) => ({ seatNumber: i + 1, claimedByToken: null, playerName: null, characterId: null }))

vi.mock('../lib/DealSession', () => ({
  getDealSession: vi.fn(async () => ({
    id: 'sess1', createdAt: {}, expiresAt: {}, hostToken: 'h', status: 'open', cardCount: 0, totalSeats: 5,
  })),
  getSeatClaims: vi.fn(async () => SEATS),
  findClaimedSeat: vi.fn(async () => claimedSeatOnLoad),
  claimSeat: vi.fn(async (_id: string, seatNumber: number, _token: string, playerName: string) => ({
    seatNumber, claimedByToken: 'guest-token-test', playerName, characterId: null,
  })),
  getGuestToken: vi.fn(() => 'guest-token-test'),
  markDealCharacterSeen: vi.fn(),
  // Reflects claimedSeatOnLoad into the live snapshot so the seatClaimed
  // live-subscription effect doesn't clobber the loaded seat with a blank one.
  subscribeSeatClaims: vi.fn((_id: string, cb: (v: unknown[]) => void) => {
    const seats = claimedSeatOnLoad
      ? SEATS.map((s) => (s.seatNumber === claimedSeatOnLoad.seatNumber ? claimedSeatOnLoad : s))
      : SEATS
    cb(seats)
    return () => {}
  }),
  subscribeActiveDealVote: vi.fn((_id: string, cb: (v: null) => void) => { cb(null); return () => {} }),
  subscribeDealVoteResponses: vi.fn((_id: string, _voteId: string, cb: (v: unknown[]) => void) => { cb([]); return () => {} }),
  submitDealVoteResponse: vi.fn(),
  subscribeSeatMessages: vi.fn((_id: string, _seat: number, cb: (v: unknown[]) => void) => { cb([]); return () => {} }),
  sendMessage: vi.fn(),
  markMessageRead: vi.fn(),
}))

function withI18n(node: React.ReactElement) {
  return <I18nProvider language="en">{node}</I18nProvider>
}

afterEach(() => { claimedSeatOnLoad = null })

describe('DealGuestPage — seat pick + naming step', () => {
  it('renders the open seat grid', async () => {
    render(withI18n(<DealGuestPage sessionId="sess1" language="en" />))

    expect(await screen.findByText(/pick your seat/i)).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#5')).toBeInTheDocument()
  })

  it('shows a required error when confirming an empty name', async () => {
    render(withI18n(<DealGuestPage sessionId="sess1" language="en" />))

    fireEvent.click(await screen.findByText('#3'))
    expect(await screen.findByText(/confirm your seat/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /claim this seat/i }))
    expect(await screen.findByText(/required/i)).toBeInTheDocument()
  })

  it('claims the seat once a name is entered and shows the waiting state', async () => {
    render(withI18n(<DealGuestPage sessionId="sess1" language="en" />))

    fireEvent.click(await screen.findByText('#3'))
    const nameField = await screen.findByLabelText(/player name/i)
    fireEvent.change(nameField, { target: { value: 'Alice' } })
    fireEvent.click(screen.getByRole('button', { name: /claim this seat/i }))

    await waitFor(() => {
      expect(screen.getByText(/wait for the storyteller/i)).toBeInTheDocument()
    })
  })
})

// ── Fix: reveal-after-refresh (Show My Character button) ────────────────────

describe('DealGuestPage — reshowing an already-claimed seat character', () => {
  it('loading an already-claimed seat (e.g. after a refresh) hides the character behind a button', async () => {
    claimedSeatOnLoad = { seatNumber: 3, claimedByToken: 'guest-token-test', playerName: 'Alice', characterId: 'washerwoman' }

    render(withI18n(<DealGuestPage sessionId="sess1" language="en" />))

    expect(await screen.findByText(/character hidden/i)).toBeInTheDocument()
    expect(screen.queryByText('Washerwoman')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show my character/i })).toBeInTheDocument()
  })

  it('clicking "Show My Character" reveals the assigned character again', async () => {
    claimedSeatOnLoad = { seatNumber: 3, claimedByToken: 'guest-token-test', playerName: 'Alice', characterId: 'washerwoman' }

    render(withI18n(<DealGuestPage sessionId="sess1" language="en" />))

    const showBtn = await screen.findByRole('button', { name: /show my character/i })
    fireEvent.click(showBtn)

    await waitFor(() => {
      expect(screen.getByText('Washerwoman')).toBeInTheDocument()
    })
    expect(screen.queryByText(/character hidden/i)).not.toBeInTheDocument()
  })

  it('shows the waiting message when the claimed seat has no character yet', async () => {
    claimedSeatOnLoad = { seatNumber: 3, claimedByToken: 'guest-token-test', playerName: 'Alice', characterId: null }

    render(withI18n(<DealGuestPage sessionId="sess1" language="en" />))

    expect(await screen.findByText(/wait for the storyteller/i)).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})


describe('live player privacy', () => {
  it('does not automatically reveal a newly delivered role', async () => {
    claimedSeatOnLoad = { seatNumber: 3, claimedByToken: 'guest-token-test', playerName: 'Alice', characterId: null }
    render(withI18n(<DealGuestPage sessionId="sess1" language="en" />))
    await screen.findByText(/wait for the storyteller/i)
    const callback = vi.mocked(subscribeSeatClaims).mock.calls.at(-1)![1]
    act(() => callback([{ ...claimedSeatOnLoad, characterId: 'washerwoman' }]))
    expect(await screen.findByText(/character hidden/i)).toBeInTheDocument()
    expect(screen.queryByText('Washerwoman')).not.toBeInTheDocument()
  })

  it('hides an open role on each new nomination but allows explicit reopening', async () => {
    claimedSeatOnLoad = { seatNumber: 3, claimedByToken: 'guest-token-test', playerName: 'Alice', characterId: 'washerwoman' }
    render(withI18n(<DealGuestPage sessionId="sess1" language="en" />))
    fireEvent.click(await screen.findByRole('button', { name: /show my character/i }))
    expect(await screen.findByText('Washerwoman')).toBeInTheDocument()
    const callback = vi.mocked(subscribeActiveDealVote).mock.calls.at(-1)![1]
    const now = Date.now()
    const vote = { voteId: 'vote-1', actorSeat: 1, targetSeat: 2, requiredVotes: 3, votingOrder: [3, 4], currentIndex: 0, perPlayerSeconds: 10, noVoteSeats: [], status: 'active' as const, startedAt: { toMillis: () => now }, deadlineAt: { toMillis: () => now + 10000 } } as any
    act(() => callback(vote))
    expect(screen.queryByText('Washerwoman')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /show my character/i }))
    expect(await screen.findByText('Washerwoman')).toBeInTheDocument()
    act(() => callback({ ...vote, currentIndex: 1 }))
    expect(screen.getByText('Washerwoman')).toBeInTheDocument()
    act(() => callback({ ...vote, voteId: 'vote-2' }))
    expect(screen.queryByText('Washerwoman')).not.toBeInTheDocument()
  })
})
