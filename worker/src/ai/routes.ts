/**
 * P5 hosted AI routes: semantic character search and service status.
 * Everything here needs the Workers AI binding (env.AI); without it the
 * routes answer 503 so the web app falls back to its local search.
 */
import { Hono, type Context } from 'hono'
import { SCRIPT_TEAMS } from '../../../src/core/script/validate'
import type { Team } from '../../../src/core/types/catalog'
import { getCatalog } from '../catalog'
import type { Env } from '../env'
import { InputError } from '../scripts'
import { characterView, parseLang, type Lang } from '../views'
import { D1EmbeddingStore, embeddingStatus, findSimilar, MemoryEmbeddingStore, workersAiEmbedder, type EmbeddingStore, type SemanticDeps } from './embeddings'
import type { Neighbor } from '../../../src/core/ai/vectors'
import { chatModelOf, embedModelOf } from './models'

export type AiAppOptions = {
  /** Where vectors are kept; defaults to D1 (env.DB), else a per-isolate memory store. */
  embeddingStoreFor?: (env: Env) => EmbeddingStore
  now?: () => number
}

type AppContext = Context<{ Bindings: Env }>

const isolateEmbeddings = new MemoryEmbeddingStore()

export function semanticDepsFor(env: Env, options: AiAppOptions = {}): SemanticDeps | null {
  if (!env.AI) return null
  const model = embedModelOf(env)
  const store = options.embeddingStoreFor?.(env) ?? (env.DB ? new D1EmbeddingStore(env.DB) : isolateEmbeddings)
  return { store, embed: workersAiEmbedder(env.AI, model), model, now: options.now ?? Date.now }
}

const unavailable = (c: AppContext) => c.json({ error: { code: 'ai_unavailable', message: 'AI features are not enabled on this server (no Workers AI binding).' } }, 503)

function teamParam(value: string | undefined): Team | undefined {
  if (value && !SCRIPT_TEAMS.includes(value as Team)) throw new InputError(`Unknown team "${value}".`)
  return value as Team | undefined
}

function limitParam(value: string | undefined): number {
  const limit = Number(value ?? 5)
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new InputError('"limit" must be an integer from 1 to 50.')
  return limit
}

export function similarView(neighbors: Neighbor[], lang?: Lang) {
  const catalog = getCatalog()
  return neighbors.flatMap(({ id, score }) => {
    const c = catalog.getCharacter(id)
    return c ? [{ ...characterView(c, lang), score: Math.round(score * 1000) / 1000 }] : []
  })
}

export function buildAiRoutes(options: AiAppOptions = {}) {
  const r = new Hono<{ Bindings: Env }>()

  r.get('/characters/similar', async (c) => {
    const query = c.req.query('q')?.trim()
    if (!query) throw new InputError('"q" is required: text in English or Chinese to match against abilities.')
    if (query.length > 1000) throw new InputError('"q" is limited to 1000 characters.')
    const deps = semanticDepsFor(c.env, options)
    if (!deps) return unavailable(c)
    const exclude = c.req.query('exclude')?.split(',').map((s) => s.trim()).filter(Boolean)
    const items = await findSimilar(deps, { query, team: teamParam(c.req.query('team')), exclude, limit: limitParam(c.req.query('limit')) })
    return c.json({ model: deps.model, items: similarView(items ?? [], parseLang(c.req.query('lang'))) })
  })

  r.get('/characters/:id/similar', async (c) => {
    const id = c.req.param('id')
    if (!getCatalog().getCharacter(id)) return c.json({ error: { code: 'not_found', message: `Unknown character "${id}".` } }, 404)
    const deps = semanticDepsFor(c.env, options)
    if (!deps) return unavailable(c)
    const items = await findSimilar(deps, { id, team: teamParam(c.req.query('team')), limit: limitParam(c.req.query('limit')) })
    return c.json({ model: deps.model, items: similarView(items ?? [], parseLang(c.req.query('lang'))) })
  })

  r.get('/ai/status', async (c) => {
    const deps = semanticDepsFor(c.env, options)
    return c.json({
      chat: { available: !!c.env.AI, model: c.env.AI ? chatModelOf(c.env) : null },
      embeddings: deps ? { available: true, ...(await embeddingStatus(deps)) } : { available: false },
    })
  })

  return r
}
