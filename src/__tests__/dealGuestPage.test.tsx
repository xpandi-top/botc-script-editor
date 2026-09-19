/**
 * DealGuestPage — guest-side "enter your info" form tests.
 *
 * Covers the fix making the name/seat entry step more obvious: fields are
 * grouped in a labeled card with icons and a persistent helper explaining
 * what "seat" means, instead of two bare floating text fields.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

import { I18nProvider } from '../context/I18nContext'
import { DealGuestPage } from '../components/DealGuestPage'

vi.mock('../lib/firebaseDeal', () => ({
  getDealSession: vi.fn(async () => ({
    id: 'sess1', createdAt: {}, expiresAt: {}, hostToken: 'h', status: 'open', cardCount: 5,
  })),
  getGuestCards: vi.fn(async () => Array.from({ length: 5 }, (_, i) => ({ position: i }))),
  findClaimedCard: vi.fn(async () => null),
  claimCard: vi.fn(),
  getGuestToken: vi.fn(() => 'guest-token-test'),
  hasSeenDealCharacter: vi.fn(() => false),
  markDealCharacterSeen: vi.fn(),
  subscribeActiveDealVote: vi.fn((_id: string, cb: (v: null) => void) => { cb(null); return () => {} }),
  subscribeDealVoteResponses: vi.fn((_id: string, _voteId: string, cb: (v: unknown[]) => void) => { cb([]); return () => {} }),
  submitDealVoteResponse: vi.fn(),
}))

function withI18n(node: React.ReactElement) {
  return <I18nProvider language="en">{node}</I18nProvider>
}

describe('DealGuestPage — name entry step', () => {
  it('renders name + seat fields grouped with a section label and seat helper text', async () => {
    render(withI18n(<DealGuestPage sessionId="sess1" language="en" />))

    expect(await screen.findByLabelText(/player name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/seat/i)).toBeInTheDocument()
    expect(screen.getByText(/enter your info to begin/i)).toBeInTheDocument()
    expect(screen.getByText(/the seat number the storyteller assigned you/i)).toBeInTheDocument()
  })

  it('shows required errors when submitting empty fields', async () => {
    render(withI18n(<DealGuestPage sessionId="sess1" language="en" />))

    const button = await screen.findByRole('button', { name: /view cards/i })
    fireEvent.click(button)

    const requiredMessages = await screen.findAllByText(/required/i)
    expect(requiredMessages.length).toBeGreaterThanOrEqual(2)
  })

  it('advances to the card grid once both fields are filled', async () => {
    render(withI18n(<DealGuestPage sessionId="sess1" language="en" />))

    const nameField = await screen.findByLabelText(/player name/i)
    const seatField = screen.getByLabelText(/seat/i)
    fireEvent.change(nameField, { target: { value: 'Alice' } })
    fireEvent.change(seatField, { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /view cards/i }))

    await waitFor(() => {
      expect(screen.getByText(/pick your character card/i)).toBeInTheDocument()
    })
  })
})
