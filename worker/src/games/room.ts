/**
 * One cloud game (P3). All logic lives here and is storage-agnostic; the
 * Durable Object in durable.ts only supplies storage and serialized access,
 * so every command for a game runs one at a time (no racing votes).
 */
import { applyCommand, currentDayOf, type EngineGame, type GameCommand } from '../../../src/core/engine/commands'
import { createDayState } from '../../../src/core/engine/factories'
import { buildNightScript } from '../../../src/core/engine/nightScript'
import { suggestNightInfo } from '../../../src/core/engine/nightInfo'
import { buildSeatsFromConfig, drawRandomAssignments } from '../../../src/core/engine/setup'
import { publicView, seatView } from '../../../src/core/engine/views'
import type { NewGameConfig, TimerDefaults } from '../../../src/core/types/game'
import type { CatalogIndex } from '../../../src/core/catalog'
import { sha256Hex } from '../library/auth'

export const DEFAULT_TIMERS: TimerDefaults = {
  privateSeconds: 180, publicFreeSeconds: 300, publicRoundRobinSeconds: 30, nominationDelayMinutes: 2,
  nominationWaitSeconds: 10, nominationActorSeconds: 30, nominationTargetSeconds: 30, nominationVoteSeconds: 5, alarmSound: '',
}

const JOURNAL_LIMIT = 500
const MESSAGE_LIMIT = 500
const MAX_MESSAGE_LENGTH = 500
const MAX_NAME_LENGTH = 40

export type GameMeta = {
  gameId: string
  createdAt: number
  ownerId: string | null
  hostTokenHash: string
  script: { slug?: string; title: string; characters: string[] }
}

export type JournalEntry = { version: number; at: number; command: GameCommand }

export type SeatClaim = { tokenHash: string; name: string; claimedAt: number }

/** Storyteller ↔ player messages. `from`/`to` are seat numbers, 'st', or 'all' (broadcast from the ST). */
export type RoomMessage = { id: string; at: number; from: 'st' | number; to: 'st' | 'all' | number; text: string }

export type RoomState = {
  meta: GameMeta
  game: EngineGame
  journal: JournalEntry[]
  /** Seat → the player who claimed it in the lobby (games created before lobbies have none). */
  claims?: Record<number, SeatClaim>
  messages?: RoomMessage[]
}

export interface RoomStorage {
  load(): Promise<RoomState | null>
  save(state: RoomState): Promise<void>
}

export type Access = { hostToken?: string; userId?: string; seatToken?: string }

export type CreateGameInput = {
  script: { slug?: string; title: string; characters: string[] }
  playerCount: number
  travelerCount?: number
  seatNames?: Record<string, string>
  /** Seat → character id, or "random" to deal the official distribution from the script. */
  assignments?: Record<string, string> | 'random'
  /** Seat → the character the player is told they are (Drunk etc.). */
  perceived?: Record<string, string>
  travelers?: Record<string, string>
  demonBluffs?: string[]
  timers?: Partial<TimerDefaults>
}

export class RoomError extends Error {
  constructor(readonly code: 'not_found' | 'forbidden' | 'conflict' | 'invalid_argument' | 'exists', message: string) {
    super(message)
  }
}

const toSeatMap = (m: Record<string, string> | undefined): Record<number, string> =>
  Object.fromEntries(Object.entries(m ?? {}).map(([k, v]) => [Number(k), v]).filter(([k]) => Number.isInteger(k)))

function randomSource(): () => number {
  return () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
}

export class GameRoomCore {
  constructor(private readonly storage: RoomStorage, private readonly catalog: CatalogIndex, private readonly now: () => number = Date.now) {}

  private async state(): Promise<RoomState> {
    const state = await this.storage.load()
    if (!state) throw new RoomError('not_found', 'No such game.')
    return state
  }

  private async requireHost(state: RoomState, access: Access) {
    if (access.userId && state.meta.ownerId === access.userId) return
    if (access.hostToken && (await sha256Hex(access.hostToken)) === state.meta.hostTokenHash) return
    throw new RoomError('forbidden', 'Storyteller access required: send the game\'s host token.')
  }

  async create(gameId: string, input: CreateGameInput, owner: { ownerId: string | null; hostToken: string }): Promise<RoomState> {
    if (await this.storage.load()) throw new RoomError('exists', 'Game already exists.')
    const { playerCount } = input
    const travelerCount = input.travelerCount ?? 0
    if (!Number.isInteger(playerCount) || playerCount < 5 || playerCount > 20) throw new RoomError('invalid_argument', 'playerCount must be 5–20.')
    if (!Number.isInteger(travelerCount) || travelerCount < 0 || travelerCount > 5) throw new RoomError('invalid_argument', 'travelerCount must be 0–5.')
    const assignments = input.assignments === 'random'
      ? drawRandomAssignments({ playerCount, scriptCharacters: input.script.characters, getTeam: this.catalog.teamOf, rng: randomSource() })
      : toSeatMap(input.assignments)
    const unknown = [...Object.values(assignments), ...Object.values(toSeatMap(input.perceived)), ...Object.values(toSeatMap(input.travelers)), ...(input.demonBluffs ?? [])]
      .filter((id) => !this.catalog.getCharacter(id))
    if (unknown.length) throw new RoomError('invalid_argument', `Unknown character ids: ${[...new Set(unknown)].join(', ')}.`)
    const config: NewGameConfig = {
      playerCount, travelerCount, scriptSlug: input.script.slug ?? 'custom',
      seatNames: toSeatMap(input.seatNames), assignments, userAssignments: toSeatMap(input.perceived),
      travelerAssignments: toSeatMap(input.travelers), seatNotes: {}, specialNote: '',
      demonBluffs: input.demonBluffs ?? [], charPool: [],
    }
    const timers = { ...DEFAULT_TIMERS, ...input.timers }
    const day = { ...createDayState(1, buildSeatsFromConfig(config, this.catalog.teamOf), timers, `day-1-${gameId}`, this.catalog.teamOf), demonBluffs: config.demonBluffs }
    const state: RoomState = {
      meta: { gameId, createdAt: this.now(), ownerId: owner.ownerId, hostTokenHash: await sha256Hex(owner.hostToken), script: input.script },
      game: { days: [day], currentDayId: day.id, timers, version: 0 },
      journal: [],
    }
    await this.storage.save(state)
    return state
  }

  /** The storyteller's full view. */
  async grimoire(access: Access) {
    const state = await this.state()
    await this.requireHost(state, access)
    const { hostTokenHash: _hash, ...meta } = state.meta
    return { meta, game: state.game }
  }

  /** What everybody may know. */
  async publicState() {
    const state = await this.state()
    return { gameId: state.meta.gameId, script: { slug: state.meta.script.slug, title: state.meta.script.title }, ...publicView(state.game) }
  }

  /** One player's view (storyteller only until seats get their own tokens). */
  async seat(access: Access, seatNumber: number) {
    const state = await this.state()
    await this.requireHost(state, access)
    const view = seatView(state.game, seatNumber)
    if (!view) throw new RoomError('invalid_argument', `Seat ${seatNumber} does not exist.`)
    return view
  }

  async command(access: Access, commands: GameCommand[], expectedVersion?: number) {
    const state = await this.state()
    await this.requireHost(state, access)
    if (expectedVersion !== undefined && expectedVersion !== state.game.version) {
      throw new RoomError('conflict', `Game is at version ${state.game.version}, not ${expectedVersion}. Re-read and retry.`)
    }
    let game = state.game
    const events = []
    const effects = []
    const journal = [...state.journal]
    for (let i = 0; i < commands.length; i++) {
      const at = this.now()
      let result
      try {
        result = applyCommand(game, commands[i], { now: at, getTeam: this.catalog.teamOf })
      } catch {
        result = { ok: false as const, error: { code: 'invalid_argument' as const, message: 'Malformed command.' } }
      }
      if (!result.ok) {
        // Nothing is saved when any command fails: the batch is atomic.
        return { ok: false as const, failedAt: i, error: result.error, version: state.game.version }
      }
      game = result.game
      events.push(...result.events)
      effects.push(...result.effects)
      journal.push({ version: game.version, at, command: commands[i] })
    }
    await this.storage.save({ ...state, game, journal: journal.slice(-JOURNAL_LIMIT) })
    return { ok: true as const, version: game.version, events, effects }
  }

  async nightScript(access: Access, night: 'first' | 'other', lang: 'en' | 'zh', includeDead = false) {
    const state = await this.state()
    await this.requireHost(state, access)
    const c = this.catalog
    return buildNightScript(currentDayOf(state.game), {
      order: night === 'first' ? c.data.nightOrder.first : c.data.nightOrder.other,
      name: (id) => c.getCharacter(id)?.name[lang],
      reminder: (id) => (night === 'first' ? c.getCharacter(id)?.firstNightReminder?.[lang] : c.getCharacter(id)?.otherNightReminder?.[lang]),
    }, { includeDead })
  }

  /** Legal information for a seat's night action (see core/engine/nightInfo.ts). */
  async nightInfo(access: Access, seatNumber: number, targets?: number[]) {
    const state = await this.state()
    await this.requireHost(state, access)
    const ordered = [...state.game.days].sort((a, b) => a.day - b.day)
    const current = currentDayOf(state.game)
    const i = ordered.indexOf(current)
    // Execution flags carry over to later days, so "today's execution" for
    // tonight's Undertaker is the seat newly executed on the previous day.
    const prev = ordered[i - 1]
    const before = ordered[i - 2]
    const executedSeat = prev?.seats.find((s) => s.isExecuted && !before?.seats.find((b) => b.seat === s.seat)?.isExecuted)?.seat ?? null
    const suggestion = suggestNightInfo(current, seatNumber, this.catalog.teamOf, { targets, executedSeat })
    if (!suggestion) throw new RoomError('invalid_argument', `Seat ${seatNumber} does not exist.`)
    return suggestion
  }

  async journal(access: Access, since = 0) {
    const state = await this.state()
    await this.requireHost(state, access)
    return state.journal.filter((j) => j.version > since)
  }

  // ── Lobby, seat tokens and messages ───────────────────────────────────────

  private async isHost(state: RoomState, access: Access) {
    try { await this.requireHost(state, access); return true } catch { return false }
  }

  /** The seat a seat token belongs to, or an error. */
  private async requireSeat(state: RoomState, access: Access): Promise<number> {
    if (access.seatToken) {
      const hash = await sha256Hex(access.seatToken)
      for (const [seat, claim] of Object.entries(state.claims ?? {})) if (claim.tokenHash === hash) return Number(seat)
    }
    throw new RoomError('forbidden', 'Player access required: send your seat token.')
  }

  /** Who sits where — public, so players can pick a free seat. */
  async lobby() {
    const state = await this.state()
    const claims = state.claims ?? {}
    return currentDayOf(state.game).seats.map((s) => ({ seat: s.seat, name: s.name, claimed: !!claims[s.seat], isTraveler: s.isTraveler }))
  }

  /** A player takes a free seat under a name and gets the seat token (shown once). */
  async claimSeat(seatNumber: number, name: string, seatToken: string) {
    const state = await this.state()
    const clean = name.trim().slice(0, MAX_NAME_LENGTH)
    if (!clean) throw new RoomError('invalid_argument', 'A name is required.')
    if (!currentDayOf(state.game).seats.some((s) => s.seat === seatNumber)) throw new RoomError('invalid_argument', `Seat ${seatNumber} does not exist.`)
    if (state.claims?.[seatNumber]) throw new RoomError('conflict', `Seat ${seatNumber} is already taken.`)
    const renamed = applyCommand(state.game, { type: 'seat.update', seat: seatNumber, changes: { name: clean } }, { now: this.now(), getTeam: this.catalog.teamOf })
    const game = renamed.ok ? renamed.game : state.game
    const claims = { ...state.claims, [seatNumber]: { tokenHash: await sha256Hex(seatToken), name: clean, claimedAt: this.now() } }
    await this.storage.save({ ...state, game, claims })
    return { seat: seatNumber, name: clean, version: game.version }
  }

  /** Storyteller frees a seat (e.g. a player left); their token stops working. */
  async releaseSeat(access: Access, seatNumber: number) {
    const state = await this.state()
    await this.requireHost(state, access)
    if (!state.claims?.[seatNumber]) throw new RoomError('not_found', `Seat ${seatNumber} is not claimed.`)
    const { [seatNumber]: _released, ...claims } = state.claims
    await this.storage.save({ ...state, claims })
    return { seat: seatNumber, released: true }
  }

  /** A player's own view, by seat token. */
  async mySeat(access: Access) {
    const state = await this.state()
    const seat = await this.requireSeat(state, access)
    return seatView(state.game, seat)!
  }

  /** Send a message: the storyteller to a seat or everyone; a player to the storyteller. */
  async sendMessage(access: Access, to: 'st' | 'all' | number, text: string) {
    const state = await this.state()
    const body = text.trim()
    if (!body || body.length > MAX_MESSAGE_LENGTH) throw new RoomError('invalid_argument', `Message must be 1–${MAX_MESSAGE_LENGTH} characters.`)
    let from: RoomMessage['from']
    if (await this.isHost(state, access)) {
      if (to === 'st') throw new RoomError('invalid_argument', 'The storyteller sends to a seat number or "all".')
      if (typeof to === 'number' && !currentDayOf(state.game).seats.some((s) => s.seat === to)) throw new RoomError('invalid_argument', `Seat ${to} does not exist.`)
      from = 'st'
    } else {
      from = await this.requireSeat(state, access)
      to = 'st'
    }
    const message: RoomMessage = { id: `${this.now()}-${(state.messages ?? []).length}`, at: this.now(), from, to, text: body }
    await this.storage.save({ ...state, messages: [...(state.messages ?? []), message].slice(-MESSAGE_LIMIT) })
    return message
  }

  /** The storyteller sees every message; a player sees their own thread and broadcasts. */
  async messages(access: Access, since = 0) {
    const state = await this.state()
    const all = (state.messages ?? []).filter((m) => m.at > since)
    if (await this.isHost(state, access)) return all
    const seat = await this.requireSeat(state, access)
    return all.filter((m) => m.from === seat || m.to === seat || m.to === 'all')
  }

  /** A player casts their own vote when it is their turn in a clockwise vote. */
  async castOwnVote(access: Access, yes: boolean) {
    const state = await this.state()
    const seat = await this.requireSeat(state, access)
    const command: GameCommand = { type: 'vote.cast', seat, yes }
    const result = applyCommand(state.game, command, { now: this.now(), getTeam: this.catalog.teamOf })
    if (!result.ok) throw new RoomError(result.error.code === 'not_allowed' ? 'conflict' : 'invalid_argument', result.error.message)
    await this.storage.save({ ...state, game: result.game, journal: [...state.journal, { version: result.game.version, at: this.now(), command }].slice(-JOURNAL_LIMIT) })
    return { version: result.game.version }
  }
}

export class MemoryRoomStorage implements RoomStorage {
  private state: RoomState | null = null
  async load() { return this.state ? structuredClone(this.state) : null }
  async save(state: RoomState) { this.state = structuredClone(state) }
}

// ── RPC-safe facade ─────────────────────────────────────────────────────────
// Durable Object RPC does not carry custom error fields, so the room API
// returns result objects instead of throwing.

export type RoomResult<T> = { ok: true; value: T } | { ok: false; code: RoomError['code'] | 'internal'; message: string }

async function settle<T>(run: () => Promise<T>): Promise<RoomResult<T>> {
  try {
    return { ok: true, value: await run() }
  } catch (e) {
    if (e instanceof RoomError) return { ok: false, code: e.code, message: e.message }
    throw e
  }
}

export type RoomApi = ReturnType<typeof roomApi>

export function roomApi(core: GameRoomCore) {
  return {
    create: (gameId: string, input: CreateGameInput, owner: { ownerId: string | null; hostToken: string }) => settle(async () => {
      const state = await core.create(gameId, input, owner)
      return { gameId, version: state.game.version }
    }),
    grimoire: (access: Access) => settle(() => core.grimoire(access)),
    publicState: () => settle(() => core.publicState()),
    seat: (access: Access, seat: number) => settle(() => core.seat(access, seat)),
    command: (access: Access, commands: GameCommand[], expectedVersion?: number) => settle(() => core.command(access, commands, expectedVersion)),
    nightScript: (access: Access, night: 'first' | 'other', lang: 'en' | 'zh', includeDead?: boolean) => settle(() => core.nightScript(access, night, lang, includeDead)),
    journal: (access: Access, since?: number) => settle(() => core.journal(access, since)),
    nightInfo: (access: Access, seat: number, targets?: number[]) => settle(() => core.nightInfo(access, seat, targets)),
    lobby: () => settle(() => core.lobby()),
    claimSeat: (seat: number, name: string, seatToken: string) => settle(() => core.claimSeat(seat, name, seatToken)),
    releaseSeat: (access: Access, seat: number) => settle(() => core.releaseSeat(access, seat)),
    mySeat: (access: Access) => settle(() => core.mySeat(access)),
    sendMessage: (access: Access, to: 'st' | 'all' | number, text: string) => settle(() => core.sendMessage(access, to, text)),
    messages: (access: Access, since?: number) => settle(() => core.messages(access, since)),
    castOwnVote: (access: Access, yes: boolean) => settle(() => core.castOwnVote(access, yes)),
  }
}
