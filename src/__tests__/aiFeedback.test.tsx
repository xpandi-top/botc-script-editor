/**
 * Answer traces and feedback (src/lib/ai/trace.ts, src/lib/ai/feedback.ts):
 * every answer records how it was produced; 👍 / 👎 and "share" send the
 * question, the answer and the trace, or wait in an outbox while offline.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { saveAiSettings, type AiSettings } from '../lib/aiSettings'
import { conversationMarkdown, flushFeedback, pendingFeedback, traceLine } from '../lib/ai/feedback'
import { PROMPT_VERSION } from '../lib/ai/trace'
import { useAiPanel } from '../components/AiPanel/useAiPanel'
import { AnswerFeedback } from '../components/AiPanel/AnswerFeedback'
import { I18nProvider } from '../context/I18nContext'

const API = 'https://api.test'
const localMode: AiSettings = { provider: 'webllm', model: 'Qwen3-1.7B-q4f16_1-MLC', keys: { groq: '', openrouter: '', gemini: '' } }
const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider language="zh">{children}</I18nProvider>
const posted = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls
  .filter(([url]) => String(url).endsWith('/v1/ai/feedback'))
  .map(([, init]) => JSON.parse((init as RequestInit).body as string))

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', API)
  saveAiSettings(localMode)
})
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('answer traces', () => {
  it('records how a program answer was made', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
    const panel = renderHook(() => useAiPanel({ open: true }), { wrapper })
    await act(async () => { await panel.result.current.handleSend('6 个人存活的时候，处决至少需要几票？') })
    const trace = panel.result.current.messages.at(-1)!.trace!
    expect(trace).toMatchObject({ route: 'program', provider: 'webllm', language: 'zh', contextType: 'general', promptVersion: PROMPT_VERSION, facts: ['votes'] })
    expect(trace.latencyMs).toBeGreaterThanOrEqual(0)
    expect(traceLine(trace, true)).toContain('程序事实: votes')
  })
})

describe('feedback', () => {
  it('sends a rated answer with its question and trace', async () => {
    const fetchMock = vi.fn(async () => new Response('{"id":"x"}', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const panel = renderHook(() => useAiPanel({ open: true }), { wrapper })
    await act(async () => { await panel.result.current.handleSend('洗衣妇的能力是什么？') })
    const answer = panel.result.current.messages.at(-1)!
    await act(async () => { await panel.result.current.rateAnswer(answer.id, 'down', ['vague'], '想要例子') })
    const [item] = posted(fetchMock)
    expect(item).toMatchObject({ kind: 'answer', rating: 'down', reasons: ['vague'], comment: '想要例子', language: 'zh', promptVersion: PROMPT_VERSION })
    expect(item.messages.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant'])
    expect(item.messages[1].trace.route).toBe('program')
    expect(panel.result.current.messages.at(-1)!.feedback).toMatchObject({ rating: 'down', state: 'sent' })
  })

  it('keeps feedback given offline and sends it once online', async () => {
    const fetchMock = vi.fn(async () => new Response('{"id":"x"}', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const panel = renderHook(() => useAiPanel({ open: true }), { wrapper })
    await act(async () => { await panel.result.current.handleSend('洗衣妇的能力是什么？') })
    await act(async () => { await panel.result.current.rateAnswer(panel.result.current.messages.at(-1)!.id, 'up') })
    expect(panel.result.current.messages.at(-1)!.feedback?.state).toBe('queued')
    expect(pendingFeedback()).toBe(1)
    expect(posted(fetchMock)).toEqual([])
    onLine.mockReturnValue(true)
    expect(await flushFeedback()).toBe(0)
    expect(posted(fetchMock)).toHaveLength(1)
  })

  it('shares the whole conversation and copies it as Markdown', async () => {
    const fetchMock = vi.fn(async () => new Response('{"id":"x"}', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const panel = renderHook(() => useAiPanel({ open: true }), { wrapper })
    await act(async () => { await panel.result.current.handleSend('洗衣妇的能力是什么？') })
    await act(async () => { await panel.result.current.handleSend('6 个人存活的时候，处决至少需要几票？') })
    await act(async () => { await panel.result.current.shareConversation() })
    const [item] = posted(fetchMock)
    expect(item.kind).toBe('conversation')
    expect(item.messages).toHaveLength(4)
    expect(writeText.mock.calls[0][0]).toContain('**问：** 洗衣妇的能力是什么？')
    expect(panel.result.current.notice).toContain('已发送给开发者')
  })

  it('writes Markdown with each answer\'s diagnostics', () => {
    const md = conversationMarkdown([
      { role: 'user', content: '醉着是什么意思' },
      { role: 'assistant', content: '……', trace: { route: 'model', provider: 'webllm', model: 'Qwen3-0.6B', latencyMs: 15200, facts: [], characters: ['sailor'], editions: [], rules: ['醉酒与中毒'], wiki: [], at: '', build: 'abc', promptVersion: 'p1', language: 'zh', contextType: 'general' } },
    ], true)
    expect(md).toContain('> webllm · Qwen3-0.6B · 15.2 s · 角色: sailor · 规则: 醉酒与中毒')
  })
})

describe('the rating control', () => {
  it('asks for reasons on 👎 and sends them', () => {
    const onRate = vi.fn()
    render(<I18nProvider language="zh"><AnswerFeedback message={{ id: 'a1', role: 'assistant', content: '……' }} zh onRate={onRate} /></I18nProvider>)
    fireEvent.click(screen.getByRole('button', { name: '回答有问题' }))
    const send = screen.getByRole('button', { name: '提交' })
    expect(send).toBeDisabled()
    fireEvent.click(screen.getByText('事实或规则错误'))
    fireEvent.change(screen.getByPlaceholderText('正确答案或说明（可选）'), { target: { value: '醉酒是失去能力' } })
    fireEvent.click(send)
    expect(onRate).toHaveBeenCalledWith('a1', 'down', ['wrong'], '醉酒是失去能力')
    fireEvent.click(screen.getByRole('button', { name: '回答准确' }))
    expect(onRate).toHaveBeenLastCalledWith('a1', 'up')
  })
})
