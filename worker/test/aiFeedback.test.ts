import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../src/index'
import { MemoryFeedbackStore, parseFeedback } from '../src/ai/feedback'
import { MemoryQuotaStore } from '../src/ai/quota'
import type { Env } from '../src/env'

// Response bodies are untyped JSON in these tests.
const j = (res: Response): Promise<any> => res.json()

let feedback: MemoryFeedbackStore
let quota: MemoryQuotaStore
let app: ReturnType<typeof createApp>
// No Workers AI binding: feedback on local answers works without it.
const env: Env = { APP_URL: 'https://example.test/app/' }
const clock = Date.UTC(2026, 8, 24, 12)

beforeEach(() => {
  feedback = new MemoryFeedbackStore()
  quota = new MemoryQuotaStore()
  app = createApp({ feedbackStoreFor: () => feedback, quotaStoreFor: () => quota, now: () => clock })
})

const send = (body: unknown, ip = '203.0.113.9') => app.request('/v1/ai/feedback', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
  body: JSON.stringify(body),
}, env)

const trace = { route: 'model', provider: 'webllm', model: 'Qwen3-0.6B-q4f16_1-MLC', promptVersion: '2026-09-24', latencyMs: 15000, facts: [], characters: ['sailor'], editions: ['bmr'], rules: [], wiki: [] }
const rated = {
  kind: 'answer', rating: 'down', reasons: ['wrong', 'language'], comment: '醉酒是没有能力但以为自己有',
  language: 'zh', context: { type: 'general', title: '' }, build: 'abc1234', promptVersion: '2026-09-24',
  messages: [
    { role: 'user', content: '水手这个角色怎么玩' },
    { role: 'assistant', content: '水手的能力是……', trace },
    { role: 'user', content: '醉着是什么意思' },
    { role: 'assistant', content: '醉着 means 他还在喝醉', trace },
  ],
}

describe('POST /v1/ai/feedback', () => {
  it('stores a rated answer with its trace, for grouping by route, model and prompt', async () => {
    const res = await send(rated)
    expect(res.status).toBe(201)
    expect((await j(res)).id).toBe(feedback.records[0].id)
    expect(feedback.records[0]).toMatchObject({
      kind: 'answer', rating: 'down', reasons: ['wrong', 'language'], language: 'zh', createdAt: clock,
      route: 'model', provider: 'webllm', model: 'Qwen3-0.6B-q4f16_1-MLC', promptVersion: '2026-09-24', build: 'abc1234',
      // The question the rated (last) answer replied to.
      question: '醉着是什么意思',
    })
    expect(JSON.parse(feedback.records[0].payload).messages).toHaveLength(4)
  })

  it('takes a shared conversation without a rating', async () => {
    const res = await send({ ...rated, kind: 'conversation', rating: undefined, reasons: undefined })
    expect(res.status).toBe(201)
    expect(feedback.records[0]).toMatchObject({ kind: 'conversation', rating: null, reasons: [] })
  })

  it('rejects malformed items', async () => {
    for (const body of [
      { ...rated, kind: 'other' },
      { ...rated, rating: undefined },
      { ...rated, reasons: ['bad'] },
      { ...rated, messages: [] },
      { ...rated, messages: [{ role: 'system', content: 'x' }] },
      { ...rated, messages: [{ role: 'user', content: 'x'.repeat(8001) }] },
    ]) expect((await send(body)).status).toBe(400)
    expect(feedback.records).toHaveLength(0)
  })

  it('caps feedback per IP per day', async () => {
    for (let i = 0; i < 100; i++) await send(rated)
    expect((await send(rated)).status).toBe(429)
    expect((await send(rated, '198.51.100.1')).status).toBe(201)
    expect(feedback.records).toHaveLength(101)
  })
})

describe('parseFeedback', () => {
  it('keeps the rated answer\'s question when the conversation continues past it', () => {
    const record = parseFeedback({ ...rated, messages: rated.messages.slice(0, 2) }, 'id', clock)
    expect(record.question).toBe('水手这个角色怎么玩')
  })
})
