/**
 * I-73: with VITE_OAUTH_TOKEN_PROXY set, web token requests go to the API
 * worker without a client secret; without it, behavior is unchanged.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

async function loadAuth() {
  vi.resetModules()
  return import('../lib/googleAuth')
}

function tokenResponse() {
  return new Response(JSON.stringify({ access_token: 'at', refresh_token: 'rt', expires_in: 3600 }), { status: 200 })
}

describe('Google token requests', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn(async () => tokenResponse())
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'web-client')
    vi.stubEnv('VITE_GOOGLE_CLIENT_SECRET', 'bundled-secret')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  const sent = () => {
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    return { url, body: new URLSearchParams(String(init.body)) }
  }

  it('goes straight to Google with the configured secret when no proxy is set', async () => {
    vi.stubEnv('VITE_OAUTH_TOKEN_PROXY', '')
    const auth = await loadAuth()
    await auth.refreshAccessToken('refresh-1')
    const { url, body } = sent()
    expect(url).toBe('https://oauth2.googleapis.com/token')
    expect(body.get('client_secret')).toBe('bundled-secret')
    expect(body.get('refresh_token')).toBe('refresh-1')
  })

  it('uses the proxy without a secret when configured', async () => {
    vi.stubEnv('VITE_OAUTH_TOKEN_PROXY', 'https://api.test/v1/auth/google/token')
    const auth = await loadAuth()
    await auth.refreshAccessToken('refresh-1')
    const { url, body } = sent()
    expect(url).toBe('https://api.test/v1/auth/google/token')
    expect(body.has('client_secret')).toBe(false)
    expect(body.get('client_id')).toBe('web-client')
  })

  it('keeps a user-supplied secret going directly to Google', async () => {
    vi.stubEnv('VITE_OAUTH_TOKEN_PROXY', 'https://api.test/v1/auth/google/token')
    localStorage.setItem('BOTC_GOOGLE_CLIENT_SECRET', 'my-own-secret')
    const auth = await loadAuth()
    await auth.refreshAccessToken('refresh-1')
    const { url, body } = sent()
    expect(url).toBe('https://oauth2.googleapis.com/token')
    expect(body.get('client_secret')).toBe('my-own-secret')
  })

  it('exchanges the authorization code through the proxy', async () => {
    vi.stubEnv('VITE_OAUTH_TOKEN_PROXY', 'https://api.test/v1/auth/google/token')
    localStorage.setItem('BOTC_PKCE_VERIFIER', 'verifier')
    localStorage.setItem('BOTC_OAUTH_STATE', 'state-1')
    const auth = await loadAuth()
    const result = await auth.handleOAuthCallback(new URLSearchParams({ code: 'code-1', state: 'state-1' }))
    expect(result?.tokens.access_token).toBe('at')
    const { url, body } = sent()
    expect(url).toBe('https://api.test/v1/auth/google/token')
    expect(body.get('code')).toBe('code-1')
    expect(body.get('code_verifier')).toBe('verifier')
    expect(body.has('client_secret')).toBe(false)
  })
})
