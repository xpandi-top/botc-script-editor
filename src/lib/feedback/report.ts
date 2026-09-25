/**
 * Problem reports from the app itself: a wrong ability text, a bad
 * translation, a missing reminder token, a storyteller step that misbehaves.
 * A report says what it is about (a character, a script, a storyteller
 * element or a page), what the user saw there, and where in the app they
 * were, so an agent can find the file to fix (scripts/feedback-reports.mjs,
 * docs/FEEDBACK.md). It goes to the developers' Google Form ("BOTC Companion
 * App Feedback Form", read in Google Sheets) as readable text followed by a
 * JSON block; offline, reports wait in a small outbox. No player names,
 * notes or keys.
 */
import { BUILD_ID } from '../ai/trace'
import type { Language } from '../../types'

export const REPORT_ISSUES = ['wrong', 'translation', 'missing', 'bug', 'layout', 'suggestion'] as const
export type ReportIssue = typeof REPORT_ISSUES[number]

/** What a report is about. `script` is the script it was seen in, when there is one. */
export type ReportTarget =
  | { type: 'character'; id: string; script?: string }
  | { type: 'script'; slug: string }
  | { type: 'storyteller'; characterId?: string; seat?: number; script?: string }
  | { type: 'settings' }
  | { type: 'analytics' }
  | { type: 'print'; script?: string }
  | { type: 'page' }
export type ReportTargetType = ReportTarget['type']

/** The parts of each kind of target a report can point at. */
export const REPORT_PARTS = {
  character: ['name', 'ability', 'reminders', 'night', 'jinx', 'icon', 'almanac'],
  script: ['characters', 'night', 'info', 'sheet', 'export'],
  storyteller: ['night', 'seat', 'reminders', 'nomination', 'setup', 'log', 'timer'],
  settings: ['language', 'theme', 'fonts', 'sync', 'api', 'backup'],
  analytics: ['overview', 'scripts', 'players', 'characters', 'records', 'filter', 'share', 'record_form'],
  print: ['tokens', 'reminders', 'markers', 'layout', 'sheet', 'export'],
  page: [],
} as const satisfies Record<ReportTargetType, readonly string[]>
export type ReportPart = typeof REPORT_PARTS[ReportTargetType][number]

/** Recent errors in the app (src/lib/feedback/errors.ts). */
export type ReportError = { at: string; message: string; stack?: string }

export type FeedbackReport = {
  v: 1
  /** Short id to refer to the report in commits and issues. */
  id: string
  at: string
  target: ReportTarget
  /** The button that opened the report, e.g. "characters/detail", "storyteller/seat". */
  surface: string
  /** A readable name for the target, e.g. "洗衣妇 (washerwoman)". */
  label: string
  issues: ReportIssue[]
  parts: string[]
  comment?: string
  /** What the text should say. */
  expected?: string
  /** Text the user had selected when they opened the report. */
  selection?: string
  /** What the target showed: texts, revision, tokens, local edits. */
  snapshot?: Record<string, unknown>
  /** What else was on screen: the tab, the script, the game's day and phase. */
  context?: Record<string, unknown>
  app: { language: Language; build: string; path: string; viewport?: string; online?: boolean; standalone?: boolean }
  errors?: ReportError[]
}

export type ReportFields = Pick<FeedbackReport, 'target' | 'surface' | 'label' | 'issues' | 'parts' | 'comment' | 'expected' | 'selection' | 'snapshot' | 'context' | 'errors'> & { language: Language }

/** What a report button asks for: the target, and what it showed when that is not the default. */
export type ReportRequest = Pick<FeedbackReport, 'target' | 'surface' | 'label'> & {
  /** Issues and parts to preselect. */
  issues?: ReportIssue[]
  parts?: string[]
  snapshot?: Record<string, unknown>
}

const LIMITS = { comment: 2000, expected: 2000, selection: 600 }
const trimTo = (text: string | undefined, max: number) => text?.trim().slice(0, max) || undefined

/** A new report id, e.g. "fb-260925-k3x9q": readable in a sheet, unique enough for a few reports a day. */
export function newReportId(now = new Date()) {
  return `fb-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7)}`
}

function appInfo(language: Language): FeedbackReport['app'] {
  if (typeof window === 'undefined') return { language, build: BUILD_ID, path: '' }
  return {
    language,
    build: BUILD_ID,
    // The route and tab, never the query string: share links carry whole scripts and games.
    path: `${window.location.pathname}${window.location.hash.split('?')[0]}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    online: typeof navigator === 'undefined' ? undefined : navigator.onLine,
    standalone: window.matchMedia?.('(display-mode: standalone)').matches || undefined,
  }
}

/** A report from the dialog's fields; `stamp` keeps one id while the user edits it. */
export function feedbackReport({ language, ...fields }: ReportFields, stamp?: { id: string; at: string }): FeedbackReport {
  const now = new Date()
  return {
    v: 1,
    id: stamp?.id ?? newReportId(now),
    at: stamp?.at ?? now.toISOString(),
    ...fields,
    comment: trimTo(fields.comment, LIMITS.comment),
    expected: trimTo(fields.expected, LIMITS.expected),
    selection: trimTo(fields.selection, LIMITS.selection),
    errors: fields.errors?.length ? fields.errors : undefined,
    app: appInfo(language),
  }
}

// ── Text ─────────────────────────────────────────────────────────────────────

/** Marks the machine-readable part of the form answer. */
export const REPORT_JSON_MARKER = '--- botc-report-json ---'

const ISSUE_TEXT: Record<ReportIssue, string> = {
  wrong: 'wrong content', translation: 'translation', missing: 'missing content',
  bug: 'does not work', layout: 'display / layout', suggestion: 'suggestion',
}
const TARGET_TEXT: Record<ReportTargetType, string> = {
  character: 'Character', script: 'Script', storyteller: 'Storyteller',
  settings: 'Settings', analytics: 'Analytics', print: 'Print', page: 'Page',
}

/**
 * The form answer: a few readable lines for people reading the sheet, then
 * the whole report as JSON for scripts/feedback-reports.mjs. The readable part
 * is in English so every report reads the same whatever the app language;
 * the user's own words are kept as written.
 */
export function reportText(report: FeedbackReport): string {
  const lines = [
    `[BOTC report ${report.id}] ${TARGET_TEXT[report.target.type]}: ${report.label}${report.parts.length ? ` — ${report.parts.join(', ')}` : ''}`,
    report.issues.length ? `Issue: ${report.issues.map((i) => ISSUE_TEXT[i]).join(', ')}` : '',
    report.comment ? `Note: ${report.comment}` : '',
    report.expected ? `Should be: ${report.expected}` : '',
    report.selection ? `Selected text: “${report.selection}”` : '',
    `Where: ${report.surface} · ${report.app.language} · build ${report.app.build} · ${report.at}`,
  ]
  return `${lines.filter(Boolean).join('\n')}\n\n${REPORT_JSON_MARKER}\n${JSON.stringify(report)}`
}

/** Read a report back from a form answer; undefined for a free-text answer. */
export function parseReportText(text: string): FeedbackReport | undefined {
  const json = text.split(REPORT_JSON_MARKER)[1]
  if (!json) return undefined
  try {
    const report = JSON.parse(json) as FeedbackReport
    return report?.v === 1 && report.target ? report : undefined
  } catch {
    return undefined
  }
}

// ── Google Form ──────────────────────────────────────────────────────────────

export const REPORT_FORM = {
  id: '1FAIpQLSeeA3iYgwUQWWZSDDWvDj71j63T4cjAX8qzaCJi8VHu_kvUPA',
  /** "Detailed Description of the Bug or Feature Suggestion:" */
  description: 'entry.1270975439',
} as const
export const REPORT_FORM_URL = `https://docs.google.com/forms/d/e/${REPORT_FORM.id}/viewform`
// Google Sheets keeps at most 50,000 characters per cell.
const MAX_CHARS = 45_000
// A prefilled link must stay a URL Google accepts.
const MAX_URL = 7_500

/** The form text, with the snapshot and errors dropped when it would not fit a cell. */
function formText(report: FeedbackReport, max = MAX_CHARS): string {
  const full = reportText(report)
  if (full.length <= max) return full
  const slim = reportText({ ...report, snapshot: undefined, errors: undefined, context: undefined })
  return slim.slice(0, max)
}

async function submitToForm(report: FeedbackReport): Promise<boolean> {
  try {
    const body = new URLSearchParams({ [REPORT_FORM.description]: formText(report) })
    // The response is opaque (no-cors): a request that goes through counts as sent.
    await fetch(`https://docs.google.com/forms/d/e/${REPORT_FORM.id}/formResponse`, { method: 'POST', mode: 'no-cors', body, signal: AbortSignal.timeout(15_000) })
    return true
  } catch {
    return false
  }
}

/**
 * The form in a browser tab with the report filled in, for people who would
 * rather submit there. What the target showed is left out first when the
 * report does not fit a URL; the app can rebuild it from the target.
 */
export function prefilledReportUrl(report: FeedbackReport): { url: string; truncated: boolean } {
  const url = (text: string) => `${REPORT_FORM_URL}?usp=pp_url&${REPORT_FORM.description}=${encodeURIComponent(text)}`
  const attempts = [
    report,
    { ...report, snapshot: undefined, errors: undefined },
    { ...report, snapshot: undefined, errors: undefined, context: undefined },
  ]
  for (const attempt of attempts) {
    const link = url(reportText(attempt))
    if (link.length <= MAX_URL) return { url: link, truncated: attempt !== report }
  }
  // Only a very long note gets here: keep the readable part, cut to fit.
  const readable = reportText(attempts[2]).split(REPORT_JSON_MARKER)[0]
  let lo = 0, hi = readable.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (url(readable.slice(0, mid)).length <= MAX_URL) lo = mid
    else hi = mid - 1
  }
  return { url: url(readable.slice(0, lo)), truncated: true }
}

// ── Sending and the outbox ───────────────────────────────────────────────────

/** 'sent': submitted; 'queued': sent when online; 'local': no form in this build (copy only). */
export type ReportState = 'sent' | 'queued' | 'local'

const OUTBOX_KEY = 'botc-report-outbox'
const OUTBOX_MAX = 20

// VITE_FEEDBACK_FORM=off turns the form off (tests, self-hosted builds), as for AI feedback.
const formEnabled = () => ((import.meta.env.VITE_FEEDBACK_FORM as string | undefined) ?? '').trim().toLowerCase() !== 'off'
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

function readOutbox(): FeedbackReport[] {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as FeedbackReport[] } catch { return [] }
}
function writeOutbox(reports: FeedbackReport[]) {
  try {
    if (reports.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(reports.slice(-OUTBOX_MAX)))
    else localStorage.removeItem(OUTBOX_KEY)
  } catch { /* storage unavailable */ }
}
export const pendingReports = () => readOutbox().length

export async function sendReport(report: FeedbackReport): Promise<ReportState> {
  if (!formEnabled()) return 'local'
  if (!isOffline() && await submitToForm(report)) return 'sent'
  writeOutbox([...readOutbox(), report])
  return 'queued'
}

/** Send the reports that waited offline; returns how many are still waiting. */
export async function flushReports(): Promise<number> {
  if (!formEnabled() || isOffline()) return pendingReports()
  const left: FeedbackReport[] = []
  for (const report of readOutbox()) if (!(await submitToForm(report))) left.push(report)
  writeOutbox(left)
  return left.length
}
