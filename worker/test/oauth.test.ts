import { describe, it, expect, vi, afterEach } from 'vitest'
import app from '../src/index'
import type { Env } from '../src/env'

const env: Env = {
  APP_URL: 'https://example.test/app/',
  GOOGLE_WEB_CLIENT_ID: 'web-client',
  GOOGLE_CLIENT_SECRET: 'server-secret',
  OAUTH_ALLOWED_ORIGINS: 'https://app.test,http://localhost:5173',
}

const token = (fields: Record<string, string>, e: Env = env, origin = 'https://app.test') =>
  app.request('/v1/auth/google/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin },
    body: new URLSearchParams(fields).toString(),
  }, e)

afterEach(() => vi.unstubAllGlobals())

describe('OAuth token proxy', () => {
  it('adds the secret and passes Google responses through', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: 'at', expires_in: 3600 }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await token({ client_id: 'web-client', grant_type: 'authorization_code', code: 'c', code_verifier: 'v', redirect_uri: 'https://app.test/botc/', client_secret: 'ignored', extra: 'dropped' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ access_token: 'at', expires_in: 3600 })
    expect(res.headers.get('cache-control')).toBe('no-store')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://oauth2.googleapis.com/token')
    const sent = new URLSearchParams(String(init.body))
    expect(sent.get('client_secret')).toBe('server-secret')
    expect(sent.has('extra')).toBe(false)
    expect(sent.get('code_verifier')).toBe('v')
  })

  it('refreshes tokens and relays Google errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })))
    const res = await token({ client_id: 'web-client', grant_type: 'refresh_token', refresh_token: 'r' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_grant' })
  })

  it('rejects requests it should not forward', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect((await token({ client_id: 'web-client', grant_type: 'refresh_token', refresh_token: 'r' }, { APP_URL: 'x' })).status).toBe(501)
    expect((await token({ client_id: 'web-client', grant_type: 'refresh_token', refresh_token: 'r' }, env, 'https://evil.test')).status).toBe(403)
    expect((await token({ client_id: 'other', grant_type: 'refresh_token', refresh_token: 'r' })).status).toBe(400)
    expect((await token({ client_id: 'web-client', grant_type: 'password' })).status).toBe(400)
    expect((await token({ client_id: 'web-client', grant_type: 'authorization_code', code: 'c', code_verifier: 'v', redirect_uri: 'https://evil.test/' })).status).toBe(400)
    expect((await token({ client_id: 'web-client', grant_type: 'refresh_token' })).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
