/**
 * Google OAuth2 PKCE flow — no backend, no client_secret.
 * Works on any static host (GitHub Pages, Netlify, etc.).
 *
 * Setup required in Google Cloud Console:
 *  1. Create project → Enable "Google Drive API"
 *  2. OAuth2 credentials → Web Application
 *  3. Authorized redirect URIs: add your deployed URL (e.g. https://you.github.io/botc_webapp/)
 *     AND http://localhost:5173/ for local dev
 *  4. Set VITE_GOOGLE_CLIENT_ID in .env.local
 */

export const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''

const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

const SESSION_KEY = 'BOTC_GOOGLE_TOKENS'
const VERIFIER_KEY = 'BOTC_PKCE_VERIFIER'
const STATE_KEY = 'BOTC_OAUTH_STATE'

// ── Token types ───────────────────────────────────────────────────────────────

export interface GoogleTokens {
  access_token: string
  refresh_token: string
  expires_at: number // epoch ms
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function randomBase64Url(byteCount: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256Base64Url(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ── Token storage (sessionStorage — cleared on tab close) ─────────────────────

export function getStoredTokens(): GoogleTokens | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as GoogleTokens) : null
  } catch {
    return null
  }
}

export function storeTokens(tokens: GoogleTokens): void {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens)) } catch {}
}

export function clearTokens(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(VERIFIER_KEY)
    sessionStorage.removeItem(STATE_KEY)
  } catch {}
}

export function isConnected(): boolean {
  const t = getStoredTokens()
  return !!t?.access_token
}

// ── OAuth2 redirect URL ───────────────────────────────────────────────────────

/** The URL Google will redirect back to — must match Console registration. */
export function getRedirectUri(): string {
  const { origin, pathname } = window.location
  // Strip hash/search, keep pathname (e.g. /botc_webapp/)
  return origin + pathname.replace(/\/$/, '') + '/'
}

// ── Start flow ────────────────────────────────────────────────────────────────

/**
 * Kick off PKCE OAuth2.
 * Stores verifier in sessionStorage, then navigates to Google consent.
 * After consent, Google redirects back with `?code=...&state=...`.
 * Call `handleOAuthCallback()` to complete.
 */
export async function startOAuthFlow(): Promise<void> {
  if (!GOOGLE_CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID not set')

  const verifier = randomBase64Url(96)
  const challenge = await sha256Base64Url(verifier)
  const state = randomBase64Url(16)

  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ── Complete flow (called on page load when ?code= present) ───────────────────

export interface OAuthCallbackResult {
  tokens: GoogleTokens
  /** Cleaned URL without the OAuth params — replace history with this */
  cleanUrl: string
}

export async function handleOAuthCallback(
  searchParams: URLSearchParams,
): Promise<OAuthCallbackResult | null> {
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = sessionStorage.getItem(STATE_KEY)
  const verifier = sessionStorage.getItem(VERIFIER_KEY)

  if (!code || !verifier) return null
  if (state !== storedState) throw new Error('OAuth state mismatch — possible CSRF')

  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Token exchange failed: ${(err as { error?: string }).error ?? res.status}`)
  }

  const data = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const tokens: GoogleTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  storeTokens(tokens)

  // Clean OAuth params from URL
  const clean = new URL(window.location.href)
  clean.searchParams.delete('code')
  clean.searchParams.delete('state')
  clean.searchParams.delete('scope')

  return { tokens, cleanUrl: clean.toString() }
}

// ── Token refresh ─────────────────────────────────────────────────────────────

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) throw new Error('Token refresh failed')

  const data = await res.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  const tokens: GoogleTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  storeTokens(tokens)
  return tokens
}

// ── Get a valid access token (auto-refresh if expired) ────────────────────────

/** Returns a valid access_token, refreshing if needed. Null if not authed. */
export async function getValidToken(): Promise<string | null> {
  const tokens = getStoredTokens()
  if (!tokens) return null

  // Refresh if within 5 minutes of expiry
  if (Date.now() >= tokens.expires_at - 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(tokens.refresh_token)
      return refreshed.access_token
    } catch {
      clearTokens()
      return null
    }
  }

  return tokens.access_token
}
