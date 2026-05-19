/**
 * build-embeddings.mjs
 *
 * Pre-compute Gemini text embeddings for all BotC characters and write them
 * to public/embeddings.json. Run once (or when catalog changes).
 *
 * Usage:
 *   VITE_GEMINI_API_KEY=<key> node scripts/build-embeddings.mjs
 *
 * Output: public/embeddings.json
 *   { version: 1, model: "...", entries: [{ id, vector: number[] }] }
 *
 * The app can then load this JSON and use cosine similarity for semantic
 * search (botcVectorSearch.ts), falling back to TF-IDF (botcSearch.ts)
 * when the JSON is unavailable.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.resolve(__dirname, '..')

// ── Config ────────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
const EMBED_MODEL    = 'models/text-embedding-004'
const BATCH_SIZE     = 10          // embed N texts per request
const RATE_DELAY_MS  = 300         // ms between batches
const OUT_PATH       = path.join(ROOT, 'public', 'embeddings.json')

if (!GEMINI_API_KEY) {
  console.error('Error: VITE_GEMINI_API_KEY or GEMINI_API_KEY env var required')
  process.exit(1)
}

// ── Load catalog ──────────────────────────────────────────────────────────────

const charDir = path.join(ROOT, 'assets', 'characters')
if (!fs.existsSync(charDir)) {
  console.error('Character assets not found at', charDir)
  process.exit(1)
}

// Load EN locale for ability texts
const enLocale = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'assets', 'locales', 'en.json'), 'utf-8'),
)

// Load character JSON files
const charFiles = fs.readdirSync(charDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    try { return JSON.parse(fs.readFileSync(path.join(charDir, f), 'utf-8')) }
    catch { return null }
  })
  .filter(Boolean)

// Build (id, text) pairs — ability text is the embedding content
const docs = charFiles
  .filter((c) => c?.id && c?.team)
  .map((c) => {
    const ability = enLocale?.abilities?.[c.id] ?? enLocale?.[c.id]?.ability ?? ''
    const name    = enLocale?.names?.[c.id]     ?? enLocale?.[c.id]?.name    ?? c.id
    return { id: c.id, team: c.team, text: `${name}: ${ability}`.trim() }
  })
  .filter((d) => d.text && d.text.length > 5)

console.log(`Embedding ${docs.length} characters…`)

// ── Gemini embed API ──────────────────────────────────────────────────────────

async function embedBatch(texts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/${EMBED_MODEL}:batchEmbedContents?key=${GEMINI_API_KEY}`
  const body = {
    requests: texts.map((text) => ({
      model: EMBED_MODEL,
      content: { parts: [{ text }] },
      taskType: 'SEMANTIC_SIMILARITY',
    })),
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini embed error ${res.status}: ${err}`)
  }
  const json = await res.json()
  return json.embeddings.map((e) => e.values)
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

// ── Main ──────────────────────────────────────────────────────────────────────

const entries = []
let processed = 0

for (let i = 0; i < docs.length; i += BATCH_SIZE) {
  const batch = docs.slice(i, i + BATCH_SIZE)
  try {
    const vectors = await embedBatch(batch.map((d) => d.text))
    for (let j = 0; j < batch.length; j++) {
      entries.push({ id: batch[j].id, vector: vectors[j] })
    }
    processed += batch.length
    process.stdout.write(`\r  ${processed}/${docs.length}`)
    if (i + BATCH_SIZE < docs.length) await sleep(RATE_DELAY_MS)
  } catch (err) {
    console.error(`\nBatch ${i}–${i + BATCH_SIZE} failed:`, err.message)
    // Continue with remaining batches
  }
}

console.log(`\nDone. Embedding dimension: ${entries[0]?.vector?.length ?? 'unknown'}`)

const output = {
  version:    1,
  model:      EMBED_MODEL,
  builtAt:    new Date().toISOString(),
  entryCount: entries.length,
  entries,
}

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
fs.writeFileSync(OUT_PATH, JSON.stringify(output))
console.log(`Wrote ${OUT_PATH} (${(JSON.stringify(output).length / 1024).toFixed(1)} KB)`)
