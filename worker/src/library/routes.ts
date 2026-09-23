/**
 * /v1/me — the signed-in user's cloud library (P2): identity, personal access
 * tokens, scripts / custom characters / game records with sync, and stats.
 */
import { Hono } from 'hono'
import { computeCharStats, computeKpiSummary, computePlayerStats, computeScriptStats, computeStorytellerStats } from '../../../src/core/stats/records'
import type { GameRecord } from '../../../src/core/types/game'
import type { Env } from '../env'
import { AuthError, authenticate, newTokenSecret, sha256Hex, type GoogleVerifier, type Principal } from './auth'
import type { LibraryStore } from './store'
import { checkDocument, KIND_BY_PATH } from './validate'

export type LibraryDeps = {
  storeFor: (env: Env) => LibraryStore | null
  verifyGoogle: GoogleVerifier
  now: () => number
}

type MeEnv = { Bindings: Env; Variables: { store: LibraryStore; principal: Principal } }

const MAX_TOKENS = 20
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

const error = (code: string, message: string) => ({ error: { code, message } })

/** Maps and Sets (used by the stats) become plain JSON objects and arrays. */
export function jsonSafe(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_key, v) => (v instanceof Map ? Object.fromEntries(v) : v instanceof Set ? [...v] : v)))
}

export function buildLibraryRoutes(deps: LibraryDeps) {
  const me = new Hono<MeEnv>()

  me.use('*', async (c, next) => {
    const store = deps.storeFor(c.env)
    if (!store) return c.json(error('library_unavailable', 'The cloud library is not configured on this server.'), 503)
    let principal: Principal | null
    try {
      principal = await authenticate(c.req.header('authorization'), c.env, store, deps.verifyGoogle, deps.now())
    } catch (e) {
      if (e instanceof AuthError) return c.json(error('unauthorized', e.message), 401)
      throw e
    }
    if (!principal) return c.json(error('unauthorized', 'Sign in required: send "Authorization: Bearer <Google access token or botc_pat_ token>".'), 401)
    c.set('store', store)
    c.set('principal', principal)
    await next()
  })

  me.get('/', (c) => {
    const { userId, email, via } = c.get('principal')
    return c.json({ userId, email, via })
  })

  // ── Personal access tokens ────────────────────────────────────────────────

  me.get('/tokens', async (c) => c.json({ items: await c.get('store').listTokens(c.get('principal').userId) }))

  me.post('/tokens', async (c) => {
    const principal = c.get('principal')
    if (principal.via !== 'google') return c.json(error('forbidden', 'Access tokens can only be created while signed in with Google.'), 403)
    const body = await c.req.json().catch(() => ({})) as { name?: unknown }
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : 'Agent'
    const store = c.get('store')
    if ((await store.listTokens(principal.userId)).length >= MAX_TOKENS) return c.json(error('limit', `At most ${MAX_TOKENS} active tokens.`), 409)
    const token = newTokenSecret()
    const id = crypto.randomUUID()
    const createdAt = deps.now()
    await store.createToken(principal.userId, id, name, await sha256Hex(token), createdAt)
    // The token itself is only ever shown in this response.
    return c.json({ id, name, createdAt, token }, 201)
  })

  me.delete('/tokens/:id', async (c) => {
    const revoked = await c.get('store').revokeToken(c.get('principal').userId, c.req.param('id'), deps.now())
    return revoked ? c.body(null, 204) : c.json(error('not_found', 'No such active token.'), 404)
  })

  // ── Stats over the stored game records ────────────────────────────────────

  me.get('/stats', async (c) => {
    const records = (await c.get('store').listDocs(c.get('principal').userId, 'record')).map((d) => d.data as GameRecord)
    return c.json(jsonSafe({
      kpi: computeKpiSummary(records),
      scripts: computeScriptStats(records),
      players: computePlayerStats(records),
      characters: computeCharStats(records),
      storytellers: computeStorytellerStats(records),
    }) as Record<string, unknown>)
  })

  // ── Library documents ─────────────────────────────────────────────────────

  me.get('/:kind', async (c) => {
    const kind = KIND_BY_PATH[c.req.param('kind')]
    if (!kind) return c.json(error('not_found', 'Unknown collection; use scripts, characters or records.'), 404)
    const sinceRaw = c.req.query('since')
    const since = sinceRaw === undefined ? undefined : Number(sinceRaw)
    if (since !== undefined && !Number.isFinite(since)) return c.json(error('invalid_request', '"since" must be a timestamp in ms.'), 400)
    const items = await c.get('store').listDocs(c.get('principal').userId, kind, since)
    return c.json({ items, serverTime: deps.now() })
  })

  me.get('/:kind/:id', async (c) => {
    const kind = KIND_BY_PATH[c.req.param('kind')]
    if (!kind) return c.json(error('not_found', 'Unknown collection.'), 404)
    const doc = await c.get('store').getDoc(c.get('principal').userId, kind, c.req.param('id'))
    return doc && !doc.deleted ? c.json(doc) : c.json(error('not_found', 'Not found.'), 404)
  })

  me.put('/:kind/:id', async (c) => {
    const kind = KIND_BY_PATH[c.req.param('kind')]
    if (!kind) return c.json(error('not_found', 'Unknown collection.'), 404)
    const id = c.req.param('id')
    const body = await c.req.json().catch(() => null) as { data?: unknown; updatedAt?: unknown; baseUpdatedAt?: unknown } | null
    if (!body) return c.json(error('invalid_request', 'Body must be JSON: { data, updatedAt?, baseUpdatedAt? }.'), 400)
    const problem = checkDocument(kind, id, body.data)
    if (problem) return c.json(error('invalid_document', problem), 400)
    const now = deps.now()
    const updatedAt = typeof body.updatedAt === 'number' ? Math.min(body.updatedAt, now + MAX_CLOCK_SKEW_MS) : now
    const base = typeof body.baseUpdatedAt === 'number' ? body.baseUpdatedAt : undefined
    const result = await c.get('store').putDoc(c.get('principal').userId, kind, id, body.data, updatedAt, base)
    return result.ok ? c.json(result.doc) : c.json({ ...error('conflict', 'A newer version is stored.'), current: result.conflict }, 409)
  })

  me.delete('/:kind/:id', async (c) => {
    const kind = KIND_BY_PATH[c.req.param('kind')]
    if (!kind) return c.json(error('not_found', 'Unknown collection.'), 404)
    const doc = await c.get('store').deleteDoc(c.get('principal').userId, kind, c.req.param('id'), deps.now())
    return doc ? c.json(doc) : c.json(error('not_found', 'Not found.'), 404)
  })

  return me
}
