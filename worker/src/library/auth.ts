/**
 * Who is calling: a personal access token (`botc_pat_…`, for agents and
 * scripts) or a Google OAuth access token from the app's existing Google
 * sign-in (Cloud Sync). Google tokens are checked with Google's tokeninfo
 * endpoint and must have been issued to one of our OAuth clients.
 */
import type { Env } from '../env'
import type { LibraryStore } from './store'

export type Principal = { userId: string; email: string | null; via: 'google' | 'token' }

export const PAT_PREFIX = 'botc_pat_'

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function newTokenSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return PAT_PREFIX + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function allowedGoogleClientIds(env: Env): string[] {
  return [env.GOOGLE_WEB_CLIENT_ID, ...(env.GOOGLE_CLIENT_IDS ?? '').split(',')].map((s) => s?.trim()).filter((s): s is string => !!s)
}

export type GoogleVerifier = (accessToken: string, allowedClientIds: string[]) => Promise<{ sub: string; email: string | null } | null>

const googleCache = new Map<string, { sub: string; email: string | null; exp: number }>()

/** Verify a Google access token via tokeninfo; results are cached until the token expires. */
export const verifyGoogleAccessToken: GoogleVerifier = async (accessToken, allowedClientIds) => {
  if (allowedClientIds.length === 0) return null
  const key = await sha256Hex(accessToken)
  const cached = googleCache.get(key)
  if (cached && cached.exp > Date.now()) return { sub: cached.sub, email: cached.email }
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`)
  if (!res.ok) return null
  const info = await res.json() as { aud?: string; azp?: string; sub?: string; email?: string; exp?: string }
  const clientOk = [info.aud, info.azp].some((id) => !!id && allowedClientIds.includes(id))
  const exp = Number(info.exp) * 1000
  if (!clientOk || !info.sub || !(exp > Date.now())) return null
  if (googleCache.size > 1000) googleCache.clear()
  googleCache.set(key, { sub: info.sub, email: info.email ?? null, exp })
  return { sub: info.sub, email: info.email ?? null }
}

export class AuthError extends Error {}

/**
 * Resolve the caller from the Authorization header. Returns null when there
 * is no header; throws AuthError when a credential is present but invalid.
 */
export async function authenticate(authorization: string | undefined, env: Env, store: LibraryStore, verifyGoogle: GoogleVerifier, now = Date.now()): Promise<Principal | null> {
  if (!authorization) return null
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match) throw new AuthError('Authorization must be "Bearer <token>".')
  const credential = match[1].trim()
  if (credential.startsWith(PAT_PREFIX)) {
    const userId = await store.useToken(await sha256Hex(credential), now)
    if (!userId) throw new AuthError('Unknown or revoked access token.')
    return { userId, email: null, via: 'token' }
  }
  const google = await verifyGoogle(credential, allowedGoogleClientIds(env))
  if (!google) throw new AuthError('Invalid Google access token.')
  const userId = `google:${google.sub}`
  await store.upsertUser(userId, google.email, now)
  return { userId, email: google.email, via: 'google' }
}
