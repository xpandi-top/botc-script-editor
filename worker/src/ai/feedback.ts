/**
 * Feedback on AI answers from the web app (src/lib/ai/feedback.ts): a rated
 * answer or a shared conversation, each answer with its trace. Validated
 * and size-limited here, stored in D1 (migrations/0003_ai_feedback.sql),
 * exported for analysis with `npm run feedback` (scripts/feedback.mjs).
 */
import { InputError } from '../scripts'

export type FeedbackRecord = {
  id: string
  createdAt: number
  kind: 'answer' | 'conversation'
  rating: 'up' | 'down' | null
  reasons: string[]
  comment: string | null
  language: string | null
  /** From the rated (or last) answer's trace. */
  route: string | null
  provider: string | null
  model: string | null
  promptVersion: string | null
  build: string | null
  /** The question the rated (or last) answer replied to. */
  question: string | null
  payload: string
}

export interface FeedbackStore {
  add(record: FeedbackRecord): Promise<void>
}

export class D1FeedbackStore implements FeedbackStore {
  constructor(private readonly db: D1Database) {}

  async add(r: FeedbackRecord) {
    await this.db.prepare(`INSERT INTO ai_feedback (id, created_at, kind, rating, reasons, comment, language, route, provider, model, prompt_version, build, question, payload)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`)
      .bind(r.id, r.createdAt, r.kind, r.rating, JSON.stringify(r.reasons), r.comment, r.language, r.route, r.provider, r.model, r.promptVersion, r.build, r.question, r.payload)
      .run()
  }
}

export class MemoryFeedbackStore implements FeedbackStore {
  readonly records: FeedbackRecord[] = []
  async add(record: FeedbackRecord) { this.records.push(record) }
}

const LIMITS = { messages: 40, content: 8000, comment: 2000, payload: 200_000 }
const REASONS = new Set(['wrong', 'off_topic', 'vague', 'language', 'slow', 'other'])
const str = (value: unknown, max: number): string | null => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null)

/** Check a feedback item and pick out the columns; throws InputError when it is not one. */
export function parseFeedback(body: unknown, id: string, now: number): FeedbackRecord {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Request body must be a JSON object.')
  const b = body as Record<string, unknown>
  if (b.kind !== 'answer' && b.kind !== 'conversation') throw new InputError('"kind" must be "answer" or "conversation".')
  if (b.rating !== undefined && b.rating !== 'up' && b.rating !== 'down') throw new InputError('"rating" must be "up" or "down".')
  if (b.kind === 'answer' && !b.rating) throw new InputError('An answer needs a "rating".')
  if (b.reasons !== undefined && (!Array.isArray(b.reasons) || b.reasons.some((r) => typeof r !== 'string' || !REASONS.has(r)))) {
    throw new InputError(`"reasons" must be a list of: ${[...REASONS].join(', ')}.`)
  }
  const messages = b.messages
  if (!Array.isArray(messages) || !messages.length || messages.length > LIMITS.messages) throw new InputError(`"messages" must be a list of 1 to ${LIMITS.messages} messages.`)
  for (const m of messages) {
    if (!m || typeof m !== 'object' || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || m.content.length > LIMITS.content) {
      throw new InputError(`Each message needs "role" (user | assistant) and "content" of at most ${LIMITS.content} characters.`)
    }
  }
  const payload = JSON.stringify(b)
  if (payload.length > LIMITS.payload) throw new InputError(`Feedback is limited to ${LIMITS.payload} characters.`)
  const answers = messages.filter((m) => m.role === 'assistant')
  const rated = answers[answers.length - 1] as { trace?: Record<string, unknown> } | undefined
  const trace = rated?.trace && typeof rated.trace === 'object' ? rated.trace : {}
  const lastIndex = messages.lastIndexOf(rated)
  const question = [...messages.slice(0, lastIndex < 0 ? messages.length : lastIndex)].reverse().find((m) => m.role === 'user') as { content: string } | undefined
  return {
    id,
    createdAt: now,
    kind: b.kind,
    rating: (b.rating as 'up' | 'down' | undefined) ?? null,
    reasons: (b.reasons as string[] | undefined) ?? [],
    comment: str(b.comment, LIMITS.comment),
    language: str(b.language, 8),
    route: str(trace.route, 20),
    provider: str(trace.provider, 40),
    model: str(trace.model, 120),
    promptVersion: str(b.promptVersion, 40) ?? str(trace.promptVersion, 40),
    build: str(b.build, 40),
    question: question ? question.content.slice(0, 2000) : null,
    payload,
  }
}
