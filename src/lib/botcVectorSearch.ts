/**
 * botcVectorSearch.ts
 *
 * Semantic similarity search using pre-computed Gemini embeddings.
 * Falls back to TF-IDF (botcSearch.ts) when embeddings unavailable.
 *
 * Usage:
 *   await initVectorIndex()          // call once at startup (optional)
 *   findSimilar(query, n, opts)      // always works (auto-falls back)
 */

import { findSimilarByTFIDF, getTeamExamples, type CharExample } from './botcSearch'
import type { Team } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────

type EmbeddingEntry = { id: string; vector: number[] }

type EmbeddingFile = {
  version: number
  model:   string
  entries: EmbeddingEntry[]
}

// ── State ─────────────────────────────────────────────────────────────────────

let _vectorMap: Map<string, number[]> | null = null
let _initAttempted = false

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Attempt to load pre-computed embeddings from /public/embeddings.json.
 * Safe to call multiple times — cached after first load.
 * Does NOT throw — falls back to TF-IDF silently.
 */
export async function initVectorIndex(): Promise<boolean> {
  if (_initAttempted) return _vectorMap !== null
  _initAttempted = true

  try {
    const res = await fetch('/embeddings.json', { cache: 'force-cache' })
    if (!res.ok) return false
    const data = (await res.json()) as EmbeddingFile
    if (data.version !== 1 || !Array.isArray(data.entries)) return false

    _vectorMap = new Map(data.entries.map((e) => [e.id, e.vector]))
    console.debug(`[botcVectorSearch] Loaded ${_vectorMap.size} vectors (${data.model})`)
    return true
  } catch {
    return false
  }
}

// ── Math ──────────────────────────────────────────────────────────────────────

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na  += a[i] * a[i]
    nb  += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// ── Gemini embed (runtime query) ──────────────────────────────────────────────

async function embedQuery(text: string, apiKey: string): Promise<number[] | null> {
  const model = 'models/text-embedding-004'
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${apiKey}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        content: { parts: [{ text }] },
        taskType: 'SEMANTIC_SIMILARITY',
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.embedding?.values ?? null
  } catch {
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type VectorSearchOpts = {
  team?: Team
  excludeIds?: string[]
  geminiApiKey?: string   // if provided, embed query live for better results
}

/**
 * Find n chars most similar to `query`.
 *
 * Strategy:
 * 1. If vectorMap loaded + apiKey provided → embed query live + cosine
 * 2. If vectorMap loaded, no key → use pre-computed vectors with TF-IDF query vec approximation (not available)
 *    → fall through to TF-IDF
 * 3. Fallback: TF-IDF (always works, no API needed)
 */
export async function findSimilar(
  query: string,
  n = 4,
  opts?: VectorSearchOpts,
): Promise<CharExample[]> {
  // Try semantic search if vectors loaded + API key available
  if (_vectorMap && opts?.geminiApiKey) {
    const queryVec = await embedQuery(query, opts.geminiApiKey)
    if (queryVec) {
      // Import entries from botcSearch to get CharExample objects
      const { allCharacterFiles, getDisplayName, getAbilityText } = await import('../catalog')
      const entries: CharExample[] = allCharacterFiles
        .filter((c) => c?.id && c?.team)
        .map((c) => ({
          id:        c.id,
          nameEn:    getDisplayName(c.id, 'en'),
          nameZh:    getDisplayName(c.id, 'zh') !== getDisplayName(c.id, 'en') ? getDisplayName(c.id, 'zh') : undefined,
          team:      c.team as Team,
          abilityEn: getAbilityText(c.id, 'en') ?? '',
          abilityZh: getAbilityText(c.id, 'zh') || undefined,
        }))
        .filter((e) => e.abilityEn && e.abilityEn !== 'No ability text available.')

      const scored = entries
        .filter((e) =>
          (!opts.team || e.team === opts.team) &&
          !opts.excludeIds?.includes(e.id),
        )
        .map((e) => {
          const vec = _vectorMap!.get(e.id)
          return { e, score: vec ? cosine(queryVec, vec) : 0 }
        })
        .sort((a, b) => b.score - a.score)

      return scored.slice(0, n).map(({ e }) => e)
    }
  }

  // Fallback: TF-IDF
  return findSimilarByTFIDF(query, n, opts)
}

/**
 * Returns true if vector index is loaded.
 */
export function isVectorIndexLoaded(): boolean {
  return _vectorMap !== null
}

// Re-export convenience helpers
export { getTeamExamples }
