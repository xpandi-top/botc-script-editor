/** Shared expectations for the P5 stores (memory and D1). */
import { describe, it, expect } from 'vitest'
import type { EmbeddingStore } from '../src/ai/embeddings'
import type { QuotaStore } from '../src/ai/quota'

export function embeddingStoreContract(make: () => Promise<EmbeddingStore>) {
  describe('EmbeddingStore contract', () => {
    const row = (id: string, hash = 'h1') => ({ id, hash, dims: 3, scale: 0.01, vector: 'AQID' })

    it('keeps rows per model and upserts by id', async () => {
      const store = await make()
      await store.put('m1', [row('imp'), row('spy')], 1)
      await store.put('m2', [row('imp', 'other')], 1)
      await store.put('m1', [row('imp', 'h2')], 2)
      expect((await store.list('m1')).map((r) => [r.id, r.hash]).sort()).toEqual([['imp', 'h2'], ['spy', 'h1']])
      expect([...(await store.hashes('m2'))]).toEqual([['imp', 'other']])
      expect((await store.list('m1')).find((r) => r.id === 'spy')).toEqual(row('spy'))
    })

    it('removes rows of one model', async () => {
      const store = await make()
      await store.put('m1', [row('imp'), row('spy')], 1)
      await store.put('m2', [row('imp')], 1)
      await store.remove('m1', ['imp'])
      await store.remove('m1', [])
      expect([...(await store.hashes('m1')).keys()]).toEqual(['spy'])
      expect([...(await store.hashes('m2')).keys()]).toEqual(['imp'])
    })
  })
}

export function quotaStoreContract(make: () => Promise<QuotaStore>) {
  describe('QuotaStore contract', () => {
    it('counts per day and subject, and prunes old days', async () => {
      const store = await make()
      await store.increment('2026-09-22', ['global', 'ip:a'])
      await store.increment('2026-09-23', ['global', 'ip:a'])
      await store.increment('2026-09-23', ['global', 'ip:b'])
      expect([...(await store.counts('2026-09-23', ['global', 'ip:a', 'ip:c']))].sort()).toEqual([['global', 2], ['ip:a', 1]])
      await store.prune('2026-09-23')
      expect((await store.counts('2026-09-22', ['global'])).size).toBe(0)
      expect((await store.counts('2026-09-23', ['global'])).get('global')).toBe(2)
    })
  })
}
