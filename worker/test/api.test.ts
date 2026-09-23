import { describe, it, expect, vi, afterEach } from 'vitest'
import app from '../src/index'
import { decodeShareParam } from '../src/share'
import type { Env } from '../src/env'

const env: Env = { APP_URL: 'https://example.test/app/' }
const get = (path: string, e: Env = env) => app.request(path, {}, e)
const post = (path: string, body: unknown, e: Env = env) =>
  app.request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, e)

afterEach(() => vi.unstubAllGlobals())

describe('meta routes', () => {
  it('describes itself', async () => {
    const res = await get('http://api.test/')
    expect(await res.json()).toMatchObject({ name: 'BOTC Companion API', mcp: 'http://api.test/mcp', app: env.APP_URL })
    expect((await (await get('/openapi.json')).json()).paths['/v1/scripts/drafts']).toBeDefined()
    expect(await (await get('/llms.txt')).text()).toContain('create_script_draft')
    expect((await get('/v1/health')).status).toBe(200)
  })

  it('returns JSON 404s and CORS headers', async () => {
    const res = await get('/v1/nope')
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: { code: 'not_found' } })
    const pre = await app.request('/v1/characters', { method: 'OPTIONS', headers: { origin: 'https://x.test', 'access-control-request-method': 'GET' } }, env)
    expect(pre.headers.get('access-control-allow-origin')).toBe('*')
  })
})

describe('catalog routes', () => {
  it('searches characters', async () => {
    const body = await (await get('/v1/characters?q=imp&lang=zh&limit=3')).json()
    expect(body.items[0]).toMatchObject({ id: 'imp', team: 'demon', name: '小恶魔' })
    const demons = await (await get('/v1/characters?team=demon&edition=tb')).json()
    expect(demons.items.map((c: { id: string }) => c.id)).toEqual(['imp'])
    expect((await get('/v1/characters?team=wizard')).status).toBe(400)
    expect((await get('/v1/characters?limit=0')).status).toBe(400)
  })

  it('gets one character with jinxes, bilingual by default', async () => {
    const spy = await (await get('/v1/characters/spy')).json()
    expect(spy.name).toEqual({ en: 'Spy', zh: expect.any(String) })
    expect(spy.jinxes.length).toBeGreaterThan(0)
    expect((await get('/v1/characters/nobody')).status).toBe(404)
  })

  it('serves night order, jinxes and editions', async () => {
    const order = await (await get('/v1/night-order?ids=poisoner,washerwoman,imp&night=first&lang=en')).json()
    expect(order.items.map((i: { id: string }) => i.id)).toEqual(['DUSK', 'MINION_INFO', 'DEMON_INFO', 'poisoner', 'washerwoman', 'DAWN'])
    expect(order.items.find((i: { id: string }) => i.id === 'washerwoman').reminder).toContain('Townsfolk')
    const jinxes = await (await get('/v1/jinxes?ids=spy,magician')).json()
    expect(jinxes.count).toBeGreaterThanOrEqual(1)
    const editions = await (await get('/v1/editions')).json()
    expect(editions.items.map((e: { id: string }) => e.id)).toContain('odyssey')
  })
})

describe('script routes', () => {
  it('lists and reads bundled scripts', async () => {
    const list = await (await get('/v1/scripts')).json()
    expect(list.items.find((s: { slug: string }) => s.slug === 'tb')).toMatchObject({ title: 'Trouble Brewing', characterCount: 22 })
    const tb = await (await get('/v1/scripts/tb?lang=en')).json()
    expect(tb.characters).toHaveLength(22)
    expect(tb.nightOrder.first[0].id).toBe('DUSK')
    expect(tb).not.toHaveProperty('data')
    expect((await get('/v1/scripts/missing')).status).toBe(404)
  })

  it('builds a token manifest', async () => {
    const tokens = await (await get('/v1/scripts/tb/tokens')).json()
    expect(tokens.totals.characterTokens).toBe(22)
    expect(tokens.reminderTokens).toContainEqual(expect.objectContaining({ characterId: 'washerwoman', label: 'Wrong', count: 1 }))
  })

  it('validates and analyzes', async () => {
    const bad = await (await post('/v1/scripts/validate', { script: ['imp', 'highpriestess', 'imp'] })).json()
    expect(bad.ok).toBe(false)
    expect(bad.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unknown_character', suggestion: 'high_priestess' }),
      expect.objectContaining({ code: 'duplicate_character' }),
    ]))
    const analyzed = await (await post('/v1/scripts/analyze', { slug: 'tb' })).json()
    expect(analyzed.validation.ok).toBe(true)
    expect(analyzed.analysis.teamCounts.townsfolk).toBe(13)
    expect((await post('/v1/scripts/validate', {})).status).toBe(400)
    expect((await post('/v1/scripts/validate', { script: '{nope' })).status).toBe(400)
    expect((await app.request('/v1/scripts/validate', { method: 'POST', body: 'x' }, env)).status).toBe(400)
  })

  it('drafts a script as an inline app link the app can decode', async () => {
    const res = await post('/v1/scripts/drafts', {
      name: 'Tiny Test', author: 'agent',
      characters: ['washerwoman', 'chef', 'empath', 'poisoner', 'imp', { id: 'custom_bard', name: 'Bard', team: 'townsfolk', ability: 'You sing.' }],
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.mode).toBe('inline')
    const url = new URL(body.url)
    expect(url.origin + url.pathname).toBe('https://example.test/app/')
    const script = await decodeShareParam<{ slug: string; title: string; characters: string[]; customCharacters: unknown[] }>(url.searchParams.get('ss')!)
    expect(script).toMatchObject({ slug: 'tiny-test', title: 'Tiny Test', author: 'agent', edition: 'custom' })
    expect(script.characters).toHaveLength(6)
    expect(script.customCharacters).toHaveLength(1)
  })

  it('refuses drafts with errors', async () => {
    const res = await post('/v1/scripts/drafts', { name: 'Bad', characters: ['imp', 'nobody'] })
    expect(res.status).toBe(422)
    expect((await res.json()).validation.ok).toBe(false)
    expect((await post('/v1/scripts/drafts', { name: '', characters: ['imp'] })).status).toBe(400)
  })

  it('stores a Firestore short link when Firebase is configured', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await post('/v1/scripts/drafts', { name: 'Short', characters: ['washerwoman', 'imp'] }, { ...env, FIREBASE_PROJECT_ID: 'proj', FIREBASE_API_KEY: 'key' })
    const body = await res.json()
    expect(body.mode).toBe('shortlink')
    expect(new URL(body.url).searchParams.get('ss')).toMatch(/^[A-Za-z2-9]{7}$/)
    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(endpoint).toContain('/projects/proj/databases/(default)/documents/shortlinks?documentId=')
    const fields = JSON.parse(String(init.body)).fields
    expect(Object.keys(fields).sort()).toEqual(['data', 'expiresAt']) // matches the Firestore rules
  })

  it('reports short link failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('denied', { status: 403 })))
    const res = await post('/v1/scripts/drafts', { name: 'Short', characters: ['washerwoman', 'imp'] }, { ...env, FIREBASE_PROJECT_ID: 'proj', FIREBASE_API_KEY: 'key' })
    expect(res.status).toBe(502)
  })
})
