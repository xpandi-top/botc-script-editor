/**
 * Hand a script to the web app as a `?ss=` link — the same format the app's
 * own "share" button produces, so opening the link imports the script.
 *
 * - With FIREBASE_PROJECT_ID + FIREBASE_API_KEY set, the payload is stored in
 *   the existing Firestore `shortlinks` collection (24 h TTL, allowed by the
 *   current security rules) and the link carries a 7-character id.
 * - Otherwise the gzip+base64url payload is put in the URL itself, which the
 *   app also accepts.
 */
import type { EditableScript } from '../../src/core/types/catalog'
import type { Env } from './env'

const TTL_MS = 24 * 60 * 60 * 1000
const MAX_INLINE_PARAM = 16_000
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

/** gzip + base64url, byte-compatible with src/lib/shareUrl.ts encodeShareParam. */
export async function encodeShareParam(data: unknown): Promise<string> {
  const stream = new CompressionStream('gzip')
  const result = new Response(stream.readable).arrayBuffer()
  const writer = stream.writable.getWriter()
  await writer.write(new TextEncoder().encode(JSON.stringify(data)))
  await writer.close()
  const bytes = new Uint8Array(await result)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function decodeShareParam<T>(param: string): Promise<T> {
  const binary = atob(param.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
  const stream = new DecompressionStream('gzip')
  const result = new Response(stream.readable).text()
  const writer = stream.writable.getWriter()
  await writer.write(bytes)
  await writer.close()
  return JSON.parse(await result) as T
}

function randomId(length = 7): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join('')
}

function appLink(env: Env, param: string): string {
  const url = new URL(env.APP_URL)
  url.searchParams.set('ss', param)
  return url.toString()
}

export type ShareLink = { url: string; mode: 'shortlink' | 'inline'; expiresAt?: string }

export class ShareError extends Error {}

async function storeShortLink(env: Env, encoded: string): Promise<{ id: string; expiresAt: string }> {
  const id = randomId()
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString()
  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID!)}/databases/(default)/documents/shortlinks?documentId=${id}&key=${encodeURIComponent(env.FIREBASE_API_KEY!)}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { data: { stringValue: encoded }, expiresAt: { timestampValue: expiresAt } } }),
  })
  if (!res.ok) throw new ShareError(`Short link storage failed (${res.status}).`)
  return { id, expiresAt }
}

export async function createScriptShareLink(env: Env, script: EditableScript): Promise<ShareLink> {
  const encoded = await encodeShareParam(script)
  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_API_KEY) {
    const { id, expiresAt } = await storeShortLink(env, encoded)
    return { url: appLink(env, id), mode: 'shortlink', expiresAt }
  }
  if (encoded.length > MAX_INLINE_PARAM) {
    throw new ShareError('Script is too large for an inline link; configure FIREBASE_PROJECT_ID and FIREBASE_API_KEY for short links.')
  }
  return { url: appLink(env, encoded), mode: 'inline' }
}
