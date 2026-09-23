/**
 * /v1/games — cloud games (P3). Anyone may create a game and read its public
 * state; storyteller actions need the game's host token (X-Game-Token header)
 * or a signed-in owner.
 */
import { Hono, type Context } from 'hono'
import type { GameCommand } from '../../../src/core/engine/commands'
import { getCatalog } from '../catalog'
import type { Env } from '../env'
import { AuthError, authenticate, type GoogleVerifier, type Principal } from '../library/auth'
import type { LibraryStore } from '../library/store'
import { InputError, resolveScriptData } from '../scripts'
import type { Access, CreateGameInput, RoomApi, RoomResult } from './room'

export type GameDeps = {
  roomFor: (env: Env, gameId: string) => RoomApi | null
  storeFor: (env: Env) => LibraryStore | null
  verifyGoogle: GoogleVerifier
  now: () => number
}

const ID_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'

export function newGameId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => ID_CHARS[b % ID_CHARS.length]).join('')
}

export function newHostToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return 'botc_host_' + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Cloud games need the GAMES Durable Object binding. */
export class GamesUnavailableError extends Error {
  constructor() { super('Cloud games are not enabled on this server.') }
}

const STATUS: Record<string, 400 | 403 | 404 | 409 | 500> = { not_found: 404, forbidden: 403, conflict: 409, invalid_argument: 400, exists: 409, internal: 500 }

type GamesContext = Context<{ Bindings: Env }>

function reply<T>(c: GamesContext, result: RoomResult<T>, status: 200 | 201 = 200) {
  return result.ok ? c.json(result.value as object, status) : c.json({ error: { code: result.code, message: result.message } }, STATUS[result.code] ?? 500)
}

/** Resolve a script reference into the ids a game is dealt from. */
export function scriptForGame(input: { scriptSlug?: unknown; script?: unknown }): CreateGameInput['script'] {
  const catalog = getCatalog()
  if (typeof input.scriptSlug === 'string') {
    const s = catalog.getScript(input.scriptSlug)
    if (!s) throw new InputError(`Unknown script "${input.scriptSlug}".`)
    return { slug: s.slug, title: s.title, characters: s.characters }
  }
  const data = resolveScriptData(catalog, { script: input.script })
  const entries = Array.isArray(data) ? data : []
  const meta = entries.find((e) => e && typeof e === 'object' && (e as { id?: string }).id === '_meta') as { name?: string } | undefined
  const characters = entries.map((e) => (typeof e === 'string' ? e : (e as { id?: string })?.id)).filter((id): id is string => !!id && id !== '_meta')
  if (characters.length === 0) throw new InputError('The script has no characters.')
  return { title: meta?.name ?? 'Custom script', characters }
}

export function buildGameRoutes(deps: GameDeps) {
  const games = new Hono<{ Bindings: Env }>()

  async function principalOf(c: GamesContext): Promise<Principal | null> {
    const authorization = c.req.header('authorization')
    if (!authorization) return null
    const store = deps.storeFor(c.env)
    if (!store) throw new InputError('Signing in needs the cloud library, which is not configured; use the host token instead.')
    return authenticate(authorization, c.env, store, deps.verifyGoogle, deps.now())
  }

  async function accessOf(c: GamesContext): Promise<Access> {
    const principal = await principalOf(c)
    return { hostToken: c.req.header('x-game-token') ?? undefined, userId: principal?.userId }
  }

  function room(c: GamesContext) {
    const r = deps.roomFor(c.env, c.req.param('id') ?? '')
    if (!r) throw new GamesUnavailableError()
    return r
  }

  games.onError((err, c) => {
    if (err instanceof AuthError) return c.json({ error: { code: 'unauthorized', message: err.message } }, 401)
    if (err instanceof GamesUnavailableError) return c.json({ error: { code: 'games_unavailable', message: err.message } }, 503)
    throw err
  })

  games.post('/', async (c) => {
    const body = await c.req.json().catch(() => null) as Record<string, unknown> | null
    if (!body) throw new InputError('Body must be JSON.')
    const principal = await principalOf(c)
    const gameId = newGameId()
    const r = deps.roomFor(c.env, gameId)
    if (!r) throw new GamesUnavailableError()
    const hostToken = newHostToken()
    const input: CreateGameInput = { ...(body as Omit<CreateGameInput, 'script'>), script: scriptForGame(body) }
    const created = await r.create(gameId, input, { ownerId: principal?.userId ?? null, hostToken })
    if (!created.ok) return reply(c, created)
    // The host token is only returned here; keep it to run the game.
    return c.json({ gameId, hostToken, version: created.value.version }, 201)
  })

  games.get('/:id', async (c) => {
    if (c.req.query('view') === 'st') return reply(c, await room(c).grimoire(await accessOf(c)))
    return reply(c, await room(c).publicState())
  })

  games.get('/:id/seats/:seat', async (c) => reply(c, await room(c).seat(await accessOf(c), Number(c.req.param('seat')))))

  games.post('/:id/commands', async (c) => {
    const body = await c.req.json().catch(() => null) as { commands?: unknown; command?: unknown; expectedVersion?: unknown } | null
    const commands = Array.isArray(body?.commands) ? body.commands : body?.command ? [body.command] : null
    if (!commands || commands.length === 0 || commands.some((cmd) => !cmd || typeof cmd !== 'object' || typeof (cmd as { type?: unknown }).type !== 'string')) {
      throw new InputError('Body must be { "commands": [{ "type": ... }] } or { "command": { "type": ... } }.')
    }
    const expectedVersion = typeof body?.expectedVersion === 'number' ? body.expectedVersion : undefined
    const result = await room(c).command(await accessOf(c), commands as GameCommand[], expectedVersion)
    if (result.ok && !result.value.ok) return c.json({ error: { code: result.value.error.code, message: result.value.error.message }, failedAt: result.value.failedAt, version: result.value.version }, 422)
    return reply(c, result)
  })

  games.get('/:id/night-script', async (c) => {
    const night = c.req.query('night') === 'other' ? 'other' : 'first'
    const lang = c.req.query('lang') === 'zh' ? 'zh' : 'en'
    return reply(c, await room(c).nightScript(await accessOf(c), night, lang, c.req.query('includeDead') === 'true'))
  })

  games.get('/:id/journal', async (c) => reply(c, await room(c).journal(await accessOf(c), Number(c.req.query('since') ?? 0) || 0)))

  return games
}
