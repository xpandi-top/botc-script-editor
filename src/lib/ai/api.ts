/**
 * Unified AI API — wraps geminiGenerate and parses AgentResponse.
 */

import { geminiGenerate, GeminiError } from '../gemini'
import type { AiSettings } from '../aiSettings'
import type { AgentResponse } from './types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AiCallParams = {
  systemPrompt: string
  history: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }>
  settings: AiSettings
  temperature?: number
}

export type AiCallResult =
  | { ok: true; response: AgentResponse; rawText: string }
  | { ok: false; error: string }

// ── Parsing ───────────────────────────────────────────────────────────────────

function parseResponse(raw: string): AgentResponse {
  const t = raw
    .trim()
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()
  try {
    return JSON.parse(t) as AgentResponse
  } catch {
    return { message: raw }
  }
}

// ── callAi ────────────────────────────────────────────────────────────────────

export async function callAi(params: AiCallParams): Promise<AiCallResult> {
  const { systemPrompt, history, temperature } = params
  try {
    const res = await geminiGenerate({
      systemInstruction: systemPrompt,
      contents: history,
      temperature: temperature ?? 0.6,
    })
    const response = parseResponse(res.text)
    return { ok: true, response, rawText: res.text }
  } catch (e) {
    const error = e instanceof GeminiError ? e.message : String(e)
    return { ok: false, error }
  }
}
