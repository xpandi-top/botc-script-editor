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

/**
 * Robust JSON response parser.
 *
 * LLMs sometimes return technically invalid JSON where the "message" value
 * contains literal newlines (not escaped as \n) or other characters that
 * break JSON.parse.  We try multiple strategies before falling back to raw text.
 */
function parseResponse(raw: string): AgentResponse {
  const t = raw
    .trim()
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()

  // ── Pass 1: strict JSON parse ────────────────────────────────────────────
  try {
    return JSON.parse(t) as AgentResponse
  } catch { /* continue */ }

  // ── Pass 2: replace literal newlines inside string values ───────────────
  // Covers the most common LLM mistake: newlines in "message": "...\n..."
  try {
    // Replace any literal newline/tab inside a JSON string value with escaped version
    const fixed = t.replace(
      /"((?:[^"\\]|\\.)*)"/gs,
      (_match, inner: string) =>
        '"' + inner.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"',
    )
    return JSON.parse(fixed) as AgentResponse
  } catch { /* continue */ }

  // ── Pass 3: regex-extract just the message field ─────────────────────────
  // Handles cases where the JSON structure is badly malformed
  if (t.includes('"message"')) {
    const match = t.match(/"message"\s*:\s*"([\s\S]*?)(?="\s*(?:,\s*"(?:fills|warning)"|[}\]]))/s)
    if (match) {
      const msg = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
      if (msg.trim()) return { message: msg }
    }
    // Broader fallback: grab everything after "message": " to end
    const broad = t.match(/"message"\s*:\s*"([\s\S]*)/)
    if (broad) {
      const msg = broad[1]
        .replace(/"\s*}\s*$/, '')   // strip closing "}
        .replace(/"\s*$/, '')       // strip trailing "
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
      if (msg.trim()) return { message: msg }
    }
  }

  // ── Pass 4: raw text fallback (no JSON at all) ───────────────────────────
  // Strip any stray leading `{` line that would confuse readers
  const stripped = t.startsWith('{') ? t.replace(/^\s*\{[^{]*"message"\s*:\s*"?/, '').trimStart() : t
  return { message: stripped || raw }
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
