/**
 * botcVectorSearch.ts
 *
 * Semantic similarity search over the catalog through the BOTC Companion API
 * (GET /v1/characters/similar). The server keeps the character vectors
 * (Workers AI bge-m3, refreshed when the catalog changes) and embeds the
 * query with the same model, so document and query vectors always match.
 * Falls back to TF-IDF (botcSearch.ts) offline, without an API, or on errors.
 *
 * Usage:
 *   findSimilar(query, n, opts)      // always works (auto-falls back)
 */

import { findSimilarByTFIDF, getTeamExamples, type CharExample } from './botcSearch'
import { getApiUrl, isApiConfigured } from './apiUrl'
import { getAbilityText, getCharacterById, getDisplayName } from '../catalog'
import type { Team } from '../types'

export type VectorSearchOpts = {
  team?: Team
  excludeIds?: string[]
  /** False keeps the search on this device (e.g. with the local WebLLM runtime). */
  allowRemote?: boolean
}

async function similarIds(query: string, n: number, opts: VectorSearchOpts): Promise<string[] | null> {
  const params = new URLSearchParams({ q: query.slice(0, 1000), limit: String(n) })
  if (opts.team) params.set('team', opts.team)
  if (opts.excludeIds?.length) params.set('exclude', opts.excludeIds.join(','))
  try {
    const res = await fetch(`${getApiUrl()}/v1/characters/similar?${params}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const body = await res.json() as { items?: Array<{ id?: unknown }> }
    return (body.items ?? []).map((item) => item.id).filter((id): id is string => typeof id === 'string')
  } catch {
    return null
  }
}

/**
 * Find n chars most similar to `query` (any language): semantic search on the
 * server when allowed and available, else TF-IDF.
 */
export async function findSimilar(
  query: string,
  n = 4,
  opts: VectorSearchOpts = {},
): Promise<CharExample[]> {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (opts.allowRemote !== false && !offline && isApiConfigured() && query.trim()) {
    const ids = await similarIds(query, n, opts)
    if (ids?.length) {
      const found = ids.flatMap((id): CharExample[] => {
        const c = getCharacterById(id)
        if (!c?.team) return []
        const nameEn = getDisplayName(id, 'en')
        const nameZh = getDisplayName(id, 'zh')
        return [{
          id,
          nameEn,
          nameZh: nameZh !== nameEn ? nameZh : undefined,
          team: c.team as Team,
          abilityEn: getAbilityText(id, 'en') ?? '',
          abilityZh: getAbilityText(id, 'zh') || undefined,
        }]
      })
      if (found.length) return found
    }
  }
  return findSimilarByTFIDF(query, n, opts)
}

// Re-export convenience helpers
export { getTeamExamples }
