/**
 * botcVectorSearch.ts
 *
 * Semantic similarity search using pre-computed Gemini embeddings.
 * Falls back to TF-IDF (botcSearch.ts) when embeddings unavailable.
 *
 * Usage:
 *   findSimilar(query, n, opts)      // always works (auto-falls back)
 *
 * The vectors (public/embeddings.json, ~2 MB, from scripts/build-embeddings.mjs)
 * are fetched on the first semantic search, not at startup.
 */

import { findSimilarByTFIDF, getTeamExamples, type CharExample } from './botcSearch'
import type { Team } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────

type EmbeddingEntry = { id: string; vector: number[] }

type EmbeddingFile = {
  version:     number
  model:       string
  dimensions?: number
  taskType?:   string
  entries:     EmbeddingEntry[]
}

/** How the document vectors were made; queries must be embedded the same way. */
type EmbeddingSpec = { model: string; dimensions?: number; taskType: string }

// ── State ─────────────────────────────────────────────────────────────────────

let _vectorMap: Map<string, number[]> | null = null
let _spec: EmbeddingSpec | null = null
let _init: Promise<boolean> | null = null

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Attempt to load pre-computed embeddings from public/embeddings.json (served
 * under the app's base path), when the build included one.
 * Safe to call multiple times (and concurrently) — the first load is shared.
 * Does NOT throw — falls back to TF-IDF silently.
 */
export function initVectorIndex(): Promise<boolean> {
  _init ??= loadVectorIndex()
  return _init
}

async function loadVectorIndex(): Promise<boolean> {
  // Not generated for this build: skip the request (it would only 404).
  if (!__BOTC_HAS_EMBEDDINGS__) return false

  try {
    const res = await fetch(`${import.meta.env.BASE_URL}embeddings.json`, { cache: 'force-cache' })
    if (!res.ok) return false
    const data = (await res.json()) as EmbeddingFile
    if (data.version !== 1 || !Array.isArray(data.entries)) return false

    _vectorMap = new Map(data.entries.map((e) => [e.id, e.vector]))
    _spec = { model: data.model, dimensions: data.dimensions, taskType: data.taskType ?? 'SEMANTIC_SIMILARITY' }
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

async function embedQuery(text: string, apiKey: string, spec: EmbeddingSpec): Promise<number[] | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/${spec.model}:embedContent`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
      body: JSON.stringify({
        model: spec.model,
        content: { parts: [{ text }] },
        taskType: spec.taskType,
        ...(spec.dimensions ? { outputDimensionality: spec.dimensions } : {}),
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
 * 1. If a Gemini key is provided and the vectors load (first call fetches
 *    them) → embed the query live with the same model + cosine
 * 2. No key, no vectors or the embed call fails → TF-IDF (always works, no API needed)
 */
export async function findSimilar(
  query: string,
  n = 4,
  opts?: VectorSearchOpts,
): Promise<CharExample[]> {
  // Try semantic search if vectors load + API key available
  if (opts?.geminiApiKey && (await initVectorIndex()) && _vectorMap && _spec) {
    const queryVec = await embedQuery(query, opts.geminiApiKey, _spec)
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
