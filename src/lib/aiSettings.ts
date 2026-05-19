/**
 * Runtime AI provider/model settings — stored in localStorage.
 * Takes precedence over env vars so user can switch without rebuild.
 */

export type AiProvider = 'groq' | 'openrouter' | 'gemini'

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
  groq: [
    { id: 'llama-3.3-70b-versatile',    label: 'Llama 3.3 70B (versatile)', free: true },
    { id: 'llama-3.1-8b-instant',        label: 'Llama 3.1 8B (fast)',        free: true },
    { id: 'gemma2-9b-it',                label: 'Gemma 2 9B',                 free: true },
    { id: 'mixtral-8x7b-32768',          label: 'Mixtral 8x7B',               free: true },
    { id: 'llama-3.3-70b-specdec',       label: 'Llama 3.3 70B SpecDec',      free: true },
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
  groq:       'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  gemini:     'gemini-2.0-flash',
}

const LS_KEY = 'BOTC_AI_SETTINGS'

function envKey(provider: AiProvider): string {
  if (provider === 'groq')       return (import.meta.env.VITE_GROQ_API_KEY as string) ?? ''
  if (provider === 'openrouter') return (import.meta.env.VITE_AI_API_KEY as string) ?? ''
  return (import.meta.env.VITE_GEMINI_API_KEY as string) ?? (import.meta.env.VITE_AI_API_KEY as string) ?? ''
}

function defaultSettings(): AiSettings {
  const provider = ((import.meta.env.VITE_AI_PROVIDER as AiProvider) ?? 'groq')
  return {
    provider,
    model: DEFAULT_MODELS[provider],
    keys: {
      groq:       envKey('groq'),
      openrouter: envKey('openrouter'),
      gemini:     envKey('gemini'),
    },
  }
}

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw) as Partial<AiSettings>
    const defaults = defaultSettings()
    return {
      provider: parsed.provider ?? defaults.provider,
      model:    parsed.model    ?? defaults.model,
      keys: {
        groq:       parsed.keys?.groq       || defaults.keys.groq,
        openrouter: parsed.keys?.openrouter || defaults.keys.openrouter,
        gemini:     parsed.keys?.gemini     || defaults.keys.gemini,
      },
    }
  } catch {
    return defaultSettings()
  }
}

export function saveAiSettings(s: AiSettings): void {
  localStorage.setItem(LS_KEY, JSON.stringify(s))
}

export function getDefaultModel(provider: AiProvider): string {
  return DEFAULT_MODELS[provider]
}

export function isAiAvailable(s?: AiSettings): boolean {
  const settings = s ?? loadAiSettings()
  return Boolean(settings.keys[settings.provider]?.trim())
}
