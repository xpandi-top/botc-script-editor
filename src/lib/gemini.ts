/**
 * Provider-agnostic AI client.
 * Provider/model/key resolved at call time from aiSettings (localStorage),
 * falling back to env vars. No page reload needed to switch provider.
 */

import { loadAiSettings, type AiProvider } from './aiSettings'

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

export function isGeminiAvailable(): boolean {
  const s = loadAiSettings()
  return Boolean(s.keys[s.provider]?.trim())
}

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
  const settings = loadAiSettings()
  const provider = settings.provider
  const apiKey   = settings.keys[provider]?.trim()
  const model    = req.model ?? settings.model

  if (!apiKey) throw new GeminiError(`No API key set for provider "${provider}"`)

  if (provider === 'gemini') return _callGemini(req, model, apiKey)
  return _callOpenAICompat(req, model, apiKey, provider)
}

// ── Gemini native ─────────────────────────────────────────────────────────────

async function _callGemini(req: GeminiRequest, model: string, apiKey: string): Promise<GeminiResponse> {
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
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
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

// ── OpenAI-compatible (Groq, OpenRouter) ─────────────────────────────────────

const COMPAT_URLS: Record<string, string> = {
  groq:       'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
}

async function _callOpenAICompat(
  req: GeminiRequest,
  model: string,
  apiKey: string,
  provider: AiProvider,
): Promise<GeminiResponse> {
  const url = COMPAT_URLS[provider] ?? COMPAT_URLS.groq

  const messages: Array<{ role: string; content: string }> = []
  if (req.systemInstruction) messages.push({ role: 'system', content: req.systemInstruction })
  for (const c of req.contents) {
    messages.push({ role: c.role === 'model' ? 'assistant' : 'user', content: c.parts.map((p) => p.text).join('') })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://botc-companion.app'
    headers['X-Title'] = 'BOTC Companion'
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: req.temperature ?? 0.7,
      ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new GeminiError(err?.error?.message ?? `HTTP ${res.status}`, res.status, err)
  }
  const data = await res.json()
  const choice = data?.choices?.[0]
  return {
    text: (choice?.message?.content ?? '').trim(),
    finishReason: choice?.finish_reason ?? 'UNKNOWN',
  }
}

/** Single-turn convenience wrapper used by botcAgent.ts */
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
