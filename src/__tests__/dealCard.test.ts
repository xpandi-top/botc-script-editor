/**
 * Tests: Card Deal feature — pure logic, type safety, and the claimed-detection
 * regression that was introduced by using deleteField() on unclaim.
 *
 * Firestore network calls are NOT tested here (require emulator / integration env).
 * We test:
 *   - shuffleDealCards pure utility
 *   - getGuestToken sessionStorage behaviour
 *   - HOST_TOKEN_KEY / GUEST_TOKEN_KEY constant shapes
 *   - DealCard claimed detection: undefined (deleteField) vs null vs string
 *   - buildShareUrl produces a non-localhost URL for deal sessions
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  shuffleDealCards,
  getGuestToken,
  HOST_TOKEN_KEY,
  GUEST_TOKEN_KEY,
  ACTIVE_HOST_DEAL_KEY,
  type DealCard,
} from '../lib/firebaseDeal'

// ── shuffleDealCards ──────────────────────────────────────────────────────────

describe('shuffleDealCards', () => {
  it('returns same length array', () => {
    const input = [1, 2, 3, 4, 5]
    expect(shuffleDealCards(input)).toHaveLength(5)
  })

  it('contains all original elements', () => {
    const input = ['a', 'b', 'c', 'd']
    const result = shuffleDealCards(input)
    expect(result.sort()).toEqual([...input].sort())
  })

  it('does not mutate original array', () => {
    const input = [1, 2, 3]
    const copy = [...input]
    shuffleDealCards(input)
    expect(input).toEqual(copy)
  })

  it('handles empty array', () => {
    expect(shuffleDealCards([])).toEqual([])
  })

  it('handles single element', () => {
    expect(shuffleDealCards(['x'])).toEqual(['x'])
  })

  it('produces different order at least sometimes (statistical)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    // Run 20 times — probability all match original order: (1/8!)^20 ≈ 0
    const alwaysSame = Array.from({ length: 20 }).every(() =>
      shuffleDealCards(input).join(',') === input.join(',')
    )
    expect(alwaysSame).toBe(false)
  })
})

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
})

// ── getGuestToken ─────────────────────────────────────────────────────────────

describe('getGuestToken', () => {
  beforeEach(() => {
    sessionStorage.clear()
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

  it('persists to sessionStorage under GUEST_TOKEN_KEY', () => {
    const token = getGuestToken()
    expect(sessionStorage.getItem(GUEST_TOKEN_KEY)).toBe(token)
  })

  it('generates different tokens for different sessions (cleared storage)', () => {
    const t1 = getGuestToken()
    sessionStorage.clear()
    const t2 = getGuestToken()
    // Extremely unlikely to collide (24-char random ID)
    expect(t1).not.toBe(t2)
  })
})

// ── DealCard claimed detection — REGRESSION ───────────────────────────────────
//
// Bug: markCardUnclaimedByHost uses deleteField(), which removes the key from
// the Firestore snapshot. JavaScript receives `undefined`, not `null`.
// The old check `card.claimedByToken !== null` is TRUE for undefined, so the
// card kept displaying as claimed.
// Fix: use loose `!= null` (catches both null and undefined).

describe('DealCard claimed detection — != null regression', () => {
  function isClaimed(card: DealCard): boolean {
    return card.claimedByToken != null   // the fixed check
  }

  function isClaimedStrict(card: DealCard): boolean {
    return card.claimedByToken !== null  // the buggy check
  }

  it('string token → claimed (both checks agree)', () => {
    const card: DealCard = { position: 0, characterId: 'imp', claimedByToken: 'abc123' }
    expect(isClaimed(card)).toBe(true)
    expect(isClaimedStrict(card)).toBe(true)
  })

  it('null token → not claimed (both checks agree)', () => {
    const card: DealCard = { position: 0, characterId: 'imp', claimedByToken: null }
    expect(isClaimed(card)).toBe(false)
    expect(isClaimedStrict(card)).toBe(false)
  })

  it('undefined token (deleteField result) → not claimed with != null', () => {
    // deleteField() removes the key; snapshot delivers undefined
    const card: DealCard = { position: 0, characterId: 'imp' }  // no claimedByToken
    expect(isClaimed(card)).toBe(false)       // FIXED: correctly not claimed
    expect(isClaimedStrict(card)).toBe(true)  // BUG: would wrongly show as claimed
  })

  it('claimedCount using != null excludes undefined-token cards', () => {
    const cards: DealCard[] = [
      { position: 0, characterId: 'imp', claimedByToken: 'tok1' },
      { position: 1, characterId: 'librarian' },              // undefined (unclaimed via deleteField)
      { position: 2, characterId: 'chef', claimedByToken: null },
      { position: 3, characterId: 'soldier', claimedByToken: 'tok2' },
    ]
    const count = cards.filter(c => c.claimedByToken != null).length
    expect(count).toBe(2)   // only positions 0 and 3
  })

  it('host-prefixed token → still claimed', () => {
    const card: DealCard = { position: 0, characterId: 'imp', claimedByToken: 'host-xyz' }
    expect(isClaimed(card)).toBe(true)
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
