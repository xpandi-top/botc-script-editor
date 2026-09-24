/**
 * Runtime data files must be fetched under the app's base path
 * (/botc-script-editor/ in production), not the domain root.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('runtime asset paths', () => {
  it('loads wiki chunks relative to BASE_URL', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ version: 1, builtAt: '', chunkCount: 0, chunks: [] })))
    vi.stubGlobal('fetch', fetchMock)
    const { initWikiSearch } = await import('../lib/wikiSearch')
    expect(await Promise.all([initWikiSearch(), initWikiSearch()])).toEqual([true, true])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}wiki-chunks.json`, expect.anything())
  })

  it('loads character embeddings relative to BASE_URL, once', async () => {
    const file = { version: 1, model: 'models/gemini-embedding-001', dimensions: 2, entries: [{ id: 'imp', vector: [1, 0] }] }
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(file)))
    vi.stubGlobal('fetch', fetchMock)
    const { initVectorIndex } = await import('../lib/botcVectorSearch')
    expect(__BOTC_HAS_EMBEDDINGS__).toBe(true) // public/embeddings.json is committed (npm run build-embeddings)
    expect(await Promise.all([initVectorIndex(), initVectorIndex()])).toEqual([true, true])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}embeddings.json`, expect.anything())
  })
})
