import { describe, it, expect, beforeEach } from 'vitest'
import app, { createApp } from '../src/index'
import type { Env } from '../src/env'
import type { GoogleVerifier } from '../src/library/auth'
import { MemoryLibraryStore } from '../src/library/store'

const env: Env = { APP_URL: 'https://example.test/app/', GOOGLE_WEB_CLIENT_ID: 'web-client' }
const j = (res: Response): Promise<any> => res.json()

// Fake Google: "google-ann" / "google-bob" are valid access tokens.
const verifyGoogle: GoogleVerifier = async (token, clients) => {
  expect(clients).toContain('web-client')
  return token.startsWith('google-') ? { sub: token.slice(7), email: `${token.slice(7)}@test` } : null
}

let store: MemoryLibraryStore
let clock = 1_000
let lib: ReturnType<typeof createApp>

beforeEach(() => {
  store = new MemoryLibraryStore()
  clock = 1_000
  lib = createApp({ storeFor: () => store, verifyGoogle, now: () => clock })
})

const call = (method: string, path: string, auth?: string, body?: unknown) => lib.request(path, {
  method,
  headers: { ...(auth ? { authorization: `Bearer ${auth}` } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
}, env)

const script = (slug: string, title = slug) => ({ slug, title, titleZh: title, author: '', edition: 'custom', characters: ['imp', 'washerwoman'], meta: { id: '_meta', name: title }, customCharacters: [], sourceFile: `${slug}.json` })

async function mintToken(auth = 'google-ann') {
  return (await j(await call('POST', '/v1/me/tokens', auth, { name: 'Claude' }))).token as string
}

describe('/v1/me auth', () => {
  it('needs a configured store', async () => {
    expect((await app.request('/v1/me', { headers: { authorization: 'Bearer google-ann' } }, env)).status).toBe(503)
  })

  it('rejects missing or bad credentials', async () => {
    expect((await call('GET', '/v1/me')).status).toBe(401)
    expect((await call('GET', '/v1/me', 'not-a-google-token')).status).toBe(401)
    expect((await call('GET', '/v1/me', 'botc_pat_unknown')).status).toBe(401)
    expect((await lib.request('/v1/me', { headers: { authorization: 'Basic abc' } }, env)).status).toBe(401)
  })

  it('identifies Google users and issues personal access tokens', async () => {
    expect(await j(await call('GET', '/v1/me', 'google-ann'))).toEqual({ userId: 'google:ann', email: 'ann@test', via: 'google' })
    const created = await j(await call('POST', '/v1/me/tokens', 'google-ann', { name: 'Claude Desktop' }))
    expect(created.token).toMatch(/^botc_pat_/)
    expect(await j(await call('GET', '/v1/me', created.token))).toMatchObject({ userId: 'google:ann', via: 'token' })
    // tokens cannot mint tokens
    expect((await call('POST', '/v1/me/tokens', created.token, { name: 'x' })).status).toBe(403)
    const list = await j(await call('GET', '/v1/me/tokens', 'google-ann'))
    expect(list.items).toEqual([expect.objectContaining({ id: created.id, name: 'Claude Desktop' })])
    expect(JSON.stringify(list)).not.toContain(created.token)
    // another user cannot revoke it
    expect((await call('DELETE', `/v1/me/tokens/${created.id}`, 'google-bob')).status).toBe(404)
    expect((await call('DELETE', `/v1/me/tokens/${created.id}`, 'google-ann')).status).toBe(204)
    expect((await call('GET', '/v1/me', created.token)).status).toBe(401)
  })
})

describe('/v1/me library', () => {
  it('stores, syncs and deletes scripts per user', async () => {
    const token = await mintToken()
    expect((await call('PUT', '/v1/me/scripts/s1', token, { data: script('other') })).status).toBe(400)
    const put = await j(await call('PUT', '/v1/me/scripts/s1', token, { data: script('s1', 'One'), updatedAt: 500 }))
    expect(put).toMatchObject({ id: 's1', updatedAt: 500 })
    clock = 2_000
    expect((await call('PUT', '/v1/me/scripts/s2', token, { data: script('s2') })).status).toBe(200)

    expect((await j(await call('GET', '/v1/me/scripts', token))).items.map((d: any) => d.id)).toEqual(['s1', 's2'])
    expect((await j(await call('GET', '/v1/me/scripts', 'google-bob'))).items).toEqual([])
    expect((await j(await call('GET', '/v1/me/scripts/s1', token))).data.title).toBe('One')

    const conflict = await call('PUT', '/v1/me/scripts/s1', token, { data: script('s1', 'Stale'), baseUpdatedAt: 100 })
    expect(conflict.status).toBe(409)
    expect((await j(conflict)).current.data.title).toBe('One')

    clock = 3_000
    expect((await call('DELETE', '/v1/me/scripts/s1', token)).status).toBe(200)
    expect((await call('GET', '/v1/me/scripts/s1', token)).status).toBe(404)
    const since = await j(await call('GET', '/v1/me/scripts?since=1500', token))
    expect(since.items.map((d: any) => [d.id, d.deleted])).toEqual([['s2', false], ['s1', true]])
    expect(since.serverTime).toBe(3_000)
    expect((await call('GET', '/v1/me/wizards', token)).status).toBe(404)
    expect((await call('GET', '/v1/me/scripts?since=abc', token)).status).toBe(400)
  })

  it('validates custom characters and records, and computes stats', async () => {
    const token = await mintToken()
    expect((await call('PUT', '/v1/me/characters/bard', token, { data: { id: 'bard', nameEn: 'Bard', abilityEn: 'x', team: 'townsfolk' } })).status).toBe(400)
    expect((await call('PUT', '/v1/me/characters/custom_bard', token, { data: { id: 'custom_bard', nameEn: 'Bard', abilityEn: 'x', team: 'wizard' } })).status).toBe(400)
    expect((await call('PUT', '/v1/me/characters/custom_bard', token, { data: { id: 'custom_bard', nameEn: 'Bard', abilityEn: 'Sings.', team: 'townsfolk', author: 'me' } })).status).toBe(200)

    const record = (id: string, winner: 'good' | 'evil') => ({ id, endedAt: 1, winner, scriptSlug: 'tb', days: [{ day: 1, votes: 1, votePassed: 1, skills: 0, nominations: 1 }], playerSummaries: [{ seat: 1, name: 'Ann', team: 'good' }] })
    expect((await call('PUT', '/v1/me/records/r1', token, { data: { id: 'r1' } })).status).toBe(400)
    await call('PUT', '/v1/me/records/r1', token, { data: record('r1', 'good') })
    await call('PUT', '/v1/me/records/r2', token, { data: record('r2', 'evil') })
    const stats = await j(await call('GET', '/v1/me/stats', token))
    expect(stats.kpi).toMatchObject({ total: 2, goodWins: 1, evilWins: 1 })
    expect(stats.players[0]).toMatchObject({ name: 'Ann', total: 2, wins: 1 })
    expect(stats.players[0].teammates).toEqual({})
  })
})

describe('MCP with credentials', () => {
  let nextId = 1
  const rpc = async (auth: string | undefined, method: string, params: Record<string, unknown> = {}) => {
    const res = await lib.request('/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
    }, env)
    return { status: res.status, body: await j(res) }
  }
  const tool = async (auth: string, name: string, args: Record<string, unknown>) => {
    const { body } = await rpc(auth, 'tools/call', { name, arguments: args })
    const text = body.result.content[0].text as string
    return { isError: !!body.result.isError, text, json: body.result.isError ? undefined : JSON.parse(text) }
  }

  it('adds library tools only for signed-in callers', async () => {
    const anon = await rpc(undefined, 'tools/list')
    expect(anon.body.result.tools.map((t: any) => t.name)).not.toContain('save_script')
    expect((await rpc('botc_pat_bad', 'tools/list')).status).toBe(401)
    const token = await mintToken()
    const names = (await rpc(token, 'tools/list')).body.result.tools.map((t: any) => t.name)
    expect(names).toEqual(expect.arrayContaining(['search_characters', 'list_my_scripts', 'save_script', 'delete_my_script', 'save_character', 'list_records', 'get_stats']))
  })

  it('saves scripts and characters to the library', async () => {
    const token = await mintToken()
    const saved = await tool(token, 'save_script', { name: 'Agent Library Script', characters: ['washerwoman', 'chef', 'poisoner', 'imp'] })
    expect(saved.json).toMatchObject({ id: 'agent-library-script' })
    expect(saved.json.link).toContain('?ss=')
    expect((await tool(token, 'list_my_scripts', {})).json).toEqual([expect.objectContaining({ id: 'agent-library-script', characterCount: 4 })])
    expect((await tool(token, 'get_my_script', { id: 'agent-library-script' })).json.validation.ok).toBe(true)
    expect((await tool(token, 'save_script', { name: 'Bad', characters: ['nobody'] })).isError).toBe(true)

    expect((await tool(token, 'save_character', { id: 'custom_bard', team: 'townsfolk', nameEn: 'Bard', abilityEn: 'You sing.', nameZh: '吟游诗人' })).json).toMatchObject({ id: 'custom_bard' })
    expect((await tool(token, 'save_character', { id: 'imp', team: 'demon', nameEn: 'Imp', abilityEn: 'x' })).isError).toBe(true)
    const chars = (await tool(token, 'list_my_characters', {})).json
    expect(chars[0]).toMatchObject({ id: 'custom_bard', nameZh: '吟游诗人', edition: 'Custom', author: 'Agent' })

    expect((await tool(token, 'delete_my_script', { id: 'agent-library-script' })).json.deleted).toBe(true)
    expect((await tool(token, 'list_my_scripts', {})).json).toEqual([])
    expect((await tool(token, 'get_stats', {})).json.kpi.total).toBe(0)
  })
})
