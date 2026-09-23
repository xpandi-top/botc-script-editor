/**
 * build-embeddings.mjs
 *
 * Pre-compute Gemini text embeddings for every character in the catalog
 * (all editions, including Odyssey) and write them to public/embeddings.json.
 * Re-run when characters are added or their name/ability text changes.
 *
 * Usage:
 *   node --env-file=.env.local scripts/build-embeddings.mjs   # key from VITE_GEMINI_API_KEY / GEMINI_API_KEY
 *   node scripts/build-embeddings.mjs --check                 # report missing/stale entries, no API calls
 *   node scripts/build-embeddings.mjs --force                 # re-embed everything
 *
 * Each character is embedded once from its English + Chinese name and ability
 * (gemini-embedding-001 is multilingual, so queries in either language match).
 * Entries keep a hash of that text: unchanged characters reuse their vector,
 * so a re-run only calls the API for new or edited characters.
 *
 * Output: public/embeddings.json
 *   { version: 1, model, dimensions, taskType, builtAt, entryCount, entries: [{ id, hash, vector }] }
 * Vectors are unit length (cosine = dot product) and rounded to 4 decimals.
 *
 * The app loads this file on demand and embeds queries with the same model,
 * dimensions and task type (src/lib/botcVectorSearch.ts), falling back to
 * TF-IDF (botcSearch.ts) without it.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCatalogData } from './catalog-data.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ── Config ────────────────────────────────────────────────────────────────────

const EMBED_MODEL   = 'models/gemini-embedding-001'
const DIMENSIONS    = 768
const TASK_TYPE     = 'SEMANTIC_SIMILARITY'
const PRECISION     = 1e4          // decimals kept per component
const BATCH_SIZE    = 20           // texts per batchEmbedContents request
const RATE_DELAY_MS = 1000         // between batches (free tier: ~100 requests / 30k tokens per minute)
const MAX_RETRIES   = 5
const OUT_PATH      = path.join(ROOT, 'public', 'embeddings.json')

const args  = process.argv.slice(2)
const CHECK = args.includes('--check')
const FORCE = args.includes('--force')

// ── Documents ─────────────────────────────────────────────────────────────────

const MISSING_ABILITY = 'No ability text available.'
const uniq = (values) => [...new Set(values.filter(Boolean))]

const docs = buildCatalogData(ROOT).characters
  .map((c) => {
    const abilities = uniq([c.ability.en, c.ability.zh]).filter((a) => a !== MISSING_ABILITY)
    const text = `${uniq([c.name.en, c.name.zh]).join(' / ')} (${c.team}): ${abilities.join('\n')}`
    return { id: c.id, text, hasAbility: abilities.length > 0 }
  })
  .filter((d) => d.hasAbility)
  .map(({ id, text }) => ({ id, text, hash: crypto.createHash('sha1').update(text).digest('hex').slice(0, 12) }))

const previous = (() => {
  try {
    const file = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'))
    const compatible = file.version === 1 && file.model === EMBED_MODEL && file.dimensions === DIMENSIONS && file.taskType === TASK_TYPE
    return compatible ? new Map(file.entries.map((e) => [e.id, e])) : new Map()
  } catch {
    return new Map()
  }
})()

const reusable = (d) => !FORCE && previous.get(d.id)?.hash === d.hash
const todo = docs.filter((d) => !reusable(d))
const removed = [...previous.keys()].filter((id) => !docs.some((d) => d.id === id))

console.log(`${docs.length} characters: ${docs.length - todo.length} up to date, ${todo.length} to embed${removed.length ? `, ${removed.length} removed` : ''}`)

if (CHECK) {
  if (todo.length) console.log(`  missing or stale: ${todo.map((d) => d.id).join(', ')}`)
  process.exit(todo.length || removed.length ? 1 : 0)
}

// ── Gemini embed API ──────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
if (todo.length && !GEMINI_API_KEY) {
  console.error('Error: VITE_GEMINI_API_KEY or GEMINI_API_KEY env var required (e.g. node --env-file=.env.local …)')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function normalize(vector) {
  const norm = Math.hypot(...vector) || 1
  return vector.map((x) => Math.round((x / norm) * PRECISION) / PRECISION)
}

async function embedBatch(texts) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${EMBED_MODEL}:batchEmbedContents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: EMBED_MODEL,
          content: { parts: [{ text }] },
          taskType: TASK_TYPE,
          outputDimensionality: DIMENSIONS,
        })),
      }),
    })
    if (res.ok) return (await res.json()).embeddings.map((e) => normalize(e.values))
    const detail = (await res.text()).slice(0, 300)
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const wait = Math.min(60_000, 5_000 * 2 ** (attempt - 1))
      console.log(`\n  HTTP ${res.status}, retrying in ${wait / 1000}s…`)
      await sleep(wait)
      continue
    }
    throw new Error(`Gemini embed error ${res.status}: ${detail}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const fresh = new Map()
for (let i = 0; i < todo.length; i += BATCH_SIZE) {
  const batch = todo.slice(i, i + BATCH_SIZE)
  const vectors = await embedBatch(batch.map((d) => d.text))
  batch.forEach((d, j) => fresh.set(d.id, vectors[j]))
  process.stdout.write(`\r  ${Math.min(i + BATCH_SIZE, todo.length)}/${todo.length}`)
  if (i + BATCH_SIZE < todo.length) await sleep(RATE_DELAY_MS)
}
if (todo.length) process.stdout.write('\n')

const entries = docs
  .map((d) => ({ id: d.id, hash: d.hash, vector: fresh.get(d.id) ?? previous.get(d.id).vector }))
  .sort((a, b) => a.id.localeCompare(b.id))

const output = {
  version:    1,
  model:      EMBED_MODEL,
  dimensions: DIMENSIONS,
  taskType:   TASK_TYPE,
  builtAt:    new Date().toISOString(),
  entryCount: entries.length,
  entries,
}

const json = JSON.stringify(output)
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
fs.writeFileSync(OUT_PATH, json)
console.log(`Wrote ${path.relative(ROOT, OUT_PATH)}: ${entries.length} entries × ${DIMENSIONS} dims (${(json.length / 1024).toFixed(0)} KB)`)
