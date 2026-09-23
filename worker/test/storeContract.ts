import { expect, it } from 'vitest'
import type { LibraryStore } from '../src/library/store'

/** Behaviour every LibraryStore implementation must share. */
export function libraryStoreContract(makeStore: () => Promise<LibraryStore>) {
  it('manages users and tokens', async () => {
    const store = await makeStore()
    await store.upsertUser('u1', 'a@test', 1)
    await store.upsertUser('u1', null, 2)
    await store.createToken('u1', 't1', 'Claude', 'hash-1', 10)
    await store.createToken('u1', 't2', 'Cursor', 'hash-2', 11)
    expect((await store.listTokens('u1')).map((t) => t.name)).toEqual(['Claude', 'Cursor'])
    expect(await store.useToken('hash-1', 20)).toBe('u1')
    expect((await store.listTokens('u1'))[0].lastUsedAt).toBe(20)
    expect(await store.useToken('nope', 20)).toBeNull()
    expect(await store.revokeToken('someone-else', 't1', 30)).toBe(false)
    expect(await store.revokeToken('u1', 't1', 30)).toBe(true)
    expect(await store.revokeToken('u1', 't1', 31)).toBe(false)
    expect(await store.useToken('hash-1', 40)).toBeNull()
    expect((await store.listTokens('u1')).map((t) => t.id)).toEqual(['t2'])
  })

  it('stores documents with last-write-wins, conflicts and tombstones', async () => {
    const store = await makeStore()
    await store.upsertUser('u1', null, 1)
    await store.upsertUser('u2', null, 1)
    expect(await store.putDoc('u1', 'script', 's1', { v: 1 }, 100)).toMatchObject({ ok: true })
    expect(await store.putDoc('u1', 'script', 's2', { v: 1 }, 110)).toMatchObject({ ok: true })
    expect(await store.putDoc('u2', 'script', 's1', { other: true }, 120)).toMatchObject({ ok: true })

    // older writes never replace newer ones; stale bases conflict
    expect(await store.putDoc('u1', 'script', 's1', { v: 0 }, 90)).toMatchObject({ ok: false, conflict: { data: { v: 1 }, updatedAt: 100 } })
    expect(await store.putDoc('u1', 'script', 's1', { v: 2 }, 200, 50)).toMatchObject({ ok: false })
    expect(await store.putDoc('u1', 'script', 's1', { v: 2 }, 200, 100)).toMatchObject({ ok: true, doc: { updatedAt: 200 } })

    expect((await store.getDoc('u1', 'script', 's1'))?.data).toEqual({ v: 2 })
    expect(await store.getDoc('u1', 'character', 's1')).toBeNull()
    expect((await store.listDocs('u1', 'script')).map((d) => d.id)).toEqual(['s2', 's1'])

    const tomb = await store.deleteDoc('u1', 'script', 's2', 150)
    expect(tomb).toMatchObject({ id: 's2', deleted: true, data: null, updatedAt: 150 })
    expect(await store.deleteDoc('u1', 'script', 's2', 160)).toBeNull()
    expect((await store.listDocs('u1', 'script')).map((d) => d.id)).toEqual(['s1'])
    expect((await store.listDocs('u1', 'script', 120)).map((d) => [d.id, d.deleted])).toEqual([['s2', true], ['s1', false]])
    expect((await store.listDocs('u2', 'script')).map((d) => d.data)).toEqual([{ other: true }])

    // a later write resurrects a deleted document
    expect(await store.putDoc('u1', 'script', 's2', { v: 3 }, 300)).toMatchObject({ ok: true })
    expect((await store.getDoc('u1', 'script', 's2'))?.deleted).toBe(false)
  })
}
