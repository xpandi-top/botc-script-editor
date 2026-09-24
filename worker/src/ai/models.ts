/**
 * Workers AI model defaults (overridable with AI_CHAT_MODEL / AI_EMBED_MODEL)
 * and error classification. Choices are from the 2026-09 comparison in
 * docs/ARCHITECTURE-API.md §7.5.
 */
import type { Env } from '../env'

export const DEFAULT_CHAT_MODEL = '@cf/zai-org/glm-4.7-flash'
export const DEFAULT_EMBED_MODEL = '@cf/baai/bge-m3'

export const chatModelOf = (env: Env) => env.AI_CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL
export const embedModelOf = (env: Env) => env.AI_EMBED_MODEL?.trim() || DEFAULT_EMBED_MODEL

/** A Workers AI call failed; `quota` when the account's free allocation is used up. */
export class AiServiceError extends Error {
  constructor(message: string, readonly quota: boolean) {
    super(message)
  }
}

/** Wrap errors thrown by the AI binding (e.g. "4006: you have used up your daily free allocation of 10,000 neurons"). */
export function toAiServiceError(e: unknown): AiServiceError {
  if (e instanceof AiServiceError) return e
  const message = e instanceof Error ? e.message : String(e)
  return new AiServiceError(message, /\b4006\b|neurons|free allocation|rate limit/i.test(message))
}
