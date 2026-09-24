/**
 * Runtime AI provider/model settings — stored in localStorage.
 * Takes precedence over env vars so user can switch without rebuild.
 *
 * Runtimes: 'botc' is the hosted AI of the BOTC Companion API (online, no
 * user key, daily limits; only offered when VITE_API_URL is set), 'webllm'
 * runs on this device, the others use the user's own API key.
 */

import { WEBLLM_MODELS } from './ai/runtime/webllmModels'
import { isApiConfigured } from './apiUrl'

/** Providers that need the user's own API key. */
export type KeyedAiProvider = 'groq' | 'openrouter' | 'gemini'
export type OnlineAiProvider = KeyedAiProvider | 'botc'
export type AiProvider = OnlineAiProvider | 'webllm'

export type AiSettings = {
  provider: AiProvider
  model: string
  keys: {
    groq: string
    openrouter: string
    gemini: string
  }
}

export const PROVIDER_MODELS: Record<AiProvider, Array<{ id: string; label: string; free?: boolean }>> = {
  // The server picks the model (worker AI_CHAT_MODEL); one entry for the selector.
  botc: [{ id: 'default', label: 'Workers AI · GLM-4.7 Flash', free: true }],
  webllm: WEBLLM_MODELS,
  groq: [
    { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B (default)' },
    { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B' },
    { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B' },
  ],
  openrouter: [
    { id: 'meta-llama/llama-3.3-70b-instruct:free',  label: 'Llama 3.3 70B',    free: true },
    { id: 'google/gemma-3-27b-it:free',               label: 'Gemma 3 27B',      free: true },
    { id: 'mistralai/mistral-7b-instruct:free',       label: 'Mistral 7B',       free: true },
    { id: 'deepseek/deepseek-r1:free',                label: 'DeepSeek R1',      free: true },
    { id: 'qwen/qwen3-8b:free',                       label: 'Qwen 3 8B',        free: true },
    { id: 'meta-llama/llama-3.1-8b-instruct:free',   label: 'Llama 3.1 8B',    free: true },
  ],
  gemini: [
    { id: 'gemini-2.0-flash',            label: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-flash',            label: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro',              label: 'Gemini 1.5 Pro' },
  ],
}

const DEFAULT_MODELS: Record<AiProvider, string> = {
  botc:   'default',
  webllm: WEBLLM_MODELS[0].id,
  groq:       'qwen/qwen3.8-27b',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  gemini:     'gemini-2.0-flash',
}

// Retire only known obsolete choices; preserve manually configured model IDs.
const RETIRED_GROQ_MODELS = new Set([
  'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it',
  'mixtral-8x7b-32768', 'llama-3.3-70b-specdec',
])

function normalizeModel(provider: AiProvider, model?: string): string {
  if (provider === 'botc') return DEFAULT_MODELS.botc
  if (provider === 'webllm' && !WEBLLM_MODELS.some((m) => m.id === model)) return DEFAULT_MODELS.webllm
  if (!model || (provider === 'groq' && RETIRED_GROQ_MODELS.has(model))) return DEFAULT_MODELS[provider]
  return model
}

function isProvider(value: unknown): value is AiProvider {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PROVIDER_MODELS, value)
    && (value !== 'botc' || isApiConfigured())
}

/** The user's key for a key-based provider; '' for the hosted and local runtimes. */
export function providerKey(settings: AiSettings, provider: AiProvider = settings.provider): string {
  return provider === 'botc' || provider === 'webllm' ? '' : settings.keys[provider]?.trim() ?? ''
}

const LS_KEY = 'BOTC_AI_SETTINGS'

function envKey(provider: KeyedAiProvider): string {
  const universal = (import.meta.env.VITE_AI_API_KEY as string | undefined)?.trim() ?? ''
  const activeProvider = (import.meta.env.VITE_AI_PROVIDER as AiProvider | undefined) ?? 'groq'
  if (provider === 'groq') {
    return (import.meta.env.VITE_GROQ_API_KEY as string | undefined)?.trim()
      || (activeProvider === 'groq' ? universal : '')
  }
  if (provider === 'openrouter') {
    return (activeProvider === 'openrouter' ? universal : '')
  }
  return (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim()
    || (activeProvider === 'gemini' ? universal : '')
}

function defaultSettings(): AiSettings {
  const envProvider = import.meta.env.VITE_AI_PROVIDER
  // Without a configured provider, start on the hosted AI so the assistant works with no key.
  const provider: AiProvider = isProvider(envProvider) ? envProvider : isApiConfigured() ? 'botc' : 'groq'
  const settings: AiSettings = {
    provider,
    model: DEFAULT_MODELS[provider],
    keys: {
      groq:       envKey('groq'),
      openrouter: envKey('openrouter'),
      gemini:     envKey('gemini'),
    },
  }
  return usable(settings)
}

/** A key-based provider without a key cannot answer: use the hosted AI instead when it exists. */
function usable(settings: AiSettings): AiSettings {
  if (settings.provider === 'botc' || settings.provider === 'webllm' || providerKey(settings) || !isApiConfigured()) return settings
  return { ...settings, provider: 'botc', model: DEFAULT_MODELS.botc }
}

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const defaults = defaultSettings()
    if (!raw) return defaults

    const parsed = JSON.parse(raw) as Partial<AiSettings>

    // Saved user choice wins; environment supplies first-run defaults only.
    const provider = isProvider(parsed.provider) ? parsed.provider : defaults.provider
    const model = (parsed.provider === provider && parsed.model)
      ? parsed.model
      : DEFAULT_MODELS[provider]

    return usable({
      provider,
      model: normalizeModel(provider, model),
      keys: {
        // Preserve user-entered keys, including an intentional empty value.
        groq:       parsed.keys?.groq       ?? defaults.keys.groq       ?? '',
        openrouter: parsed.keys?.openrouter ?? defaults.keys.openrouter ?? '',
        gemini:     parsed.keys?.gemini     ?? defaults.keys.gemini     ?? '',
      },
    })
  } catch {
    return defaultSettings()
  }
}

export function saveAiSettings(s: AiSettings): void {
  localStorage.setItem(LS_KEY, JSON.stringify({ ...s, model: normalizeModel(s.provider, s.model) }))
}

/** Normalize retired choices without resetting the user's selected runtime. */
export function migrateAiSettings(): void {
  try {
    if (localStorage.getItem(LS_KEY)) saveAiSettings(loadAiSettings())
  } catch { /* storage may be unavailable */ }
}

export function getDefaultModel(provider: AiProvider): string {
  return DEFAULT_MODELS[provider]
}

export function isAiAvailable(s?: AiSettings): boolean {
  const settings = s ?? loadAiSettings()
  if (settings.provider === 'botc') return isApiConfigured()
  return settings.provider === 'webllm' || Boolean(providerKey(settings))
}

/** Settings tabs in display order; the hosted AI only when this build has an API. */
export function availableProviders(): AiProvider[] {
  return [...(isApiConfigured() ? ['botc' as const] : []), 'webllm', 'groq', 'openrouter', 'gemini']
}

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  botc: 'BOTC',
  webllm: 'WebLLM',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  gemini: 'Gemini',
}
