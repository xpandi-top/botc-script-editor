/**
 * Daily caps for hosted chat, so one caller cannot use up the account's free
 * Workers AI allowance. Counted per UTC day for everyone ("global"), per
 * caller IP (salted with the day and hashed; the IP itself is not stored) or,
 * for signed-in callers, per user instead of per IP. The Workers AI neurons
 * the chats used ("neurons") are counted too: the free plan's allowance is in
 * neurons, and a long chat costs many times a short one.
 */
import type { Env } from '../env'
import { sha256Hex } from '../library/auth'

export interface QuotaStore {
  counts(day: string, subjects: string[]): Promise<Map<string, number>>
  increment(day: string, subjects: string[]): Promise<void>
  add(day: string, subject: string, amount: number): Promise<void>
  /** Drop counters older than `day`. */
  prune(day: string): Promise<void>
}

export class D1QuotaStore implements QuotaStore {
  constructor(private readonly db: D1Database) {}

  async counts(day: string, subjects: string[]) {
    const { results } = await this.db.prepare(`SELECT subject, count FROM ai_usage WHERE day = ?1 AND subject IN (${subjects.map((_, i) => `?${i + 2}`).join(', ')})`)
      .bind(day, ...subjects).all<{ subject: string; count: number }>()
    return new Map(results.map((r) => [r.subject, r.count]))
  }

  async increment(day: string, subjects: string[]) {
    const upsert = this.db.prepare('INSERT INTO ai_usage (day, subject, count) VALUES (?1, ?2, 1) ON CONFLICT(day, subject) DO UPDATE SET count = count + 1')
    await this.db.batch(subjects.map((s) => upsert.bind(day, s)))
  }

  async add(day: string, subject: string, amount: number) {
    await this.db.prepare('INSERT INTO ai_usage (day, subject, count) VALUES (?1, ?2, ?3) ON CONFLICT(day, subject) DO UPDATE SET count = count + ?3')
      .bind(day, subject, amount).run()
  }

  async prune(day: string) {
    await this.db.prepare('DELETE FROM ai_usage WHERE day < ?1').bind(day).run()
  }
}

export class MemoryQuotaStore implements QuotaStore {
  readonly rows = new Map<string, number>()

  async counts(day: string, subjects: string[]) {
    return new Map(subjects.flatMap((s) => (this.rows.has(`${day}|${s}`) ? [[s, this.rows.get(`${day}|${s}`)!]] : [])))
  }

  async increment(day: string, subjects: string[]) {
    for (const s of subjects) this.rows.set(`${day}|${s}`, (this.rows.get(`${day}|${s}`) ?? 0) + 1)
  }

  async add(day: string, subject: string, amount: number) {
    this.rows.set(`${day}|${subject}`, (this.rows.get(`${day}|${subject}`) ?? 0) + amount)
  }

  async prune(day: string) {
    for (const key of [...this.rows.keys()]) if (key.split('|')[0] < day) this.rows.delete(key)
  }
}

export type QuotaLimits = { global: number; perIp: number; perUser: number; neurons: number }

/** Unset → default; "0" (or anything not a positive integer) → no cap. */
function limitOf(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : Infinity
}

export function quotaLimits(env: Env): QuotaLimits {
  return {
    global: limitOf(env.AI_DAILY_LIMIT, 300),
    perIp: limitOf(env.AI_DAILY_LIMIT_PER_IP, 30),
    perUser: limitOf(env.AI_DAILY_LIMIT_PER_USER, 100),
    // Below the free plan's 10,000 so embedding refreshes still fit.
    neurons: limitOf(env.AI_DAILY_NEURONS, 8000),
  }
}

export type QuotaDecision =
  | { ok: true; remaining: number | null }
  | { ok: false; scope: 'global' | 'caller'; limit: number }

/** Check the caps and count one request if all allow it. */
export async function takeQuota(store: QuotaStore, opts: { now: number; ip: string; userId: string | null; limits: QuotaLimits }): Promise<QuotaDecision> {
  const day = new Date(opts.now).toISOString().slice(0, 10)
  const caller = opts.userId ? `user:${opts.userId}` : `ip:${(await sha256Hex(`${day}|${opts.ip}`)).slice(0, 16)}`
  const callerLimit = opts.userId ? opts.limits.perUser : opts.limits.perIp
  const counts = await store.counts(day, ['global', caller, 'neurons'])
  const used = { global: counts.get('global') ?? 0, caller: counts.get(caller) ?? 0 }
  if (used.global >= opts.limits.global) return { ok: false, scope: 'global', limit: opts.limits.global }
  if ((counts.get('neurons') ?? 0) >= opts.limits.neurons) return { ok: false, scope: 'global', limit: opts.limits.global }
  if (used.caller >= callerLimit) return { ok: false, scope: 'caller', limit: callerLimit }
  await store.increment(day, ['global', caller])
  const weekAgo = new Date(opts.now - 7 * 86_400_000).toISOString().slice(0, 10)
  await store.prune(weekAgo)
  const remaining = Math.min(opts.limits.global - used.global, callerLimit - used.caller) - 1
  return { ok: true, remaining: Number.isFinite(remaining) ? remaining : null }
}

const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10)

/** Count the neurons a chat used (rounded up) against today's budget. */
export async function recordNeurons(store: QuotaStore, now: number, neurons: number): Promise<void> {
  if (neurons > 0) await store.add(dayOf(now), 'neurons', Math.ceil(neurons))
}

export async function usageToday(store: QuotaStore, now: number): Promise<{ requests: number; neurons: number }> {
  const counts = await store.counts(dayOf(now), ['global', 'neurons'])
  return { requests: counts.get('global') ?? 0, neurons: counts.get('neurons') ?? 0 }
}
