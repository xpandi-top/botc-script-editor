/**
 * Firebase Firestore-backed short URL service.
 *
 * Creates 7-character IDs stored in the `shortlinks` collection with a
 * 24-hour TTL.  Expiry is enforced client-side on read; expired docs are
 * lazily deleted at resolve-time (no Blaze plan or TTL policy required).
 *
 * URL format: ?sl=XXXXXXX  (vs the long ?ar=<gzip+base64> fallback)
 */

import { getFirestore, doc, setDoc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { getFirebaseApp } from './firebase'

const COLLECTION      = 'shortlinks'
const TTL_MS_DEFAULT  = 24 * 60 * 60 * 1000         // 24 hours (analytics)
export const TTL_MS_SCRIPT = 7 * 24 * 60 * 60 * 1000 // 7 days  (script share)
const ID_LEN          = 7
// Omit visually ambiguous chars (0/O, 1/I/l)
const CHARS      = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

function randomId(): string {
  return Array.from(
    { length: ID_LEN },
    () => CHARS[Math.floor(Math.random() * CHARS.length)],
  ).join('')
}

function db() {
  return getFirestore(getFirebaseApp())
}

/**
 * Store `encodedData` (the gzip+base64url string from encodeShareParam)
 * and return the short ID.  Throws on Firestore error.
 * @param ttlMs  TTL in milliseconds (default 24 h; use TTL_MS_SCRIPT for 7 d)
 */
export async function createShortLink(encodedData: string, ttlMs = TTL_MS_DEFAULT): Promise<string> {
  const id        = randomId()
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + ttlMs))
  await setDoc(doc(db(), COLLECTION, id), { data: encodedData, expiresAt })
  return id
}

/**
 * Resolve a short ID back to the encoded data string.
 * Returns null if the document is missing or expired.
 */
export async function resolveShortLink(id: string): Promise<string | null> {
  const snap = await getDoc(doc(db(), COLLECTION, id))
  if (!snap.exists()) return null
  const { data, expiresAt } = snap.data() as { data: string; expiresAt: Timestamp }
  if (expiresAt.toMillis() < Date.now()) {
    // Lazy cleanup — fire-and-forget, doesn't block caller
    deleteDoc(doc(db(), COLLECTION, id)).catch(() => {})
    return null
  }
  return data
}
