/**
 * wikiSearch.ts
 *
 * TF-IDF search over pre-built BotC wiki chunks (public/wiki-chunks.json).
 * Loaded lazily once; returns relevant chunks to inject into AI system prompts.
 *
 * Falls back gracefully when wiki-chunks.json is unavailable.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type WikiChunk = {
  id:        string
  page:      string
  url:       string
  heading:   string
  text:      string
  wordCount: number
}

type WikiFile = {
  version:    number
  builtAt:    string
  chunkCount: number
  chunks:     WikiChunk[]
}

// ── State ─────────────────────────────────────────────────────────────────────

type IndexEntry = { chunk: WikiChunk; tokens: string[]; vec: Map<string, number> }

let _chunks:  WikiChunk[] | null = null
let _index:   IndexEntry[]      = []
let _initAttempted = false

// ── TF-IDF helpers ────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  // Split CJK characters individually; keep Latin alphanumeric words
  const cjkTokens = (text.match(/[一-鿿㐀-䶿]/g) ?? [])
  const latinTokens = text
    .toLowerCase()
    .replace(/[一-鿿㐀-䶿]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)
  return [...latinTokens, ...cjkTokens]
}

function buildIdf(docs: string[][]): Map<string, number> {
  const df = new Map<string, number>()
  for (const doc of docs) {
    for (const term of new Set(doc)) df.set(term, (df.get(term) ?? 0) + 1)
  }
  const N = docs.length
  const idf = new Map<string, number>()
  df.forEach((count, term) => idf.set(term, Math.log((N + 1) / (count + 1)) + 1))
  return idf
}

function tfidfVec(tokens: string[], idf: Map<string, number>): Map<string, number> {
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
  let dot = 0, na = 0, nb = 0
  a.forEach((v, k) => { dot += v * (b.get(k) ?? 0); na += v * v })
  b.forEach((v) => { nb += v * v })
  return (na === 0 || nb === 0) ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Load wiki-chunks.json and build TF-IDF index.
 * Call once at startup; safe to call multiple times.
 */
export async function initWikiSearch(): Promise<boolean> {
  if (_initAttempted) return _chunks !== null
  _initAttempted = true
  try {
    const res = await fetch('/wiki-chunks.json', { cache: 'force-cache' })
    if (!res.ok) return false
    const data = await res.json() as WikiFile
    if (data.version !== 1 || !Array.isArray(data.chunks)) return false
    _chunks = data.chunks

    const tokenized = _chunks.map((c) => tokenize(`${c.heading} ${c.text}`))
    const idf = buildIdf(tokenized)
    _index = _chunks.map((chunk, i) => ({
      chunk,
      tokens: tokenized[i],
      vec:    tfidfVec(tokenized[i], idf),
    }))

    console.debug(`[wikiSearch] Loaded ${_chunks.length} chunks from wiki-chunks.json`)
    return true
  } catch {
    return false
  }
}

export function isWikiLoaded(): boolean { return _chunks !== null }

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Find n most relevant wiki chunks for a query.
 */
export function searchWiki(query: string, n = 3): WikiChunk[] {
  if (!_index.length) return []
  const qTokens   = tokenize(query)
  const corpusIdf = buildIdf(_index.map((e) => e.tokens))
  const qVecFull  = tfidfVec(qTokens, corpusIdf)

  return _index
    .map((e) => ({ e, score: cosineSparse(qVecFull, e.vec) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(({ e }) => e.chunk)
}

/**
 * Format wiki chunks as a prompt section.
 * Truncates to ~600 words total to keep prompt size manageable.
 */
export function formatWikiPrompt(chunks: WikiChunk[], maxWords = 600): string {
  if (!chunks.length) return ''
  const sections: string[] = []
  let totalWords = 0

  for (const chunk of chunks) {
    const words = chunk.text.split(/\s+/).length
    if (totalWords + words > maxWords) {
      // Include truncated version
      const allowed = maxWords - totalWords
      if (allowed < 30) break
      const truncated = chunk.text.split(/\s+/).slice(0, allowed).join(' ') + '…'
      sections.push(`[${chunk.page} › ${chunk.heading}]\n${truncated}`)
      break
    }
    sections.push(`[${chunk.page} › ${chunk.heading}]\n${chunk.text}`)
    totalWords += words
  }

  return `BotC Rules Reference:\n${sections.join('\n\n')}`
}
