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
import { expandTermAliases } from '../core/ai/glossary'

export type { WikiChunk } from '../core/ai/wikiIndex'
export { formatWikiPrompt } from '../core/ai/wikiIndex'

// ── State ─────────────────────────────────────────────────────────────────────

let _index: WikiIndex | null = null
let _init: Promise<boolean> | null = null

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Load wiki-chunks.json and build TF-IDF index.
 * Call once at startup; safe to call multiple times. A failed load (offline
 * before the file was ever cached) is retried on the next call.
 */
export function initWikiSearch(): Promise<boolean> {
  _init ??= loadWikiIndex().then((loaded) => {
    if (!loaded) _init = null
    return loaded
  })
  return _init
}

async function loadWikiIndex(): Promise<boolean> {
  try {
    // Relative to the deployed base path (e.g. /botc-script-editor/), not the domain root.
    const res = await fetch(`${import.meta.env.BASE_URL}wiki-chunks.json`, { cache: 'force-cache', signal: AbortSignal.timeout(5000) })
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

// "X 是什么意思": the glossary pages hold one short chunk per term, which
// outrank longer advice on shared words, so they answer definition questions only.
const ASKS_DEFINITION = /什么意思|啥意思|是什么|什么是|指什么|是指|含义|定义|what does .{1,30} mean|what is|meaning|definition|define/i

/**
 * Find n most relevant wiki chunks for a query ("鬼票" also searches the
 * rules' own words, see expandTermAliases).
 */
export function searchWiki(query: string, n = 3): WikiChunk[] {
  if (!_index) return []
  const definitions = ASKS_DEFINITION.test(query)
  return _index.search(expandTermAliases(query), n + 40)
    .filter((chunk) => definitions || !chunk.page.endsWith('glossary'))
    .slice(0, n)
}
