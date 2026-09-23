/**
 * One cloud game (P3). All logic lives here and is storage-agnostic; the
 * Durable Object in durable.ts only supplies storage and serialized access,
 * so every command for a game runs one at a time (no racing votes).
 */
import { applyCommand, currentDayOf, type EngineGame, type GameCommand } from '../../../src/core/engine/commands'
import { createDayState } from '../../../src/core/engine/factories'
import { buildNightScript } from '../../../src/core/engine/nightScript'
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

export type GameMeta = {
  gameId: string
  createdAt: number
  ownerId: string | null
  hostTokenHash: string
  script: { slug?: string; title: string; characters: string[] }
}

export type JournalEntry = { version: number; at: number; command: GameCommand }

export type RoomState = { meta: GameMeta; game: EngineGame; journal: JournalEntry[] }

export interface RoomStorage {
  load(): Promise<RoomState | null>
  save(state: RoomState): Promise<void>
}

export type Access = { hostToken?: string; userId?: string }

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
    const day = { ...createDayState(1, buildSeatsFromConfig(config, this.catalog.teamOf), timers, `day-1-${gameId}`), demonBluffs: config.demonBluffs }
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

  async journal(access: Access, since = 0) {
    const state = await this.state()
    await this.requireHost(state, access)
    return state.journal.filter((j) => j.version > since)
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
  }
}
