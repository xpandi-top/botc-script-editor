/**
 * Semantic character search: the committed embeddings must match the catalog,
 * and queries must be embedded the same way as the documents.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi, afterEach } from 'vitest'
// @ts-expect-error — plain ESM build script without type declarations
import { buildCatalogData } from '../../scripts/catalog-data.mjs'

type Entry = { id: string; hash: string; vector: number[] }
const embeddings = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/embeddings.json'), 'utf8')) as {
  version: number; model: string; dimensions: number; taskType: string; entries: Entry[]
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('public/embeddings.json', () => {
  it('has one unit vector per known character, all the same size', () => {
    const ids = new Set((buildCatalogData(process.cwd()).characters as Array<{ id: string }>).map((c) => c.id))
    expect(embeddings.version).toBe(1)
    expect(embeddings.entries.length).toBeGreaterThan(300)
    expect(new Set(embeddings.entries.map((e) => e.id)).size).toBe(embeddings.entries.length)
    for (const e of embeddings.entries) {
      expect(ids.has(e.id), `${e.id} is not in the catalog`).toBe(true)
      expect(e.vector).toHaveLength(embeddings.dimensions)
      expect(Math.hypot(...e.vector)).toBeCloseTo(1, 2)
    }
  })

  it('covers the Odyssey characters', () => {
    const odyssey = (buildCatalogData(process.cwd()).characters as Array<{ id: string; edition: string }>).filter((c) => c.edition === 'odyssey')
    const embedded = new Set(embeddings.entries.map((e) => e.id))
    expect(odyssey.length).toBeGreaterThan(0)
    expect(odyssey.filter((c) => !embedded.has(c.id)).map((c) => c.id)).toEqual([])
  })
})

describe('findSimilar', () => {
  const file = {
    version: 1,
    model: 'models/gemini-embedding-001',
    dimensions: 2,
    taskType: 'SEMANTIC_SIMILARITY',
    entries: [
      { id: 'imp', vector: [1, 0] },
      { id: 'poisoner', vector: [0, 1] },
      { id: 'vigormortis', vector: [0.9, 0.1] },
    ],
  }

  it('embeds the query with the file model and ranks by cosine', async () => {
    const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(
      url.endsWith('embeddings.json') ? file : { embedding: { values: [1, 0.05] } },
    )))
    vi.stubGlobal('fetch', fetchMock)
    const { findSimilar } = await import('../lib/botcVectorSearch')

    const result = await findSimilar('kills a player each night', 2, { team: 'demon', geminiApiKey: 'test-key' })

    expect(result.map((r) => r.id)).toEqual(['imp', 'vigormortis'])
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent')
    expect(url).not.toContain('test-key')
    expect((init.headers as Record<string, string>)['X-goog-api-key']).toBe('test-key')
    expect(JSON.parse(init.body as string)).toMatchObject({ taskType: 'SEMANTIC_SIMILARITY', outputDimensionality: 2 })
  })

  it('falls back to TF-IDF without a key, without fetching the vectors', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { findSimilar } = await import('../lib/botcVectorSearch')

    const result = await findSimilar('each night choose a player they die', 2, { team: 'demon' })

    expect(result).toHaveLength(2)
    expect(result.every((r) => r.team === 'demon')).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to TF-IDF when the embed call fails', async () => {
    const fetchMock = vi.fn(async (url: string) => (url.endsWith('embeddings.json')
      ? new Response(JSON.stringify(file))
      : new Response('quota', { status: 429 })))
    vi.stubGlobal('fetch', fetchMock)
    const { findSimilar } = await import('../lib/botcVectorSearch')

    const result = await findSimilar('each night choose a player they die', 2, { team: 'demon', geminiApiKey: 'test-key' })

    expect(result).toHaveLength(2)
    expect(result.every((r) => r.team === 'demon')).toBe(true)
  })
})
