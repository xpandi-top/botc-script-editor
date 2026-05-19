/**
 * Translation Memory — localStorage-backed EN↔ZH pairs.
 *
 * Auto-stored when user applies a translation fill.
 * Retrieved as few-shot examples when translating new text.
 */

const STORAGE_KEY = 'BOTC_TRANSLATION_MEMORY'
const MAX_ENTRIES  = 200

// ── Types ─────────────────────────────────────────────────────────────────────

export type TmEntry = {
  id: string
  en: string
  zh: string
  charId?: string       // source character ID if known
  field?: string        // 'abilityEn'|'nameEn' etc.
  addedAt: number
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function load(): TmEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as TmEntry[]
  } catch {
    return []
  }
}

function save(entries: TmEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Store a confirmed EN↔ZH pair.
 * Deduplicates by EN text (updates if exists).
 */
export function storePair(en: string, zh: string, meta?: { charId?: string; field?: string }): void {
  const enNorm = en.trim()
  const zhNorm = zh.trim()
  if (!enNorm || !zhNorm) return

  const entries = load()
  const existing = entries.findIndex((e) => e.en === enNorm)
  const entry: TmEntry = {
    id:      existing >= 0 ? entries[existing].id : crypto.randomUUID(),
    en:      enNorm,
    zh:      zhNorm,
    charId:  meta?.charId,
    field:   meta?.field,
    addedAt: Date.now(),
  }

  if (existing >= 0) {
    entries.splice(existing, 1, entry)
  } else {
    entries.push(entry)
    // Trim oldest if over max
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => b.addedAt - a.addedAt)
      entries.splice(MAX_ENTRIES)
    }
  }
  save(entries)
}

/**
 * Get all stored pairs, newest first.
 */
export function getAllPairs(): TmEntry[] {
  return load().sort((a, b) => b.addedAt - a.addedAt)
}

/**
 * Find n most relevant examples for translating `query` EN→ZH.
 * Simple heuristic: longest common word overlap.
 */
export function findSimilarPairs(query: string, n = 3): TmEntry[] {
  const qWords = new Set(query.toLowerCase().split(/\s+/).filter((w) => w.length > 2))
  const pairs = load()

  const scored = pairs.map((p) => {
    const pWords = p.en.toLowerCase().split(/\s+/)
    const overlap = pWords.filter((w) => qWords.has(w)).length
    const score   = overlap / Math.sqrt(pWords.length + 1)
    return { p, score }
  })

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(({ p }) => p)
}

/**
 * Format pairs as a translation prompt section.
 */
export function formatTmPrompt(pairs: TmEntry[]): string {
  if (pairs.length === 0) return ''
  const lines = pairs.map((p) => `  EN: "${p.en}"\n  ZH: "${p.zh}"`)
  return `Your confirmed translations (follow this style):\n${lines.join('\n\n')}`
}

/**
 * Clear all stored pairs.
 */
export function clearTranslationMemory(): void {
  localStorage.removeItem(STORAGE_KEY)
}
