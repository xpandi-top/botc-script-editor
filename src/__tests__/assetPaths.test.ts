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
    expect(await initWikiSearch()).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}wiki-chunks.json`, expect.anything())
  })

  it('does not request embeddings that were not built', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { initVectorIndex } = await import('../lib/botcVectorSearch')
    expect(__BOTC_HAS_EMBEDDINGS__).toBe(false) // public/embeddings.json is not generated in this repo
    expect(await initVectorIndex()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
