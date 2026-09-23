/**
 * Character embeddings on Cloudflare (P5): vectors are made with Workers AI,
 * stored in D1 (int8, per model) and searched in memory.
 *
 * Each stored vector keeps a hash of the text it was made from
 * (src/core/ai/embeddingText.ts). The first similarity query in an isolate
 * compares those hashes with the bundled catalog and re-embeds new or edited
 * characters, so a deploy with catalog changes refreshes the vectors without
 * a manual step. /v1/ai/status reports how many are stale.
 */
import { characterEmbeddingText } from '../../../src/core/ai/embeddingText'
import { dequantize, normalize, quantize, VectorIndex, type Neighbor } from '../../../src/core/ai/vectors'
import type { Team } from '../../../src/core/types/catalog'
import { getCatalog } from '../catalog'
import type { AiRunner } from '../env'
import { toAiServiceError } from './models'

export type StoredEmbedding = { id: string; hash: string; dims: number; scale: number; vector: string }

export interface EmbeddingStore {
  list(model: string): Promise<StoredEmbedding[]>
  hashes(model: string): Promise<Map<string, string>>
  put(model: string, rows: StoredEmbedding[], now: number): Promise<void>
  remove(model: string, ids: string[]): Promise<void>
}

export class D1EmbeddingStore implements EmbeddingStore {
  constructor(private readonly db: D1Database) {}

  async list(model: string) {
    const { results } = await this.db.prepare('SELECT id, hash, dims, scale, vector FROM character_embeddings WHERE model = ?1').bind(model).all<StoredEmbedding>()
    return results
  }

  async hashes(model: string) {
    const { results } = await this.db.prepare('SELECT id, hash FROM character_embeddings WHERE model = ?1').bind(model).all<{ id: string; hash: string }>()
    return new Map(results.map((r) => [r.id, r.hash]))
  }

  async put(model: string, rows: StoredEmbedding[], now: number) {
    const insert = this.db.prepare(`INSERT INTO character_embeddings (model, id, hash, dims, scale, vector, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      ON CONFLICT(model, id) DO UPDATE SET hash = ?3, dims = ?4, scale = ?5, vector = ?6, updated_at = ?7`)
    for (let i = 0; i < rows.length; i += 50) {
      await this.db.batch(rows.slice(i, i + 50).map((r) => insert.bind(model, r.id, r.hash, r.dims, r.scale, r.vector, now)))
    }
  }

  async remove(model: string, ids: string[]) {
    const del = this.db.prepare('DELETE FROM character_embeddings WHERE model = ?1 AND id = ?2')
    if (ids.length) await this.db.batch(ids.map((id) => del.bind(model, id)))
  }
}

export class MemoryEmbeddingStore implements EmbeddingStore {
  readonly rows = new Map<string, StoredEmbedding>()
  private key = (model: string, id: string) => `${model}\u0000${id}`

  async list(model: string) {
    return [...this.rows].filter(([k]) => k.startsWith(`${model}\u0000`)).map(([, r]) => r)
  }

  async hashes(model: string) {
    return new Map((await this.list(model)).map((r) => [r.id, r.hash]))
  }

  async put(model: string, rows: StoredEmbedding[]) {
    for (const r of rows) this.rows.set(this.key(model, r.id), r)
  }

  async remove(model: string, ids: string[]) {
    for (const id of ids) this.rows.delete(this.key(model, id))
  }
}

/** Texts → vectors (any length; unit length not required). */
export type Embedder = (texts: string[]) => Promise<number[][]>

/** Workers AI embeddings (bge-m3 style `{ text: [] }` → `{ data: [][] }`). */
export function workersAiEmbedder(ai: AiRunner, model: string): Embedder {
  return async (texts) => {
    const out: number[][] = []
    for (let i = 0; i < texts.length; i += 50) {
      let result: { data?: number[][] }
      try {
        result = await ai.run(model, { text: texts.slice(i, i + 50) }) as { data?: number[][] }
      } catch (e) {
        throw toAiServiceError(e)
      }
      if (!Array.isArray(result?.data)) throw toAiServiceError(new Error(`Unexpected embedding response from ${model}.`))
      out.push(...result.data)
    }
    return out
  }
}

export type SemanticDeps = { store: EmbeddingStore; embed: Embedder; model: string; now: () => number }

type Doc = { id: string; text: string; hash: string }

let docsCache: Promise<Doc[]> | undefined

async function shortHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text))
  return [...new Uint8Array(digest).slice(0, 6)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** One document per catalog character with ability text. */
function catalogDocs(): Promise<Doc[]> {
  docsCache ??= Promise.all(getCatalog().data.characters.map(async (c) => {
    const text = characterEmbeddingText(c)
    return text ? { id: c.id, text, hash: await shortHash(text) } : null
  })).then((docs) => docs.filter((d): d is Doc => d !== null))
  return docsCache
}

const toBase64 = (bytes: Int8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)))
const fromBase64 = (text: string) => new Int8Array(Uint8Array.from(atob(text), (ch) => ch.charCodeAt(0)).buffer)

export type EmbeddingStatus = { model: string; total: number; embedded: number; stale: number }

export async function embeddingStatus(deps: Pick<SemanticDeps, 'store' | 'model'>): Promise<EmbeddingStatus> {
  const [docs, stored] = await Promise.all([catalogDocs(), deps.store.hashes(deps.model)])
  const fresh = docs.filter((d) => stored.get(d.id) === d.hash).length
  return { model: deps.model, total: docs.length, embedded: fresh, stale: docs.length - fresh }
}

/** Embed characters whose text changed (or that are new) and drop removed ones. */
export async function syncEmbeddings(deps: SemanticDeps): Promise<{ embedded: number; removed: number; total: number }> {
  const [docs, stored] = await Promise.all([catalogDocs(), deps.store.hashes(deps.model)])
  const todo = docs.filter((d) => stored.get(d.id) !== d.hash)
  const known = new Set(docs.map((d) => d.id))
  const removed = [...stored.keys()].filter((id) => !known.has(id))
  if (todo.length) {
    const vectors = await deps.embed(todo.map((d) => d.text))
    await deps.store.put(deps.model, todo.map((d, i) => {
      const { bytes, scale } = quantize(normalize(vectors[i]))
      return { id: d.id, hash: d.hash, dims: bytes.length, scale, vector: toBase64(bytes) }
    }), deps.now())
  }
  if (removed.length) await deps.store.remove(deps.model, removed)
  return { embedded: todo.length, removed: removed.length, total: docs.length }
}

// One index per model and isolate; the catalog only changes with a deploy.
const indexCache = new Map<string, Promise<VectorIndex>>()
const queryCache = new Map<string, Float32Array>()

export function resetSemanticCache() {
  indexCache.clear()
  queryCache.clear()
  docsCache = undefined
}

async function buildIndex(deps: SemanticDeps): Promise<VectorIndex> {
  await syncEmbeddings(deps)
  const rows = await deps.store.list(deps.model)
  return new VectorIndex(rows.map((r) => r.id), rows.map((r) => dequantize(fromBase64(r.vector), r.scale)))
}

export function semanticIndex(deps: SemanticDeps): Promise<VectorIndex> {
  let index = indexCache.get(deps.model)
  if (!index) {
    index = buildIndex(deps)
    indexCache.set(deps.model, index)
    index.catch(() => indexCache.delete(deps.model)) // retry on the next request
  }
  return index
}

async function embedQuery(deps: SemanticDeps, text: string): Promise<Float32Array> {
  const key = `${deps.model}\u0000${text}`
  const cached = queryCache.get(key)
  if (cached) return cached
  const [vector] = await deps.embed([text])
  const unit = normalize(vector)
  if (queryCache.size >= 200) queryCache.delete(queryCache.keys().next().value!)
  queryCache.set(key, unit)
  return unit
}

export type SimilarQuery = { query?: string; id?: string; team?: Team; exclude?: string[]; limit?: number }

/** Characters closest to a text (any language) or to another character. Unknown id → null. */
export async function findSimilar(deps: SemanticDeps, q: SimilarQuery): Promise<Neighbor[] | null> {
  const index = await semanticIndex(deps)
  const catalog = getCatalog()
  const target = q.id ? index.vectorOf(q.id) : await embedQuery(deps, q.query ?? '')
  if (!target) return null
  const skip = new Set([...(q.exclude ?? []), ...(q.id ? [q.id] : [])])
  return index.nearest(target, Math.min(50, Math.max(1, q.limit ?? 5)), (id) => !skip.has(id) && (!q.team || catalog.getCharacter(id)?.team === q.team))
}
