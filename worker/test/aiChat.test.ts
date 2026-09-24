import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../src/index'
import { parseChatResponse } from '../src/ai/chat'
import { MemoryEmbeddingStore, resetSemanticCache } from '../src/ai/embeddings'
import { MemoryQuotaStore, takeQuota } from '../src/ai/quota'
import { MemoryLibraryStore } from '../src/library/store'
import type { Env } from '../src/env'
import { quotaStoreContract } from './aiStoreContract'
import { CHAT_MODEL, FakeAi } from './fakeAi'

quotaStoreContract(async () => new MemoryQuotaStore())

// Response bodies are untyped JSON in these tests.
const j = (res: Response): Promise<any> => res.json()

let ai: FakeAi
let quota: MemoryQuotaStore
let env: Env
let app: ReturnType<typeof createApp>
const clock = Date.UTC(2026, 8, 23, 12)

beforeEach(() => {
  resetSemanticCache()
  ai = new FakeAi()
  quota = new MemoryQuotaStore()
  env = { APP_URL: 'https://example.test/app/', AI: ai }
  const library = new MemoryLibraryStore()
  app = createApp({
    embeddingStoreFor: () => new MemoryEmbeddingStore(),
    quotaStoreFor: () => quota,
    storeFor: () => library,
    verifyGoogle: async (token) => (token === 'google-ann' ? { sub: 'ann', email: 'ann@example.test' } : null),
    now: () => clock,
  })
})

const chat = (body: unknown, opts: { env?: Env; ip?: string; auth?: string } = {}) => app.request('/v1/ai/chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'cf-connecting-ip': opts.ip ?? '203.0.113.7', ...(opts.auth ? { authorization: `Bearer ${opts.auth}` } : {}) },
  body: JSON.stringify(body),
}, opts.env ?? env)

const ask = (text: string, extra: Record<string, unknown> = {}) => ({ messages: [{ role: 'user', content: text }], ...extra })
const toolCall = (id: string, name: string, args: unknown) => ({ id, type: 'function' as const, function: { name, arguments: typeof args === 'string' ? args : JSON.stringify(args) } })

describe('parseChatResponse', () => {
  it('reads OpenAI-style and legacy Workers AI responses', () => {
    expect(parseChatResponse({ choices: [{ message: { content: '<think>hmm</think> Hi', tool_calls: [{ id: 'a', function: { name: 'get_character', arguments: '{"id":"imp"}' } }] } }] }))
      .toMatchObject({ content: 'Hi', toolCalls: [{ id: 'a', type: 'function', function: { name: 'get_character', arguments: '{"id":"imp"}' } }] })
    expect(parseChatResponse({ response: 'Hello', tool_calls: [{ name: 'search_characters', arguments: { query: 'imp' } }] }))
      .toMatchObject({ content: 'Hello', toolCalls: [{ id: 'call_0', type: 'function', function: { name: 'search_characters', arguments: '{"query":"imp"}' } }] })
    expect(parseChatResponse({ choices: [{ message: { content: null } }] })).toMatchObject({ content: '', toolCalls: [] })
    expect(parseChatResponse({ choices: [], usage: { prompt_tokens: 1000, completion_tokens: 100, neurons: 9.5 } }).usage).toEqual({ promptTokens: 1000, completionTokens: 100, neurons: 9.5 })
    // No neurons reported: estimated from tokens at GLM rates.
    expect(parseChatResponse({ choices: [], usage: { prompt_tokens: 1000, completion_tokens: 100 } }).usage.neurons).toBeCloseTo(9.14, 1)
  })
})

describe('POST /v1/ai/chat', () => {
  it('needs Workers AI and a valid body', async () => {
    expect((await chat(ask('hi'), { env: { APP_URL: env.APP_URL } })).status).toBe(503)
    for (const bad of [{}, { messages: [] }, { messages: [{ role: 'system', content: 'x' }] }, ask('hi', { temperature: 3 }), { messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] }, ask('x'.repeat(20_001))]) {
      const res = await chat(bad)
      expect(res.status, JSON.stringify(bad).slice(0, 80)).toBe(400)
    }
    expect(ai.chatCalls).toHaveLength(0)
  })

  it('answers with the MCP tools offered and the tool guide appended', async () => {
    ai.queue({ content: '你好！' })
    const res = await chat(ask('你好', { system: 'Reply as JSON: {"message": "..."}' }))
    expect(res.status).toBe(200)
    expect(await j(res)).toEqual({ text: '你好！', steps: [], model: CHAT_MODEL, remaining: 29, usage: { promptTokens: 10, completionTokens: 5, neurons: 0.2, rounds: 1 } })
    expect(res.headers.get('x-ai-remaining')).toBe('29')
    const call = ai.chatCalls[0]
    expect(call.messages[0]).toMatchObject({ role: 'system' })
    expect(call.messages[0].content).toMatch(/^Reply as JSON/)
    expect(call.messages[0].content).toContain('## Tools')
    expect(call.chat_template_kwargs).toEqual({ enable_thinking: false })
    const names = call.tools!.map((t) => t.function.name)
    expect(names).toEqual(expect.arrayContaining(['search_characters', 'get_character', 'find_similar_characters', 'validate_script', 'create_script_draft']))
    expect(names).not.toContain('create_game')
    expect(names).not.toContain('save_script')
  })

  it('runs the tools the model calls and returns the steps', async () => {
    ai.queue(
      { tool_calls: [toolCall('c1', 'search_characters', { query: 'imp', language: 'en', limit: 1 }), toolCall('c2', 'no_such_tool', {}), toolCall('c3', 'get_character', '{not json')] },
      { content: 'The Imp kills each night.' },
    )
    const body = await j(await chat(ask('What does the Imp do?')))
    expect(body.text).toBe('The Imp kills each night.')
    expect(body.steps).toEqual([
      { tool: 'search_characters', arguments: { query: 'imp', language: 'en', limit: 1 }, ok: true },
      { tool: 'no_such_tool', arguments: {}, ok: false },
      { tool: 'get_character', arguments: '{not json', ok: false },
    ])
    const second = ai.chatCalls[1].messages
    const toolMessages = second.filter((m) => m.role === 'tool')
    expect(toolMessages.map((m) => m.tool_call_id)).toEqual(['c1', 'c2', 'c3'])
    expect(JSON.parse(toolMessages[0].content as string).items[0]).toMatchObject({ id: 'imp', name: 'Imp' })
    expect(toolMessages[1].content).toMatch(/^Error: Unknown tool/)
    expect(toolMessages[2].content).toMatch(/^Error: Tool arguments must be a JSON object/)
    expect(second.find((m) => m.role === 'assistant')).toMatchObject({ tool_calls: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }] })
  })

  it('forces an answer after the tool round budget', async () => {
    for (let i = 0; i < 5; i++) ai.queue({ tool_calls: [toolCall(`c${i}`, 'list_scripts', {})] })
    ai.queue({ content: 'Here are the scripts.' })
    const body = await j(await chat(ask('List scripts')))
    expect(body.text).toBe('Here are the scripts.')
    expect(body.steps).toHaveLength(5)
    expect(ai.chatCalls).toHaveLength(6)
    expect(ai.chatCalls[5].tool_choice).toBe('none')
  })

  it('can skip tools, and reports empty answers and quota errors', async () => {
    ai.queue({ content: 'plain' })
    expect((await j(await chat(ask('hi', { tools: false })))).text).toBe('plain')
    expect(ai.chatCalls[0].tools).toBeUndefined()

    ai.queue({ content: '' }, { content: '' })
    const empty = await chat(ask('hi'))
    expect(empty.status).toBe(502)
    expect((await j(empty)).error.code).toBe('ai_failed')

    ai.queue(new Error('4006: you have used up your daily free allocation of 10,000 neurons'))
    const exhausted = await chat(ask('hi'))
    expect(exhausted.status).toBe(429)
    expect((await j(exhausted)).error.code).toBe('ai_quota_exhausted')
  })

  it('enforces daily caps per IP, per user and globally', async () => {
    const capped = { ...env, AI_DAILY_LIMIT: '4', AI_DAILY_LIMIT_PER_IP: '2', AI_DAILY_LIMIT_PER_USER: '3' }
    expect((await chat(ask('1'), { env: capped })).status).toBe(200)
    const second = await chat(ask('2'), { env: capped })
    expect((await j(second)).remaining).toBe(0)
    const third = await chat(ask('3'), { env: capped })
    expect(third.status).toBe(429)
    expect(await j(third)).toMatchObject({ error: { code: 'ai_rate_limited', scope: 'caller' } })

    // Another IP has its own allowance; a signed-in user is counted per user.
    expect((await chat(ask('4'), { env: capped, ip: '198.51.100.1' })).status).toBe(200)
    expect((await j(await chat(ask('5'), { env: capped, auth: 'google-ann' }))).remaining).toBe(0) // global: 4 of 4
    const global = await chat(ask('6'), { env: capped, ip: '198.51.100.2' })
    expect(await j(global)).toMatchObject({ error: { code: 'ai_rate_limited', scope: 'global' } })

    expect((await chat(ask('7'), { env: capped, auth: 'forged' })).status).toBe(401)
    // IPs are stored hashed.
    expect([...quota.rows.keys()].some((k) => k.includes('203.0.113.7'))).toBe(false)
    expect([...quota.rows.keys()]).toContain('2026-09-23|user:google:ann')
  })

  it('treats "0" as no cap and starts a new count each day', async () => {
    const store = new MemoryQuotaStore()
    const limits = { global: Infinity, perIp: 1, perUser: 1, neurons: Infinity }
    expect(await takeQuota(store, { now: clock, ip: 'x', userId: null, limits })).toEqual({ ok: true, remaining: 0 })
    expect((await takeQuota(store, { now: clock, ip: 'x', userId: null, limits })).ok).toBe(false)
    expect((await takeQuota(store, { now: clock + 86_400_000, ip: 'x', userId: null, limits })).ok).toBe(true)
    const status = await j(await app.request('/v1/ai/status', {}, { ...env, AI_DAILY_LIMIT: '0' }))
    expect(status.chat.dailyLimits).toEqual({ global: null, perIp: 30, perUser: 100, neurons: 8000 })
  })

  it('stops when the daily neuron budget is used, and reports usage', async () => {
    const budget = { ...env, AI_DAILY_NEURONS: '50' }
    ai.queue({ content: 'one', neurons: 30 }, { content: 'two', neurons: 30 })
    expect((await j(await chat(ask('1'), { env: budget }))).usage).toMatchObject({ neurons: 30, rounds: 1 })
    expect((await chat(ask('2'), { env: budget })).status).toBe(200)
    const over = await chat(ask('3'), { env: budget })
    expect(over.status).toBe(429)
    expect(await j(over)).toMatchObject({ error: { code: 'ai_rate_limited', scope: 'global' } })
    const status = await j(await app.request('/v1/ai/status', {}, budget))
    expect(status.chat.usedToday).toEqual({ requests: 2, neurons: 60 })
  })

  it('makes the model answer once tool output reaches the cap', async () => {
    const bigSearch = (id: string) => toolCall(id, 'search_characters', { limit: 100 })
    ai.queue({ tool_calls: [bigSearch('a'), bigSearch('b'), bigSearch('c')] }, { content: 'Summary.' })
    const body = await j(await chat(ask('List every character')))
    expect(body.text).toBe('Summary.')
    expect(ai.chatCalls).toHaveLength(2)
    expect(ai.chatCalls[1].tool_choice).toBe('none')
    const toolText = ai.chatCalls[1].messages.filter((m) => m.role === 'tool').map((m) => m.content as string)
    expect(toolText.every((t) => t.length <= 6020)).toBe(true)
  })
})

