import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { getWebLlmState, loadWebLlm, resumeWebLlm, unloadWebLlm, generateWebLlm } from '../lib/ai/runtime/webllm'
import { WEBLLM_INPUT_BUDGET, WEBLLM_MODELS } from '../lib/ai/runtime/webllmModels'
import { getDefaultModel, loadAiSettings, migrateAiSettings, saveAiSettings, type AiSettings } from '../lib/aiSettings'
import { geminiGenerate } from '../lib/gemini'
import { prepareSystemPrompt } from '../lib/ai/prompts'
import { estimateQwenTokens } from '../core/ai/contextBudget'
import { WebLlmSettings } from '../components/AiPanel/WebLlmSettings'
import { I18nProvider } from '../context/I18nContext'

const sdk = vi.hoisted(() => ({ reload: vi.fn(), create: vi.fn(), terminate: vi.fn(), cached: vi.fn(), remove: vi.fn() }))
vi.mock('@mlc-ai/web-llm', () => ({
  hasModelInCache: sdk.cached,
  deleteModelAllInfoInCache: sdk.remove,
  prebuiltAppConfig: { model_list: [{ model_id: 'Qwen3-1.7B-q4f16_1-MLC', model: 'https://huggingface.co/mlc-ai/Qwen3-1.7B-q4f16_1-MLC' }] },
  WebWorkerMLCEngine: class {
    reload = sdk.reload
    chat = { completions: { create: sdk.create } }
    constructor(_worker: unknown, config: { initProgressCallback: (p: unknown) => void }) {
      config.initProgressCallback({ progress: 0.4, text: 'Loading' })
    }
  },
}))
const model = WEBLLM_MODELS[0].id
const settings: AiSettings = { provider: 'webllm', model, keys: { groq: '', gemini: '', openrouter: '' } }
beforeEach(() => {
  vi.stubGlobal('Worker', class { terminate = sdk.terminate })
  Object.defineProperty(navigator, 'gpu', { configurable: true, value: { requestAdapter: vi.fn(async () => ({ features: new Set(['shader-f16']) })) } })
  sdk.reload.mockResolvedValue(undefined)
  sdk.create.mockResolvedValue({ choices: [{ message: { content: '{"message":"本地奥德赛目录共有119个角色。"}' }, finish_reason: 'stop' }] })
})
afterEach(() => { cleanup(); unloadWebLlm(); localStorage.clear(); vi.clearAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined }) })

describe('WebLLM settings', () => {
  it('persists local choice across reload/migration despite a Groq environment default', () => {
    vi.stubEnv('VITE_AI_PROVIDER', 'groq')
    saveAiSettings(settings)
    migrateAiSettings()
    expect(loadAiSettings()).toEqual(settings)
    expect(getDefaultModel('webllm')).toBe(model)
  })
  it('preserves an explicitly cleared API key and a saved online provider', () => {
    vi.stubEnv('VITE_GROQ_API_KEY', 'environment-key')
    vi.stubEnv('VITE_AI_PROVIDER', 'groq')
    saveAiSettings({ ...settings, provider: 'openrouter', model: getDefaultModel('openrouter') })
    expect(loadAiSettings().provider).toBe('openrouter')
    expect(loadAiSettings().keys.groq).toBe('')
  })
  it('requires an explicit load action and never falls through to online fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(geminiGenerate({ contents: [{ role: 'user', parts: [{ text: '你好' }] }] }, settings)).rejects.toThrow('下载并加载')
    expect(sdk.reload).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('resuming a cached model after a reload', () => {
  it('loads again only a model this device loaded before and still has cached', async () => {
    sdk.cached.mockResolvedValue(true)
    expect(await resumeWebLlm(model)).toBe(false) // never loaded here: no automatic download
    expect(sdk.reload).not.toHaveBeenCalled()
    await loadWebLlm(model)
    unloadWebLlm()
    sdk.reload.mockClear()
    expect(await resumeWebLlm(model)).toBe(true)
    expect(sdk.reload).toHaveBeenCalledTimes(1)
    expect(getWebLlmState().status).toBe('ready')
    unloadWebLlm()
    // Cache cleared by the browser: no download without the button.
    sdk.cached.mockResolvedValue(false)
    sdk.reload.mockClear()
    expect(await resumeWebLlm(model)).toBe(false)
    expect(sdk.reload).not.toHaveBeenCalled()
  })

  it('tops up a partly cached model only while online', async () => {
    await loadWebLlm(model)
    unloadWebLlm()
    sdk.reload.mockClear()
    // The manifest is cached, a shard is not: an interrupted download or cache write.
    sdk.cached.mockResolvedValue(false)
    const match = vi.fn(async (url: string) => url === 'https://huggingface.co/mlc-ai/Qwen3-1.7B-q4f16_1-MLC/resolve/main/tensor-cache.json' ? new Response('{}') : undefined)
    vi.stubGlobal('caches', { open: async () => ({ match }) })
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      expect(await resumeWebLlm(model)).toBe(false)
      expect(sdk.reload).not.toHaveBeenCalled()
      onLine.mockReturnValue(true)
      expect(await resumeWebLlm(model)).toBe(true)
      expect(sdk.reload).toHaveBeenCalledTimes(1)
    } finally {
      onLine.mockRestore()
    }
  })
})

describe('downloaded model files', () => {
  it('shows a downloaded model and deletes its files on request', async () => {
    sdk.cached.mockResolvedValue(true)
    sdk.remove.mockResolvedValue(undefined)
    render(<I18nProvider language="zh"><WebLlmSettings model={model} /></I18nProvider>)
    expect(await screen.findByText('已完整下载到本机，可离线加载')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '加载模型' })).toBeInTheDocument()
    sdk.cached.mockResolvedValue(false)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '删除模型文件' })) })
    expect(sdk.remove).toHaveBeenCalledWith(model)
    await waitFor(() => expect(screen.getByRole('button', { name: '下载并加载模型' })).toBeInTheDocument())
  })
})

describe('local runtime', () => {
  it('loads once, uses bounded Qwen generation without a key, then releases the worker', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await loadWebLlm(model)
    await loadWebLlm(model)
    expect(sdk.reload).toHaveBeenCalledTimes(1)
    expect(getWebLlmState().status).toBe('ready')
    const result = await geminiGenerate({ contents: [{ role: 'user', parts: [{ text: '奥德赛有多少角色？' }] }] }, settings)
    expect(result.text).toContain('119')
    expect(sdk.create).toHaveBeenCalledWith(expect.objectContaining({ max_tokens: 768, extra_body: { enable_thinking: false } }))
    expect(fetchMock).not.toHaveBeenCalled()
    unloadWebLlm()
    expect(sdk.terminate).toHaveBeenCalledOnce()
    expect(getWebLlmState().status).toBe('idle')
  })
  it('reports unavailable GPU without attempting to load weights', async () => {
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined })
    await expect(loadWebLlm(model)).rejects.toThrow('WebGPU')
    expect(getWebLlmState().status).toBe('error')
    expect(sdk.reload).not.toHaveBeenCalled()
  })
  it('cancels a pending load and allows a clean retry', async () => {
    sdk.reload.mockImplementationOnce(() => new Promise(() => {}))
    const pending = loadWebLlm(model)
    const rejected = expect(pending).rejects.toThrow('取消')
    await vi.waitFor(() => expect(sdk.reload).toHaveBeenCalled())
    unloadWebLlm()
    await rejected
    expect(getWebLlmState().status).toBe('idle')
    await loadWebLlm(model)
    expect(getWebLlmState().status).toBe('ready')
  })
  it('cancels generation without keeping a hanging request', async () => {
    await loadWebLlm(model)
    sdk.create.mockImplementationOnce(() => new Promise(() => {}))
    const pending = generateWebLlm({ contents: [{ role: 'user', parts: [{ text: '你好' }] }] }, model)
    const rejected = expect(pending).rejects.toThrow('取消')
    expect(getWebLlmState().status).toBe('generating')
    unloadWebLlm()
    await rejected
  })
  it('rejects overlong questions locally before inference', async () => {
    await loadWebLlm(model)
    await expect(generateWebLlm({ contents: [{ role: 'user', parts: [{ text: '中'.repeat(5000) }] }] }, model)).rejects.toThrow('分段')
    expect(sdk.create).not.toHaveBeenCalled()
    expect(getWebLlmState().status).toBe('ready')
  })
  it('builds a Chinese prompt that fits the local window, with no embedding or API calls', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const prompt = await prepareSystemPrompt({ type: 'general', title: '', language: 'zh', fields: [] }, '奥德赛有多少角色？', [], { local: true })
    expect(prompt).toContain('119')
    expect(prompt).toContain('简体中文')
    expect(estimateQwenTokens(prompt)).toBeLessThan(WEBLLM_INPUT_BUDGET - 400)
    // Only the app's own wiki file (served from the service worker cache offline).
    expect(fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => !url.endsWith('/wiki-chunks.json'))).toEqual([])
  })
  it('shows Chinese loading/ready controls and releases resources from the UI', async () => {
    render(<I18nProvider language="zh"><WebLlmSettings model={model} /></I18nProvider>)
    expect(sdk.reload).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '下载并加载模型' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('已就绪'))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '释放内存' })) })
    expect(getWebLlmState().status).toBe('idle')
  })
})
