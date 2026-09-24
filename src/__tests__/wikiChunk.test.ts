/**
 * Wiki chunking for retrieval (scripts/wiki-chunk.mjs → public/wiki-chunks.json):
 * Chinese pages are split by size too, tables of contents are dropped,
 * glossaries get one chunk per term, and player wording finds rules words.
 */
import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
// @ts-expect-error — plain ESM build script without type declarations
import { chunkText, chunkSize, MAX_CHUNK_SIZE } from '../../scripts/wiki-chunk.mjs'
import { createWikiIndex, parseWikiFile, type WikiChunk } from '../core/ai/wikiIndex'
import { expandTermAliases } from '../core/ai/glossary'
import { searchCoreRules } from '../core/ai/rules'

describe('wiki chunking', () => {
  it('counts Chinese characters, not spaces', () => {
    expect(chunkSize('one two three')).toBe(3)
    expect(chunkSize('醉酒的玩家')).toBe(3)
    const zh = `## 规则\n${Array.from({ length: 40 }, (_, i) => `第${i}段：醉酒的玩家会失去能力，但会认为自己仍具有能力，说书人会做出这些玩家仍然具有能力的行为。`).join('\n')}`
    const chunks = chunkText(zh, 'zh-x', 'u') as WikiChunk[]
    expect(chunks.length).toBeGreaterThan(2)
    for (const c of chunks) expect(chunkSize(c.text)).toBeLessThanOrEqual(MAX_CHUNK_SIZE + 60)
  })

  it('drops tables of contents and keeps heading parents by level', () => {
    const seats = 'Arrange the chairs in a circle so every player can see every other player clearly. '.repeat(3)
    const night = 'At night the players close their eyes and the Storyteller wakes characters in the night order. '.repeat(3)
    const text = `## Contents\n• 1 Setup\n• 2 Night\n## Setup\n### Seats\n${seats}\n## Night\n${night}`
    const chunks = chunkText(text, 'setup', 'u') as WikiChunk[]
    expect(chunks.map((c) => c.heading)).toEqual(['Setup › Seats', 'Night'])
    expect(chunks.some((c) => c.text.includes('1 Setup'))).toBe(false)
  })

  it('gives each glossary term its own chunk', () => {
    const text = '• 醉酒 ： 醉酒的玩家会失去能力。\n• 中毒： 中毒的玩家会失去能力。\nDrunk: A drunk player has no ability.'
    const chunks = chunkText(text, 'zh-glossary', 'u', { perItem: true }) as WikiChunk[]
    expect(chunks.map((c) => c.heading)).toEqual(['醉酒', '中毒', 'Drunk'])
  })

  it('the bundled file: bounded Chinese chunks, one per glossary term', () => {
    const chunks = parseWikiFile(JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/wiki-chunks.json'), 'utf8')))!
    const zh = chunks.filter((c) => c.page.startsWith('zh-'))
    expect(Math.max(...zh.map((c) => c.text.length))).toBeLessThan(1200)
    expect(chunks.some((c) => /^(Contents|目录)/.test(c.heading))).toBe(false)
    const index = createWikiIndex(zh)
    expect(index.search(expandTermAliases('被当作是什么意思'), 1)[0].heading).toBe('当作')
    expect(index.search('醉酒是什么意思', 1)[0].heading).toBe('醉酒')
  })
})

describe('term aliases', () => {
  it('add the rules\' words for player wording', () => {
    expect(expandTermAliases('鬼票还能投吗')).toContain('死亡玩家')
    expect(expandTermAliases('首夜谁先醒')).toContain('首个夜晚')
    expect(expandTermAliases('醉着是什么意思')).toContain('醉酒')
    expect(expandTermAliases('洗衣妇的能力')).toBe('洗衣妇的能力')
    expect(expandTermAliases('abilities')).toBe('abilities')
  })

  it('find the rules section for slang', () => {
    expect(searchCoreRules('鬼票还能投几次', 'zh')[0].text).toContain('死亡玩家在余下的游戏中只能再投一次票')
    expect(searchCoreRules('ghost vote', 'en')[0].text).toContain('A dead player may vote only once more')
  })
})

describe('wiki search in the app', () => {
  it('uses glossary entries for definition questions only', async () => {
    const json = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/wiki-chunks.json'), 'utf8'))
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => json })))
    const { initWikiSearch, searchWiki } = await import('../lib/wikiSearch')
    expect(await initWikiSearch()).toBe(true)
    // Advice, not the one-line definition of 说书人.
    expect(searchWiki('新手说书人第一次主持要注意什么？', 1)[0].page).toBe('zh-st-tips')
    expect(searchWiki('被当作是什么意思', 1)[0].heading).toBe('当作')
    expect(searchWiki('what does mad mean', 1)[0].heading).toBe('Mad')
    vi.unstubAllGlobals()
  })
})
