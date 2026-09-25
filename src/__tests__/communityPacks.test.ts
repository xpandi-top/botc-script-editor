/**
 * Community (民间) character packs as shipped (scripts/import-packs.mjs):
 * every pack in scripts/community-packs.json is an edition with its credit,
 * characters and icons; the app labels it by its name; the AI says a
 * community character is not official.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { allCharacterFiles, editionCredits, editionLabels, getDisplayName, isCommunityEdition } from '../catalog'
import { retrieveCatalog } from '../lib/ai/catalogRetrieval'

const root = process.cwd()
const config = JSON.parse(fs.readFileSync(path.join(root, 'scripts/community-packs.json'), 'utf8')) as {
  packs: Array<{ key: string; edition: string; name_en: string; name_zh: string; source: string; language: 'en' | 'zh' }>
}
const icons = new Set(fs.readdirSync(path.join(root, 'assets/icons')).map((f) => f.replace(/\.[^.]+$/, '')))

describe('community packs', () => {
  it.each(config.packs)('$key is an edition with a credit, characters and icons', (pack) => {
    expect(editionCredits[pack.edition]).toMatchObject({ name_en: pack.name_en, name_zh: pack.name_zh, source: pack.source, community: true, requiresAttribution: true })
    const members = allCharacterFiles.filter((c) => c.edition === pack.edition)
    expect(members.length).toBeGreaterThan(10)
    expect(members.every((c) => c.id.startsWith(`${pack.key}_`))).toBe(true)
    expect(members.filter((c) => !icons.has(c.id)).map((c) => c.id)).toEqual([])
    expect(members.every((c) => c[pack.language]?.name && c[pack.language]?.ability)).toBe(true)
  })

  it('lists every community edition in the config', () => {
    const configured = new Set(config.packs.map((p) => p.edition))
    expect(Object.values(editionCredits).filter((c) => c.community).map((c) => c.id).filter((id) => !configured.has(id))).toEqual([])
  })

  it('labels a pack by its name and knows it is community', () => {
    expect(editionLabels.zh['community-hp']).toBe(editionCredits['community-hp'].name_zh)
    expect(editionLabels.en['community-hp']).toBe(editionCredits['community-hp'].name_en)
    expect(isCommunityEdition('community-hp')).toBe(true)
    expect(isCommunityEdition('odyssey')).toBe(false)
    expect(isCommunityEdition('tb')).toBe(false)
  })

  it('shows English-only characters by their English name in Chinese, and aligned Chinese names where a source gave one', () => {
    expect(getDisplayName('hp_hagrid', 'zh')).toBe('Hagrid')
    expect(getDisplayName('lotr_aragorn', 'zh')).toBe('阿拉贡')
    expect(getDisplayName('rome_sculptor', 'zh')).toBe('雕塑家')
  })

  it('tells the AI that a community character is not official', () => {
    const facts = retrieveCatalog('Hagrid 的能力是什么', 'zh')
    expect(facts.characterIds).toContain('hp_hagrid')
    expect(facts.details.join('\n')).toMatch(/Community \(民间\) character, NOT official — pack 《霍格沃茨之战》哈利·波特 by JJ & Mas/)
    expect(retrieveCatalog('魔戒：护戒使者有哪些角色', 'zh').facts).toContain('community (民间) character pack, fan-made, NOT official')
  })
})
