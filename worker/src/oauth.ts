/**
 * Google OAuth token proxy for the web app (docs/ISSUES.md I-73).
 *
 * Google's "Web application" clients need the client secret even with PKCE.
 * Instead of shipping it in the web bundle, the app posts the same token
 * request here (without the secret) and the worker adds it from a Worker
 * secret. Only the configured client id, grant types and redirect origins are
 * accepted; responses from Google are passed through unchanged.
 */
import { Hono } from 'hono'
import type { Env } from './env'

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const FORWARDED = ['client_id', 'grant_type', 'code', 'code_verifier', 'redirect_uri', 'refresh_token'] as const

const oauthError = (error: string, description: string) => ({ error, error_description: description })

export function buildOAuthRoutes() {
  const routes = new Hono<{ Bindings: Env }>()

  routes.post('/google/token', async (c) => {
    const { GOOGLE_CLIENT_SECRET, GOOGLE_WEB_CLIENT_ID } = c.env
    if (!GOOGLE_CLIENT_SECRET || !GOOGLE_WEB_CLIENT_ID) {
      return c.json(oauthError('not_configured', 'Token proxy is not configured on this server.'), 501)
    }
    const allowedOrigins = (c.env.OAUTH_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    const origin = c.req.header('origin')
    if (origin && !allowedOrigins.includes(origin)) return c.json(oauthError('origin_not_allowed', `Origin ${origin} may not use this proxy.`), 403)

    const form = new URLSearchParams(await c.req.text())
    if (form.get('client_id') !== GOOGLE_WEB_CLIENT_ID) return c.json(oauthError('invalid_client', 'Unknown client_id.'), 400)
    const grant = form.get('grant_type')
    if (grant === 'authorization_code') {
      if (!form.get('code') || !form.get('code_verifier')) return c.json(oauthError('invalid_request', 'code and code_verifier are required.'), 400)
      let redirectOrigin = ''
      try { redirectOrigin = new URL(form.get('redirect_uri') ?? '').origin } catch { /* invalid URL */ }
      if (!allowedOrigins.includes(redirectOrigin)) return c.json(oauthError('invalid_request', 'redirect_uri is not allowed.'), 400)
    } else if (grant === 'refresh_token') {
      if (!form.get('refresh_token')) return c.json(oauthError('invalid_request', 'refresh_token is required.'), 400)
    } else {
      return c.json(oauthError('unsupported_grant_type', 'Only authorization_code and refresh_token are supported.'), 400)
    }

    const body = new URLSearchParams()
    for (const key of FORWARDED) {
      const value = form.get(key)
      if (value) body.set(key, value)
    }
    body.set('client_secret', GOOGLE_CLIENT_SECRET)
    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    return new Response(await res.text(), { status: res.status, headers: { 'content-type': res.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' } })
  })

  return routes
}
