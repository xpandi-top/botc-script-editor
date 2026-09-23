import { describe, it, expect, beforeEach } from 'vitest'
import app, { createApp } from '../src/index'
import { getCatalog } from '../src/catalog'
import type { Env } from '../src/env'
import type { GoogleVerifier } from '../src/library/auth'
import { MemoryLibraryStore } from '../src/library/store'
import { GameRoomCore, MemoryRoomStorage, roomApi, type RoomApi } from '../src/games/room'

const env: Env = { APP_URL: 'https://example.test/app/', GOOGLE_WEB_CLIENT_ID: 'web-client' }
const j = (res: Response): Promise<any> => res.json()
const verifyGoogle: GoogleVerifier = async (token) => (token.startsWith('google-') ? { sub: token.slice(7), email: null } : null)

let rooms: Map<string, RoomApi>
let lib: ReturnType<typeof createApp>
let clock: number

beforeEach(() => {
  rooms = new Map()
  clock = 1_000
  const store = new MemoryLibraryStore()
  lib = createApp({
    storeFor: () => store,
    verifyGoogle,
    now: () => clock++,
    roomFor: (_env, id) => {
      if (!rooms.has(id)) rooms.set(id, roomApi(new GameRoomCore(new MemoryRoomStorage(), getCatalog(), () => clock++)))
      return rooms.get(id)!
    },
  })
})

const send = (method: string, path: string, opts: { body?: unknown; token?: string; auth?: string } = {}) => lib.request(path, {
  method,
  headers: {
    ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
    ...(opts.token ? { 'x-game-token': opts.token } : {}),
    ...(opts.auth ? { authorization: `Bearer ${opts.auth}` } : {}),
  },
  ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
}, env)

const TB7 = { scriptSlug: 'tb', playerCount: 7, seatNames: { 1: 'Ann' }, assignments: { 1: 'washerwoman', 2: 'empath', 3: 'fortuneteller', 4: 'monk', 5: 'poisoner', 6: 'imp', 7: 'drunk' }, perceived: { 7: 'chef' }, demonBluffs: ['slayer'] }

async function newGame(body: unknown = TB7, auth?: string) {
  const res = await send('POST', '/v1/games', { body, auth })
  expect(res.status).toBe(201)
  return j(res) as Promise<{ gameId: string; hostToken: string; version: number }>
}

describe('/v1/games', () => {
  it('is unavailable without the Durable Object binding', async () => {
    const res = await app.request('/v1/games', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(TB7) }, env)
    expect(res.status).toBe(503)
  })

  it('creates a game and separates public and storyteller views', async () => {
    const { gameId, hostToken, version } = await newGame()
    expect(hostToken).toMatch(/^botc_host_/)
    expect(version).toBe(0)
    const pub = await j(await send('GET', `/v1/games/${gameId}`))
    expect(pub).toMatchObject({ gameId, script: { slug: 'tb', title: 'Trouble Brewing' }, day: { day: 1, phase: 'night' } })
    expect(JSON.stringify(pub)).not.toMatch(/imp|poisoner|drunk|slayer/)
    expect((await send('GET', `/v1/games/${gameId}?view=st`)).status).toBe(403)
    expect((await send('GET', `/v1/games/${gameId}?view=st`, { token: 'botc_host_wrong' })).status).toBe(403)
    const st = await j(await send('GET', `/v1/games/${gameId}?view=st`, { token: hostToken }))
    expect(st.meta).not.toHaveProperty('hostTokenHash')
    expect(st.game.days[0].seats[5]).toMatchObject({ characterId: 'imp', teamTag: 'evil' })
    expect(st.game.days[0].seats[0].name).toBe('Ann')
    expect(await j(await send('GET', `/v1/games/${gameId}/seats/7`, { token: hostToken }))).toMatchObject({ seat: 7, character: 'chef' })
    expect((await send('GET', `/v1/games/${gameId}/seats/7`)).status).toBe(403)
    expect((await send('GET', '/v1/games/nosuchgame')).status).toBe(404)
  })

  it('runs commands atomically with optimistic concurrency', async () => {
    const { gameId, hostToken } = await newGame()
    const run = (commands: unknown[], expectedVersion?: number) => send('POST', `/v1/games/${gameId}/commands`, { token: hostToken, body: { commands, expectedVersion } })
    const ok = await j(await run([{ type: 'phase.set', phase: 'nomination' }, { type: 'nomination.set', actor: 1, target: 6 }, { type: 'vote.cast', seat: 2, yes: true }, { type: 'vote.record' }], 0))
    expect(ok.version).toBe(4)
    expect(ok.events.map((e: any) => e.code)).toEqual(['vote.recorded'])

    const bad = await run([{ type: 'seat.update', seat: 6, changes: { alive: false } }, { type: 'seat.update', seat: 42, changes: {} }])
    expect(bad.status).toBe(422)
    expect(await j(bad)).toMatchObject({ error: { code: 'unknown_seat' }, failedAt: 1, version: 4 })
    const pub = await j(await send('GET', `/v1/games/${gameId}`))
    expect(pub.version).toBe(4)
    expect(pub.day.seats[5].alive).toBe(true) // the batch was not partially applied

    expect((await run([{ type: 'phase.next' }], 3)).status).toBe(409)
    expect((await send('POST', `/v1/games/${gameId}/commands`, { body: { commands: [{ type: 'phase.next' }] } })).status).toBe(403)
    expect((await send('POST', `/v1/games/${gameId}/commands`, { token: hostToken, body: { commands: [{}] } })).status).toBe(400)
    const journal = await j(await send('GET', `/v1/games/${gameId}/journal?since=2`, { token: hostToken }))
    expect(journal.map((e: any) => e.version)).toEqual([3, 4])
  })

  it('builds the night script for the storyteller', async () => {
    const { gameId, hostToken } = await newGame()
    const script = await j(await send('GET', `/v1/games/${gameId}/night-script?night=first&lang=zh`, { token: hostToken }))
    expect(script.map((s: any) => s.id)).toEqual(expect.arrayContaining(['DUSK', 'MINION_INFO', 'DEMON_INFO', 'poisoner', 'washerwoman', 'chef']))
    expect(script.find((s: any) => s.id === 'chef')).toMatchObject({ seats: [{ seat: 7, perceived: true, actualCharacter: 'drunk' }] })
    expect(script.find((s: any) => s.id === 'washerwoman').name).toBe('洗衣妇')
    expect((await send('GET', `/v1/games/${gameId}/night-script`)).status).toBe(403)
  })

  it('deals at random and lets a signed-in owner play without the token', async () => {
    const { gameId } = await newGame({ scriptSlug: 'tb', playerCount: 10, assignments: 'random' }, 'google-ann')
    const st = await j(await send('GET', `/v1/games/${gameId}?view=st`, { auth: 'google-ann' }))
    const teams = st.game.days[0].seats.map((s: any) => getCatalog().getCharacter(s.characterId)?.team)
    expect(teams.filter((t: string) => t === 'townsfolk')).toHaveLength(7)
    expect(teams.filter((t: string) => t === 'minion')).toHaveLength(2)
    expect(teams.filter((t: string) => t === 'demon')).toHaveLength(1)
    expect((await send('GET', `/v1/games/${gameId}?view=st`, { auth: 'google-bob' })).status).toBe(403)
  })

  it('rejects bad setups', async () => {
    expect((await send('POST', '/v1/games', { body: { scriptSlug: 'tb', playerCount: 3 } })).status).toBe(400)
    expect((await send('POST', '/v1/games', { body: { scriptSlug: 'nope', playerCount: 7 } })).status).toBe(400)
    expect((await send('POST', '/v1/games', { body: { scriptSlug: 'tb', playerCount: 7, assignments: { 1: 'nobody' } } })).status).toBe(400)
    const custom = await send('POST', '/v1/games', { body: { script: [{ id: '_meta', name: 'Mini' }, 'washerwoman', 'chef', 'empath', 'poisoner', 'imp'], playerCount: 5, assignments: 'random' } })
    expect(custom.status).toBe(201)
  })
})

describe('lobby, seat tokens and messages', () => {
  const seatSend = (method: string, path: string, seatToken: string, body?: unknown) => lib.request(path, {
    method,
    headers: { 'x-seat-token': seatToken, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }, env)

  it('lets players claim seats and see only their own character', async () => {
    const { gameId, hostToken } = await newGame()
    const lobby = await j(await send('GET', `/v1/games/${gameId}/lobby`))
    expect(lobby).toHaveLength(7)
    expect(lobby.every((s: any) => !s.claimed)).toBe(true)

    const claim = await send('POST', `/v1/games/${gameId}/claim`, { body: { seat: 7, name: '  Gus  ' } })
    expect(claim.status).toBe(201)
    const { seatToken, name } = await j(claim)
    expect(seatToken).toMatch(/^botc_seat_/)
    expect(name).toBe('Gus')
    expect((await send('POST', `/v1/games/${gameId}/claim`, { body: { seat: 7, name: 'Other' } })).status).toBe(409)
    expect((await send('POST', `/v1/games/${gameId}/claim`, { body: { seat: 99, name: 'X' } })).status).toBe(400)
    expect((await send('POST', `/v1/games/${gameId}/claim`, { body: { seat: 6, name: '   ' } })).status).toBe(400)
    expect((await j(await send('GET', `/v1/games/${gameId}/lobby`))).find((s: any) => s.seat === 7)).toEqual({ seat: 7, name: 'Gus', claimed: true, isTraveler: false })

    const me = await j(await seatSend('GET', `/v1/games/${gameId}/me`, seatToken))
    expect(me).toMatchObject({ seat: 7, character: 'chef' }) // the Drunk is told they are the Chef
    expect(JSON.stringify(me)).not.toMatch(/drunk|imp|poisoner/)
    expect((await seatSend('GET', `/v1/games/${gameId}/me`, 'botc_seat_forged')).status).toBe(403)

    // the storyteller can free the seat; the token stops working
    expect((await send('DELETE', `/v1/games/${gameId}/claims/7`)).status).toBe(403)
    expect((await send('DELETE', `/v1/games/${gameId}/claims/7`, { token: hostToken })).status).toBe(200)
    expect((await seatSend('GET', `/v1/games/${gameId}/me`, seatToken)).status).toBe(403)
  })

  it('routes private messages between the storyteller and seats', async () => {
    const { gameId, hostToken } = await newGame()
    const ann = (await j(await send('POST', `/v1/games/${gameId}/claim`, { body: { seat: 1, name: 'Ann' } }))).seatToken
    const bo = (await j(await send('POST', `/v1/games/${gameId}/claim`, { body: { seat: 2, name: 'Bo' } }))).seatToken

    expect((await send('POST', `/v1/games/${gameId}/messages`, { token: hostToken, body: { to: 1, text: 'You learn: #3 or #6 is the Fortune Teller.' } })).status).toBe(201)
    await send('POST', `/v1/games/${gameId}/messages`, { token: hostToken, body: { to: 'all', text: 'Dawn breaks.' } })
    expect((await seatSend('POST', `/v1/games/${gameId}/messages`, bo, { text: 'Can I use my ability?' })).status).toBe(201)
    expect((await seatSend('POST', `/v1/games/${gameId}/messages`, bo, { to: 1, text: 'sneaky' })).status).toBe(201) // players can only reach the ST

    const annInbox = await j(await seatSend('GET', `/v1/games/${gameId}/messages`, ann))
    expect(annInbox.map((m: any) => m.text)).toEqual(['You learn: #3 or #6 is the Fortune Teller.', 'Dawn breaks.'])
    const boInbox = await j(await seatSend('GET', `/v1/games/${gameId}/messages`, bo))
    expect(boInbox.map((m: any) => [m.from, m.to])).toEqual([['st', 'all'], [2, 'st'], [2, 'st']])
    const all = await j(await send('GET', `/v1/games/${gameId}/messages`, { token: hostToken }))
    expect(all).toHaveLength(4)
    expect((await send('GET', `/v1/games/${gameId}/messages`)).status).toBe(403)
    expect((await send('POST', `/v1/games/${gameId}/messages`, { token: hostToken, body: { to: 'st', text: 'x' } })).status).toBe(400)
    expect((await send('POST', `/v1/games/${gameId}/messages`, { token: hostToken, body: { to: 1, text: 'x'.repeat(501) } })).status).toBe(400)
  })

  it('lets a player cast their own vote only on their turn', async () => {
    const { gameId, hostToken } = await newGame()
    const tokens: Record<number, string> = {}
    for (const seat of [1, 7]) tokens[seat] = (await j(await send('POST', `/v1/games/${gameId}/claim`, { body: { seat, name: `P${seat}` } }))).seatToken
    await send('POST', `/v1/games/${gameId}/commands`, { token: hostToken, body: { commands: [
      { type: 'phase.set', phase: 'nomination' }, { type: 'nomination.set', actor: 1, target: 6 },
      { type: 'nomination.confirm' }, { type: 'speech.target' }, { type: 'vote.start' },
    ] } })
    // clockwise after the nominee (6): seat 7 first
    expect((await seatSend('POST', `/v1/games/${gameId}/vote`, tokens[1], { yes: true })).status).toBe(409)
    expect((await seatSend('POST', `/v1/games/${gameId}/vote`, tokens[7], { yes: true })).status).toBe(200)
    const pub = await j(await send('GET', `/v1/games/${gameId}`))
    expect(pub.day.voting).toMatchObject({ index: 1, votes: { 7: true } })
    expect((await seatSend('POST', `/v1/games/${gameId}/vote`, tokens[7], { yes: 'maybe' })).status).toBe(400)
  })
})

describe('MCP game tools', () => {
  let nextId = 1
  const tool = async (name: string, args: Record<string, unknown>) => {
    const res = await lib.request('/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method: 'tools/call', params: { name, arguments: args } }),
    }, env)
    const body = await j(res)
    const text = body.result.content[0].text as string
    return { isError: !!body.result.isError, text, json: body.result.isError ? undefined : JSON.parse(text) }
  }

  it('lets an agent run a game end to end', async () => {
    const created = await tool('create_game', { script_slug: 'tb', player_count: 7, assignments: TB7.assignments, perceived: { 7: 'chef' }, seat_names: ['Ann', 'Bo'] })
    const { game_id, host_token } = created.json
    expect(created.json.grimoire.seats[6]).toMatchObject({ seat: 7, character: 'drunk', believes: 'chef', team: 'good' })
    expect(created.json.grimoire.seats[1].name).toBe('Bo')

    const night = await tool('get_night_script', { game_id, host_token, night: 'first' })
    expect(night.json.find((s: any) => s.id === 'poisoner').seats[0].seat).toBe(5)

    const ran = await tool('run_commands', { game_id, host_token, commands: [
      { type: 'seat.tag.add', seat: 2, tag: 'Poisoned', scope: 'st' },
      { type: 'phase.next' }, { type: 'phase.next' }, { type: 'phase.next' },
      { type: 'nomination.set', actor: 1, target: 6 },
      { type: 'nomination.confirm' }, { type: 'speech.target' }, { type: 'vote.start' },
    ] })
    expect(ran.json.version).toBe(8)
    const failed = await tool('run_commands', { game_id, host_token, commands: [{ type: 'vote.cast', seat: 1, yes: true }] })
    expect(failed.isError).toBe(true)
    expect(failed.text).toContain("seat 7's turn")

    const view = await tool('get_game', { game_id, host_token })
    expect(view.json).toMatchObject({ phase: 'nomination', nominationStep: 'voting', nomination: { actor: 1, target: 6 } })
    expect(view.json.seats[1].stTags).toEqual(['Poisoned'])
    const pub = await tool('get_game', { game_id, view: 'public' })
    expect(JSON.stringify(pub.json)).not.toContain('Poisoned')
    expect((await tool('get_game', { game_id })).isError).toBe(true) // storyteller view needs the token
    expect((await tool('get_seat_view', { game_id, host_token, seat: 7 })).json.character).toBe('chef')
    expect((await tool('send_player_message', { game_id, host_token, to: 7, text: 'You are the Chef. You learn: 0.' })).json).toMatchObject({ from: 'st', to: 7 })
    expect((await tool('get_messages', { game_id, host_token })).json).toHaveLength(1)
    expect((await tool('get_lobby', { game_id })).json).toHaveLength(7)
  })
})
