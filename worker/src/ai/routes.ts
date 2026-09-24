/**
 * P5 hosted AI routes: chat with this project's MCP tools, semantic
 * character search and service status. Everything here needs the Workers AI
 * binding (env.AI); without it the routes answer 503 so the web app falls
 * back to its own key or local search.
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
import { AuthError, authenticate, sha256Hex } from '../library/auth'
import type { LibraryDeps } from '../library/routes'
import { buildMcpServer } from '../mcp'
import { runAgent, TOOL_GUIDE } from './agent'
import { workersAiChat, type ChatMessage } from './chat'
import { chatModelOf, embedModelOf } from './models'
import { D1QuotaStore, MemoryQuotaStore, quotaLimits, recordNeurons, takeQuota, usageToday, type QuotaStore } from './quota'
import { connectTools } from './tools'
import { D1FeedbackStore, MemoryFeedbackStore, parseFeedback, type FeedbackStore } from './feedback'

export type AiAppOptions = {
  /** Where vectors are kept; defaults to D1 (env.DB), else a per-isolate memory store. */
  embeddingStoreFor?: (env: Env) => EmbeddingStore
  /** Daily chat counters; defaults to D1 (env.DB), else a per-isolate memory store. */
  quotaStoreFor?: (env: Env) => QuotaStore
  /** Answer feedback; defaults to D1 (env.DB), else a per-isolate memory store. */
  feedbackStoreFor?: (env: Env) => FeedbackStore
  now?: () => number
}

const DEFAULT_SYSTEM = `You are the assistant in BOTC Companion, a Blood on the Clocktower script editor and storyteller tool. Help with characters, scripts, rules and running games. Answer in the user's language (Chinese or English), concisely.`

const LIMITS = { messages: 40, messageChars: 20_000, systemChars: 30_000, totalChars: 100_000 }

type ChatBody = { system?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }>; temperature?: number; tools?: boolean }

function parseChatBody(body: unknown): ChatBody {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Request body must be a JSON object.')
  const { system, messages, temperature, tools } = body as Record<string, unknown>
  if (system !== undefined && (typeof system !== 'string' || system.length > LIMITS.systemChars)) throw new InputError(`"system" must be a string of at most ${LIMITS.systemChars} characters.`)
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > LIMITS.messages) throw new InputError(`"messages" must be an array of 1 to ${LIMITS.messages} messages.`)
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || !m.content.trim() || m.content.length > LIMITS.messageChars) {
      throw new InputError(`Each message needs "role" (user | assistant) and non-empty "content" of at most ${LIMITS.messageChars} characters.`)
    }
  }
  if (messages[messages.length - 1].role !== 'user') throw new InputError('The last message must be from the user.')
  const total = (system?.length ?? 0) + messages.reduce((n: number, m: { content: string }) => n + m.content.length, 0)
  if (total > LIMITS.totalChars) throw new InputError(`The conversation is too long (${total} characters, limit ${LIMITS.totalChars}). Start a new chat.`)
  if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 1.5)) throw new InputError('"temperature" must be a number from 0 to 1.5.')
  if (tools !== undefined && typeof tools !== 'boolean') throw new InputError('"tools" must be true or false.')
  return { system: system as string | undefined, messages: messages as ChatBody['messages'], temperature: temperature as number | undefined, tools: tools as boolean | undefined }
}

const isolateQuota = new MemoryQuotaStore()

type AppContext = Context<{ Bindings: Env }>

const isolateEmbeddings = new MemoryEmbeddingStore()
const isolateFeedback = new MemoryFeedbackStore()
/** Feedback items per IP per UTC day. */
const FEEDBACK_PER_IP = 100

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

export function buildAiRoutes(options: AiAppOptions = {}, library?: LibraryDeps) {
  const r = new Hono<{ Bindings: Env }>()
  const now = options.now ?? Date.now
  const quotaStoreOf = (env: Env) => options.quotaStoreFor?.(env) ?? (env.DB ? new D1QuotaStore(env.DB) : isolateQuota)

  /**
   * Hosted chat. The model can call this server's MCP tools (read-only
   * catalog / rules / script checks, plus script import links). Counted
   * against the daily caps; a signed-in caller (Authorization: Bearer <PAT or
   * Google token>) gets the per-user cap instead of the per-IP one.
   */
  r.post('/ai/chat', async (c) => {
    const body = parseChatBody(await c.req.json().catch(() => undefined))
    if (!c.env.AI) return unavailable(c)

    let userId: string | null = null
    const authorization = c.req.header('authorization')
    const libraryStore = authorization && library ? library.storeFor(c.env) : null
    if (authorization && libraryStore && library) {
      try {
        userId = (await authenticate(authorization, c.env, libraryStore, library.verifyGoogle, now()))?.userId ?? null
      } catch (e) {
        if (e instanceof AuthError) return c.json({ error: { code: 'unauthorized', message: e.message } }, 401, { 'www-authenticate': 'Bearer' })
        throw e
      }
    }

    const quotaStore = quotaStoreOf(c.env)
    const quota = await takeQuota(quotaStore, { now: now(), ip: c.req.header('cf-connecting-ip') ?? 'unknown', userId, limits: quotaLimits(c.env) })
    if (!quota.ok) {
      const message = quota.scope === 'global'
        ? 'The free AI has reached its daily limit for everyone. Try again tomorrow, or use your own API key in the AI settings.'
        : `You have used today's ${quota.limit} free AI requests. Try again tomorrow, or use your own API key in the AI settings.`
      return c.json({ error: { code: 'ai_rate_limited', scope: quota.scope, message } }, 429)
    }

    const model = chatModelOf(c.env)
    const tools = body.tools === false ? undefined : await connectTools(buildMcpServer(c.env, undefined, undefined, semanticDepsFor(c.env, options) ?? undefined))
    try {
      const system = `${body.system?.trim() || DEFAULT_SYSTEM}${tools ? `\n\n${TOOL_GUIDE}` : ''}`
      const messages: ChatMessage[] = [{ role: 'system', content: system }, ...body.messages]
      const run = await runAgent({ chat: workersAiChat(c.env.AI, model), messages, tools, temperature: body.temperature })
      await recordNeurons(quotaStore, now(), run.usage.neurons)
      if (quota.remaining !== null) c.header('x-ai-remaining', String(quota.remaining))
      const usage = { ...run.usage, neurons: Math.round(run.usage.neurons * 10) / 10 }
      return c.json({ text: run.text, steps: run.steps, model, remaining: quota.remaining, usage })
    } finally {
      await tools?.close()
    }
  })

  /**
   * Feedback on an answer (👍 / 👎 with reasons) or a shared conversation,
   * with each answer's trace. Works without Workers AI: local-mode answers
   * are rated too. Capped per IP per day; the IP is not stored.
   */
  r.post('/ai/feedback', async (c) => {
    const record = parseFeedback(await c.req.json().catch(() => undefined), crypto.randomUUID(), now())
    const day = new Date(now()).toISOString().slice(0, 10)
    const subject = `feedback:${(await sha256Hex(`${day}|${c.req.header('cf-connecting-ip') ?? 'unknown'}`)).slice(0, 16)}`
    const quotaStore = quotaStoreOf(c.env)
    if (((await quotaStore.counts(day, [subject])).get(subject) ?? 0) >= FEEDBACK_PER_IP) {
      return c.json({ error: { code: 'feedback_rate_limited', message: `At most ${FEEDBACK_PER_IP} feedback items per day.` } }, 429)
    }
    await quotaStore.increment(day, [subject])
    const store = options.feedbackStoreFor?.(c.env) ?? (c.env.DB ? new D1FeedbackStore(c.env.DB) : isolateFeedback)
    await store.add(record)
    return c.json({ id: record.id }, 201)
  })

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
    const limits = quotaLimits(c.env)
    const cap = (n: number) => (Number.isFinite(n) ? n : null)
    return c.json({
      chat: {
        available: !!c.env.AI,
        model: c.env.AI ? chatModelOf(c.env) : null,
        dailyLimits: { global: cap(limits.global), perIp: cap(limits.perIp), perUser: cap(limits.perUser), neurons: cap(limits.neurons) },
        ...(c.env.AI ? { usedToday: await usageToday(quotaStoreOf(c.env), now()) } : {}),
      },
      embeddings: deps ? { available: true, ...(await embeddingStatus(deps)) } : { available: false },
    })
  })

  return r
}
