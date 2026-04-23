import { describe, it, expect } from 'vitest'
import {
  livingNonTravelers,
  eligibleVoters,
  regularSeats,
  travelerSeats,
  findSeat,
  getSeatPosition,
  getSeatAngle,
} from '../utils/seats'
import type { StorytellerSeat } from '../components/StorytellerSub/types'

function makeSeat(overrides: Partial<StorytellerSeat>): StorytellerSeat {
  return {
    seat: 1,
    name: 'Player',
    alive: true,
    isTraveler: false,
    isExecuted: false,
    hasNoVote: false,
    customTags: [],
    stTags: [],
    characterId: null,
    userCharacterId: null,
    teamTag: null,
    note: '',
    ...overrides,
  }
}

const seats: StorytellerSeat[] = [
  makeSeat({ seat: 1, alive: true,  isTraveler: false }),
  makeSeat({ seat: 2, alive: false, isTraveler: false }),
  makeSeat({ seat: 3, alive: true,  isTraveler: true  }),
  makeSeat({ seat: 4, alive: false, isTraveler: true  }),
  makeSeat({ seat: 5, alive: true,  isTraveler: false, hasNoVote: true }),
]

// ── livingNonTravelers ──────────────────────────────────────────────────────

describe('livingNonTravelers', () => {
  it('returns only alive non-traveler seats', () => {
    const result = livingNonTravelers(seats)
    // seat 1: alive non-traveler ✓  seat 5: alive non-traveler (hasNoVote doesn't affect this filter) ✓
    expect(result.map((s) => s.seat)).toEqual([1, 5])
  })

  it('returns empty array when all dead', () => {
    const dead = seats.map((s) => ({ ...s, alive: false }))
    expect(livingNonTravelers(dead)).toHaveLength(0)
  })

  it('excludes travelers even if alive', () => {
    const result = livingNonTravelers(seats)
    expect(result.every((s) => !s.isTraveler)).toBe(true)
  })
})

// ── eligibleVoters ──────────────────────────────────────────────────────────

describe('eligibleVoters', () => {
  it('returns seat numbers of players without hasNoVote', () => {
    const result = eligibleVoters(seats)
    expect(result).toContain(1)
    expect(result).toContain(2)
    expect(result).not.toContain(5)
  })

  it('returns empty array when all have hasNoVote', () => {
    const noVoters = seats.map((s) => ({ ...s, hasNoVote: true }))
    expect(eligibleVoters(noVoters)).toHaveLength(0)
  })

  it('returns seat numbers (not full objects)', () => {
    const result = eligibleVoters(seats)
    expect(result.every((v) => typeof v === 'number')).toBe(true)
  })
})

// ── regularSeats ────────────────────────────────────────────────────────────

describe('regularSeats', () => {
  it('excludes travelers', () => {
    const result = regularSeats(seats)
    expect(result.every((s) => !s.isTraveler)).toBe(true)
  })

  it('includes dead non-travelers', () => {
    const result = regularSeats(seats)
    expect(result.map((s) => s.seat)).toContain(2) // dead non-traveler
  })
})

// ── travelerSeats ───────────────────────────────────────────────────────────

describe('travelerSeats', () => {
  it('returns only travelers', () => {
    const result = travelerSeats(seats)
    expect(result.every((s) => s.isTraveler)).toBe(true)
    expect(result.map((s) => s.seat)).toEqual([3, 4])
  })

  it('returns empty when no travelers', () => {
    const noTravelers = seats.filter((s) => !s.isTraveler)
    expect(travelerSeats(noTravelers)).toHaveLength(0)
  })
})

// ── findSeat ────────────────────────────────────────────────────────────────

describe('findSeat', () => {
  it('finds seat by number', () => {
    expect(findSeat(seats, 3)?.seat).toBe(3)
  })

  it('returns null for missing seat', () => {
    expect(findSeat(seats, 99)).toBeNull()
  })

  it('returns first match when duplicates exist', () => {
    const dup = [...seats, makeSeat({ seat: 1, name: 'Duplicate' })]
    expect(findSeat(dup, 1)?.name).toBe('Player')
  })
})

// ── getSeatPosition ─────────────────────────────────────────────────────────

describe('getSeatPosition', () => {
  it('returns values in [0, 100] range', () => {
    for (let i = 0; i < 8; i++) {
      const { left, top } = getSeatPosition(i, 8, false)
      expect(left).toBeGreaterThanOrEqual(0)
      expect(left).toBeLessThanOrEqual(100)
      expect(top).toBeGreaterThanOrEqual(0)
      expect(top).toBeLessThanOrEqual(100)
    }
  })

  it('distributes seats across perimeter (not all same position)', () => {
    const positions = Array.from({ length: 8 }, (_, i) => getSeatPosition(i, 8, false))
    const uniqueLeft = new Set(positions.map((p) => Math.round(p.left)))
    expect(uniqueLeft.size).toBeGreaterThan(1)
  })

  it('portrait uses different W/H ratio than landscape', () => {
    const portrait = getSeatPosition(0, 4, true)
    const landscape = getSeatPosition(0, 4, false)
    expect(portrait.left).not.toEqual(landscape.left)
  })

  it('first and last seat are not the same position', () => {
    const first = getSeatPosition(0, 6, false)
    const last  = getSeatPosition(5, 6, false)
    expect(first).not.toEqual(last)
  })
})

// ── getSeatAngle ────────────────────────────────────────────────────────────

describe('getSeatAngle', () => {
  it('returns angle in [-180, 180] range', () => {
    for (let i = 0; i < 10; i++) {
      const angle = getSeatAngle(i, 10, false)
      expect(angle).toBeGreaterThanOrEqual(-180)
      expect(angle).toBeLessThanOrEqual(180)
    }
  })

  it('different seats have different angles', () => {
    const a0 = getSeatAngle(0, 4, false)
    const a1 = getSeatAngle(1, 4, false)
    expect(a0).not.toBeCloseTo(a1, 1)
  })
})
