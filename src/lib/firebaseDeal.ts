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
 *       // Rule 3 — ST force-claims or unclears a card. Must touch at least one
 *       //           ST-only field (assignedSeat/assignedName) to distinguish from a
 *       //           plain guest claim. Prevents guests from overwriting existing claims
 *       //           via this rule. Full enforcement requires Cloud Functions.
 *       allow update: if request.resource.data.diff(resource.data).affectedKeys()
 *                          .hasOnly(['claimedByToken','claimedByName','claimedBySeat','claimedAt','assignedSeat','assignedName'])
 *                     && request.resource.data.diff(resource.data).affectedKeys()
 *                          .hasAny(['assignedSeat','assignedName']);
 *
 *       allow delete: if false;
 *     }
 *
 *     match /votes/{voteId} {
 *       // Experimental linked voting. Vote docs may include optional
 *       // seatLabels map for low-latency player display.
 *       allow read, create, update: if true;
 *
 *       match /responses/{seat} {
 *         allow read, create, update: if true; // app-layer guest token checks
 *       }
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
  setDoc,
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

export type DealVoteStatus = 'active' | 'closed' | 'cancelled'
export type DealVoteResponse = 'agree' | 'disagree'

export type DealVoteSession = {
  voteId: string
  actorSeat: number
  targetSeat: number
  requiredVotes: number
  votingOrder: number[]
  currentIndex: number
  perPlayerSeconds: number
  noVoteSeats: number[]
  seatLabels?: Record<string, string>
  status: DealVoteStatus
  startedAt: Timestamp
  deadlineAt: Timestamp
  gameId?: string | null
  dayId?: string | null
}

export type DealVoteResponseRecord = {
  seat: number
  response: DealVoteResponse
  guestToken?: string | null
  submittedAt?: Timestamp | null
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

// localStorage key marking that this browser/device has already seen its dealt
// character for a session. The guest link can then be reused for votes/tools
// without becoming a persistent character lookup page.
export const CHARACTER_SEEN_KEY = (id: string) => `botc-deal-character-seen-${id}`

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

function votesRef(sessionId: string) {
  return collection(db(), COLLECTION, sessionId, 'votes')
}

function voteRef(sessionId: string, voteId: string) {
  return doc(db(), COLLECTION, sessionId, 'votes', voteId)
}

function responsesRef(sessionId: string, voteId: string) {
  return collection(db(), COLLECTION, sessionId, 'votes', voteId, 'responses')
}

function responseRef(sessionId: string, voteId: string, seat: number) {
  return doc(db(), COLLECTION, sessionId, 'votes', voteId, 'responses', String(seat))
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

export function hasSeenDealCharacter(sessionId: string): boolean {
  try {
    return localStorage.getItem(CHARACTER_SEEN_KEY(sessionId)) === '1'
  } catch {
    return false
  }
}

export function markDealCharacterSeen(sessionId: string): void {
  try {
    localStorage.setItem(CHARACTER_SEEN_KEY(sessionId), '1')
  } catch {
    // Privacy marker is best-effort; if storage is unavailable the restored
    // claim path still hides the character.
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

/**
 * Fetch all cards for the guest grid view — characterId is OMITTED for all
 * cards so it is never present in client state before a successful claim.
 * Only the claimed card (returned by claimCard / findClaimedCard) contains
 * characterId; that data path verifies ownership first.
 */
export async function getGuestCards(sessionId: string): Promise<Omit<DealCard, 'characterId'>[]> {
  const { getDocs } = await import('firebase/firestore')
  const snap = await getDocs(cardsRef(sessionId))
  return snap.docs
    .map(d => {
      const { characterId: _stripped, ...rest } = d.data() as DealCard
      return rest
    })
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

// ── Experimental linked vote sessions ────────────────────────────────────────

export async function createDealVoteSession(
  sessionId: string,
  input: {
    actorSeat: number
    targetSeat: number
    requiredVotes: number
    votingOrder: number[]
    noVoteSeats?: number[]
    seatLabels?: Record<string, string>
    perPlayerSeconds?: number
    gameId?: string | null
    dayId?: string | null
  },
): Promise<DealVoteSession> {
  const voteDoc = doc(votesRef(sessionId))
  const voteId = voteDoc.id
  const perPlayerSeconds = input.perPlayerSeconds ?? 5
  const now = Timestamp.now()
  const deadlineAt = Timestamp.fromMillis(now.toMillis() + perPlayerSeconds * 1000)
  const payload: DealVoteSession = {
    voteId,
    actorSeat: input.actorSeat,
    targetSeat: input.targetSeat,
    requiredVotes: input.requiredVotes,
    votingOrder: input.votingOrder,
    currentIndex: 0,
    perPlayerSeconds,
    noVoteSeats: input.noVoteSeats ?? [],
    seatLabels: input.seatLabels ?? {},
    status: 'active',
    startedAt: now,
    deadlineAt,
    gameId: input.gameId ?? null,
    dayId: input.dayId ?? null,
  }
  await setDoc(voteDoc, payload)
  return payload
}

export function subscribeActiveDealVote(
  sessionId: string,
  onChange: (vote: DealVoteSession | null) => void,
): Unsubscribe {
  // Filter client-side to avoid requiring a composite Firestore index for this
  // experimental layer. Vote documents are tiny and short-lived per deal session.
  return onSnapshot(votesRef(sessionId), (snap) => {
    const active = snap.docs
      .map(d => d.data() as DealVoteSession)
      .filter(v => v.status === 'active')
      .sort((a, b) => b.startedAt.toMillis() - a.startedAt.toMillis())[0] ?? null
    onChange(active)
  })
}

export function subscribeDealVoteResponses(
  sessionId: string,
  voteId: string,
  onChange: (responses: DealVoteResponseRecord[]) => void,
): Unsubscribe {
  return onSnapshot(responsesRef(sessionId, voteId), (snap) => {
    onChange(snap.docs
      .map(d => d.data() as DealVoteResponseRecord)
      .sort((a, b) => a.seat - b.seat)
    )
  })
}

export async function submitDealVoteResponse(
  sessionId: string,
  voteId: string,
  seat: number,
  guestToken: string,
  response: DealVoteResponse,
): Promise<void> {
  await setDoc(responseRef(sessionId, voteId, seat), {
    seat,
    response,
    guestToken,
    submittedAt: serverTimestamp(),
  })
}

export async function advanceDealVote(
  sessionId: string,
  vote: DealVoteSession,
  fallbackResponse?: { seat: number; response: DealVoteResponse },
): Promise<void> {
  const batch = writeBatch(db())
  if (fallbackResponse) {
    batch.set(responseRef(sessionId, vote.voteId, fallbackResponse.seat), {
      seat: fallbackResponse.seat,
      response: fallbackResponse.response,
      guestToken: null,
      submittedAt: serverTimestamp(),
    }, { merge: true })
  }
  const nextIndex = vote.currentIndex + 1
  if (nextIndex >= vote.votingOrder.length) {
    batch.update(voteRef(sessionId, vote.voteId), {
      currentIndex: nextIndex,
      status: 'closed',
      deadlineAt: Timestamp.now(),
    })
  } else {
    batch.update(voteRef(sessionId, vote.voteId), {
      currentIndex: nextIndex,
      deadlineAt: Timestamp.fromMillis(Date.now() + vote.perPlayerSeconds * 1000),
    })
  }
  await batch.commit()
}

export async function closeDealVote(
  sessionId: string,
  voteId: string,
  status: DealVoteStatus = 'closed',
): Promise<void> {
  await updateDoc(voteRef(sessionId, voteId), { status, deadlineAt: Timestamp.now() })
}

// ── Guest actions ─────────────────────────────────────────────────────────────

/**
 * Atomically claim a card.
 * Firestore rule rejects the write if claimedByToken is already set.
 * Returns the full card (including characterId) ONLY if the post-write
 * snapshot confirms claimedByToken === guestToken — guards against the race
 * where two guests write simultaneously and one wins the Firestore rule check
 * but both proceed to read.
 * Throws if already claimed by another user.
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
    // Retry without optional seat field in case Firestore rule affectedKeys check
    // rejects a payload that includes claimedBySeat but the rule only lists 4 fields.
    if (claimedSeat == null) throw e
    await updateDoc(ref, {
      claimedByToken: guestToken,
      claimedByName:  displayName.trim() || null,
      claimedAt:      serverTimestamp(),
    })
  }
  // Verify ownership — read back and confirm this token won the race.
  // Without this check, a second user whose Firestore write was mis-allowed
  // (e.g. via the overly-permissive Rule 3) could still see the characterId.
  const snap = await getDoc(ref)
  const data = snap.data() as DealCard
  if (data.claimedByToken !== guestToken) {
    throw new Error('card_already_claimed')
  }
  return data
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
