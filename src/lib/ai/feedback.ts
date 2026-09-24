/**
 * Feedback on AI answers, for improving prompts, retrieval, routing and
 * models later (docs/AI-ARCHITECTURE-OFFLINE-FIRST.md §19). Sent only when
 * the user rates an answer or shares a conversation: the questions, the
 * answers and their traces (src/lib/ai/trace.ts) — no API keys, page text or
 * player names. It goes to the developers' Google Form ("BOTC CHAT BOT
 * FEEDBACK", read in Google Sheets); without a form, to the API
 * (POST /v1/ai/feedback). Offline, items wait in a small outbox.
 */
import { getApiUrl } from '../apiUrl'
import { BUILD_ID, PROMPT_VERSION, type AnswerTrace } from './trace'
import type { Language } from '../../types'

export type FeedbackRating = 'up' | 'down'
export const FEEDBACK_REASONS = ['wrong', 'off_topic', 'vague', 'language', 'slow', 'other'] as const
export type FeedbackReason = typeof FEEDBACK_REASONS[number]

export const REASON_LABELS: Record<FeedbackReason, [string, string]> = {
  wrong: ['事实或规则错误', 'Wrong facts or rules'],
  off_topic: ['答非所问', 'Did not answer the question'],
  vague: ['太笼统 / 重复', 'Vague or repetitive'],
  language: ['语言或格式问题', 'Language or formatting'],
  slow: ['太慢', 'Too slow'],
  other: ['其他', 'Other'],
}

export type FeedbackMessage = { role: 'user' | 'assistant'; content: string; trace?: AnswerTrace }

export type FeedbackItem = {
  kind: 'answer' | 'conversation'
  rating?: FeedbackRating
  reasons?: FeedbackReason[]
  comment?: string
  language: Language
  /** The page type and title, and the script's character ids; not the page's text. */
  context: { type: string; title?: string; script?: string[] }
  messages: FeedbackMessage[]
  build: string
  promptVersion: string
  at: string
}

/** 'sent': stored on the server; 'queued': will be sent when online; 'local': no server (copy only). */
export type FeedbackState = 'sent' | 'queued' | 'local'

const OUTBOX_KEY = 'botc-ai-feedback-outbox'
const OUTBOX_MAX = 30
const LIMITS = { messages: 40, chars: 8000, comment: 2000 }

export function feedbackItem(fields: Omit<FeedbackItem, 'build' | 'promptVersion' | 'at'>): FeedbackItem {
  return {
    ...fields,
    comment: fields.comment?.trim().slice(0, LIMITS.comment) || undefined,
    // The last messages, each cut to a size the server accepts.
    messages: fields.messages.slice(-LIMITS.messages).map((m) => ({ ...m, content: m.content.slice(0, LIMITS.chars) })),
    build: BUILD_ID,
    promptVersion: PROMPT_VERSION,
    at: new Date().toISOString(),
  }
}

function readOutbox(): FeedbackItem[] {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as FeedbackItem[] } catch { return [] }
}
function writeOutbox(items: FeedbackItem[]) {
  try {
    if (items.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(-OUTBOX_MAX)))
    else localStorage.removeItem(OUTBOX_KEY)
  } catch { /* storage unavailable */ }
}
export const pendingFeedback = () => readOutbox().length

async function post(item: FeedbackItem): Promise<boolean> {
  try {
    const res = await fetch(`${getApiUrl()}/v1/ai/feedback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(item),
      signal: AbortSignal.timeout(10_000),
    })
    // A malformed or oversized item will not get better on retry: drop it. Anything
    // else (a server without the route yet, rate limits, outages) is retried later.
    return res.ok || res.status === 400 || res.status === 413
  } catch {
    return false
  }
}

/** Where feedback goes: the Google Form, else the API, else nowhere (copy only). */
// VITE_FEEDBACK_FORM=off sends to the API instead (tests, self-hosted builds).
const formEnabled = () => ((import.meta.env.VITE_FEEDBACK_FORM as string | undefined) ?? '').trim().toLowerCase() !== 'off'
const destination = (): 'form' | 'api' | null => (formEnabled() ? 'form' : getApiUrl() ? 'api' : null)
const deliver = (item: FeedbackItem) => (destination() === 'form' ? submitToForm(item) : post(item))

export async function sendFeedback(item: FeedbackItem): Promise<FeedbackState> {
  if (!destination()) return 'local'
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (!offline && await deliver(item)) return 'sent'
  writeOutbox([...readOutbox(), item])
  return 'queued'
}

/** Send what waited offline; returns how many are still waiting. */
export async function flushFeedback(): Promise<number> {
  if (!destination() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return pendingFeedback()
  const waiting = readOutbox()
  const left: FeedbackItem[] = []
  for (const item of waiting) if (!(await deliver(item))) left.push(item)
  writeOutbox(left)
  return left.length
}

const routeLabel = (trace: AnswerTrace, zh: boolean) => ({
  model: `${trace.provider} · ${trace.model}`,
  program: zh ? '程序' : 'program',
  fallback: zh ? '本地资料（模型不可用）' : 'local data (model unavailable)',
  offline: zh ? '本地资料（离线）' : 'local data (offline)',
}[trace.route])

/** One line of diagnostics for an answer: who answered, with what, how fast. */
export function traceLine(trace: AnswerTrace, zh: boolean): string {
  const parts = [
    routeLabel(trace, zh),
    `${(trace.latencyMs / 1000).toFixed(1)} s`,
    trace.facts.length ? `${zh ? '程序事实' : 'facts'}: ${trace.facts.join(', ')}` : '',
    trace.characters.length ? `${zh ? '角色' : 'characters'}: ${trace.characters.join(', ')}` : '',
    trace.rules.length ? `${zh ? '规则' : 'rules'}: ${trace.rules.join(', ')}` : '',
    trace.wiki.length ? `wiki: ${trace.wiki.join(', ')}` : '',
    trace.checks?.length ? `${zh ? '校验' : 'checks'}: ${trace.checks.join(', ')}` : '',
    trace.tools?.length ? `${zh ? '工具' : 'tools'}: ${trace.tools.map((t) => t.tool).join(', ')}` : '',
    `prompt ${trace.promptVersion} · build ${trace.build}`,
  ]
  return parts.filter(Boolean).join(' · ')
}

/** The conversation as Markdown, with each answer's diagnostics, for pasting into an issue or chat. */
export function conversationMarkdown(messages: FeedbackMessage[], zh: boolean, title?: string): string {
  const lines = [`# ${zh ? 'BOTC AI 对话' : 'BOTC AI conversation'}${title ? ` — ${title}` : ''}`, '']
  for (const m of messages) {
    if (m.role === 'user') lines.push(`**${zh ? '问' : 'Q'}：** ${m.content}`, '')
    else {
      lines.push(`**${zh ? '答' : 'A'}：**`, '', m.content, '')
      if (m.trace) lines.push(`> ${traceLine(m.trace, zh)}`, '')
    }
  }
  lines.push(`_prompt ${PROMPT_VERSION} · build ${BUILD_ID}_`)
  return lines.join('\n')
}

// ── Google Form ──────────────────────────────────────────────────────────────

export const FEEDBACK_FORM = {
  id: '1FAIpQLScfMVv4KasHgVVRhe7RHvKIlNMEiX-UbUVp_fpv2O0vbn6dEQ',
  chatHistory: 'entry.923753264',
  comment: 'entry.1025242982',
} as const

/** Marks the machine-readable part of the Chat History answer. */
export const FORM_JSON_MARKER = '--- botc-feedback-json ---'
// Google Sheets keeps at most 50,000 characters per cell.
const MAX_CHARS = 45_000
// A prefilled link must stay a URL Google accepts.
const MAX_URL = 7_500

const formBase = `https://docs.google.com/forms/d/e/${FEEDBACK_FORM.id}`

/** The "Chat History" answer: readable conversation, then the traces as JSON. */
export function chatHistoryText(item: FeedbackItem): string {
  const zh = item.language === 'zh'
  const header = [
    `${zh ? '时间' : 'Time'}: ${item.at} · ${zh ? '语言' : 'Language'}: ${item.language} · ${zh ? '页面' : 'Page'}: ${item.context.type}${item.context.title ? `（${item.context.title}）` : ''} · build ${item.build} · prompt ${item.promptVersion}`,
    item.kind === 'answer'
      ? `${zh ? '评价' : 'Rating'}: ${item.rating === 'up' ? '👍' : '👎'}${item.reasons?.length ? ` · ${zh ? '原因' : 'Reasons'}: ${item.reasons.map((r) => REASON_LABELS[r][zh ? 0 : 1]).join(zh ? '、' : ', ')}` : ''}`
      : (zh ? '分享的对话' : 'Shared conversation'),
  ].join('\n')
  const meta = (messages: FeedbackItem['messages']) => JSON.stringify({
    v: 1, kind: item.kind, rating: item.rating ?? null, reasons: item.reasons ?? [], language: item.language,
    context: item.context, build: item.build, promptVersion: item.promptVersion, at: item.at,
    // Per answer: the question it replied to (short) and its trace.
    turns: messages.flatMap((m, i) => m.role === 'assistant'
      ? [{ q: [...messages.slice(0, i)].reverse().find((x) => x.role === 'user')?.content.slice(0, 300) ?? null, trace: m.trace ?? null }]
      : []),
  })
  // Drop the oldest turns until it fits a Sheets cell.
  let messages = item.messages
  let text = ''
  for (;;) {
    text = `${header}\n\n${conversationMarkdown(messages, zh, item.context.title)}\n\n${FORM_JSON_MARKER}\n${meta(messages)}`
    if (text.length <= MAX_CHARS || messages.length <= 2) break
    messages = messages.slice(2)
  }
  return text.slice(0, MAX_CHARS)
}

/** Submit to the form. The response is opaque (no-cors): a resolved request counts as sent. */
export async function submitToForm(item: FeedbackItem): Promise<boolean> {
  try {
    const body = new URLSearchParams({ [FEEDBACK_FORM.chatHistory]: chatHistoryText(item), [FEEDBACK_FORM.comment]: item.comment ?? '' })
    await fetch(`${formBase}/formResponse`, { method: 'POST', mode: 'no-cors', body, signal: AbortSignal.timeout(15_000) })
    return true
  } catch {
    return false
  }
}

/**
 * The form in a browser tab with the answers filled in, for people who
 * would rather submit there. Long conversations are cut to fit a URL.
 */
export function prefilledFormUrl(item: FeedbackItem): { url: string; truncated: boolean } {
  const zh = item.language === 'zh'
  let text = chatHistoryText(item)
  const url = (t: string) => `${formBase}/viewform?usp=pp_url&${FEEDBACK_FORM.chatHistory}=${encodeURIComponent(t)}${item.comment ? `&${FEEDBACK_FORM.comment}=${encodeURIComponent(item.comment)}` : ''}`
  if (url(text).length <= MAX_URL) return { url: url(text), truncated: false }
  const note = zh ? '\n…（过长已截断，完整内容已复制，可粘贴替换）' : '\n… (cut to fit; the full text was copied — paste to replace)'
  // Cut the readable part; the JSON block does not survive a cut, so it goes.
  text = text.split(FORM_JSON_MARKER)[0]
  let lo = 0, hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (url(text.slice(0, mid) + note).length <= MAX_URL) lo = mid
    else hi = mid - 1
  }
  return { url: url(text.slice(0, lo) + note), truncated: true }
}
