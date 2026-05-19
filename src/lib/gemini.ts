/**
 * Gemini API thin client.
 * Uses the v1beta REST endpoint so no SDK dependency needed.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-2.0-flash'

export type GeminiMessage = {
  role: 'user' | 'model'
  parts: Array<{ text: string }>
}

export type GeminiRequest = {
  model?: string
  systemInstruction?: string
  contents: GeminiMessage[]
  /** 0–2, default 0.7 */
  temperature?: number
  /** Max output tokens */
  maxOutputTokens?: number
}

export type GeminiResponse = {
  text: string
  /** Raw candidates[0].finishReason */
  finishReason: string
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly raw?: unknown,
  ) {
    super(message)
    this.name = 'GeminiError'
  }
}

export function isGeminiAvailable(): boolean {
  return Boolean(API_KEY?.trim())
}

export async function geminiGenerate(req: GeminiRequest): Promise<GeminiResponse> {
  if (!API_KEY?.trim()) {
    throw new GeminiError('VITE_GEMINI_API_KEY not set')
  }

  const model = req.model ?? DEFAULT_MODEL
  const url = `${BASE_URL}/${model}:generateContent`

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
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': API_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new GeminiError(
      err?.error?.message ?? `HTTP ${res.status}`,
      res.status,
      err,
    )
  }

  const data = await res.json()
  const candidate = data?.candidates?.[0]
  const text: string = candidate?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  const finishReason: string = candidate?.finishReason ?? 'UNKNOWN'

  return { text: text.trim(), finishReason }
}

/** Single-turn convenience wrapper. */
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
