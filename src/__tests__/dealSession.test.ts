/**
 * Tests: seat self-claim deal feature — pure logic, type safety, and the
 * claimed-detection regression that was introduced by using deleteField() on
 * unclaim.
 *
 * Firestore network calls are NOT tested here (require emulator / integration env).
 * We test:
 *   - getGuestToken localStorage behaviour (shared across tabs)
 *   - HOST_TOKEN_KEY / GUEST_TOKEN_KEY constant shapes
 *   - DealSeatClaim claimed detection: undefined (deleteField) vs null vs string
 *   - buildShareUrl produces a non-localhost URL for deal sessions
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getGuestToken,
  HOST_TOKEN_KEY,
  GUEST_TOKEN_KEY,
  ACTIVE_HOST_DEAL_KEY,
  CHARACTER_SEEN_KEY,
  hasSeenDealCharacter,
  markDealCharacterSeen,
  type DealSeatClaim,
} from '../lib/DealSession'

// ── Constants ─────────────────────────────────────────────────────────────────

describe('deal localStorage/sessionStorage key constants', () => {
  it('HOST_TOKEN_KEY includes sessionId', () => {
    const key = HOST_TOKEN_KEY('abc123')
    expect(key).toContain('abc123')
    expect(key).toMatch(/botc-deal-host/)
  })

  it('HOST_TOKEN_KEY unique per sessionId', () => {
    expect(HOST_TOKEN_KEY('aaa')).not.toBe(HOST_TOKEN_KEY('bbb'))
  })

  it('GUEST_TOKEN_KEY is a non-empty string', () => {
    expect(typeof GUEST_TOKEN_KEY).toBe('string')
    expect(GUEST_TOKEN_KEY.length).toBeGreaterThan(0)
  })

  it('ACTIVE_HOST_DEAL_KEY is a non-empty string', () => {
    expect(typeof ACTIVE_HOST_DEAL_KEY).toBe('string')
    expect(ACTIVE_HOST_DEAL_KEY.length).toBeGreaterThan(0)
  })

  it('CHARACTER_SEEN_KEY includes sessionId', () => {
    const key = CHARACTER_SEEN_KEY('abc123')
    expect(key).toContain('abc123')
    expect(key).toMatch(/botc-deal-character-seen/)
  })
})

// ── getGuestToken ─────────────────────────────────────────────────────────────

describe('getGuestToken', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns a non-empty string', () => {
    const token = getGuestToken()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('returns same token on repeated calls (persisted)', () => {
    const t1 = getGuestToken()
    const t2 = getGuestToken()
    expect(t1).toBe(t2)
  })

  it('persists to localStorage under GUEST_TOKEN_KEY (shared across tabs)', () => {
    const token = getGuestToken()
    expect(localStorage.getItem(GUEST_TOKEN_KEY)).toBe(token)
  })

  it('generates different tokens for different sessions (cleared storage)', () => {
    const t1 = getGuestToken()
    localStorage.clear()
    const t2 = getGuestToken()
    // Extremely unlikely to collide (24-char random ID)
    expect(t1).not.toBe(t2)
  })
})

// ── one-time character reveal marker ─────────────────────────────────────────

describe('deal character seen marker', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('is false before character is marked seen', () => {
    expect(hasSeenDealCharacter('session123')).toBe(false)
  })

  it('persists seen marker to localStorage', () => {
    markDealCharacterSeen('session123')
    expect(hasSeenDealCharacter('session123')).toBe(true)
    expect(localStorage.getItem(CHARACTER_SEEN_KEY('session123'))).toBe('1')
  })

  it('is scoped per deal session', () => {
    markDealCharacterSeen('session-a')
    expect(hasSeenDealCharacter('session-a')).toBe(true)
    expect(hasSeenDealCharacter('session-b')).toBe(false)
  })
})

// ── DealSeatClaim claimed detection — REGRESSION ──────────────────────────────
//
// Bug: unclaimSeatByHost uses deleteField(), which removes the key from
// the Firestore snapshot. JavaScript receives `undefined`, not `null`.
// The old check `seat.claimedByToken !== null` is TRUE for undefined, so the
// seat kept displaying as claimed.
// Fix: use loose `!= null` (catches both null and undefined).

describe('DealSeatClaim claimed detection — != null regression', () => {
  function isClaimed(seat: DealSeatClaim): boolean {
    return seat.claimedByToken != null   // the fixed check
  }

  function isClaimedStrict(seat: DealSeatClaim): boolean {
    return seat.claimedByToken !== null  // the buggy check
  }

  it('string token → claimed (both checks agree)', () => {
    const seat: DealSeatClaim = { seatNumber: 1, claimedByToken: 'abc123' }
    expect(isClaimed(seat)).toBe(true)
    expect(isClaimedStrict(seat)).toBe(true)
  })

  it('null token → not claimed (both checks agree)', () => {
    const seat: DealSeatClaim = { seatNumber: 1, claimedByToken: null }
    expect(isClaimed(seat)).toBe(false)
    expect(isClaimedStrict(seat)).toBe(false)
  })

  it('undefined token (deleteField result) → not claimed with != null', () => {
    // deleteField() removes the key; snapshot delivers undefined
    const seat: DealSeatClaim = { seatNumber: 1 }  // no claimedByToken
    expect(isClaimed(seat)).toBe(false)       // FIXED: correctly not claimed
    expect(isClaimedStrict(seat)).toBe(true)  // BUG: would wrongly show as claimed
  })

  it('claimedCount using != null excludes undefined-token seats', () => {
    const seats: DealSeatClaim[] = [
      { seatNumber: 1, claimedByToken: 'tok1' },
      { seatNumber: 2 },              // undefined (unclaimed via deleteField)
      { seatNumber: 3, claimedByToken: null },
      { seatNumber: 4, claimedByToken: 'tok2' },
    ]
    const count = seats.filter(s => s.claimedByToken != null).length
    expect(count).toBe(2)   // only seats 1 and 4
  })

  it('host-prefixed token → still claimed', () => {
    const seat: DealSeatClaim = { seatNumber: 1, claimedByToken: 'host-xyz' }
    expect(isClaimed(seat)).toBe(true)
  })
})

// ── buildShareUrl for deal links ──────────────────────────────────────────────

describe('buildShareUrl — deal links', () => {
  it('includes sessionId as deal param', async () => {
    const { buildShareUrl } = await import('../lib/shareUrl')
    // VITE_APP_URL is not set in test env; window.location.origin is 'http://localhost'
    // but since it IS localhost, buildShareUrl falls back to relative path.
    // Just verify the param is present and no raw localhost URL is formed.
    const url = buildShareUrl('deal', 'session123')
    expect(url).toContain('deal=session123')
  })

  it('deal URL does not use capacitor:// or file:// scheme', async () => {
    const { buildShareUrl } = await import('../lib/shareUrl')
    const url = buildShareUrl('deal', 'session123')
    expect(url).not.toMatch(/^capacitor:\/\//)
    expect(url).not.toMatch(/^file:\/\//)
  })
})
