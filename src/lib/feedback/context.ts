/**
 * What is on screen, for problem reports (src/lib/feedback/report.ts): parts
 * of the app register a small summary under their own key — the tab, the
 * open script, the game's day and phase — and every report carries all of
 * them. Ids and counts only: no player names or notes.
 */
const contexts = new Map<string, Record<string, unknown>>()

export function setReportContext(key: string, value: Record<string, unknown> | undefined) {
  if (value) contexts.set(key, value)
  else contexts.delete(key)
}

export function reportContext(): Record<string, unknown> | undefined {
  return contexts.size ? Object.fromEntries(contexts) : undefined
}
