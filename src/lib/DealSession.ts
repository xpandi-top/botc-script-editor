/**
 * Firebase Firestore helpers for the seat self-claim / character-deal feature.
 *
 * Collection structure:
 *   dealSessions/{sessionId}                 — session metadata
 *   dealSessions/{sessionId}/seats/{seat}    — one doc per seat, seat self-claim mode
 *   dealSessions/{sessionId}/messages/{id}   — ST <-> seat chat, auto-id per message
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
 *     match /seats/{seatNumber} {
 *       allow read: if true;
 *       allow create: if true;
 *
 *       // Rule 1 — guest claims an unclaimed seat
 *       allow update: if resource.data.get('claimedByToken', null) == null
 *                     && request.resource.data.claimedByToken is string
 *                     && request.resource.data.claimedByToken.size() > 0
 *                     && request.resource.data.diff(resource.data).affectedKeys()
 *                          .hasOnly(['claimedByToken','playerName','claimedAt']);
 *
 *       // Rule 2 — ST clears or renames a claim (host token checked app-layer)
 *       allow update: if request.resource.data.diff(resource.data).affectedKeys()
 *                          .hasOnly(['claimedByToken','playerName','claimedAt']);
 *
 *       // Rule 3 — ST pushes a character onto an already-claimed seat, no second
 *       //           "draw a card" step needed; the guest's page reveals it live.
 *       allow update: if request.resource.data.diff(resource.data).affectedKeys()
 *                          .hasOnly(['characterId']);
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
 *
 *     match /messages/{messageId} {
 *       // ST <-> seat chat. seatNumber: null = broadcast to all seats.
 *       // No ownership check at the rule layer (matches votes/responses above) —
 *       // guest/ST identity is enforced app-side; tighten with a Cloud Function
 *       // in Phase 2 if this needs to resist a malicious client.
 *       allow read: if true;
 *       allow create: if request.resource.data.text is string
 *                    && request.resource.data.text.size() > 0
 *                    && request.resource.data.text.size() <= 500;
 *       allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);
 *       allow delete: if false;
 *     }
 *   }
 * ─────────────────────────────────────────────────────────────────────
 * ST assignment writes (seat/name) are guarded at the app layer via
 * hostToken comparison. Tighten with a Cloud Function in Phase 2.
 *
 * TTL: lazy-delete on read — Spark plan compatible, no scheduled functions.
 */

import { Timestamp, getFirestore, doc, collection, writeBatch, getDoc, deleteDoc, type Unsubscribe, onSnapshot, setDoc, serverTimestamp, updateDoc, deleteField } from 'firebase/firestore';
import { getFirebaseApp } from './firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DealSession = {
  id: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  hostToken: string;
  status: 'open' | 'closed';
  cardCount: number;
  totalSeats?: number; // present when created via createSeatClaimSession
};

export type DealSeatClaim = {
  seatNumber: number; // 1-indexed seat
  claimedByToken?: string | null;
  playerName?: string | null;
  claimedAt?: Timestamp | null;
  characterId?: string | null; // pushed by the ST after the seat is claimed
};

export type DealVoteStatus = 'active' | 'closed' | 'cancelled';
export type DealVoteResponse = 'agree' | 'disagree';

export type DealVoteSession = {
  voteId: string;
  actorSeat: number;
  targetSeat: number;
  requiredVotes: number;
  votingOrder: number[];
  currentIndex: number;
  perPlayerSeconds: number;
  noVoteSeats: number[];
  seatLabels?: Record<string, string>;
  status: DealVoteStatus;
  startedAt: Timestamp;
  deadlineAt: Timestamp;
  gameId?: string | null;
  dayId?: string | null;
};

export type DealVoteResponseRecord = {
  seat: number;
  response: DealVoteResponse;
  guestToken?: string | null;
  submittedAt?: Timestamp | null;
};

export type DealMessageSender = 'st' | 'seat';

export type DealMessage = {
  id: string;
  seatNumber: number | null; // null = broadcast to all seats
  from: DealMessageSender;
  text: string;
  sentAt: Timestamp;
  read: boolean;
};
// ── Constants ─────────────────────────────────────────────────────────────────
const COLLECTION = 'dealSessions';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const ID_LEN = 6;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
// localStorage key where ST's hostToken is stored, keyed by sessionId

export const HOST_TOKEN_KEY = (id: string) => `botc-deal-host-${id}`;
// localStorage key for the ST's most recently created host dashboard session

export const ACTIVE_HOST_DEAL_KEY = 'botc-deal-active-host';
// localStorage key for deal session linked to a specific game instance

export const GAME_DEAL_KEY = (gameId: string) => `botc-deal-game-${gameId}`;
// localStorage key for the guest's browser token

export const GUEST_TOKEN_KEY = 'botc-deal-guest-token';
// localStorage key marking that this browser/device has already seen its dealt
// character for a session. The guest link can then be reused for votes/tools
// without becoming a persistent character lookup page.

export const CHARACTER_SEEN_KEY = (id: string) => `botc-deal-character-seen-${id}`;
// ── Helpers ───────────────────────────────────────────────────────────────────
function randomId(len = ID_LEN): string {
  return Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}
function db() {
  return getFirestore(getFirebaseApp());
}
function sessionRef(sessionId: string) {
  return doc(db(), COLLECTION, sessionId);
}
function seatsRef(sessionId: string) {
  return collection(db(), COLLECTION, sessionId, 'seats');
}
function seatRef(sessionId: string, seatNumber: number) {
  return doc(db(), COLLECTION, sessionId, 'seats', String(seatNumber));
}
function votesRef(sessionId: string) {
  return collection(db(), COLLECTION, sessionId, 'votes');
}
function voteRef(sessionId: string, voteId: string) {
  return doc(db(), COLLECTION, sessionId, 'votes', voteId);
}
function responsesRef(sessionId: string, voteId: string) {
  return collection(db(), COLLECTION, sessionId, 'votes', voteId, 'responses');
}
function responseRef(sessionId: string, voteId: string, seat: number) {
  return doc(db(), COLLECTION, sessionId, 'votes', voteId, 'responses', String(seat));
}
function messagesRef(sessionId: string) {
  return collection(db(), COLLECTION, sessionId, 'messages');
}
function messageRef(sessionId: string, messageId: string) {
  return doc(db(), COLLECTION, sessionId, 'messages', messageId);
}
/** Get or create the guest's browser token (persisted in localStorage, shared
 *  across tabs — so re-opening the same link in a new tab restores the same
 *  claimed seat instead of letting the browser claim a second one). */

export function getGuestToken(): string {
  try {
    const existing = localStorage.getItem(GUEST_TOKEN_KEY);
    if (existing) return existing;
    const fresh = randomId(24);
    localStorage.setItem(GUEST_TOKEN_KEY, fresh);
    return fresh;
  } catch {
    return randomId(24);
  }
}

export function hasSeenDealCharacter(sessionId: string): boolean {
  try {
    return localStorage.getItem(CHARACTER_SEEN_KEY(sessionId)) === '1';
  } catch {
    return false;
  }
}

export function markDealCharacterSeen(sessionId: string): void {
  try {
    localStorage.setItem(CHARACTER_SEEN_KEY(sessionId), '1');
  } catch {
    // Privacy marker is best-effort; if storage is unavailable the restored
    // claim path still hides the character.
  }
}
/** Check if expiry has passed; lazily delete and return true if expired. */
function isExpired(expiresAt: Timestamp): boolean {
  return expiresAt.toMillis() < Date.now();
}
// ── Session CRUD ──────────────────────────────────────────────────────────────
/**
 * Create a new session in seat self-claim mode: guests pick an open seat
 * number and enter their name, blind. The ST assigns characters to claimed
 * seats afterward (random or manual) via assignCharacterToSeatByHost —
 * returns { sessionId, hostToken }, ST should persist hostToken in localStorage.
 */

export async function createSeatClaimSession(
  totalSeats: number
): Promise<{ sessionId: string; hostToken: string; }> {
  const sessionId = randomId();
  const hostToken = randomId(32);
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + TTL_MS));

  const batch = writeBatch(db());

  batch.set(sessionRef(sessionId), {
    createdAt: Timestamp.now(),
    expiresAt,
    hostToken,
    status: 'open',
    cardCount: 0,
    totalSeats,
  });

  for (let seatNumber = 1; seatNumber <= totalSeats; seatNumber++) {
    batch.set(seatRef(sessionId, seatNumber), {
      seatNumber,
      claimedByToken: null,
      playerName: null,
      claimedAt: null,
      characterId: null,
    });
  }

  await batch.commit();
  return { sessionId, hostToken };
}
/** Fetch session metadata. Returns null if missing or expired. */

export async function getDealSession(sessionId: string): Promise<DealSession | null> {
  const snap = await getDoc(sessionRef(sessionId));
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<DealSession, 'id'>;
  if (isExpired(data.expiresAt)) {
    // Lazy cleanup — fire-and-forget
    deleteDoc(sessionRef(sessionId)).catch(() => { });
    return null;
  }
  return { id: sessionId, ...data };
}
// ── Real-time subscription ────────────────────────────────────────────────────
/** Fetch all seat claims for a session (host + one-off guest lookups). */

export async function getSeatClaims(sessionId: string): Promise<DealSeatClaim[]> {
  const { getDocs } = await import('firebase/firestore');
  const snap = await getDocs(seatsRef(sessionId));
  return snap.docs
    .map(d => d.data() as DealSeatClaim)
    .sort((a, b) => a.seatNumber - b.seatNumber);
}
/**
 * Subscribe to live seat-claim updates.
 * Returns an unsubscribe function — call in useEffect cleanup.
 */

export function subscribeSeatClaims(
  sessionId: string,
  onChange: (seats: DealSeatClaim[]) => void
): Unsubscribe {
  return onSnapshot(seatsRef(sessionId), (snap) => {
    const seats = snap.docs
      .map(d => d.data() as DealSeatClaim)
      .sort((a, b) => a.seatNumber - b.seatNumber);
    onChange(seats);
  });
}
// ── Experimental linked vote sessions ────────────────────────────────────────

export async function createDealVoteSession(
  sessionId: string,
  input: {
    actorSeat: number;
    targetSeat: number;
    requiredVotes: number;
    votingOrder: number[];
    noVoteSeats?: number[];
    seatLabels?: Record<string, string>;
    perPlayerSeconds?: number;
    gameId?: string | null;
    dayId?: string | null;
  }
): Promise<DealVoteSession> {
  const voteDoc = doc(votesRef(sessionId));
  const voteId = voteDoc.id;
  const perPlayerSeconds = input.perPlayerSeconds ?? 5;
  const now = Timestamp.now();
  const deadlineAt = Timestamp.fromMillis(now.toMillis() + perPlayerSeconds * 1000);
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
  };
  await setDoc(voteDoc, payload);
  return payload;
}

export function subscribeActiveDealVote(
  sessionId: string,
  onChange: (vote: DealVoteSession | null) => void
): Unsubscribe {
  // Filter client-side to avoid requiring a composite Firestore index for this
  // experimental layer. Vote documents are tiny and short-lived per deal session.
  return onSnapshot(votesRef(sessionId), (snap) => {
    const active = snap.docs
      .map(d => d.data() as DealVoteSession)
      .filter(v => v.status === 'active')
      .sort((a, b) => b.startedAt.toMillis() - a.startedAt.toMillis())[0] ?? null;
    onChange(active);
  });
}

export function subscribeDealVoteResponses(
  sessionId: string,
  voteId: string,
  onChange: (responses: DealVoteResponseRecord[]) => void
): Unsubscribe {
  return onSnapshot(responsesRef(sessionId, voteId), (snap) => {
    onChange(snap.docs
      .map(d => d.data() as DealVoteResponseRecord)
      .sort((a, b) => a.seat - b.seat)
    );
  });
}

export async function submitDealVoteResponse(
  sessionId: string,
  voteId: string,
  seat: number,
  guestToken: string,
  response: DealVoteResponse
): Promise<void> {
  await setDoc(responseRef(sessionId, voteId, seat), {
    seat,
    response,
    guestToken,
    submittedAt: serverTimestamp(),
  });
}

export async function advanceDealVote(
  sessionId: string,
  vote: DealVoteSession,
  fallbackResponse?: { seat: number; response: DealVoteResponse; }
): Promise<void> {
  const batch = writeBatch(db());
  if (fallbackResponse) {
    batch.set(responseRef(sessionId, vote.voteId, fallbackResponse.seat), {
      seat: fallbackResponse.seat,
      response: fallbackResponse.response,
      guestToken: null,
      submittedAt: serverTimestamp(),
    }, { merge: true });
  }
  const nextIndex = vote.currentIndex + 1;
  if (nextIndex >= vote.votingOrder.length) {
    batch.update(voteRef(sessionId, vote.voteId), {
      currentIndex: nextIndex,
      status: 'closed',
      deadlineAt: Timestamp.now(),
    });
  } else {
    batch.update(voteRef(sessionId, vote.voteId), {
      currentIndex: nextIndex,
      deadlineAt: Timestamp.fromMillis(Date.now() + vote.perPlayerSeconds * 1000),
    });
  }
  await batch.commit();
}

export async function closeDealVote(
  sessionId: string,
  voteId: string,
  status: DealVoteStatus = 'closed'
): Promise<void> {
  await updateDoc(voteRef(sessionId, voteId), { status, deadlineAt: Timestamp.now() });
}
// ── Guest actions ─────────────────────────────────────────────────────────────
/**
 * Atomically claim a seat.
 * Firestore rule rejects the write if claimedByToken is already set.
 * Verifies ownership via a post-write read — guards against two guests
 * tapping the same seat at once (one write wins the Firestore rule check,
 * but both would otherwise proceed to read).
 * Throws 'seat_already_claimed' if another guest won the race.
 */

export async function claimSeat(
  sessionId: string,
  seatNumber: number,
  guestToken: string,
  playerName: string
): Promise<DealSeatClaim> {
  const ref = seatRef(sessionId, seatNumber);
  await updateDoc(ref, {
    claimedByToken: guestToken,
    playerName: playerName.trim() || null,
    claimedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  const data = snap.data() as DealSeatClaim;
  if (data.claimedByToken !== guestToken) {
    throw new Error('seat_already_claimed');
  }
  return data;
}
/**
 * Find the seat already claimed by this guest token, if any.
 * Used to restore state when guest re-opens the link.
 */

export async function findClaimedSeat(
  sessionId: string,
  guestToken: string
): Promise<DealSeatClaim | null> {
  const seats = await getSeatClaims(sessionId);
  return seats.find(s => s.claimedByToken === guestToken) ?? null;
}
// ── Host actions ──────────────────────────────────────────────────────────────
/** Clear a guest's seat claim, freeing it up again. ST only (host token checked app-layer). */

export async function unclaimSeatByHost(
  sessionId: string,
  seatNumber: number
): Promise<void> {
  await updateDoc(seatRef(sessionId, seatNumber), {
    claimedByToken: deleteField(),
    playerName: deleteField(),
    claimedAt: deleteField(),
  });
}
/**
 * Rename or force-claim a seat from the host dashboard. ST only.
 * Uses setDoc+merge rather than updateDoc: the seat count can grow after the
 * session was created (Assignment Center's player-count stepper), and a seat
 * added that way has no Firestore doc yet — updateDoc would reject a write to
 * a nonexistent doc. merge:true creates it if missing, patches it if not.
 */

export async function renameSeatByHost(
  sessionId: string,
  seatNumber: number,
  playerName: string
): Promise<void> {
  await setDoc(seatRef(sessionId, seatNumber), {
    claimedByToken: `host-${randomId(24)}`,
    playerName: playerName.trim() || null,
    claimedAt: serverTimestamp(),
  }, { merge: true });
}
/**
 * Push a character onto an already-claimed seat — the guest's page reveals it
 * live, no draw step. ST only. setDoc+merge for the same reason as
 * renameSeatByHost above.
 */

export async function assignCharacterToSeatByHost(
  sessionId: string,
  seatNumber: number,
  characterId: string
): Promise<void> {
  await setDoc(seatRef(sessionId, seatNumber), { characterId }, { merge: true });
}
/** Create a seat doc for a seat number added after the session was already
 *  started (Assignment Center's player-count stepper can grow the roster
 *  mid-session). Only call this for a seat number known not to have a doc
 *  yet — it writes claimedByToken: null unconditionally, which would wipe
 *  an existing claim if the seat were already claimed. */

export async function addSeatToSession(
  sessionId: string,
  seatNumber: number
): Promise<void> {
  await setDoc(seatRef(sessionId, seatNumber), {
    seatNumber,
    claimedByToken: null,
    playerName: null,
    claimedAt: null,
    characterId: null,
  }, { merge: true });
}
/** Close the session so no more claims can be made (app-layer only for now). */

export async function closeDealSession(
  sessionId: string,
  hostToken: string
): Promise<void> {
  const session = await getDealSession(sessionId);
  if (!session) throw new Error('Session not found');
  if (session.hostToken !== hostToken) throw new Error('Invalid host token');
  await updateDoc(sessionRef(sessionId), { status: 'closed' });
}
// ── Messages — ST <-> seat chat ─────────────────────────────────────────────

/**
 * Send a message. seatNumber null broadcasts to every seat; a specific
 * seatNumber addresses one seat's thread. Either side (ST or a claimed seat)
 * can call this — `from` distinguishes the sender for rendering.
 */
export async function sendMessage(
  sessionId: string,
  input: { seatNumber: number | null; from: DealMessageSender; text: string },
): Promise<DealMessage> {
  const ref = doc(messagesRef(sessionId));
  const payload = {
    seatNumber: input.seatNumber,
    from: input.from,
    text: input.text.trim().slice(0, 500),
    sentAt: serverTimestamp(),
    read: false,
  };
  await setDoc(ref, payload);
  const snap = await getDoc(ref);
  return { id: ref.id, ...(snap.data() as Omit<DealMessage, 'id'>) };
}

/** Subscribe to every message in the session — ST-side view. */
export function subscribeMessages(
  sessionId: string,
  onChange: (messages: DealMessage[]) => void,
): Unsubscribe {
  return onSnapshot(messagesRef(sessionId), (snap) => {
    const messages = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<DealMessage, 'id'>) }))
      .sort((a, b) => (a.sentAt?.toMillis?.() ?? 0) - (b.sentAt?.toMillis?.() ?? 0));
    onChange(messages);
  });
}

/**
 * Subscribe to one seat's thread — its own messages plus any broadcast
 * (seatNumber: null) messages. Filtered client-side, same as the vote
 * subscriptions above, to avoid a composite Firestore index.
 */
export function subscribeSeatMessages(
  sessionId: string,
  seatNumber: number,
  onChange: (messages: DealMessage[]) => void,
): Unsubscribe {
  return subscribeMessages(sessionId, (all) => {
    onChange(all.filter((m) => m.seatNumber === seatNumber || m.seatNumber === null));
  });
}

/** Mark a message read (unread-badge bookkeeping on either side). */
export async function markMessageRead(sessionId: string, messageId: string): Promise<void> {
  await updateDoc(messageRef(sessionId, messageId), { read: true });
}
