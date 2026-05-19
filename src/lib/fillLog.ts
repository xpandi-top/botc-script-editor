/**
 * Fill log — records every AI-suggested field change.
 * Stored in localStorage BOTC_AI_FILL_LOG, capped at 500 entries.
 */

const LS_KEY = 'BOTC_AI_FILL_LOG'
const MAX_ENTRIES = 500

export type FillLogEntry = {
  id: string
  timestamp: number
  form: string          // e.g. 'character:wude'
  field: string
  fieldLabel: string
  oldValue: unknown
  newValue: unknown
  source: 'ai' | 'user'
  model: string
  undone?: boolean
}

export function loadFillLog(): FillLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as FillLogEntry[]
  } catch {
    return []
  }
}

function saveFillLog(log: FillLogEntry[]): void {
  const trimmed = log.slice(-MAX_ENTRIES)
  localStorage.setItem(LS_KEY, JSON.stringify(trimmed))
}

export function appendFillLog(entry: Omit<FillLogEntry, 'id'>): FillLogEntry {
  const full: FillLogEntry = { ...entry, id: crypto.randomUUID() }
  const log = loadFillLog()
  log.push(full)
  saveFillLog(log)
  return full
}

export function markUndone(id: string): void {
  const log = loadFillLog()
  const idx = log.findIndex((e) => e.id === id)
  if (idx !== -1) { log[idx].undone = true; saveFillLog(log) }
}

export function clearFillLog(): void {
  localStorage.removeItem(LS_KEY)
}

/** Entries for a specific form key, newest first. */
export function getFillLogForForm(formKey: string): FillLogEntry[] {
  return loadFillLog()
    .filter((e) => e.form === formKey)
    .reverse()
}

/** Export log as markdown string. */
export function exportFillLogMd(entries: FillLogEntry[]): string {
  if (entries.length === 0) return '# AI Fill Log\n\n(empty)'
  const grouped: Record<string, FillLogEntry[]> = {}
  for (const e of entries) {
    grouped[e.form] = grouped[e.form] ?? []
    grouped[e.form].push(e)
  }
  const lines: string[] = ['# AI Fill Log\n']
  for (const [form, list] of Object.entries(grouped)) {
    lines.push(`## ${form}\n`)
    for (const e of list) {
      const ts = new Date(e.timestamp).toLocaleString()
      const undone = e.undone ? ' ~~(undone)~~' : ''
      lines.push(`- **${e.fieldLabel}** at ${ts}${undone}`)
      lines.push(`  - Before: \`${String(e.oldValue) || '(empty)'}\``)
      lines.push(`  - After:  \`${String(e.newValue)}\``)
      lines.push(`  - Model: ${e.model}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}
