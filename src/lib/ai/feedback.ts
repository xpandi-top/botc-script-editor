/**
 * Feedback on AI answers, for improving prompts, retrieval, routing and
 * models later (docs/AI-ARCHITECTURE-OFFLINE-FIRST.md §19). Sent only when
 * the user rates an answer or shares a conversation: the questions, the
 * answers and their traces (src/lib/ai/trace.ts) — no API keys, page text or
 * player names. Offline, items wait in a small outbox and go out later.
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
    // 4xx other than rate limiting will not get better on retry: drop it.
    return res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)
  } catch {
    return false
  }
}

export async function sendFeedback(item: FeedbackItem): Promise<FeedbackState> {
  if (!getApiUrl()) return 'local'
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (!offline && await post(item)) return 'sent'
  writeOutbox([...readOutbox(), item])
  return 'queued'
}

/** Send what waited offline; returns how many are still waiting. */
export async function flushFeedback(): Promise<number> {
  if (!getApiUrl() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return pendingFeedback()
  const waiting = readOutbox()
  const left: FeedbackItem[] = []
  for (const item of waiting) if (!(await post(item))) left.push(item)
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
