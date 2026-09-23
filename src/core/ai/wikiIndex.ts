/**
 * TF-IDF search over the pre-built BotC wiki chunks (public/wiki-chunks.json).
 * Pure: the web app (src/lib/wikiSearch.ts) and the API worker load the
 * chunks their own way and share this index.
 */

export type WikiChunk = {
  id: string
  page: string
  url: string
  heading: string
  text: string
  wordCount: number
}

export type WikiFile = {
  version: number
  builtAt: string
  chunkCount: number
  chunks: WikiChunk[]
}

type IndexEntry = { chunk: WikiChunk; tokens: string[]; vec: Map<string, number> }

export type WikiIndex = {
  chunks: WikiChunk[]
  /** The `n` most relevant chunks for a query (EN or ZH), best first. */
  search(query: string, n?: number): WikiChunk[]
}

export function tokenize(text: string): string[] {
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

/** Validate a parsed wiki-chunks.json; null when it is not a supported file. */
export function parseWikiFile(data: unknown): WikiChunk[] | null {
  const file = data as Partial<WikiFile> | null
  if (!file || file.version !== 1 || !Array.isArray(file.chunks)) return null
  return file.chunks
}

export function createWikiIndex(chunks: WikiChunk[]): WikiIndex {
  const tokenized = chunks.map((c) => tokenize(`${c.heading} ${c.text}`))
  const idf = buildIdf(tokenized)
  const index: IndexEntry[] = chunks.map((chunk, i) => ({ chunk, tokens: tokenized[i], vec: tfidfVec(tokenized[i], idf) }))
  return {
    chunks,
    search(query, n = 3) {
      if (!index.length) return []
      const qVec = tfidfVec(tokenize(query), idf)
      return index
        .map((e) => ({ e, score: cosineSparse(qVec, e.vec) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, n)
        .map(({ e }) => e.chunk)
    },
  }
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
