import { describe, it, expect } from 'vitest'
import {
  livingNonTravelers,
  eligibleVoters,
  regularSeats,
  travelerSeats,
  findSeat,
  getSeatPosition,
  getSeatAngle,
  nominationThreshold,
  exileThreshold,
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

// ── nominationThreshold ──────────────────────────────────────────────────────
// Threshold = ceil(livingNonTravelers / 2), minimum 1.
// Dead players and exiled travelers reduce the pool.

describe('nominationThreshold', () => {
  it.each([
    // [description, aliveCount, deadCount, travelerAliveCount, expected]
    ['5 alive non-travelers',           5, 0, 0, 3],
    ['6 alive non-travelers',           6, 0, 0, 3],
    ['7 alive non-travelers',           7, 0, 0, 4],
    ['10 alive non-travelers',         10, 0, 0, 5],
    ['3 alive, 2 dead non-travelers',   3, 2, 0, 2],
    ['2 alive, 4 dead non-travelers',   2, 4, 0, 1],
    ['0 alive (all dead) → min 1',      0, 5, 0, 1],
    ['travelers excluded from pool',    5, 0, 3, 3],
    ['dead travelers also excluded',    5, 0, 2, 3],
  ])('%s', (_, aliveNT, deadNT, travelersAlive, expected) => {
    const s = [
      ...Array.from({ length: aliveNT },  (__, i) => makeSeat({ seat: i + 1,                            alive: true,  isTraveler: false })),
      ...Array.from({ length: deadNT },   (__, i) => makeSeat({ seat: 100 + i,                          alive: false, isTraveler: false })),
      ...Array.from({ length: travelersAlive }, (__, i) => makeSeat({ seat: 200 + i,                   alive: true,  isTraveler: true  })),
    ]
    expect(nominationThreshold(s)).toBe(expected)
  })

  it('dead traveler does not count toward threshold', () => {
    // 5 alive non-travelers + 1 dead traveler → threshold = ceil(5/2) = 3
    const s = [
      ...Array.from({ length: 5 }, (_, i) => makeSeat({ seat: i + 1, alive: true,  isTraveler: false })),
      makeSeat({ seat: 10, alive: false, isTraveler: true }),
    ]
    expect(nominationThreshold(s)).toBe(3)
  })

  it('only dead non-travelers reduce the pool', () => {
    // 8 alive + 2 dead → pool = 8 → threshold = ceil(8/2) = 4
    const alive = Array.from({ length: 8 }, (_, i) => makeSeat({ seat: i + 1, alive: true }))
    const dead  = Array.from({ length: 2 }, (_, i) => makeSeat({ seat: 20 + i, alive: false }))
    expect(nominationThreshold([...alive, ...dead])).toBe(4)
  })

  it('minimum is 1 even with empty seat list', () => {
    expect(nominationThreshold([])).toBe(1)
  })
})

// ── exileThreshold ───────────────────────────────────────────────────────────
// Exile threshold = ceil(total seats / 2), minimum 1.
// ALL seats count (alive, dead, travelers included).

describe('exileThreshold', () => {
  it.each([
    ['4 total seats',  4, 2],
    ['5 total seats',  5, 3],
    ['10 total seats', 10, 5],
    ['11 total seats', 11, 6],
    ['1 total seat',   1, 1],
  ])('%s → %d', (_, count, expected) => {
    const s = Array.from({ length: count }, (__, i) => makeSeat({ seat: i + 1 }))
    expect(exileThreshold(s)).toBe(expected)
  })

  it('includes dead seats in count', () => {
    const s = [
      makeSeat({ seat: 1, alive: true  }),
      makeSeat({ seat: 2, alive: false }),
      makeSeat({ seat: 3, alive: false }),
      makeSeat({ seat: 4, alive: true  }),
    ]
    expect(exileThreshold(s)).toBe(2) // ceil(4/2)
  })

  it('includes travelers in count', () => {
    const s = [
      ...Array.from({ length: 5 }, (_, i) => makeSeat({ seat: i + 1, isTraveler: false })),
      makeSeat({ seat: 6, isTraveler: true }),
    ]
    expect(exileThreshold(s)).toBe(3) // ceil(6/2)
  })

  it('minimum is 1 for empty list', () => {
    expect(exileThreshold([])).toBe(1)
  })
})

// ── nomination vs exile threshold comparison ─────────────────────────────────

describe('nominationThreshold vs exileThreshold', () => {
  it('exile threshold ≥ nomination threshold when travelers/dead exist', () => {
    const s = [
      ...Array.from({ length: 5 }, (_, i) => makeSeat({ seat: i + 1, alive: true,  isTraveler: false })),
      makeSeat({ seat: 6, alive: false, isTraveler: false }),   // dead
      makeSeat({ seat: 7, alive: true,  isTraveler: true  }),   // traveler
    ]
    // nomination: ceil(5/2) = 3; exile: ceil(7/2) = 4
    expect(nominationThreshold(s)).toBe(3)
    expect(exileThreshold(s)).toBe(4)
    expect(exileThreshold(s)).toBeGreaterThanOrEqual(nominationThreshold(s))
  })

  it('thresholds are equal when all seats are alive non-travelers', () => {
    const s = Array.from({ length: 6 }, (_, i) => makeSeat({ seat: i + 1, alive: true, isTraveler: false }))
    expect(nominationThreshold(s)).toBe(exileThreshold(s))
  })
})
