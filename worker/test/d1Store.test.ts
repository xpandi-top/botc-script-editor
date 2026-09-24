/**
 * Runs the store contract against a real (local, in-memory) D1 database
 * through wrangler's platform proxy, with the SQL from migrations/.
 */
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { D1EmbeddingStore } from '../src/ai/embeddings'
import { D1QuotaStore } from '../src/ai/quota'
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
  for (const table of ['documents', 'api_tokens', 'users', 'character_embeddings', 'ai_usage']) await db.prepare(`DROP TABLE IF EXISTS ${table}`).run()
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
