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

function randomToken(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return prefix + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const newHostToken = () => randomToken('botc_host_')
export const newSeatToken = () => randomToken('botc_seat_')

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
    return { hostToken: c.req.header('x-game-token') ?? undefined, seatToken: c.req.header('x-seat-token') ?? undefined, userId: principal?.userId }
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

  /** ?seat=3&targets=1,6 — legal information for that seat's night action (host). */
  games.get('/:id/night-info', async (c) => {
    const seat = Number(c.req.query('seat'))
    if (!Number.isInteger(seat)) throw new InputError('"seat" is required.')
    const targets = c.req.query('targets')?.split(',').map(Number).filter(Number.isInteger)
    return reply(c, await room(c).nightInfo(await accessOf(c), seat, targets))
  })

  games.get('/:id/journal', async (c) => reply(c, await room(c).journal(await accessOf(c), Number(c.req.query('since') ?? 0) || 0)))

  // ── Lobby and players (seat tokens replace the Firestore deal sessions) ────

  games.get('/:id/lobby', async (c) => reply(c, await room(c).lobby()))

  /** A player takes a free seat; the seat token is returned only here. */
  games.post('/:id/claim', async (c) => {
    const body = await c.req.json().catch(() => null) as { seat?: unknown; name?: unknown } | null
    if (!body || !Number.isInteger(body.seat) || typeof body.name !== 'string') throw new InputError('Body must be { "seat": <number>, "name": <string> }.')
    const seatToken = newSeatToken()
    const claimed = await room(c).claimSeat(body.seat as number, body.name, seatToken)
    return claimed.ok ? c.json({ ...claimed.value, seatToken }, 201) : reply(c, claimed)
  })

  games.delete('/:id/claims/:seat', async (c) => reply(c, await room(c).releaseSeat(await accessOf(c), Number(c.req.param('seat')))))

  /** A player's own view (X-Seat-Token). */
  games.get('/:id/me', async (c) => reply(c, await room(c).mySeat(await accessOf(c))))

  games.post('/:id/messages', async (c) => {
    const body = await c.req.json().catch(() => null) as { to?: unknown; text?: unknown } | null
    const to = body?.to === 'all' || body?.to === 'st' ? body.to : Number.isInteger(body?.to) ? body!.to as number : body?.to === undefined ? 'st' : null
    if (to === null || typeof body?.text !== 'string') throw new InputError('Body must be { "to": <seat> | "all", "text": <string> } (players omit "to").')
    return reply(c, await room(c).sendMessage(await accessOf(c), to, body.text), 201)
  })

  games.get('/:id/messages', async (c) => reply(c, await room(c).messages(await accessOf(c), Number(c.req.query('since') ?? 0) || 0)))

  /** A player votes when it is their turn in a clockwise vote (X-Seat-Token). */
  games.post('/:id/vote', async (c) => {
    const body = await c.req.json().catch(() => null) as { yes?: unknown } | null
    if (typeof body?.yes !== 'boolean') throw new InputError('Body must be { "yes": true | false }.')
    return reply(c, await room(c).castOwnVote(await accessOf(c), body.yes))
  })

  return games
}
