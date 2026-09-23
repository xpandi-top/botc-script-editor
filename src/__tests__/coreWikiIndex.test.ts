import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createWikiIndex, formatWikiPrompt, parseWikiFile, tokenize } from '../core/ai/wikiIndex'

const chunks = parseWikiFile(JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/wiki-chunks.json'), 'utf8')))!
const index = createWikiIndex(chunks)

describe('core/ai/wikiIndex', () => {
  it('parses the bundled wiki file', () => {
    expect(chunks.length).toBeGreaterThan(10)
    expect(parseWikiFile({ version: 2, chunks: [] })).toBeNull()
    expect(parseWikiFile(null)).toBeNull()
  })

  it('tokenizes Latin words and CJK characters', () => {
    expect(tokenize('The Drunk is poisoned! 醉酒')).toEqual(['the', 'drunk', 'poisoned', '醉', '酒'])
  })

  it('ranks relevant chunks for English and Chinese queries', () => {
    const en = index.search('drunk poisoned ability', 3)
    expect(en.length).toBeGreaterThan(0)
    expect(en.some((c) => /drunk|poison/i.test(c.text))).toBe(true)
    const zh = index.search('提名 处决', 3)
    expect(zh.length).toBeGreaterThan(0)
    expect(index.search('zzzzqqq', 3)).toEqual([])
    expect(createWikiIndex([]).search('drunk')).toEqual([])
  })

  it('formats a bounded prompt section', () => {
    const text = formatWikiPrompt(index.search('execution nomination vote', 5), 120)
    expect(text.startsWith('BotC Rules Reference:')).toBe(true)
    expect(text.split(/\s+/).length).toBeLessThan(200)
    expect(formatWikiPrompt([])).toBe('')
  })
})
