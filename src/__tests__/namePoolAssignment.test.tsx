/**
 * Name pool assignment — clicking a pool chip assigns to the focused seat, not seat 1.
 *
 * Bug: handlePoolNameClick always assigned to first available seat regardless
 * of which field was focused.
 * Fix: focusedSeatRef tracks last-focused seat; pool click targets that seat.
 *
 * Tests:
 *  - Pool click with no focus → falls back to first empty seat
 *  - Pool click after focusing seat 2 → assigns to seat 2 (not seat 1)
 *  - Pool click after focusing seat 3 → assigns to seat 3 even if seat 1 is empty
 *  - Pool click after focusing a seat that already has a name → overwrites it
 *  - No focused seat, all seats filled → does nothing
 *  - Focus changes between clicks — each click goes to currently-focused seat
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { PlayersTab } from '../components/StorytellerSub/Modals/ModalsNewGamePlayersTab'

// ── Test helpers ──────────────────────────────────────────────────────────────

function makePanel(seatNames: Record<number, string> = {}) {
  return {
    playerCount: 5,
    travelerCount: 0,
    seatNames: {
      1: 'Player 1', 2: 'Player 2', 3: 'Player 3', 4: 'Player 4', 5: 'Player 5',
      ...seatNames,
    },
  }
}

const SEATS = [1, 2, 3, 4, 5]
const POOL = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve']

function renderTab(
  panelOverride: Record<number, string> = {},
  updateConfig = vi.fn(),
) {
  const panel = makePanel(panelOverride)
  render(
    <PlayersTab
      newGamePanel={panel}
      playerNamePool={POOL}
      language="en"
      seats={SEATS}
      updateConfig={updateConfig}
      setPlayerNamePool={vi.fn()}
    />
  )
  // Open the name pool
  fireEvent.click(screen.getByText('Name Pool'))
  return { panel, updateConfig }
}

// ── No focus — fallback to first empty/default seat ──────────────────────────

describe('pool click — no focused seat', () => {
  it('assigns to first seat with default name when nothing focused', () => {
    const updateConfig = vi.fn()
    renderTab({}, updateConfig)

    // Click "Alice" without focusing any field first
    fireEvent.click(screen.getByText('Alice'))

    expect(updateConfig).toHaveBeenCalledWith({
      seatNames: expect.objectContaining({ 1: 'Alice' }),
    })
  })

  it('skips filled seats; assigns to first default-named seat', () => {
    const updateConfig = vi.fn()
    // seat 1 already has a real name
    renderTab({ 1: 'Zara' }, updateConfig)

    fireEvent.click(screen.getByText('Bob'))

    // seat 1 = Zara (filled), first default is seat 2 = "Player 2"
    expect(updateConfig).toHaveBeenCalledWith({
      seatNames: expect.objectContaining({ 2: 'Bob' }),
    })
    // seat 1 must NOT be overwritten
    const call = updateConfig.mock.calls[0][0]
    expect(call.seatNames[1]).toBe('Zara')
  })

  it('does nothing when all seats are filled and no seat is focused', () => {
    const updateConfig = vi.fn()
    renderTab({ 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' }, updateConfig)

    fireEvent.click(screen.getByText('Alice'))

    expect(updateConfig).not.toHaveBeenCalled()
  })
})

// ── With focused seat — assigns to focused seat regardless of order ────────────

describe('pool click — with focused seat', () => {
  it('assigns to seat 2 when seat 2 input is focused', () => {
    const updateConfig = vi.fn()
    renderTab({}, updateConfig)

    // Focus seat 2 input
    const comboboxes = screen.getAllByRole('combobox')
    // comboboxes[0..4] = seats 1-5
    const seat2Input = comboboxes[1] // index 1 = seat 2
    fireEvent.focus(seat2Input)

    fireEvent.click(screen.getByText('Carol'))

    const call = updateConfig.mock.calls[0][0]
    expect(call.seatNames[2]).toBe('Carol')
    // seat 1 must NOT be assigned
    expect(call.seatNames[1]).toBe('Player 1')
  })

  it('assigns to seat 3 when seat 3 is focused, even if seat 1 and 2 are empty', () => {
    const updateConfig = vi.fn()
    renderTab({}, updateConfig)

    const comboboxes = screen.getAllByRole('combobox')
    const seat3Input = comboboxes[2] // index 2 = seat 3
    fireEvent.focus(seat3Input)

    fireEvent.click(screen.getByText('Dave'))

    const call = updateConfig.mock.calls[0][0]
    expect(call.seatNames[3]).toBe('Dave')
    expect(call.seatNames[1]).toBe('Player 1')
    expect(call.seatNames[2]).toBe('Player 2')
  })

  it('overwrites existing name in focused seat', () => {
    const updateConfig = vi.fn()
    renderTab({ 2: 'OldName' }, updateConfig)

    const comboboxes = screen.getAllByRole('combobox')
    fireEvent.focus(comboboxes[1]) // seat 2

    fireEvent.click(screen.getByText('Eve'))

    const call = updateConfig.mock.calls[0][0]
    expect(call.seatNames[2]).toBe('Eve')
  })

  it('assigns to seat 5 when seat 5 is focused', () => {
    const updateConfig = vi.fn()
    renderTab({}, updateConfig)

    const comboboxes = screen.getAllByRole('combobox')
    fireEvent.focus(comboboxes[4]) // seat 5

    fireEvent.click(screen.getByText('Alice'))

    const call = updateConfig.mock.calls[0][0]
    expect(call.seatNames[5]).toBe('Alice')
    // Seats 1-4 untouched
    expect(call.seatNames[1]).toBe('Player 1')
    expect(call.seatNames[4]).toBe('Player 4')
  })
})

// ── Focus changes between clicks ──────────────────────────────────────────────

describe('pool click — focus changes between clicks', () => {
  it('each click respects the currently focused seat', () => {
    const calls: any[] = []
    const updateConfig = vi.fn((patch) => calls.push(patch))

    // Initial seatNames — we need to rebuild the panel manually for each click
    // since updateConfig is mocked (doesn't actually mutate state).
    // Two separate render calls is cleaner.

    // First: focus seat 4, click Alice
    const { unmount } = render(
      <PlayersTab
        newGamePanel={makePanel()}
        playerNamePool={POOL}
        language="en"
        seats={SEATS}
        updateConfig={updateConfig}
        setPlayerNamePool={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Name Pool'))
    const comboboxes = screen.getAllByRole('combobox')
    fireEvent.focus(comboboxes[3]) // seat 4
    fireEvent.click(screen.getByText('Bob'))

    expect(calls[0].seatNames[4]).toBe('Bob')
    expect(calls[0].seatNames[1]).toBe('Player 1')

    unmount()
    calls.length = 0

    // Second: focus seat 2, click Carol
    render(
      <PlayersTab
        newGamePanel={makePanel()}
        playerNamePool={POOL}
        language="en"
        seats={SEATS}
        updateConfig={updateConfig}
        setPlayerNamePool={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Name Pool'))
    const comboboxes2 = screen.getAllByRole('combobox')
    fireEvent.focus(comboboxes2[1]) // seat 2
    fireEvent.click(screen.getByText('Carol'))

    expect(calls[0].seatNames[2]).toBe('Carol')
    expect(calls[0].seatNames[4]).toBe('Player 4')
  })
})

// ── handlePoolNameClick pure logic (unit-level) ───────────────────────────────

describe('pool assignment logic — pure unit', () => {
  /**
   * Replicate the pure logic of handlePoolNameClick to test in isolation,
   * independent of React rendering and focus events.
   */
  function poolAssign(
    name: string,
    seats: number[],
    seatNames: Record<number, string>,
    focusedSeat: number | null,
  ): Record<number, string> | null {
    const target = focusedSeat ?? seats.find((n) => {
      const cur = seatNames[n] ?? ''
      return !cur || /^Player \d+$|^Traveler \d+$/.test(cur)
    })
    if (target == null) return null
    return { ...seatNames, [target]: name }
  }

  const defaultNames = { 1: 'Player 1', 2: 'Player 2', 3: 'Player 3' }
  const seats = [1, 2, 3]

  it('no focus → first empty/default seat', () => {
    const result = poolAssign('Alice', seats, defaultNames, null)
    expect(result![1]).toBe('Alice')
  })

  it('focused seat 2 → assigns to seat 2', () => {
    const result = poolAssign('Alice', seats, defaultNames, 2)
    expect(result![2]).toBe('Alice')
    expect(result![1]).toBe('Player 1')
  })

  it('focused seat 3 → assigns to seat 3 regardless of empty earlier seats', () => {
    const result = poolAssign('Bob', seats, defaultNames, 3)
    expect(result![3]).toBe('Bob')
    expect(result![1]).toBe('Player 1')
    expect(result![2]).toBe('Player 2')
  })

  it('focused seat with existing real name → overwrites', () => {
    const names = { 1: 'Zara', 2: 'Player 2', 3: 'Player 3' }
    const result = poolAssign('Carol', seats, names, 1)
    expect(result![1]).toBe('Carol')
  })

  it('no focus, all seats filled → returns null', () => {
    const full = { 1: 'A', 2: 'B', 3: 'C' }
    expect(poolAssign('Dave', seats, full, null)).toBeNull()
  })

  it('focused seat always wins even if all other seats are empty', () => {
    const result = poolAssign('Eve', seats, defaultNames, 3)
    expect(result![3]).toBe('Eve')
  })
})
