/**
 * P1 — Night phase: wake-order dense-rank algorithm.
 *
 * The seat wake-order badge in ArenaSeat/MobileSeatCard shows a dense rank
 * (32,37,37,52 → 1,2,2,3) relative to the seats that appear on the current
 * night list. This tests the algorithm extracted from the component logic.
 *
 * Also covers getEffectiveNightOrderFromRegistry() to confirm it returns
 * a valid night order structure.
 */
import { describe, it, expect } from 'vitest'
import { getEffectiveNightOrderFromRegistry } from '../catalog'

// ── Wake-order dense-rank algorithm (extracted from ArenaSeat) ────────────────

/**
 * Replicate the component's dense-rank logic.
 * Returns the 1-based dense rank for `charId` within `seatChars` given `nightList`.
 * Returns null if charId is not in nightList.
 */
function computeWakeOrder(
  charId: string,
  seatChars: string[],  // all perceived charIds for seats in this game
  nightList: string[],  // night order (indexes = positions)
): number | null {
  const rawPos = (() => {
    const idx = nightList.indexOf(charId)
    return idx !== -1 ? idx + 1 : null
  })()
  if (rawPos === null) return null

  const allRaw = seatChars
    .map((c) => { const i = nightList.indexOf(c); return i !== -1 ? i + 1 : null })
    .filter((p): p is number => p !== null)

  const sortedUnique = [...new Set(allRaw)].sort((a, b) => a - b)
  const rankMap = new Map(sortedUnique.map((pos, i) => [pos, i + 1]))
  return rankMap.get(rawPos) ?? null
}

// ── Dense rank algorithm ──────────────────────────────────────────────────────

describe('wake-order dense rank', () => {
  const nightList = ['a', 'b', 'c', 'd', 'e']  // positions 1-5

  it('single char in night list → rank 1', () => {
    expect(computeWakeOrder('a', ['a'], nightList)).toBe(1)
  })

  it('two chars, a before b → 1 and 2', () => {
    expect(computeWakeOrder('a', ['a', 'b'], nightList)).toBe(1)
    expect(computeWakeOrder('b', ['a', 'b'], nightList)).toBe(2)
  })

  it('gaps compressed: positions 1,3,5 → ranks 1,2,3', () => {
    const seatChars = ['a', 'c', 'e']
    expect(computeWakeOrder('a', seatChars, nightList)).toBe(1)
    expect(computeWakeOrder('c', seatChars, nightList)).toBe(2)
    expect(computeWakeOrder('e', seatChars, nightList)).toBe(3)
  })

  it('ties preserved: two chars at position 3 (same char) → same rank', () => {
    // positions 3 and 5 used, seats have [c, c, e]
    const seatChars = ['c', 'c', 'e']
    expect(computeWakeOrder('c', seatChars, nightList)).toBe(1)
    expect(computeWakeOrder('e', seatChars, nightList)).toBe(2)
  })

  it('char not in night list → null', () => {
    expect(computeWakeOrder('z', ['a', 'z'], nightList)).toBeNull()
  })

  it('char in night list but NOT in seatChars → still ranked (as if only it exists)', () => {
    // computeWakeOrder for 'a' when other seats have chars not in nightList
    const seatChars = ['a', 'z']  // z not in nightList
    expect(computeWakeOrder('a', seatChars, nightList)).toBe(1)
  })

  it('all chars same position → all rank 1', () => {
    // only position 2 used
    const seatChars = ['b', 'b', 'b']
    expect(computeWakeOrder('b', seatChars, nightList)).toBe(1)
  })

  it('realistic 4-seat: positions 2,4,4,5 → ranks 1,2,2,3', () => {
    // nightList positions: b=2, d=4, e=5
    const seatChars = ['b', 'd', 'd', 'e']
    expect(computeWakeOrder('b', seatChars, nightList)).toBe(1)
    expect(computeWakeOrder('d', seatChars, nightList)).toBe(2)
    expect(computeWakeOrder('e', seatChars, nightList)).toBe(3)
  })
})

// ── getEffectiveNightOrderFromRegistry ────────────────────────────────────────

describe('getEffectiveNightOrderFromRegistry', () => {
  it('returns object with first_night and other_nights arrays', () => {
    const order = getEffectiveNightOrderFromRegistry()
    expect(order).toHaveProperty('first_night')
    expect(order).toHaveProperty('other_nights')
    expect(Array.isArray(order.first_night)).toBe(true)
    expect(Array.isArray(order.other_nights)).toBe(true)
  })

  it('first_night is non-empty (has at least DUSK/MINION INFO etc)', () => {
    const order = getEffectiveNightOrderFromRegistry()
    expect(order.first_night.length).toBeGreaterThan(0)
  })

  it('other_nights is non-empty', () => {
    const order = getEffectiveNightOrderFromRegistry()
    expect(order.other_nights.length).toBeGreaterThan(0)
  })

  it('all entries are strings', () => {
    const order = getEffectiveNightOrderFromRegistry()
    for (const entry of [...order.first_night, ...order.other_nights]) {
      expect(typeof entry).toBe('string')
    }
  })

  it('known base-game chars appear in other_nights (imp, washerwoman, etc)', () => {
    const order = getEffectiveNightOrderFromRegistry()
    // imp acts at night — should be in other_nights
    expect(order.other_nights).toContain('imp')
  })
})
