/**
 * Semantic character search goes through the BOTC API (server-side vectors,
 * same model for documents and queries) and falls back to local TF-IDF.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { findSimilar } from '../lib/botcVectorSearch'

const API = 'https://api.test'
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

beforeEach(() => vi.stubEnv('VITE_API_URL', API))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('findSimilar', () => {
  it('asks the API and maps the ids to catalog examples', async () => {
    const fetchMock = vi.fn(async (_url: string) => reply({ model: '@cf/baai/bge-m3', items: [{ id: 'imp', score: 0.8 }, { id: 'nobody', score: 0.7 }, { id: 'vigormortis', score: 0.6 }] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await findSimilar('每晚杀一名玩家的恶魔', 3, { team: 'demon', excludeIds: ['po', 'pukka'] })

    expect(result.map((r) => r.id)).toEqual(['imp', 'vigormortis']) // unknown ids dropped
    expect(result[0]).toMatchObject({ nameEn: 'Imp', nameZh: '小恶魔', team: 'demon' })
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe(`${API}/v1/characters/similar`)
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: '每晚杀一名玩家的恶魔', limit: '3', team: 'demon', exclude: 'po,pukka' })
  })

  it('stays local when remote search is not allowed or there is no API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const local = await findSimilar('each night choose a player they die', 2, { team: 'demon', allowRemote: false })
    expect(local).toHaveLength(2)
    expect(local.every((r) => r.team === 'demon')).toBe(true)
    vi.stubEnv('VITE_API_URL', 'off')
    expect(await findSimilar('each night choose a player they die', 2, { team: 'demon' })).toHaveLength(2)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to TF-IDF when the API fails', async () => {
    for (const failure of [() => reply({ error: { code: 'ai_unavailable' } }, 503), () => { throw new TypeError('offline') }, () => reply({ items: [] })]) {
      vi.stubGlobal('fetch', vi.fn(async () => failure()))
      const result = await findSimilar('each night choose a player they die', 2, { team: 'demon' })
      expect(result).toHaveLength(2)
      expect(result.every((r) => r.team === 'demon')).toBe(true)
    }
  })
})
