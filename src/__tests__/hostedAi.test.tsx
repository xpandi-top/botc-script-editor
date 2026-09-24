/**
 * The BOTC hosted AI runtime (worker /v1/ai/chat): when it is the default,
 * what a request carries, how failures read, and what the chat shows.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { availableProviders, isAiAvailable, loadAiSettings, migrateAiSettings, saveAiSettings, type AiSettings } from '../lib/aiSettings'
import { geminiGenerate } from '../lib/gemini'
import { callAi } from '../lib/ai/api'
import { getHostedStatus, resetHostedStatus } from '../lib/ai/runtime/hosted'
import { ChatTab } from '../components/AiPanel/ChatTab'
import { HostedAiSettings } from '../components/AiPanel/HostedAiSettings'
import { I18nProvider } from '../context/I18nContext'

const google = vi.hoisted(() => ({ token: null as string | null }))
vi.mock('../lib/googleAuth', () => ({ getValidToken: async () => google.token }))

const API = 'https://api.test'
const hosted: AiSettings = { provider: 'botc', model: 'default', keys: { groq: '', openrouter: '', gemini: '' } }
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', `${API}/`)
  vi.stubEnv('VITE_AI_PROVIDER', '')
  vi.stubEnv('VITE_GROQ_API_KEY', '')
  vi.stubEnv('VITE_AI_API_KEY', '')
  vi.stubEnv('VITE_GEMINI_API_KEY', '')
  google.token = null
  resetHostedStatus()
})
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('hosted AI settings', () => {
  it('is the default when the build has an API, and offered first', () => {
    expect(loadAiSettings()).toMatchObject({ provider: 'botc', model: 'default' })
    expect(availableProviders()[0]).toBe('botc')
    expect(isAiAvailable()).toBe(true)
  })

  it('keeps a working choice and replaces a key-based provider that has no key', () => {
    saveAiSettings({ ...hosted, provider: 'groq', model: 'qwen/qwen3.8-27b', keys: { ...hosted.keys, groq: 'user-key' } })
    expect(loadAiSettings().provider).toBe('groq')
    saveAiSettings({ ...hosted, provider: 'webllm', model: 'Qwen3-1.7B-q4f16_1-MLC' })
    expect(loadAiSettings().provider).toBe('webllm')
    // Settings saved before the hosted AI existed: Groq selected, never given a key.
    localStorage.setItem('BOTC_AI_SETTINGS', JSON.stringify({ provider: 'groq', model: 'llama-3.3-70b-versatile', keys: { groq: '', openrouter: '', gemini: '' } }))
    migrateAiSettings()
    expect(loadAiSettings()).toMatchObject({ provider: 'botc', model: 'default' })
  })

  it('an environment provider with a key still wins', () => {
    vi.stubEnv('VITE_AI_PROVIDER', 'groq')
    vi.stubEnv('VITE_GROQ_API_KEY', 'env-key')
    expect(loadAiSettings().provider).toBe('groq')
  })

  it('does not exist without an API', () => {
    vi.stubEnv('VITE_API_URL', 'off')
    saveAiSettings(hosted)
    expect(loadAiSettings().provider).toBe('webllm') // local mode: answers from local data without a key
    expect(availableProviders()).not.toContain('botc')
  })
})

describe('hosted AI requests', () => {
  it('sends the system prompt and trimmed history, and returns the tools it used', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => reply({ text: '{"message":"119"}', model: '@cf/zai-org/glm-4.7-flash', remaining: 28, steps: [{ tool: 'list_editions', arguments: {}, ok: true }] }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await geminiGenerate({
      systemInstruction: 'LOCAL CATALOG RESULTS …',
      contents: [
        { role: 'model', parts: [{ text: 'Hello!' }] },
        { role: 'user', parts: [{ text: '奥德赛角色包' }] },
        { role: 'model', parts: [{ text: '好的' }] },
        { role: 'user', parts: [{ text: '一共有多少角色？' }] },
      ],
      temperature: 0.6,
    }, hosted)
    expect(res).toMatchObject({ text: '{"message":"119"}', remaining: 28, steps: [{ tool: 'list_editions', ok: true }] })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API}/v1/ai/chat`)
    expect((init!.headers as Record<string, string>).authorization).toBeUndefined()
    expect(JSON.parse(init!.body as string)).toEqual({
      system: 'LOCAL CATALOG RESULTS …',
      messages: [
        { role: 'user', content: '奥德赛角色包' },
        { role: 'assistant', content: '好的' },
        { role: 'user', content: '一共有多少角色？' },
      ],
      temperature: 0.6,
    })
  })

  it('explains limits and outages in both languages', async () => {
    const cases: Array<[Response | Error, RegExp]> = [
      [reply({ error: { code: 'ai_rate_limited', scope: 'caller', message: 'x' } }, 429), /次数已用完.*used today's free AI requests/],
      [reply({ error: { code: 'ai_rate_limited', scope: 'global', message: 'x' } }, 429), /全站上限/],
      [reply({ error: { code: 'ai_quota_exhausted', message: 'x' } }, 429), /额度已用完/],
      [reply({ error: { code: 'not_found' } }, 404), /尚未启用 AI/],
      [new TypeError('Failed to fetch'), /无法连接 BOTC 服务器/],
    ]
    for (const [outcome, message] of cases) {
      vi.stubGlobal('fetch', vi.fn(async () => { if (outcome instanceof Error) throw outcome; return outcome }))
      await expect(geminiGenerate({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }, hosted)).rejects.toThrow(message)
    }
  })

  it('uses a Google sign-in for the per-user limit, and falls back to anonymous if it is rejected', async () => {
    google.token = 'google-token'
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => ((init!.headers as Record<string, string>).authorization
      ? reply({ error: { code: 'unauthorized' } }, 401)
      : reply({ text: 'ok', steps: [], remaining: 29 })))
    vi.stubGlobal('fetch', fetchMock)
    expect((await geminiGenerate({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }, hosted)).text).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((fetchMock.mock.calls[0][1]!.headers as Record<string, string>).authorization).toBe('Bearer google-token')
  })

  it('passes tool steps through callAi', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({ text: '{"message":"Imp kills."}', steps: [{ tool: 'get_character', ok: true }], remaining: 5 })))
    const result = await callAi({ systemPrompt: 's', history: [{ role: 'user', parts: [{ text: 'imp?' }] }], settings: hosted })
    expect(result).toMatchObject({ ok: true, response: { message: 'Imp kills.' }, steps: [{ tool: 'get_character', ok: true }], remaining: 5 })
  })

  it('reads the server status once', async () => {
    const fetchMock = vi.fn(async () => reply({ chat: { available: true, model: 'glm', dailyLimits: { global: 300, perIp: 30, perUser: 100 } } }))
    vi.stubGlobal('fetch', fetchMock)
    const [a, b] = await Promise.all([getHostedStatus(), getHostedStatus()])
    expect(a).toEqual({ available: true, model: 'glm', dailyLimits: { global: 300, perIp: 30, perUser: 100 } })
    expect(b).toBe(a)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('hosted AI in the panel', () => {
  it('shows which lookups backed an answer and the requests left', () => {
    render(<I18nProvider language="zh"><ChatTab
      messages={[{ id: 'a', role: 'assistant', content: '共有 119 个角色。', steps: [{ tool: 'list_editions', ok: true }, { tool: 'search_characters', ok: true }, { tool: 'search_characters', ok: true }, { tool: 'get_character', ok: false }], remaining: 28 }]}
      loading={false} input="" setInput={() => {}} autoApply={false} setAutoApply={() => {}}
      handleSend={async () => {}} doApplyFill={() => {}} setMessages={() => {}}
      canSend bottomRef={{ current: null }} inputRef={{ current: null }} language="zh"
    /></I18nProvider>)
    expect(screen.getByText('已查询: 角色包统计 · 查角色 · 角色详情 ✗ — 今日剩余 28 次')).toBeInTheDocument()
  })

  it('describes what is sent and warns when the server has no AI', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({ error: { code: 'not_found' } }, 404)))
    render(<I18nProvider language="zh"><HostedAiSettings /></I18nProvider>)
    expect(screen.getByText(/会发送到 BOTC 服务器/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/暂未提供 AI/)).toBeInTheDocument())
  })
})

describe('prompt budget for the hosted runtime', () => {
  it('keeps the whole script roster, and more page context than the Groq budget', async () => {
    const { buildScriptContext } = await import('../lib/ai/context')
    const { buildSystemPrompt } = await import('../lib/ai/prompts')
    const { initialScripts } = await import('../catalog')
    const { estimateTokens } = await import('../core/ai/contextBudget')
    const { HOSTED_INPUT_BUDGET } = await import('../lib/ai/runtime/hosted')
    const script = initialScripts.find((s) => s.slug === 'al_vs_al') ?? initialScripts.find((s) => s.characters.length > 20)!
    const ctx = buildScriptContext({ script, language: 'zh' })
    const groq = buildSystemPrompt(ctx, '这个剧本里有哪些相克规则？')
    const hostedPrompt = buildSystemPrompt(ctx, '这个剧本里有哪些相克规则？', { inputBudget: HOSTED_INPUT_BUDGET })
    for (const prompt of [groq, hostedPrompt]) expect(prompt).toContain(`角色 id: ${script.characters.join(', ')}`)
    const abilityLines = (prompt: string) => prompt.split('\n').filter((line) => /^ {2}\S.* \[[a-z_]+\]: /.test(line)).length
    expect(abilityLines(hostedPrompt)).toBeGreaterThan(abilityLines(groq))
    expect(estimateTokens(hostedPrompt)).toBeLessThanOrEqual(HOSTED_INPUT_BUDGET)
  })
})

describe('answers without a model', () => {
  it('uses local data when the local model is not loaded, and after an online failure', async () => {
    const { renderHook, act } = await import('@testing-library/react')
    const { useAiPanel } = await import('../components/AiPanel/useAiPanel')
    const wrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider language="zh">{children}</I18nProvider>

    saveAiSettings({ ...hosted, provider: 'webllm', model: 'Qwen3-1.7B-q4f16_1-MLC' })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const local = renderHook(() => useAiPanel({ open: true }), { wrapper })
    expect(local.result.current.canSend).toBe(true)
    await act(async () => { await local.result.current.handleSend('洗衣妇的能力是什么？') })
    const answer = local.result.current.messages.at(-1)!
    expect(answer).toMatchObject({ role: 'assistant', local: true })
    expect(answer.content).toContain('这两名玩家之一是该角色')
    // Official text is exact: no model needed, so no note about loading one.
    expect(answer.content).not.toContain('本地模型尚未下载或加载')
    await act(async () => { await local.result.current.handleSend('新手说书人第一次主持要注意什么？') })
    expect(local.result.current.messages.at(-1)!.content).toContain('本地模型尚未下载或加载')
    // Only the app's own wiki file (cached for offline answers); nothing goes to the API.
    expect(fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => !url.endsWith('/wiki-chunks.json'))).toEqual([])

    saveAiSettings(hosted)
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).endsWith('/v1/ai/status')
      ? reply({ chat: { available: true, model: 'glm' } })
      : reply({ error: { code: 'ai_quota_exhausted' } }, 429))))
    const online = renderHook(() => useAiPanel({ open: true }), { wrapper })
    await act(async () => { await online.result.current.handleSend('6 个人存活的时候，处决至少需要几票？') })
    const [error, fallback] = online.result.current.messages.slice(-2)
    expect(error).toMatchObject({ role: 'error', content: expect.stringContaining('额度已用完') })
    expect(fallback).toMatchObject({ role: 'assistant', local: true })
    expect(fallback.content).toContain('至少需要 3 票')
  })

  it('answers from local data at once when the browser is offline', async () => {
    const { renderHook, act } = await import('@testing-library/react')
    const { useAiPanel } = await import('../components/AiPanel/useAiPanel')
    const wrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider language="zh">{children}</I18nProvider>
    saveAiSettings(hosted)
    const fetchMock = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    vi.stubGlobal('fetch', fetchMock)
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      const panel = renderHook(() => useAiPanel({ open: true }), { wrapper })
      await act(async () => { await panel.result.current.handleSend('6 个人存活的时候，处决至少需要几票？') })
      const answer = panel.result.current.messages.at(-1)!
      expect(answer).toMatchObject({ role: 'assistant', local: true })
      expect(answer.content).toContain('至少需要 3 票')
      expect(answer.content).toContain('当前离线')
      expect(panel.result.current.messages.some((m) => m.role === 'error')).toBe(false)
      expect(fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/v1/ai/chat'))).toEqual([])
    } finally {
      onLine.mockRestore()
    }
  })
})

describe('settings modes', () => {
  it('offers online and local first, and the own-key mode as optional', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const { SettingsPanel } = await import('../components/AiPanel/SettingsPanel')
    vi.stubGlobal('fetch', vi.fn(async () => reply({ chat: { available: true, model: 'glm' } })))
    const patch = vi.fn()
    const { rerender } = render(<I18nProvider language="zh"><SettingsPanel settings={hosted} patchSettings={patch} showSettings /></I18nProvider>)
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['在线 · BOTC 免费', '本地 · 离线', '自带 Key（可选）'])
    expect(screen.queryByLabelText(/API Key/)).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: '本地 · 离线' }))
    expect(patch).toHaveBeenCalledWith({ provider: 'webllm', model: 'Qwen3-1.7B-q4f16_1-MLC' })
    rerender(<I18nProvider language="zh"><SettingsPanel settings={{ ...hosted, provider: 'webllm', model: 'Qwen3-1.7B-q4f16_1-MLC' }} patchSettings={patch} showSettings /></I18nProvider>)
    expect(screen.getByText(/不需要模型也能用/)).toBeInTheDocument()
    rerender(<I18nProvider language="zh"><SettingsPanel settings={{ ...hosted, provider: 'groq', model: 'qwen/qwen3.8-27b' }} patchSettings={patch} showSettings /></I18nProvider>)
    expect(screen.getByLabelText('Groq API Key')).toBeInTheDocument()
  })
})
