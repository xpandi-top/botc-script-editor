/**
 * Wiki page text → retrieval chunks, for scripts/build-wiki.mjs. Pure, so
 * src/__tests__/wikiChunk.test.ts can run it.
 *
 * Chunks follow the headings and are split at line ends when they grow past
 * MAX_CHUNK_SIZE. Size counts Latin words and Chinese characters (two
 * characters ≈ one word), so a Chinese page no longer ends up as one
 * 6,000-character chunk because it has few spaces. Table-of-contents
 * sections are dropped. Glossary pages (`perItem`) get one chunk per term,
 * headed by the term, so "X 是什么意思" retrieves the definition itself.
 */

export const MAX_CHUNK_SIZE = 350
export const MIN_CHUNK_SIZE = 30

const TOC = /^(contents|目录)$/i
const CJK = /[㐀-鿿]/g

/** Latin words plus half the CJK characters. */
export function chunkSize(text) {
  const cjk = (text.match(CJK) ?? []).length
  const words = text.replace(CJK, ' ').split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length
  return words + Math.ceil(cjk / 2)
}

/** "• 醉酒 ： 醉酒的玩家…" / "Drunk: A drunk player…" → the term, else null. */
function itemTerm(line) {
  return line.match(/^\s*(?:[•*]\s*)?([^：:。.\n]{1,32}?)\s*[：:]\s*\S/)?.[1]?.trim() ?? null
}

export function chunkText(text, pageKey, pageUrl, { perItem = false } = {}) {
  const chunks = []
  // Open headings by level (#, ##, ###): a heading's parents are the higher levels only.
  let headings = []
  let buffer = []
  let term = null
  let skipping = false

  function flush(force = false) {
    const body = buffer.join('\n').trim()
    buffer = []
    const itemTermHeading = term
    term = null
    if (!body) return
    const size = chunkSize(body)
    if (size < MIN_CHUNK_SIZE && !force) return
    const chain = [...headings, itemTermHeading].filter((h) => h && !TOC.test(h)).join(' › ')
    chunks.push({ id: `${pageKey}-${chunks.length}`, page: pageKey, url: pageUrl, heading: chain || '(intro)', text: body, wordCount: size })
  }

  for (const line of text.split('\n')) {
    const match = line.match(/^(#{1,3}) (.+)/)
    if (match) {
      flush(perItem)
      const level = match[1].length
      const title = match[2].trim()
      skipping = TOC.test(title)
      headings = [...headings.slice(0, level - 1), title]
      continue
    }
    if (skipping) continue
    if (perItem) {
      const found = itemTerm(line)
      if (found) { flush(true); term = found }
    }
    buffer.push(line)
    if (chunkSize(buffer.join('\n')) > MAX_CHUNK_SIZE) flush(perItem)
  }
  flush(perItem)
  return chunks
}
