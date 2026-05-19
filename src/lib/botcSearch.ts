/**
 * BOTC catalog search — in-browser retrieval, no external API.
 *
 * Provides:
 *   getTeamExamples()     — chars from same team (for ability generation few-shot)
 *   getTranslationPairs() — chars with both EN + ZH ability (for translation few-shot)
 *   findSimilarByTFIDF()  — keyword-based similarity across full corpus
 */

import {
  allCharacterFiles, getDisplayName, getAbilityText,
} from '../catalog'
import type { Team } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CharExample = {
  id: string
  nameEn: string
  nameZh?: string
  team: Team
  abilityEn: string
  abilityZh?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

/** Build IDF map over the full corpus of ability texts. */
function buildIdf(docs: string[][]): Map<string, number> {
  const df = new Map<string, number>()
  for (const doc of docs) {
    for (const term of new Set(doc)) {
      df.set(term, (df.get(term) ?? 0) + 1)
    }
  }
  const N = docs.length
  const idf = new Map<string, number>()
  df.forEach((count, term) => {
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1)
  })
  return idf
}

/** TF-IDF vector (sparse, as Map). */
function tfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  const vec = new Map<string, number>()
  tf.forEach((count, term) => {
    const w = (count / tokens.length) * (idf.get(term) ?? 1)
    if (w > 0) vec.set(term, w)
  })
  return vec
}

function cosineSparse(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0
  a.forEach((v, k) => { dot += v * (b.get(k) ?? 0); normA += v * v })
  b.forEach((v) => { normB += v * v })
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// ── Index (built once lazily) ─────────────────────────────────────────────────

type CharIndex = {
  entries: CharExample[]
  tokenized: string[][]
  idf: Map<string, number>
  vectors: Map<string, number>[]
}

let _index: CharIndex | null = null

function getIndex(): CharIndex {
  if (_index) return _index

  const entries: CharExample[] = allCharacterFiles
    .filter((c) => c?.id && c?.team)
    .map((c) => {
      const abilityEn = getAbilityText(c.id, 'en') ?? ''
      const abilityZh = getAbilityText(c.id, 'zh') || undefined
      const nameZh = getDisplayName(c.id, 'zh') !== getDisplayName(c.id, 'en')
        ? getDisplayName(c.id, 'zh')
        : undefined
      return {
        id: c.id,
        nameEn: getDisplayName(c.id, 'en'),
        nameZh,
        team: c.team as Team,
        abilityEn,
        abilityZh,
      }
    })
    .filter((e) => e.abilityEn && e.abilityEn !== 'No ability text available.')

  const tokenized = entries.map((e) => tokenize(e.abilityEn))
  const idf = buildIdf(tokenized)
  const vectors = tokenized.map((tok) => tfidfVector(tok, idf))

  _index = { entries, tokenized, idf, vectors }
  return _index
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get n example chars from the same team.
 * Excludes chars in `excludeIds` (e.g., the char being edited).
 */
export function getTeamExamples(
  team: Team,
  n = 3,
  excludeIds: string[] = [],
): CharExample[] {
  const { entries } = getIndex()
  const pool = entries.filter((e) => e.team === team && !excludeIds.includes(e.id))
  // Shuffle deterministically (stable but varied)
  const shuffled = pool.slice().sort(() => 0.5 - Math.sin(pool.length))
  return shuffled.slice(0, n)
}

/**
 * Find n chars most similar to `query` text by TF-IDF cosine.
 */
export function findSimilarByTFIDF(
  query: string,
  n = 4,
  opts?: { team?: Team; excludeIds?: string[] },
): CharExample[] {
  const { entries, idf, vectors } = getIndex()
  const queryVec = tfidfVector(tokenize(query), idf)

  const scored = entries
    .map((e, i) => ({ e, score: cosineSparse(queryVec, vectors[i]) }))
    .filter(({ e }) =>
      (!opts?.team || e.team === opts.team) &&
      !opts?.excludeIds?.includes(e.id),
    )
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, n).map(({ e }) => e)
}

/**
 * Get n chars that have both EN and ZH ability text — for translation few-shot.
 */
export function getTranslationPairs(
  n = 4,
  opts?: { team?: Team; excludeIds?: string[] },
): CharExample[] {
  const { entries } = getIndex()
  const pool = entries.filter((e) =>
    e.abilityZh &&
    e.abilityZh !== 'No ability text available.' &&
    (!opts?.team || e.team === opts.team) &&
    !opts?.excludeIds?.includes(e.id),
  )
  // Take a spread: pick from start, middle, end for diversity
  if (pool.length <= n) return pool
  const step = Math.floor(pool.length / n)
  return Array.from({ length: n }, (_, i) => pool[i * step])
}

/**
 * Serialise examples as a prompt section.
 */
export function formatExamplesPrompt(
  examples: CharExample[],
  mode: 'ability' | 'translation',
): string {
  if (examples.length === 0) return ''

  if (mode === 'ability') {
    const lines = examples.map((e) =>
      `  [${e.team}] ${e.nameEn}: "${e.abilityEn}"`,
    )
    return `Style reference — real BotC abilities from the same team:\n${lines.join('\n')}`
  }

  // translation mode
  const lines = examples
    .filter((e) => e.abilityZh)
    .map((e) =>
      `  EN: "${e.abilityEn}"\n  ZH: "${e.abilityZh}"`,
    )
  return `Translation examples (follow this style exactly):\n${lines.join('\n\n')}`
}
