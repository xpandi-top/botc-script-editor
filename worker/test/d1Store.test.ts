/**
 * Runs the store contract against a real (local, in-memory) D1 database
 * through wrangler's platform proxy, with the SQL from migrations/.
 */
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { D1EmbeddingStore } from '../src/ai/embeddings'
import { D1QuotaStore } from '../src/ai/quota'
import { D1FeedbackStore, parseFeedback } from '../src/ai/feedback'
import { D1LibraryStore } from '../src/library/store'
import { embeddingStoreContract, quotaStoreContract } from './aiStoreContract'
import { libraryStoreContract } from './storeContract'

let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>
const migrations = fs.readdirSync(path.resolve('migrations')).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => fs.readFileSync(path.resolve('migrations', f), 'utf8'))

beforeAll(async () => {
  proxy = await getPlatformProxy<{ DB: D1Database }>({ configPath: 'wrangler.test.jsonc', persist: false })
}, 60_000)

afterAll(async () => {
  await proxy?.dispose()
})

async function freshDb() {
  const db = proxy.env.DB
  // Each test gets empty tables.
  for (const table of ['documents', 'api_tokens', 'users', 'character_embeddings', 'ai_usage', 'ai_feedback']) await db.prepare(`DROP TABLE IF EXISTS ${table}`).run()
  for (const sql of migrations) {
    const statements = sql.split(';').map((s) => s.replace(/--.*$/gm, '').trim()).filter(Boolean)
    for (const statement of statements) await db.prepare(statement).run()
  }
  return db
}

describe('D1LibraryStore (local D1)', () => {
  libraryStoreContract(async () => new D1LibraryStore(await freshDb()))
})

describe('D1EmbeddingStore (local D1)', () => {
  embeddingStoreContract(async () => new D1EmbeddingStore(await freshDb()))
})

describe('D1QuotaStore (local D1)', () => {
  quotaStoreContract(async () => new D1QuotaStore(await freshDb()))
})

describe('D1FeedbackStore (local D1)', () => {
  it('stores feedback in the migrated table', async () => {
    const db = await freshDb()
    const record = parseFeedback({
      kind: 'answer', rating: 'down', reasons: ['wrong'], language: 'zh', build: 'abc1234', promptVersion: '2026-09-24',
      messages: [{ role: 'user', content: '醉着是什么意思' }, { role: 'assistant', content: '……', trace: { route: 'model', provider: 'webllm', model: 'Qwen3-0.6B-q4f16_1-MLC' } }],
    }, 'fb-1', 1_000)
    await new D1FeedbackStore(db).add(record)
    const row = await db.prepare('SELECT * FROM ai_feedback WHERE id = ?1').bind('fb-1').first<Record<string, unknown>>()
    expect(row).toMatchObject({ kind: 'answer', rating: 'down', reasons: '["wrong"]', route: 'model', provider: 'webllm', question: '醉着是什么意思', prompt_version: '2026-09-24' })
  })
})

