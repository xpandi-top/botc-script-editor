/**
 * Data checks on the character assets: every reference resolves and every
 * character carries the text the app, the API and the AI search rely on.
 * Runs in CI on every change (npm test), so broken data never deploys.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
// @ts-expect-error — plain ESM build script without type declarations
import { buildCatalogData } from '../../scripts/catalog-data.mjs'
import { characterEmbeddingText } from '../core/ai/embeddingText'
import type { CatalogData } from '../core/catalog/types'

const root = process.cwd()
const readJson = (...parts: string[]) => JSON.parse(fs.readFileSync(path.join(root, ...parts), 'utf8'))
const catalog = buildCatalogData(root) as CatalogData
const known = new Set(catalog.characters.map((c) => c.id))
const characterFiles = fs.readdirSync(path.join(root, 'assets/characters/individual')).filter((f) => f.endsWith('.json'))

/**
 * Characters that wake at night but have no storyteller reminder text yet
 * (Chinese community editions). Fixing one? Remove it here.
 */
const WAKE_WITHOUT_REMINDER = [
  'baojun', 'bingbi', 'geling', 'guhuoniao', 'hundun', 'qiongqi', 'shaxing', 'shiguan',
  'shusheng', 'taotie', 'taowu', 'tixingguan', 'yangguren', 'yongjiang', 'zhen', 'zhifu',
]

describe('character assets', () => {
  it('have one file per id, and every file is in the catalog', () => {
    const ids = characterFiles.map((f) => readJson('assets/characters/individual', f).id as string)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
    expect(ids.filter((id) => !known.has(id))).toEqual([]) // missing or unknown team / edition drops a file silently
  })

  it('give every character a name, ability text, an icon and a searchable text', () => {
    const icons = new Set(fs.readdirSync(path.join(root, 'assets/icons')).map((f) => f.replace(/\.(png|jpe?g|webp|svg)$/i, '')))
    const problems = catalog.characters.flatMap((c) => [
      ...(characterEmbeddingText(c) ? [] : [`${c.id}: no ability text`]),
      ...(icons.has(c.id) ? [] : [`${c.id}: no icon`]),
      ...(c.name.en.trim() && c.name.zh.trim() ? [] : [`${c.id}: no name`]),
    ])
    expect(problems).toEqual([])
  })

  it('only reference known characters in the night order and jinxes', () => {
    const night = readJson('assets/characters/night-order.json')
    const placeholder = (id: string) => /^[A-Z_]+$/.test(id)
    expect([...night.first_night, ...night.other_nights].filter((id: string) => !known.has(id) && !placeholder(id))).toEqual([])
    const jinxes = Object.values(readJson('assets/jinxes.json')) as Array<{ id: string; characters: string[] }>
    expect(jinxes.filter((j) => j.characters.some((id) => !known.has(id))).map((j) => j.id)).toEqual([])
    expect(catalog.jinxes.filter((j) => !j.reason.en.trim() && !j.reason.zh.trim()).map((j) => j.id)).toEqual([])
  })

  it('give night wakers a storyteller reminder (known gaps listed above)', () => {
    const missing = catalog.characters
      .filter((c) => (c.firstNight && !c.firstNightReminder) || (c.otherNight && !c.otherNightReminder))
      .map((c) => c.id)
    expect(missing.filter((id) => !WAKE_WITHOUT_REMINDER.includes(id))).toEqual([])
    expect(WAKE_WITHOUT_REMINDER.filter((id) => !missing.includes(id))).toEqual([]) // fixed: update the list
  })
})
