import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm'
import type { GeminiRequest, GeminiResponse } from '../../gemini'
import { budgetHistory, estimateQwenTokens } from '../../../core/ai/contextBudget'
import { stripThinking } from '../modelText'
import { WEBLLM_MODELS, WEBLLM_INPUT_BUDGET, WEBLLM_OUTPUT_BUDGET } from './webllmModels'

type State = {
  status: 'idle' | 'loading' | 'ready' | 'generating' | 'error'
  model: string
  progress: number
  detail: string
}
let state: State = { status: 'idle', model: '', progress: 0, detail: '' }
const listeners = new Set<() => void>()
export const getWebLlmState = () => state
export const subscribeWebLlm = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
function update(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}
let session: { worker?: Worker; engine?: WebWorkerMLCEngine; abort: AbortController } | undefined
// The 6 MB runtime, imported once (cached by the service worker after first use).
let sdkModule: Promise<typeof import('@mlc-ai/web-llm')> | undefined
const loadSdk = () => (sdkModule ??= import('@mlc-ai/web-llm'))

type LocalGpu = { requestAdapter(): Promise<{ features: ReadonlySet<string> } | null> }
const getGpu = () => typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { gpu?: LocalGpu }).gpu

export function supportsWebLlm(): boolean {
  return Boolean(getGpu()) && typeof Worker !== 'undefined'
}

function cancellable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const stop = () => reject(new Error('本地模型操作已取消 / Local model operation cancelled'))
    if (signal.aborted) { void promise.catch(() => {}); stop(); return }
    signal.addEventListener('abort', stop, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', stop))
  })
}

/** Stop downloads/inference and release GPU resources; downloaded cache is retained. */
export function unloadWebLlm(): void {
  session?.abort.abort()
  session?.worker?.terminate()
  session = undefined
  update({ status: 'idle', model: '', progress: 0, detail: '' })
}

// The model last loaded on this device: its files are probably in the browser cache.
const LOADED_KEY = 'botc-webllm-loaded'
const remember = (model: string | null) => {
  try { if (model) localStorage.setItem(LOADED_KEY, model); else localStorage.removeItem(LOADED_KEY) } catch { /* storage unavailable */ }
}

/**
 * After a page reload, load the model again when its files are still in the
 * browser cache: no download, a few seconds. Never starts a download — a
 * cleared cache needs the explicit button again.
 */
export async function resumeWebLlm(model: string): Promise<boolean> {
  if (state.status !== 'idle' || !supportsWebLlm()) return false
  try { if (localStorage.getItem(LOADED_KEY) !== model) return false } catch { return false }
  const cache = await webLlmCacheState(model)
  // A partial cache is topped up only when online; offline it cannot load.
  const online = typeof navigator === 'undefined' || navigator.onLine !== false
  if (cache === 'none') { remember(null); return false }
  if (cache === 'partial' && !online) return false
  if (state.status !== 'idle') return false
  await loadWebLlm(model)
  return true
}

/**
 * How much of the model is in this browser's cache: all of it (loads
 * offline), part of it (a download or cache write was cut short; loading
 * online fills the gaps), or nothing.
 */
export type WebLlmCache = 'complete' | 'partial' | 'none'

export async function webLlmCacheState(model: string): Promise<WebLlmCache> {
  if (!supportsWebLlm()) return 'none'
  try {
    const sdk = await loadSdk()
    if (await sdk.hasModelInCache(model)) return 'complete'
    const record = sdk.prebuiltAppConfig?.model_list.find((m) => m.model_id === model)
    if (!record || typeof caches === 'undefined') return 'none'
    let base = record.model.endsWith('/') ? record.model : `${record.model}/`
    if (!/\/resolve\/.+\//.test(base)) base += 'resolve/main/'
    const manifest = await (await caches.open('webllm/model')).match(new URL('tensor-cache.json', base).href)
    return manifest ? 'partial' : 'none'
  } catch {
    return 'none'
  }
}

/** Release the model if loaded and delete its downloaded files. */
export async function deleteWebLlm(model: string): Promise<void> {
  if (state.model === model) unloadWebLlm()
  const { deleteModelAllInfoInCache } = await loadSdk()
  await deleteModelAllInfoInCache(model)
  try { if (localStorage.getItem(LOADED_KEY) === model) remember(null) } catch { /* storage unavailable */ }
}

/** Explicit user action only (or resumeWebLlm from cache). Merely choosing WebLLM never downloads a model. */
export async function loadWebLlm(model: string): Promise<void> {
  if (state.status === 'ready' && state.model === model) return
  if (state.status === 'loading' || state.status === 'generating') throw new Error('本地模型正在忙 / Local model is busy')
  unloadWebLlm()
  const current = { abort: new AbortController() } as NonNullable<typeof session>
  session = current
  update({ status: 'loading', model, progress: 0, detail: '' })
  try {
    if (!WEBLLM_MODELS.some((m) => m.id === model)) throw new Error('不支持此本地模型 / Unsupported local model')
    if (!supportsWebLlm()) throw new Error('当前浏览器不支持 WebGPU，请使用支持 WebGPU 的桌面浏览器。 / WebGPU is unavailable.')
    const adapter = await cancellable(getGpu()!.requestAdapter(), current.abort.signal)
    if (!adapter?.features.has('shader-f16')) throw new Error('设备不支持此模型需要的 GPU 功能 / Required GPU feature shader-f16 is unavailable')
    const { WebWorkerMLCEngine } = await cancellable(loadSdk(), current.abort.signal)
    current.worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' })
    current.worker.onerror = () => {
      if (session !== current) return
      unloadWebLlm()
      update({ status: 'error', model, detail: '本地模型后台运行失败，请重新加载。 / Local worker failed; please reload.' })
    }
    current.engine = new WebWorkerMLCEngine(current.worker, {
      initProgressCallback: (report) => {
        if (session === current) update({ progress: Math.max(0, Math.min(1, report.progress)), detail: report.text })
      },
    })
    await cancellable(current.engine.reload(model, { context_window_size: 4096 }), current.abort.signal)
    if (session === current) {
      update({ status: 'ready', progress: 1, detail: '' })
      remember(model)
    }
  } catch (error) {
    if (session === current) {
      unloadWebLlm()
      update({ status: 'error', model, detail: error instanceof Error ? error.message : String(error) })
    }
    throw error
  }
}

export async function generateWebLlm(req: GeminiRequest, model: string): Promise<GeminiResponse> {
  const current = session
  if (!current?.engine || state.status !== 'ready' || state.model !== model) {
    throw new Error('请先在 AI 设置中下载并加载所选本地模型。 / Load the selected local model in AI settings first.')
  }
  const contents = budgetHistory(req.systemInstruction ?? '', req.contents, WEBLLM_INPUT_BUDGET, estimateQwenTokens)
  const messages = [
    ...(req.systemInstruction ? [{ role: 'system' as const, content: req.systemInstruction }] : []),
    ...contents.map((c) => ({ role: c.role === 'model' ? 'assistant' as const : 'user' as const, content: c.parts.map((p) => p.text).join('') })),
  ]
  update({ status: 'generating' })
  try {
    const result = await cancellable(current.engine.chat.completions.create({
      messages, stream: false, temperature: req.temperature ?? 0.3,
      max_tokens: Math.min(req.maxOutputTokens ?? WEBLLM_OUTPUT_BUDGET, WEBLLM_OUTPUT_BUDGET),
      extra_body: { enable_thinking: false },
    }), current.abort.signal)
    const choice = result.choices[0]
    const text = stripThinking(choice?.message.content ?? '')
    if (!text) throw new Error('本地模型未返回内容，请缩短问题后重试。 / No local response; try a shorter question.')
    return { text, finishReason: choice.finish_reason ?? 'unknown' }
  } catch (error) {
    if (session === current) {
      unloadWebLlm()
      update({ status: 'error', model, detail: error instanceof Error ? error.message : String(error) })
    }
    throw error
  } finally {
    if (session === current) update({ status: 'ready' })
  }
}
