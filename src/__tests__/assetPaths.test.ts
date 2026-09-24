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
})
