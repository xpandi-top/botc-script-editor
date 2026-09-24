import { describe, it, expect } from 'vitest'
// @ts-expect-error plain JS module
import { evalDrafts, formatSummary, summarize } from '../scripts/feedbackReport.mjs'

const trace = (extra: Record<string, unknown>) => ({ route: 'model', provider: 'webllm', model: 'Qwen3-0.6B', latencyMs: 15000, facts: [], characters: [], rules: [], wiki: [], ...extra })
const row = (id: string, rating: 'up' | 'down', t: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  id, created_at: 1, kind: 'answer', rating, reasons: rating === 'down' ? '["wrong"]' : '[]', comment: null, language: 'zh',
  route: t.route, provider: t.provider, model: t.model, prompt_version: 'p1', build: 'b', question: 'q',
  payload: JSON.stringify({ context: { type: 'general' }, messages: [{ role: 'user', content: '醉着是什么意思' }, { role: 'assistant', content: 'bad', trace: t }] }),
  ...extra,
})

describe('feedback report', () => {
  const rows = [
    row('a1', 'down', trace({})),
    row('a2', 'up', trace({ route: 'program', provider: 'webllm', latencyMs: 20, facts: ['votes'] })),
    row('a3', 'down', trace({ rules: ['醉酒与中毒'], latencyMs: 25000 })),
    { ...row('c1', 'up', trace({})), kind: 'conversation', rating: null },
  ]

  it('groups ratings by route and model, with latency and retrieval misses', () => {
    const s = summarize(rows)
    expect(s).toMatchObject({ items: 4, answers: 3, conversations: 1, up: 1, down: 2, reasons: [['wrong', 2]], retrievalMisses: 1 })
    expect(s.byRoute.find((g: { value: string }) => g.value === 'model')).toMatchObject({ total: 2, down: 2, downRate: '100%', p50ms: 25000 })
    expect(formatSummary(s)).toContain('retrieval misses): 1')
  })

  it('turns 👎 answers into draft eval cases', () => {
    const drafts = evalDrafts(rows)
    expect(drafts).toHaveLength(2)
    expect(drafts[0]).toMatchObject({ id: 'feedback-a1', question: '醉着是什么意思', badAnswer: 'bad', reasons: ['wrong'], context: 'general', checks: [] })
  })
})
