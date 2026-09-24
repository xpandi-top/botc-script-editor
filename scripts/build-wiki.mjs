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
import { chunkText } from './wiki-chunk.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT  = path.join(ROOT, 'public', 'wiki-chunks.json')

const ZH_BASE = 'https://clocktower-wiki.gstonegames.com/index.php?title='

const ZH_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const BOT_UA = 'BotCCompanionBot/1.0 (build-wiki.mjs; non-commercial)'

const WIKI_PAGES = [
  // ── English wiki ─────────────────────────────────────────────────────────────
  { key: 'setup',        url: 'https://wiki.bloodontheclocktower.com/Setup',               label: 'Setup Rules' },
  { key: 'rules',        url: 'https://wiki.bloodontheclocktower.com/Rules_Explanation',   label: 'Rules Explanation' },
  { key: 'glossary',     url: 'https://wiki.bloodontheclocktower.com/Glossary',            label: 'Glossary', perItem: true },
  { key: 'st-advice',    url: 'https://wiki.bloodontheclocktower.com/Storyteller_Advice',  label: 'Storyteller Advice' },
  { key: 'states',       url: 'https://wiki.bloodontheclocktower.com/States',              label: 'States' },
  { key: 'abilities',    url: 'https://wiki.bloodontheclocktower.com/Abilities',           label: 'Abilities' },
  // ── Chinese wiki (gstonegames) — requires browser UA ─────────────────────────
  { key: 'zh-rules',     url: ZH_BASE + encodeURIComponent('规则概要'),            label: '规则概要', ua: ZH_UA },
  { key: 'zh-details',   url: ZH_BASE + encodeURIComponent('重要细节'),            label: '重要细节', ua: ZH_UA },
  { key: 'zh-glossary',  url: ZH_BASE + encodeURIComponent('术语汇总'),            label: '术语汇总', ua: ZH_UA, perItem: true },
  { key: 'zh-st-tips',   url: ZH_BASE + encodeURIComponent('给说书人的建议'),      label: '给说书人的建议', ua: ZH_UA },
  { key: 'zh-jinx',      url: ZH_BASE + encodeURIComponent('相克规则'),            label: '相克规则', ua: ZH_UA },
]

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

// ── Fetch + process one page ──────────────────────────────────────────────────

async function processPage({ key, url, label, ua, perItem }) {
  console.log(`  Fetching [${label}] …`)
  const res = await fetch(url, {
    headers: { 'User-Agent': ua ?? BOT_UA },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const html    = await res.text()
  const content = extractMainContent(html)
  const text    = htmlToText(content)
  const chunks  = chunkText(text, key, url, { perItem })
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
