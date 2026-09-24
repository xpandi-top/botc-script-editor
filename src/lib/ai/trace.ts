/**
 * How an answer was produced, kept with it so that feedback on the answer
 * says why it was good or bad: the runtime, model and prompt version; what
 * the program computed and which local passages the answer had; what the
 * answer check appended; and how long it took. This is what later tuning
 * compares (prompt versions, retrieval, routing, models, speed).
 *
 * Never included: API keys, the page's text, player names.
 */
import type { Language } from '../../types'

/** Bump when the system prompts or the routing between program and model change. */
export const PROMPT_VERSION = '2026-09-24'

export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'

/**
 * Who answered: the model; the program alone because the question has an
 * exact answer; local data after the model was unavailable or failed; or
 * local data because the browser was offline.
 */
export type AnswerRoute = 'model' | 'program' | 'fallback' | 'offline'

/** What the answer had to work with. */
export type RetrievalMeta = {
  /** Computed facts: votes, setup, script-pool, script-facts, recommend, ability-backref, game-state. */
  facts: string[]
  characters: string[]
  editions: string[]
  /** Core rules sections by heading. */
  rules: string[]
  /** Wiki excerpts by page. */
  wiki: string[]
  /** System prompt length in characters (model routes). */
  promptChars?: number
}

export const emptyMeta = (): RetrievalMeta => ({ facts: [], characters: [], editions: [], rules: [], wiki: [] })

export type AnswerTrace = RetrievalMeta & {
  at: string
  build: string
  promptVersion: string
  route: AnswerRoute
  provider: string
  model: string
  language: Language
  /** The page the question came from: character, script, storyteller, general … */
  contextType: string
  latencyMs: number
  /** What the answer check appended: lineup, script, votes, ability. */
  checks?: string[]
  /** Hosted AI: the tools the server ran, and the Workers AI neurons used. */
  tools?: Array<{ tool: string; ok: boolean }>
  neurons?: number
  /** Why the model was not used or failed (fallback routes). */
  error?: string
}
