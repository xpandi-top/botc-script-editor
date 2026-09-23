import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../src/index'
import { MemoryEmbeddingStore, resetSemanticCache } from '../src/ai/embeddings'
import { getCatalog } from '../src/catalog'
import type { Env } from '../src/env'
import { embeddingStoreContract } from './aiStoreContract'
import { EMBED_MODEL, FakeAi } from './fakeAi'

embeddingStoreContract(async () => new MemoryEmbeddingStore())

// Response bodies are untyped JSON in these tests.
const j = (res: Response): Promise<any> => res.json()

let store: MemoryEmbeddingStore
let ai: FakeAi
let env: Env
let app: ReturnType<typeof createApp>

beforeEach(() => {
  resetSemanticCache()
  store = new MemoryEmbeddingStore()
  ai = new FakeAi()
  env = { APP_URL: 'https://example.test/app/', AI: ai }
  app = createApp({ embeddingStoreFor: () => store })
})

const get = (path: string, e: Env = env) => app.request(path, {}, e)

describe('semantic character search', () => {
  it('is unavailable without Workers AI', async () => {
    const noAi = { APP_URL: env.APP_URL }
    expect(await j(await get('/v1/ai/status', noAi))).toEqual({ chat: { available: false, model: null }, embeddings: { available: false } })
    const res = await get('/v1/characters/similar?q=kill', noAi)
    expect(res.status).toBe(503)
    expect((await j(res)).error.code).toBe('ai_unavailable')
  })

  it('embeds the catalog on first use, then reuses the stored vectors', async () => {
    const before = await j(await get('/v1/ai/status'))
    expect(before.chat).toEqual({ available: true, model: '@cf/zai-org/glm-4.7-flash' })
    expect(before.embeddings).toMatchObject({ available: true, model: EMBED_MODEL, embedded: 0 })
    const total = before.embeddings.total
    expect(total).toBeGreaterThan(300)
    expect(before.embeddings.stale).toBe(total)

    const res = await get('/v1/characters/similar?q=' + encodeURIComponent('Imp 小恶魔: each night choose a player, they die') + '&team=demon&lang=en&limit=5')
    expect(res.status).toBe(200)
    const body = await j(res)
    expect(body.model).toBe(EMBED_MODEL)
    expect(body.items).toHaveLength(5)
    expect(body.items.every((c: { team: string }) => c.team === 'demon')).toBe(true)
    expect(body.items.map((c: { id: string }) => c.id)).toContain('imp')
    expect(body.items[0].score).toBeGreaterThanOrEqual(body.items[4].score)
    expect(ai.embeddedTexts).toBe(total + 1) // catalog + the query

    expect((await j(await get('/v1/ai/status'))).embeddings).toMatchObject({ embedded: total, stale: 0 })
    await get('/v1/characters/similar?q=' + encodeURIComponent('Imp 小恶魔: each night choose a player, they die') + '&team=demon')
    expect(ai.embeddedTexts).toBe(total + 1) // index and query cached

    // A new isolate re-reads D1 without embedding anything.
    resetSemanticCache()
    await get('/v1/characters/similar?q=poison')
    expect(ai.embeddedTexts).toBe(total + 2)
  })

  it('re-embeds only characters whose text changed, and drops removed ones', async () => {
    await get('/v1/characters/imp/similar')
    const imp = store.rows.get(`${EMBED_MODEL}\u0000imp`)!
    store.rows.set(`${EMBED_MODEL}\u0000imp`, { ...imp, hash: 'outdated' })
    store.rows.set(`${EMBED_MODEL}\u0000retired_character`, { ...imp, id: 'retired_character' })
    expect((await j(await get('/v1/ai/status'))).embeddings.stale).toBe(1)

    resetSemanticCache()
    const texts = ai.embeddedTexts
    await get('/v1/characters/imp/similar')
    expect(ai.embeddedTexts).toBe(texts + 1)
    expect(store.rows.has(`${EMBED_MODEL}\u0000retired_character`)).toBe(false)
    expect((await j(await get('/v1/ai/status'))).embeddings.stale).toBe(0)
  })

  it('finds neighbours of a character', async () => {
    const body = await j(await get('/v1/characters/imp/similar?team=demon&limit=3'))
    expect(body.items).toHaveLength(3)
    expect(body.items.map((c: { id: string }) => c.id)).not.toContain('imp')
    expect(body.items.every((c: { team: string }) => c.team === 'demon')).toBe(true)
    expect(body.items[0].name).toEqual(expect.objectContaining({ en: expect.any(String), zh: expect.any(String) }))
  })

  it('validates input', async () => {
    expect((await get('/v1/characters/similar')).status).toBe(400)
    expect((await get('/v1/characters/similar?q=x&team=wizard')).status).toBe(400)
    expect((await get('/v1/characters/similar?q=x&limit=0')).status).toBe(400)
    expect((await get('/v1/characters/nobody/similar')).status).toBe(404)
    // The plain character route still works next to /similar.
    expect((await j(await get('/v1/characters/imp?lang=en'))).name).toBe('Imp')
  })

  it('maps Workers AI failures', async () => {
    ai.embedError = new Error('4006: you have used up your daily free allocation of 10,000 neurons')
    const quota = await get('/v1/characters/similar?q=kill')
    expect(quota.status).toBe(429)
    expect((await j(quota)).error.code).toBe('ai_quota_exhausted')
    ai.embedError = new Error('upstream timeout')
    const failed = await get('/v1/characters/similar?q=kill')
    expect(failed.status).toBe(502)
    expect((await j(failed)).error.code).toBe('ai_failed')
    // A failed build is not cached.
    ai.embedError = undefined
    expect((await get('/v1/characters/similar?q=kill')).status).toBe(200)
  })

  it('is an MCP tool', async () => {
    const rpc = async (method: string, params: Record<string, unknown>) => {
      const res = await app.request('/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      }, env)
      return (await j(res)).result
    }
    const { tools } = await rpc('tools/list', {})
    expect(tools.map((t: { name: string }) => t.name)).toContain('find_similar_characters')
    const result = await rpc('tools/call', { name: 'find_similar_characters', arguments: { id: 'washerwoman', team: 'townsfolk', limit: 3, language: 'zh' } })
    const found = JSON.parse(result.content[0].text)
    expect(found.items).toHaveLength(3)
    expect(found.items.every((c: { id: string }) => getCatalog().getCharacter(c.id)?.team === 'townsfolk')).toBe(true)
    const missing = await rpc('tools/call', { name: 'find_similar_characters', arguments: {} })
    expect(missing.isError).toBe(true)
    // Without AI the tool is not offered.
    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    }, { APP_URL: env.APP_URL })
    expect((await j(res)).result.tools.map((t: { name: string }) => t.name)).not.toContain('find_similar_characters')
  })
})
