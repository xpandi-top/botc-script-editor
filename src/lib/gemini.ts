/**
 * Provider-agnostic AI client.
 *
 * Supported providers (set VITE_AI_PROVIDER):
 *   groq       — https://console.groq.com  (free tier, recommended)
 *   openrouter — https://openrouter.ai     (free models available)
 *   gemini     — https://aistudio.google.com (original, quota-limited)
 *
 * Env vars:
 *   VITE_AI_PROVIDER   = groq | openrouter | gemini   (default: groq)
 *   VITE_AI_API_KEY    = your key
 *   VITE_GEMINI_API_KEY = legacy fallback for gemini provider
 */

type Provider = 'groq' | 'openrouter' | 'gemini'

const PROVIDER = (import.meta.env.VITE_AI_PROVIDER as Provider | undefined) ?? 'groq'

const API_KEY: string | undefined =
  (import.meta.env.VITE_AI_API_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() ||
  undefined

// ── Default models per provider ──────────────────────────────────────────────

const DEFAULT_MODELS: Record<Provider, string> = {
  groq:       'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  gemini:     'gemini-2.0-flash',
}

// ── Error class ───────────────────────────────────────────────────────────────

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly raw?: unknown,
  ) {
    super(message)
    this.name = 'AIError'
  }
}

// ── Availability check ────────────────────────────────────────────────────────

export function isGeminiAvailable(): boolean {
  return Boolean(API_KEY)
}

export function getActiveProvider(): Provider {
  return PROVIDER
}

// ── Core request ──────────────────────────────────────────────────────────────

export type GeminiRequest = {
  model?: string
  systemInstruction?: string
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
  temperature?: number
  maxOutputTokens?: number
}

export type GeminiResponse = {
  text: string
  finishReason: string
}

export async function geminiGenerate(req: GeminiRequest): Promise<GeminiResponse> {
  if (!API_KEY) throw new GeminiError('No AI API key set (VITE_AI_API_KEY)')

  const model = req.model ?? DEFAULT_MODELS[PROVIDER]

  if (PROVIDER === 'gemini') {
    return _callGemini(req, model)
  }
  return _callOpenAICompat(req, model)
}

// ── Gemini native format ──────────────────────────────────────────────────────

async function _callGemini(req: GeminiRequest, model: string): Promise<GeminiResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const body: Record<string, unknown> = {
    contents: req.contents,
    generationConfig: {
      temperature: req.temperature ?? 0.7,
      ...(req.maxOutputTokens ? { maxOutputTokens: req.maxOutputTokens } : {}),
    },
  }
  if (req.systemInstruction) {
    body.systemInstruction = { parts: [{ text: req.systemInstruction }] }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': API_KEY! },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new GeminiError(err?.error?.message ?? `HTTP ${res.status}`, res.status, err)
  }
  const data = await res.json()
  const candidate = data?.candidates?.[0]
  const text: string = candidate?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  return { text: text.trim(), finishReason: candidate?.finishReason ?? 'UNKNOWN' }
}

// ── OpenAI-compatible format (Groq, OpenRouter, Cerebras, etc.) ──────────────

const OPENAI_COMPAT_URLS: Record<string, string> = {
  groq:       'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
}

async function _callOpenAICompat(req: GeminiRequest, model: string): Promise<GeminiResponse> {
  const url = OPENAI_COMPAT_URLS[PROVIDER] ?? OPENAI_COMPAT_URLS.groq

  // Convert Gemini-style contents → OpenAI messages
  const messages: Array<{ role: string; content: string }> = []
  if (req.systemInstruction) {
    messages.push({ role: 'system', content: req.systemInstruction })
  }
  for (const c of req.contents) {
    messages.push({
      role: c.role === 'model' ? 'assistant' : 'user',
      content: c.parts.map((p) => p.text).join(''),
    })
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: req.temperature ?? 0.7,
    ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  }
  // OpenRouter asks for a site URL header (optional but polite)
  if (PROVIDER === 'openrouter') {
    headers['HTTP-Referer'] = 'https://botc-companion.app'
    headers['X-Title'] = 'BOTC Companion'
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new GeminiError(err?.error?.message ?? `HTTP ${res.status}`, res.status, err)
  }

  const data = await res.json()
  const choice = data?.choices?.[0]
  const text: string = choice?.message?.content ?? ''
  const finishReason: string = choice?.finish_reason ?? 'UNKNOWN'
  return { text: text.trim(), finishReason }
}

// ── Convenience wrapper (used by botcAgent.ts) ────────────────────────────────

export async function geminiAsk(
  prompt: string,
  opts?: { system?: string; temperature?: number; model?: string },
): Promise<string> {
  const res = await geminiGenerate({
    model: opts?.model,
    systemInstruction: opts?.system,
    temperature: opts?.temperature,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })
  return res.text
}
