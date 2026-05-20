/**
 * build-wiki.mjs
 *
 * Scrape key BotC wiki pages, chunk by heading, write public/wiki-chunks.json.
 * Run whenever wiki content changes. Outputs are used for RAG in the AI agent.
 *
 * Usage:
 *   node scripts/build-wiki.mjs
 *
 * Output: public/wiki-chunks.json
 *   { version, builtAt, chunks: [{ id, page, url, heading, text, wordCount }] }
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT  = path.join(ROOT, 'public', 'wiki-chunks.json')

const WIKI_PAGES = [
  { key: 'setup',       url: 'https://wiki.bloodontheclocktower.com/Setup',       label: 'Setup Rules' },
  { key: 'how-to-run',  url: 'https://wiki.bloodontheclocktower.com/How_to_Run',  label: 'How to Run' },
  { key: 'glossary',    url: 'https://wiki.bloodontheclocktower.com/Glossary',     label: 'Glossary' },
]

const MAX_CHUNK_WORDS  = 350
const MIN_CHUNK_WORDS  = 30

// ── HTML → text ───────────────────────────────────────────────────────────────

/** Minimal HTML → plain text (no external deps). */
function htmlToText(html) {
  return html
    // Remove scripts/styles
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    // Headings → newline + text
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
      const text = stripTags(inner).trim()
      return `\n${'#'.repeat(Number(level))} ${text}\n`
    })
    // List items → bullet
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `• ${stripTags(inner).trim()}\n`)
    // Paragraphs / divs / table cells → newline
    .replace(/<\/(p|div|td|th|tr|blockquote)>/gi, '\n')
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// ── Extract main content from MediaWiki HTML ──────────────────────────────────

function extractMainContent(html) {
  // Try to extract #mw-content-text or #content
  const match = html.match(/<div[^>]+id="mw-content-text"[^>]*>([\s\S]*?)<div[^>]+class="[^"]*printfooter/i)
    ?? html.match(/<div[^>]+id="bodyContent"[^>]*>([\s\S]*?)<\/div>/i)
    ?? html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  return match ? match[1] : html
}

// ── Chunk by heading ──────────────────────────────────────────────────────────

function chunkText(text, pageKey, pageUrl) {
  const chunks = []
  const lines  = text.split('\n')

  let currentHeading  = ''
  let currentParents  = []   // heading stack for context
  let buffer          = []
  let chunkIndex      = 0

  function flush() {
    const body = buffer.join('\n').trim()
    const wordCount = body.split(/\s+/).filter(Boolean).length
    if (wordCount >= MIN_CHUNK_WORDS) {
      const headingChain = [...currentParents, currentHeading].filter(Boolean).join(' › ')
      chunks.push({
        id:        `${pageKey}-${chunkIndex++}`,
        page:      pageKey,
        url:       pageUrl,
        heading:   headingChain || '(intro)',
        text:      body,
        wordCount,
      })
    }
    buffer = []
  }

  for (const line of lines) {
    const h1 = line.match(/^# (.+)/)
    const h2 = line.match(/^## (.+)/)
    const h3 = line.match(/^### (.+)/)

    if (h1) {
      flush()
      currentParents = []
      currentHeading = h1[1]
    } else if (h2) {
      flush()
      currentParents = [currentHeading].filter(Boolean)
      currentHeading = h2[1]
    } else if (h3) {
      // Split within chunk if getting long
      const words = buffer.join('\n').split(/\s+/).filter(Boolean).length
      if (words > MAX_CHUNK_WORDS) flush()
      currentParents = [currentHeading].filter(Boolean)
      currentHeading = h3[1]
    } else {
      buffer.push(line)
      // Auto-split very long chunks
      const words = buffer.join('\n').split(/\s+/).filter(Boolean).length
      if (words > MAX_CHUNK_WORDS) flush()
    }
  }
  flush()
  return chunks
}

// ── Fetch + process one page ──────────────────────────────────────────────────

async function processPage({ key, url, label }) {
  console.log(`  Fetching ${url} …`)
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BotCCompanionBot/1.0 (build-wiki.mjs; non-commercial)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const html    = await res.text()
  const content = extractMainContent(html)
  const text    = htmlToText(content)
  const chunks  = chunkText(text, key, url)
  console.log(`    → ${chunks.length} chunks, ${chunks.reduce((s, c) => s + c.wordCount, 0)} words total`)
  return chunks
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('Building wiki chunks…')
const allChunks = []

for (const page of WIKI_PAGES) {
  try {
    const chunks = await processPage(page)
    allChunks.push(...chunks)
  } catch (err) {
    console.error(`  ✗ Failed to process ${page.key}: ${err.message}`)
  }
}

const output = {
  version:    1,
  builtAt:    new Date().toISOString(),
  pageCount:  WIKI_PAGES.length,
  chunkCount: allChunks.length,
  chunks:     allChunks,
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(output))

const kb = (JSON.stringify(output).length / 1024).toFixed(1)
console.log(`\nDone. ${allChunks.length} chunks across ${WIKI_PAGES.length} pages → ${OUT} (${kb} KB)`)
