/**
 * The last few errors in this session, for problem reports
 * (src/lib/feedback/report.ts): uncaught errors, rejected promises and
 * crashes caught by ErrorBoundary. Kept in memory only.
 */
import type { ReportError } from './report'

const MAX_ERRORS = 5
const recent: ReportError[] = []

export function recordError(error: unknown, where?: string) {
  const err = error instanceof Error ? error : undefined
  const message = `${where ? `[${where}] ` : ''}${err?.message ?? String(error)}`.slice(0, 300)
  // The first frames are enough to find the component; the rest is React internals.
  const stack = err?.stack?.split('\n').slice(1, 5).map((line) => line.trim()).join('\n').slice(0, 600) || undefined
  // A render loop repeats one error: keep one copy, with the latest time.
  const same = recent.findIndex((e) => e.message === message)
  if (same !== -1) recent.splice(same, 1)
  recent.push({ at: new Date().toISOString(), message, stack })
  if (recent.length > MAX_ERRORS) recent.shift()
}

export const recentErrors = (): ReportError[] => recent.slice()

let installed = false
/** Listen for uncaught errors and rejected promises; once, at startup. */
export function captureErrors() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('error', (event) => recordError(event.error ?? event.message))
  window.addEventListener('unhandledrejection', (event) => recordError(event.reason, 'promise'))
}
