/**
 * Runs the store contract against a real (local, in-memory) D1 database
 * through wrangler's platform proxy, with the SQL from migrations/.
 */
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { D1LibraryStore } from '../src/library/store'
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

async function freshStore() {
  const db = proxy.env.DB
  // Each test gets empty tables.
  for (const table of ['documents', 'api_tokens', 'users']) await db.prepare(`DROP TABLE IF EXISTS ${table}`).run()
  for (const sql of migrations) {
    const statements = sql.split(';').map((s) => s.replace(/--.*$/gm, '').trim()).filter(Boolean)
    for (const statement of statements) await db.prepare(statement).run()
  }
  return new D1LibraryStore(db)
}

describe('D1LibraryStore (local D1)', () => {
  libraryStoreContract(freshStore)
})
