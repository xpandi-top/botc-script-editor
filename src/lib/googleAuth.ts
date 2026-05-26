/**
 * Google OAuth2 PKCE flow — web and Android native.
 *
 * Web flow (GitHub Pages / any static host):
 *  1. Google Cloud Console → Credentials → OAuth client ID → Web Application
 *  2. Authorized redirect URIs: your deployed origin + trailing slash
 *  3. Paste Client ID + Client Secret into Settings → Cloud Sync
 *  Note: Web Application clients require client_secret even with PKCE (Google limitation).
 *
 * Android native flow (@byteowls/capacitor-oauth2):
 *  1. Google Cloud Console → Credentials → OAuth client ID → Android
 *  2. Package: top.xpandi.botcstoryteller  SHA-1: <debug keystore SHA-1>
 *  3. Set VITE_GOOGLE_ANDROID_CLIENT_ID in .env.local
 *  4. No client_secret needed — Android clients verified by APK signature.
 *
 * Tokens in localStorage / Capacitor Preferences (via storage.ts shim):
 *   Scoped to drive.appdata + drive.file; revocable from Google Account settings.
 */

import { Capacitor } from '@capacitor/core'

export const CLIENT_ID_STORAGE_KEY = 'BOTC_GOOGLE_CLIENT_ID'
export const CLIENT_SECRET_STORAGE_KEY = 'BOTC_GOOGLE_CLIENT_SECRET'

/**
 * Android OAuth client ID — registered in Google Cloud Console as "Android" type.
 * Safe to hardcode: Google verifies requests by APK SHA-1 signature, not a secret.
 * env var overrides for development if needed.
 */
const ANDROID_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID as string | undefined) ||
  '401513017527-5ok0fl62q0te6njps6u5r0sqvfto02ln.apps.googleusercontent.com'

/**
 * Desktop (Electron) OAuth client ID + secret — "Desktop app" type in Google Cloud Console.
 * client_secret is NOT truly secret for desktop apps (Google acknowledges it can be extracted
 * from binaries). Set via build-time env vars in .env.local.
 *
 * Registered redirect URI: http://localhost  (Desktop clients accept any port on loopback)
 */
const ELECTRON_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_ELECTRON_CLIENT_ID as string | undefined) ?? ''
const ELECTRON_CLIENT_SECRET: string =
  (import.meta.env.VITE_GOOGLE_ELECTRON_CLIENT_SECRET as string | undefined) ?? ''

/** True when running inside Electron. */
export function isElectron(): boolean {
  return typeof navigator !== 'undefined' &&
    navigator.userAgent.toLowerCase().includes('electron')
}

/** True when Electron AND Desktop client ID is baked in — fully pre-configured. */
export function isElectronConfigured(): boolean {
  return isElectron() && !!ELECTRON_CLIENT_ID
}

/** Read client ID — Electron env var > localStorage > web env var. */
export function getClientId(): string {
  if (isElectron() && ELECTRON_CLIENT_ID) return ELECTRON_CLIENT_ID
  try {
    const stored = localStorage.getItem(CLIENT_ID_STORAGE_KEY)
    if (stored?.trim()) return stored.trim()
  } catch {}
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''
}

/** Read client secret — Electron env var > localStorage > web env var. */
export function getClientSecret(): string {
  if (isElectron() && ELECTRON_CLIENT_SECRET) return ELECTRON_CLIENT_SECRET
  try {
    const stored = localStorage.getItem(CLIENT_SECRET_STORAGE_KEY)
    if (stored?.trim()) return stored.trim()
  } catch {}
  return (import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string | undefined) ?? ''
}

export function saveClientId(id: string): void {
  try { localStorage.setItem(CLIENT_ID_STORAGE_KEY, id.trim()) } catch {}
}

export function saveClientSecret(secret: string): void {
  try { localStorage.setItem(CLIENT_SECRET_STORAGE_KEY, secret.trim()) } catch {}
}

export function clearClientId(): void {
  try { localStorage.removeItem(CLIENT_ID_STORAGE_KEY) } catch {}
}

export function clearClientSecret(): void {
  try { localStorage.removeItem(CLIENT_SECRET_STORAGE_KEY) } catch {}
}

/** @deprecated use getClientId() — kept for legacy imports */
export const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''

const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.file',
  'email',
  'profile',
].join(' ')

// Tokens: localStorage so they survive tab close / reload
// PKCE verifier + state: localStorage so they survive the navigation-away-to-Google redirect
// (sessionStorage can be wiped on navigation in some browsers / privacy modes)
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

// ── Token storage (localStorage — persists across reloads and tab close) ─────────────────────

export function getStoredTokens(): GoogleTokens | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as GoogleTokens) : null
  } catch {
    return null
  }
}

export function storeTokens(tokens: GoogleTokens): void {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(tokens)) } catch {}
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(VERIFIER_KEY)
    localStorage.removeItem(STATE_KEY)
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

// ── Native OAuth (Android — no client_secret) ────────────────────────────────

/**
 * Android PKCE flow via @byteowls/capacitor-oauth2.
 * Uses Chrome Custom Tabs; Google verifies by APK SHA-1, no secret required.
 * Redirect scheme: com.googleusercontent.apps.{reversed-client-id}
 */
async function startNativeOAuthFlow(): Promise<void> {
  const { OAuth2Client } = await import('@byteowls/capacitor-oauth2')
  const clientId = ANDROID_CLIENT_ID || getClientId()
  if (!clientId) throw new Error('Google Client ID not configured — enter it in Settings → Cloud Sync')

  // Reversed client ID scheme required for Android OAuth loopback
  const reversedClientId = clientId.split('.').reverse().join('.')
  const redirectUrl = `${reversedClientId}:/oauth2redirect`

  const result = await OAuth2Client.authenticate({
    appId: clientId,
    authorizationBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    accessTokenEndpoint: 'https://oauth2.googleapis.com/token',
    scope: SCOPES,
    pkceEnabled: true,
    responseType: 'code',
    redirectUrl,
    logsEnabled: true,
    android: {
      // Chrome Custom Tab returns via onActivityResult — handleResultOnActivityResult is required.
      // handleResultOnNewIntent is ONLY called when app was KILLED during auth (per plugin docs).
      handleResultOnActivityResult: true,
    },
    additionalParameters: {
      access_type: 'offline',
      prompt: 'consent',
    },
  })

  const tokenResponse = result?.access_token_response as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
  } | null

  if (!tokenResponse?.access_token) throw new Error('Native OAuth: no access_token in response')

  const tokens: GoogleTokens = {
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token ?? '',
    expires_at: Date.now() + (tokenResponse.expires_in ?? 3600) * 1000,
  }
  storeTokens(tokens)
}

// ── Electron loopback OAuth flow ──────────────────────────────────────────────

declare global {
  interface Window {
    electronBridge?: {
      startOAuthServer: () => Promise<number>
      stopOAuthServer: () => Promise<void>
      onOAuthCallback: (cb: (params: { code?: string; state?: string; error?: string }) => void) => void
      removeOAuthCallback: () => void
      openExternal: (url: string) => Promise<void>
    }
  }
}

/**
 * Electron PKCE flow via loopback HTTP server.
 * Opens Google consent in system browser; receives code on http://127.0.0.1:{port}/.
 * Desktop-type OAuth clients allow any loopback port (no exact match needed).
 */
async function startElectronOAuthFlow(): Promise<void> {
  const bridge = window.electronBridge
  if (!bridge) throw new Error('Electron bridge not available')

  const clientId = getClientId()
  const clientSecret = getClientSecret()
  if (!clientId) throw new Error('Google Client ID not configured — set VITE_GOOGLE_ELECTRON_CLIENT_ID')

  const port = await bridge.startOAuthServer()
  const redirectUri = `http://localhost:${port}/`

  const verifier = randomBase64Url(96)
  const challenge = await sha256Base64Url(verifier)
  const state = randomBase64Url(16)

  // Store PKCE state — persisted across external browser round-trip
  localStorage.setItem(VERIFIER_KEY, verifier)
  localStorage.setItem(STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  // Open in system browser (Electron intercepts all HTTP/HTTPS navigations)
  await bridge.openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)

  // Wait for callback from loopback server
  await new Promise<void>((resolve, reject) => {
    bridge.onOAuthCallback(async ({ code, state: retState, error }) => {
      bridge.removeOAuthCallback()
      try {
        if (error) throw new Error(`Google OAuth error: ${error}`)
        if (!code) throw new Error('No code in OAuth callback')

        const storedState = localStorage.getItem(STATE_KEY)
        if (retState !== storedState) throw new Error('OAuth state mismatch — possible CSRF')

        const storedVerifier = localStorage.getItem(VERIFIER_KEY)
        if (!storedVerifier) throw new Error('PKCE verifier missing')

        const body = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code,
          code_verifier: storedVerifier,
        })
        if (clientSecret) body.set('client_secret', clientSecret)

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
        storeTokens({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + data.expires_in * 1000,
        })

        localStorage.removeItem(VERIFIER_KEY)
        localStorage.removeItem(STATE_KEY)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })
}

// ── Start flow ────────────────────────────────────────────────────────────────

/**
 * Kick off PKCE OAuth2.
 * On Android native: uses Chrome Custom Tabs via @byteowls/capacitor-oauth2 (no secret).
 * On Electron: opens system browser + loopback HTTP server receives code.
 * On web: stores verifier in localStorage, navigates to Google consent page.
 * After web consent, Google redirects back with `?code=...&state=...`.
 * Call `handleOAuthCallback()` to complete the web flow.
 */
export async function startOAuthFlow(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    return startNativeOAuthFlow()
  }
  if (isElectron()) {
    return startElectronOAuthFlow()
  }

  const clientId = getClientId()
  if (!clientId) throw new Error('Google Client ID not configured — enter it in Settings → Cloud Sync')

  const verifier = randomBase64Url(96)
  const challenge = await sha256Base64Url(verifier)
  const state = randomBase64Url(16)

  localStorage.setItem(VERIFIER_KEY, verifier)
  localStorage.setItem(STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: clientId,
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
  const storedState = localStorage.getItem(STATE_KEY)
  const verifier = localStorage.getItem(VERIFIER_KEY)

  if (!code || !verifier) return null
  if (state !== storedState) throw new Error('OAuth state mismatch — possible CSRF')

  const body = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
  })
  // Web Application OAuth clients require client_secret even with PKCE
  const secret = getClientSecret()
  if (secret) body.set('client_secret', secret)

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

  // Clean up PKCE state — no longer needed
  try { localStorage.removeItem(VERIFIER_KEY) } catch {}
  try { localStorage.removeItem(STATE_KEY) } catch {}

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
    client_id: getClientId(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  const secret = getClientSecret()
  if (secret) body.set('client_secret', secret)

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

// ── Google account info ───────────────────────────────────────────────────────

export interface GoogleUserInfo {
  email: string
  name: string
  picture?: string
}

export async function fetchGoogleUserInfo(token: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`userinfo failed: ${res.status}`)
  return res.json() as Promise<GoogleUserInfo>
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
