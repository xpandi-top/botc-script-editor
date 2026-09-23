/**
 * MCP tools to run a cloud game as (or for) the storyteller (P3 / AI
 * storyteller L1). The agent keeps the game id and host token returned by
 * create_game; signed-in owners may omit the token.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { currentDayOf, type EngineGame, type GameCommand } from '../../../src/core/engine/commands'
import { InputError } from '../scripts'
import type { Access, RoomApi, RoomResult } from './room'
import { newGameId, newHostToken, scriptForGame } from './routes'

type Guard = (run: () => unknown | Promise<unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }>

const COMMANDS_HELP = `Commands (JSON objects, applied in order, all-or-nothing):
{"type":"phase.next"} | {"type":"phase.set","phase":"night|private|public|nomination"} | {"type":"day.next"}
{"type":"seat.update","seat":3,"changes":{"alive":false,"isExecuted":true,"hasNoVote":true,"characterId":"imp","userCharacterId":"chef","teamTag":"evil","note":"..."}}
{"type":"seat.tag.add"|"seat.tag.remove","seat":3,"tag":"Poisoned","scope":"st"|"public"}
{"type":"nomination.open"} | {"type":"nomination.set","actor":1,"target":5,"isExile":false} | {"type":"nomination.confirm"} | {"type":"nomination.reject"} | {"type":"speech.target"}
{"type":"vote.start"} | {"type":"vote.cast","seat":6,"yes":true,"weight":1} | {"type":"vote.record","passed":true?,"voteCount":5?}
{"type":"skill.record","actor":5,"roleId":"poisoner","targets":[2],"statement":"...","result":"success"}
{"type":"note.log","text":"...","visibility":"st-only"} | {"type":"game.end"}`

const idArgs = {
  game_id: z.string(),
  host_token: z.string().optional().describe('Host token from create_game (not needed for the signed-in owner).'),
}

function unwrap<T>(result: RoomResult<T>): T {
  if (!result.ok) throw new InputError(result.message)
  return result.value
}

/** A compact grimoire for the agent: today's seats with secrets, phase, nomination and recent log. */
function grimoireSummary(game: EngineGame, meta: { gameId: string; script: { title: string; characters: string[] } }) {
  const day = currentDayOf(game)
  return {
    gameId: meta.gameId,
    script: meta.script.title,
    version: game.version,
    day: day.day,
    phase: day.phase,
    nominationStep: day.nominationStep,
    nomination: day.voteDraft.actor !== null || day.voteDraft.target !== null ? { actor: day.voteDraft.actor, target: day.voteDraft.target, voters: day.voteDraft.voters } : null,
    voting: day.votingState,
    demonBluffs: day.demonBluffs,
    seats: day.seats.map((s) => ({
      seat: s.seat, name: s.name, character: s.characterId, ...(s.userCharacterId ? { believes: s.userCharacterId } : {}), team: s.teamTag,
      alive: s.alive, ...(s.isExecuted ? { executed: true } : {}), ...(s.hasNoVote ? { noVote: true } : {}), ...(s.voteTokens !== undefined ? { voteTokens: s.voteTokens } : {}),
      ...(s.isTraveler ? { traveler: true } : {}), ...(s.stTags.length ? { stTags: s.stTags } : {}), ...(s.customTags.length ? { tags: s.customTags } : {}), ...(s.note ? { note: s.note } : {}),
    })),
    votesToday: day.voteHistory.map((v) => ({ actor: v.actor, target: v.target, voteCount: v.voteCount, required: v.requiredVotes, passed: v.passed })),
    recentLog: game.days.flatMap((d) => d.eventLog.map((e) => `D${d.day} ${e.phase}: ${e.detail}`)).slice(-20),
  }
}

export function registerGameTools(server: McpServer, deps: { rooms: (gameId: string) => RoomApi | null; userId: string | null; guarded: Guard }) {
  const { rooms, userId, guarded } = deps
  const roomOf = (gameId: string) => {
    const r = rooms(gameId)
    if (!r) throw new InputError('Cloud games are not enabled on this server.')
    return r
  }
  const access = (hostToken?: string): Access => ({ hostToken, userId: userId ?? undefined })

  server.registerTool('create_game', {
    title: 'Create cloud game',
    description: 'Start a cloud game from a bundled script (script_slug) or official script JSON. Seats can be dealt at random or assigned. Returns game_id and host_token — keep both to run the game.',
    inputSchema: {
      script_slug: z.string().optional(),
      script: z.union([z.string(), z.array(z.unknown())]).optional().describe('Official script JSON instead of script_slug.'),
      player_count: z.number().int().min(5).max(20),
      traveler_count: z.number().int().min(0).max(5).optional(),
      seat_names: z.array(z.string()).optional().describe('Names for seats 1..n in order.'),
      assignments: z.union([z.literal('random'), z.record(z.string(), z.string())]).optional().describe('"random", or {"1":"washerwoman",...}.'),
      perceived: z.record(z.string(), z.string()).optional().describe('What a player is told they are, e.g. the Drunk: {"7":"chef"}.'),
      demon_bluffs: z.array(z.string()).max(3).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, (input) => guarded(async () => {
    const gameId = newGameId()
    const hostToken = newHostToken()
    const script = scriptForGame({ scriptSlug: input.script_slug, script: input.script })
    const seatNames = Object.fromEntries((input.seat_names ?? []).map((name, i) => [String(i + 1), name]))
    unwrap(await roomOf(gameId).create(gameId, {
      script, playerCount: input.player_count, travelerCount: input.traveler_count, seatNames,
      assignments: input.assignments, perceived: input.perceived, demonBluffs: input.demon_bluffs,
    }, { ownerId: userId, hostToken }))
    const g = unwrap(await roomOf(gameId).grimoire(access(hostToken)))
    return { game_id: gameId, host_token: hostToken, grimoire: grimoireSummary(g.game, g.meta) }
  }))

  server.registerTool('get_game', {
    title: 'Get cloud game',
    description: 'The storyteller grimoire (characters, alignments, tags, votes, recent log) or the public view players see.',
    inputSchema: { ...idArgs, view: z.enum(['storyteller', 'public']).default('storyteller') },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  }, ({ game_id, host_token, view }) => guarded(async () => {
    if (view === 'public') return unwrap(await roomOf(game_id).publicState())
    const g = unwrap(await roomOf(game_id).grimoire(access(host_token)))
    return grimoireSummary(g.game, g.meta)
  }))

  server.registerTool('run_commands', {
    title: 'Run game commands',
    description: `Apply storyteller commands to a cloud game. ${COMMANDS_HELP}`,
    inputSchema: {
      ...idArgs,
      commands: z.array(z.object({ type: z.string() }).passthrough()).min(1),
      expected_version: z.number().int().optional().describe('Fail if the game changed since you read this version.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, ({ game_id, host_token, commands, expected_version }) => guarded(async () => {
    const result = unwrap(await roomOf(game_id).command(access(host_token), commands as unknown as GameCommand[], expected_version))
    if (!result.ok) throw new InputError(`Command ${result.failedAt + 1} failed (${result.error.code}): ${result.error.message} Nothing was applied; the game is still at version ${result.version}.`)
    return { version: result.version, events: result.events }
  }))

  server.registerTool('get_night_script', {
    title: 'Get night script',
    description: 'Tonight\'s wake order for the characters in play: which seats to wake, whether they are dead/drunk/poisoned, players woken as the character they believe they are (e.g. the Drunk), and the storyteller reminder for each step.',
    inputSchema: { ...idArgs, night: z.enum(['first', 'other']), language: z.enum(['en', 'zh']).optional(), include_dead: z.boolean().optional() },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  }, ({ game_id, host_token, night, language, include_dead }) => guarded(async () =>
    unwrap(await roomOf(game_id).nightScript(access(host_token), night, language ?? 'en', include_dead))))

  server.registerTool('get_seat_view', {
    title: 'Get seat view',
    description: 'What one player knows: the public state plus the character they were told they are.',
    inputSchema: { ...idArgs, seat: z.number().int().min(1) },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  }, ({ game_id, host_token, seat }) => guarded(async () => unwrap(await roomOf(game_id).seat(access(host_token), seat))))
}
