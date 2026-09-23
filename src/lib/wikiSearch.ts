/**
 * wikiSearch.ts
 *
 * TF-IDF search over pre-built BotC wiki chunks (public/wiki-chunks.json).
 * Loaded lazily once; returns relevant chunks to inject into AI system prompts.
 * The index itself lives in src/core/ai/wikiIndex.ts (shared with the API).
 *
 * Falls back gracefully when wiki-chunks.json is unavailable.
 */

import { createWikiIndex, parseWikiFile, type WikiChunk, type WikiIndex } from '../core/ai/wikiIndex'

export type { WikiChunk } from '../core/ai/wikiIndex'
export { formatWikiPrompt } from '../core/ai/wikiIndex'

// ── State ─────────────────────────────────────────────────────────────────────

let _index: WikiIndex | null = null
let _initAttempted = false

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Load wiki-chunks.json and build TF-IDF index.
 * Call once at startup; safe to call multiple times.
 */
export async function initWikiSearch(): Promise<boolean> {
  if (_initAttempted) return _index !== null
  _initAttempted = true
  try {
    // Relative to the deployed base path (e.g. /botc-script-editor/), not the domain root.
    const res = await fetch(`${import.meta.env.BASE_URL}wiki-chunks.json`, { cache: 'force-cache' })
    if (!res.ok) return false
    const chunks = parseWikiFile(await res.json())
    if (!chunks) return false
    _index = createWikiIndex(chunks)
    console.debug(`[wikiSearch] Loaded ${chunks.length} chunks from wiki-chunks.json`)
    return true
  } catch {
    return false
  }
}

export function isWikiLoaded(): boolean { return _index !== null }

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Find n most relevant wiki chunks for a query.
 */
export function searchWiki(query: string, n = 3): WikiChunk[] {
  return _index ? _index.search(query, n) : []
}
