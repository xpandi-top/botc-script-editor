/**
 * Firebase Firestore helpers for the Card Dealing feature.
 *
 * Collection structure:
 *   dealSessions/{sessionId}            — session metadata
 *   dealSessions/{sessionId}/cards/{pos} — one doc per card (0-indexed)
 *
 * Firestore rules required (add to existing rules in Firebase console):
 * ─────────────────────────────────────────────────────────────────────
 *   match /dealSessions/{sessionId} {
 *     allow read: if true;
 *     allow create: if request.resource.data.keys().hasAll(['createdAt','expiresAt','hostToken','status','cardCount'])
 *                  && request.resource.data.cardCount is int
 *                  && request.resource.data.cardCount <= 20;
 *     allow update: if true;   // host token check is app-layer; tighten in Phase 2
 *     allow delete: if false;
 *
 *     match /cards/{position} {
 *       allow read: if true;
 *       allow create: if true;
 *
 *       // Rule 1 — player claims an unclaimed card
 *       allow update: if resource.data.get('claimedByToken', null) == null
 *                     && request.resource.data.claimedByToken is string
 *                     && request.resource.data.claimedByToken.size() > 0
 *                     && request.resource.data.diff(resource.data).affectedKeys()
 *                          .hasOnly(['claimedByToken','claimedByName','claimedBySeat','claimedAt']);
 *
 *       // Rule 2 — ST updates seat/name only
 *       allow update: if request.resource.data.diff(resource.data).affectedKeys()
 *                          .hasOnly(['assignedSeat','assignedName']);
 *
 *       // Rule 3 — ST claims or UNCLEARS a card (deleteField removes keys; affectedKeys
 *       //           still lists them). Permits any write touching only these 6 fields.
 *       allow update: if request.resource.data.diff(resource.data).affectedKeys()
 *                          .hasOnly(['claimedByToken','claimedByName','claimedBySeat','claimedAt','assignedSeat','assignedName']);
 *
 *       allow delete: if false;
 *     }
 *   }
 * ─────────────────────────────────────────────────────────────────────
 * ST assignment writes (seat/name) are guarded at the app layer via
 * hostToken comparison. Tighten with a Cloud Function in Phase 2.
 *
 * TTL: lazy-delete on read — Spark plan compatible, no scheduled functions.
 */

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  collection,
  onSnapshot,
  deleteDoc,
  deleteField,
  Timestamp,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { getFirebaseApp } from './firebase'

// ── Types ─────────────────────────────────────────────────────────────────────

export type DealSession = {
  id: string
  createdAt: Timestamp
  expiresAt: Timestamp
  hostToken: string
  status: 'open' | 'closed'
  cardCount: number
}

export type DealCard = {
  position: number          // 0-indexed slot
  characterId: string       // visible only to claimant (enforced app-layer)
  // Fields below are undefined when absent (deleteField() removes key from Firestore snapshot)
  claimedByToken?: string | null
  claimedByName?: string | null
  claimedBySeat?: number | null  // guest-suggested seat; ST can override
  claimedAt?: Timestamp | null
  assignedSeat?: number | null   // ST-confirmed seat (overrides claimedBySeat)
  assignedName?: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLLECTION = 'dealSessions'
const TTL_MS     = 24 * 60 * 60 * 1000   // 24 hours
const ID_LEN     = 6
const CHARS      = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

// localStorage key where ST's hostToken is stored, keyed by sessionId
export const HOST_TOKEN_KEY = (id: string) => `botc-deal-host-${id}`

// localStorage key for the ST's most recently created host dashboard session
export const ACTIVE_HOST_DEAL_KEY = 'botc-deal-active-host'

// localStorage key for deal session linked to a specific game instance
export const GAME_DEAL_KEY = (gameId: string) => `botc-deal-game-${gameId}`

// sessionStorage key for the guest's browser token
export const GUEST_TOKEN_KEY = 'botc-deal-guest-token'

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomId(len = ID_LEN): string {
  return Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

function db() {
  return getFirestore(getFirebaseApp())
}

function sessionRef(sessionId: string) {
  return doc(db(), COLLECTION, sessionId)
}

function cardsRef(sessionId: string) {
  return collection(db(), COLLECTION, sessionId, 'cards')
}

function cardRef(sessionId: string, position: number) {
  return doc(db(), COLLECTION, sessionId, 'cards', String(position))
}

/** Get or create the guest's browser token (persisted in sessionStorage). */
export function getGuestToken(): string {
  try {
    const existing = sessionStorage.getItem(GUEST_TOKEN_KEY)
    if (existing) return existing
    const fresh = randomId(24)
    sessionStorage.setItem(GUEST_TOKEN_KEY, fresh)
    return fresh
  } catch {
    return randomId(24)
  }
}

/** Check if expiry has passed; lazily delete and return true if expired. */
function isExpired(expiresAt: Timestamp): boolean {
  return expiresAt.toMillis() < Date.now()
}

// ── Session CRUD ──────────────────────────────────────────────────────────────

/**
 * Create a new deal session with shuffled cards.
 * Returns { sessionId, hostToken } — ST should persist hostToken in localStorage.
 */
export async function createDealSession(
  characterIds: string[],  // already shuffled by caller
): Promise<{ sessionId: string; hostToken: string }> {
  const sessionId = randomId()
  const hostToken = randomId(32)
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + TTL_MS))

  const batch = writeBatch(db())

  // Session document
  batch.set(sessionRef(sessionId), {
    createdAt:  Timestamp.now(),
    expiresAt,
    hostToken,
    status:    'open',
    cardCount: characterIds.length,
  })

  // One card document per character, position = index
  characterIds.forEach((characterId, position) => {
    batch.set(cardRef(sessionId, position), {
      position,
      characterId,
      claimedByToken: null,
      claimedByName:  null,
      claimedBySeat:  null,
      claimedAt:      null,
      assignedSeat:   null,
      assignedName:   null,
    })
  })

  await batch.commit()
  return { sessionId, hostToken }
}

/** Fetch session metadata. Returns null if missing or expired. */
export async function getDealSession(sessionId: string): Promise<DealSession | null> {
  const snap = await getDoc(sessionRef(sessionId))
  if (!snap.exists()) return null
  const data = snap.data() as Omit<DealSession, 'id'>
  if (isExpired(data.expiresAt)) {
    // Lazy cleanup — fire-and-forget
    deleteDoc(sessionRef(sessionId)).catch(() => {})
    return null
  }
  return { id: sessionId, ...data }
}

/** Fetch all cards for a session (returns characterId for all — host view). */
export async function getDealCards(sessionId: string): Promise<DealCard[]> {
  const { getDocs } = await import('firebase/firestore')
  const snap = await getDocs(cardsRef(sessionId))
  return snap.docs
    .map(d => d.data() as DealCard)
    .sort((a, b) => a.position - b.position)
}

// ── Real-time subscription ────────────────────────────────────────────────────

/**
 * Subscribe to live card updates.
 * Returns an unsubscribe function — call in useEffect cleanup.
 */
export function subscribeCards(
  sessionId: string,
  onChange: (cards: DealCard[]) => void,
): Unsubscribe {
  return onSnapshot(cardsRef(sessionId), (snap) => {
    const cards = snap.docs
      .map(d => d.data() as DealCard)
      .sort((a, b) => a.position - b.position)
    onChange(cards)
  })
}

// ── Guest actions ─────────────────────────────────────────────────────────────

/**
 * Atomically claim a card.
 * Firestore rule rejects the write if claimedByToken is already set.
 * Returns the full card (including characterId) after a successful claim.
 * Throws if already claimed (Firestore permission-denied).
 */
export async function claimCard(
  sessionId: string,
  position: number,
  guestToken: string,
  displayName: string,
  claimedSeat?: number | null,
): Promise<DealCard> {
  const ref = cardRef(sessionId, position)
  const claimPayload: Record<string, unknown> = {
    claimedByToken: guestToken,
    claimedByName:  displayName.trim() || null,
    claimedAt:      serverTimestamp(),
  }
  if (claimedSeat != null) claimPayload.claimedBySeat = claimedSeat
  try {
    await updateDoc(ref, claimPayload)
  } catch (e) {
    if (claimedSeat == null) throw e
    await updateDoc(ref, {
      claimedByToken: guestToken,
      claimedByName:  displayName.trim() || null,
      claimedAt:      serverTimestamp(),
    })
  }
  const snap = await getDoc(ref)
  return snap.data() as DealCard
}

/**
 * Find the card already claimed by this guest token, if any.
 * Used to restore state when guest re-opens the link.
 */
export async function findClaimedCard(
  sessionId: string,
  guestToken: string,
): Promise<DealCard | null> {
  const cards = await getDealCards(sessionId)
  return cards.find(c => c.claimedByToken === guestToken) ?? null
}

// ── Host actions ──────────────────────────────────────────────────────────────

/** Assign a seat number and player name to a claimed card. ST only. */
export async function updateCardAssignment(
  sessionId: string,
  position: number,
  seat: number | null,
  name: string,
): Promise<void> {
  await updateDoc(cardRef(sessionId, position), {
    assignedSeat: seat,
    assignedName: name.trim() || null,
  })
}

/** Mark a card claimed from the host dashboard. ST only. */
export async function markCardClaimedByHost(
  sessionId: string,
  position: number,
  name: string,
  seat: number | null,
): Promise<void> {
  await updateDoc(cardRef(sessionId, position), {
    claimedByToken: `host-${randomId(24)}`,
    claimedByName: name.trim() || null,
    claimedBySeat: seat,
    claimedAt: serverTimestamp(),
    assignedSeat: seat,
    assignedName: name.trim() || null,
  })
}

/** Mark a card unclaimed and clear any ST seat/name assignment. ST only. */
export async function markCardUnclaimedByHost(
  sessionId: string,
  position: number,
): Promise<void> {
  // Use deleteField() for token/timestamp fields so Firestore's affectedKeys()
  // correctly reflects the change (null→null wouldn't appear in the diff).
  await updateDoc(cardRef(sessionId, position), {
    claimedByToken: deleteField(),
    claimedByName: deleteField(),
    claimedBySeat: deleteField(),
    claimedAt: deleteField(),
    assignedSeat: deleteField(),
    assignedName: deleteField(),
  })
}

/** Close the session so no more claims can be made (app-layer only for now). */
export async function closeDealSession(
  sessionId: string,
  hostToken: string,
): Promise<void> {
  const session = await getDealSession(sessionId)
  if (!session) throw new Error('Session not found')
  if (session.hostToken !== hostToken) throw new Error('Invalid host token')
  await updateDoc(sessionRef(sessionId), { status: 'closed' })
}

// ── Shuffle utility ───────────────────────────────────────────────────────────

export function shuffleDealCards<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
