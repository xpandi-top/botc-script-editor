/**
 * Answer traces and feedback (src/lib/ai/trace.ts, src/lib/ai/feedback.ts):
 * every answer records how it was produced; 👍 / 👎 and "share" send the
 * question, the answer and the trace, or wait in an outbox while offline.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { saveAiSettings, type AiSettings } from '../lib/aiSettings'
import { chatHistoryText, conversationMarkdown, feedbackItem, FEEDBACK_FORM, FORM_JSON_MARKER, flushFeedback, pendingFeedback, prefilledFormUrl, traceLine } from '../lib/ai/feedback'
import { PROMPT_VERSION } from '../lib/ai/trace'
import { useAiPanel } from '../components/AiPanel/useAiPanel'
import { AnswerFeedback } from '../components/AiPanel/AnswerFeedback'
import { ShareDialog } from '../components/AiPanel/ShareDialog'
import { I18nProvider } from '../context/I18nContext'

const API = 'https://api.test'
const localMode: AiSettings = { provider: 'webllm', model: 'Qwen3-1.7B-q4f16_1-MLC', keys: { groq: '', openrouter: '', gemini: '' } }
const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider language="zh">{children}</I18nProvider>
// Items sent to the Google Form: its two answers, and the JSON block of the Chat History.
const submitted = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls
  .filter(([url]) => String(url).endsWith(`/forms/d/e/${FEEDBACK_FORM.id}/formResponse`))
  .map(([, init]) => {
    const body = (init as RequestInit).body as URLSearchParams
    const chat = body.get(FEEDBACK_FORM.chatHistory)!
    return { chat, comment: body.get(FEEDBACK_FORM.comment), mode: (init as RequestInit).mode, meta: JSON.parse(chat.split(`${FORM_JSON_MARKER}\n`)[1]) }
  })
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
  it('sends a rated answer with its question and trace to the feedback form', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const panel = renderHook(() => useAiPanel({ open: true }), { wrapper })
    await act(async () => { await panel.result.current.handleSend('洗衣妇的能力是什么？') })
    const answer = panel.result.current.messages.at(-1)!
    await act(async () => { await panel.result.current.rateAnswer(answer.id, 'down', ['vague'], '想要例子') })
    const [item] = submitted(fetchMock)
    expect(item.mode).toBe('no-cors')
    expect(item.comment).toBe('想要例子')
    expect(item.chat).toContain('评价: 👎 · 原因: 太笼统 / 重复')
    expect(item.chat).toContain('**问：** 洗衣妇的能力是什么？')
    expect(item.meta).toMatchObject({ kind: 'answer', rating: 'down', reasons: ['vague'], language: 'zh', promptVersion: PROMPT_VERSION })
    expect(item.meta.turns).toEqual([{ q: '洗衣妇的能力是什么？', trace: expect.objectContaining({ route: 'program' }) }])
    expect(panel.result.current.messages.at(-1)!.feedback).toMatchObject({ rating: 'down', state: 'sent' })
  })

  it('sends to the API instead when the form is switched off', async () => {
    vi.stubEnv('VITE_FEEDBACK_FORM', 'off')
    const fetchMock = vi.fn(async () => new Response('{"id":"x"}', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const panel = renderHook(() => useAiPanel({ open: true }), { wrapper })
    await act(async () => { await panel.result.current.handleSend('洗衣妇的能力是什么？') })
    await act(async () => { await panel.result.current.rateAnswer(panel.result.current.messages.at(-1)!.id, 'up') })
    expect(posted(fetchMock)[0]).toMatchObject({ kind: 'answer', rating: 'up' })
    expect(submitted(fetchMock)).toEqual([])
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
    expect(submitted(fetchMock)).toEqual([])
    onLine.mockReturnValue(true)
    expect(await flushFeedback()).toBe(0)
    expect(submitted(fetchMock)).toHaveLength(1)
  })

  it('shares the whole conversation with a comment', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const panel = renderHook(() => useAiPanel({ open: true }), { wrapper })
    await act(async () => { await panel.result.current.handleSend('洗衣妇的能力是什么？') })
    await act(async () => { await panel.result.current.handleSend('6 个人存活的时候，处决至少需要几票？') })
    await act(async () => { await panel.result.current.shareConversation('第二个回答很好') })
    const [item] = submitted(fetchMock)
    expect(item.comment).toBe('第二个回答很好')
    expect(item.meta.kind).toBe('conversation')
    expect(item.meta.turns.map((t: { q: string }) => t.q)).toEqual(['洗衣妇的能力是什么？', '6 个人存活的时候，处决至少需要几票？'])
    expect(item.chat).toContain('程序事实: votes')
    expect(panel.result.current.notice).toContain('已发送到反馈表单')
  })

  it('fits a long conversation into a Sheets cell and a prefilled link', () => {
    const turn = (i: number) => [{ role: 'user' as const, content: `问题 ${i} ${'醉'.repeat(400)}` }, { role: 'assistant' as const, content: '答'.repeat(2000) }]
    const item = feedbackItem({ kind: 'conversation', language: 'zh', context: { type: 'general' }, messages: Array.from({ length: 20 }, (_, i) => turn(i)).flat() })
    const text = chatHistoryText(item)
    expect(text.length).toBeLessThanOrEqual(45_000)
    expect(text).toContain('问题 19') // the latest turns are kept
    expect(JSON.parse(text.split(`${FORM_JSON_MARKER}\n`)[1]).turns.length).toBeGreaterThan(0)
    const long = prefilledFormUrl(item)
    expect(long.truncated).toBe(true)
    expect(long.url.length).toBeLessThanOrEqual(7_500)
    expect(long.url).toContain(`/viewform?usp=pp_url&${FEEDBACK_FORM.chatHistory}=`)
    const short = prefilledFormUrl(feedbackItem({ kind: 'conversation', comment: '好', language: 'zh', context: { type: 'general' }, messages: turn(1).map((m) => ({ ...m, content: m.content.slice(0, 20) })) }))
    expect(short.truncated).toBe(false)
    expect(short.url).toContain(`${FEEDBACK_FORM.comment}=${encodeURIComponent('好')}`)
  })

  it('writes Markdown with each answer\'s diagnostics', () => {
    const md = conversationMarkdown([
      { role: 'user', content: '醉着是什么意思' },
      { role: 'assistant', content: '……', trace: { route: 'model', provider: 'webllm', model: 'Qwen3-0.6B', latencyMs: 15200, facts: [], characters: ['sailor'], editions: [], rules: ['醉酒与中毒'], wiki: [], at: '', build: 'abc', promptVersion: 'p1', language: 'zh', contextType: 'general' } },
    ], true)
    expect(md).toContain('> webllm · Qwen3-0.6B · 15.2 s · 角色: sailor · 规则: 醉酒与中毒')
  })
})

describe('reading the form back', () => {
  it('turns a Google Sheets export of form responses into report rows', async () => {
    // @ts-expect-error plain JS module shared with the worker's `npm run feedback`
    const { rowsFromFormCsv, summarize, evalDrafts } = await import('../../worker/scripts/feedbackReport.mjs')
    const trace = { route: 'model', provider: 'webllm', model: 'Qwen3-0.6B', latencyMs: 15200, facts: [], characters: ['sailor'], editions: [], rules: [], wiki: [], at: '', build: 'abc', promptVersion: 'p1', language: 'zh' as const, contextType: 'general' }
    const item = feedbackItem({
      kind: 'answer', rating: 'down', reasons: ['wrong'], comment: '醉酒是失去能力', language: 'zh', context: { type: 'general' },
      messages: [{ role: 'user', content: '醉着是什么意思' }, { role: 'assistant', content: '醉着 means 他还在喝醉', trace }],
    })
    const cell = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = `\uFEFFTimestamp,Chat History,Additional Comment\r\n${cell('9/24/2026 12:00:00')},${cell(chatHistoryText(item))},${cell(item.comment!)}\r\n`
    const rows = rowsFromFormCsv(csv)
    expect(rows[0]).toMatchObject({ kind: 'answer', rating: 'down', route: 'model', provider: 'webllm', model: 'Qwen3-0.6B', comment: '醉酒是失去能力', question: '醉着是什么意思' })
    expect(summarize(rows)).toMatchObject({ answers: 1, down: 1, reasons: [['wrong', 1]] })
    expect(evalDrafts(rows)[0]).toMatchObject({ question: '醉着是什么意思', badAnswer: '醉着 means 他还在喝醉' })
  })
})

describe('the share dialog', () => {
  it('shows what is sent and sends it with the comment', () => {
    const onSend = vi.fn()
    const item = (comment?: string) => feedbackItem({ kind: 'conversation', comment, language: 'zh', context: { type: 'general' }, messages: [{ role: 'user', content: '水手这个角色怎么玩' }, { role: 'assistant', content: '……' }] })
    render(<I18nProvider language="zh"><ShareDialog open onClose={() => {}} zh item={item} onSend={onSend} /></I18nProvider>)
    fireEvent.click(screen.getByRole('button', { name: /查看发送内容/ }))
    expect(screen.getByText(/水手这个角色怎么玩/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('补充说明（可选）'), { target: { value: '只重复了能力' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))
    expect(onSend).toHaveBeenCalledWith('只重复了能力')
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
