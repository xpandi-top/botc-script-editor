/**
 * Community script import (scripts/script-import.mjs, used by
 * scripts/import-scripts.mjs): script entries map to local character ids by
 * id, loose id and Chinese / English name; characters that are not local, or
 * that reuse a local name with another ability, are reported; files match a
 * 钟楼剧本博物馆 issue; the written file keeps the author and source and
 * loads as a script.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildCharacterIndex, buildScriptFile, convertScript, issueNumberFromName, matchIssue, parseBwikiCharacter, resolveEntry, slugFor, textSimilarity, titleKey,
  // @ts-expect-error — plain ESM build script without type declarations
} from '../../scripts/script-import.mjs'
import { editableScriptFromData } from '../core/script/editable'
import { validateScript } from '../core/script/validate'

const root = path.resolve(__dirname, '../..')
const charDir = path.join(root, 'assets/characters/individual')
const characterFiles = fs.readdirSync(charDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(charDir, f), 'utf8')))
const index = buildCharacterIndex(characterFiles)
const museum = JSON.parse(fs.readFileSync(path.join(root, 'scripts/museum/index.json'), 'utf8'))
const imp = characterFiles.find((c) => c.id === 'imp')

describe('character mapping', () => {
  it('maps ids, loosely written ids and names to local ids', () => {
    expect(resolveEntry('washerwoman', index)).toMatchObject({ id: 'washerwoman', status: 'catalog', via: 'id' })
    expect(resolveEntry('fortune_teller', index)).toMatchObject({ id: 'fortuneteller', via: 'loose-id' })
    expect(resolveEntry('Fortune Teller', index)).toMatchObject({ id: 'fortuneteller' })
    expect(resolveEntry('洗衣妇', index)).toMatchObject({ id: 'washerwoman', via: 'name' })
    expect(resolveEntry('刀客', index)).toMatchObject({ id: 'daoke', via: 'name' })
    expect(resolveEntry({ id: 'swordman', name: '刀客' }, index)).toMatchObject({ id: 'daoke', via: 'name' })
  })

  it('keeps an inline copy of a local character when its ability is a known wording', () => {
    const entry = { id: 'imp', name: imp.zh.name, team: 'demon', ability: `${imp.zh.ability}。`, image: 'https://example.com/imp.png' }
    expect(resolveEntry(entry, index)).toMatchObject({ id: 'imp', status: 'catalog' })
    expect(textSimilarity(imp.en.ability, imp.en.ability.replace(/\.$/, ''))).toBe(1)
  })

  it('treats a local name with another ability as a homebrew variant', () => {
    const entry = { id: 'imp', name: '小恶魔', team: 'demon', ability: 'Each night, choose a player: they get a hat.' }
    expect(resolveEntry(entry, index)).toMatchObject({ id: null, status: 'modified', candidates: ['imp'] })
  })

  it('reports names shared by several local characters unless the team decides', () => {
    // 阴阳师: Odyssey's Onmyoji and 华灯初上's Yin-Yang Diviner, both Townsfolk.
    expect(resolveEntry('阴阳师', index)).toMatchObject({ id: null, status: 'ambiguous', candidates: ['onmyoji', 'yinyangshi'] })
    expect(resolveEntry({ id: 'x', name: '阴阳师', team: 'townsfolk' }, index).status).toBe('ambiguous')
    // "Rascal": Odyssey's Outsider (id rascal) and 华灯初上's 熊孩子 (Townsfolk). An id wins over a name.
    expect(resolveEntry('Rascal', index)).toMatchObject({ id: 'rascal', via: 'loose-id' })
    expect(resolveEntry({ id: 'x', name: 'Rascal' }, index)).toMatchObject({ id: null, status: 'ambiguous' })
    expect(resolveEntry({ id: 'x', name: 'Rascal', team: 'townsfolk' }, index)).toMatchObject({ id: 'xionghaizi', status: 'catalog' })
  })

  it('reports characters that are not local', () => {
    expect(resolveEntry('3dspecs', index)).toMatchObject({ id: null, status: 'community', input: '3dspecs' })
    const inline = resolveEntry({ id: 'specs', name: '“3D”眼镜', team: 'townsfolk', ability: '每个夜晚，你会得知一些东西。' }, index)
    expect(inline).toMatchObject({ id: null, status: 'community', inline: { name: '“3D”眼镜', team: 'townsfolk' } })
  })

  it('converts a whole script, dropping duplicates and junk entries', () => {
    const converted = convertScript([{ id: '_meta', name: '沸反盈天', author: 'Lei' }, '洗衣妇', 'washerwoman', 42, 'harpy', 'specs', 'imp'], index)
    expect(converted.meta).toMatchObject({ name: '沸反盈天', author: 'Lei' })
    expect(converted.characters.map((c: { id: string | null }) => c.id)).toEqual(['washerwoman', 'harpy', null, 'imp'])
    expect(converted.warnings).toHaveLength(2)
    expect(convertScript({ foo: 1 }, index).error).toBeTruthy()
    expect(convertScript([{ id: '_meta' }], index).error).toBeTruthy()
  })
})

describe('issue matching', () => {
  const issues = museum.issues

  it('reads the issue number from the file name', () => {
    expect(issueNumberFromName('角色快速上手/第100期《沸反盈天》.json')).toBe(100)
    expect(issueNumberFromName('100 沸反盈天.json')).toBe(100)
    expect(issueNumberFromName('100期沸反盈天.json')).toBe(100)
    expect(issueNumberFromName('大惊小怪1.2.json')).toBeUndefined()
  })

  it('matches by number, else by title without version or punctuation', () => {
    expect(matchIssue({ fileName: '第100期.json' }, issues)).toMatchObject({ issue: { issue: 100, title: '沸反盈天' }, via: 'number' })
    expect(matchIssue({ fileName: 'x.json', metaName: '《沸反盈天》v1.3' }, issues)).toMatchObject({ issue: { issue: 100 }, via: 'title' })
    expect(matchIssue({ fileName: '觅影寻踪v6.1.json' }, issues).issue?.issue).toBe(79)
    expect(matchIssue({ fileName: '双重加速.json' }, issues)).toMatchObject({ issue: { issue: 315 }, via: 'title-part' })
    expect(titleKey('大惊小怪1.2')).toBe(titleKey('大惊小怪'))
  })

  it('does not guess between issues with the same title', () => {
    const result = matchIssue({ fileName: '诸神黄昏.json' }, issues)
    expect(result.issue).toBeNull()
    expect(result.candidates.map((c: { issue: number }) => c.issue).sort()).toEqual([500, 716])
    expect(matchIssue({ fileName: '不存在的剧本.json' }, issues).issue).toBeNull()
  })

  it('has unique issue numbers with a title and a Bilibili link', () => {
    const numbers = issues.map((i: { issue: number }) => i.issue)
    expect(new Set(numbers).size).toBe(numbers.length)
    for (const issue of issues) {
      expect(issue.title).toBeTruthy()
      expect(issue.url).toMatch(/^https:\/\/www\.bilibili\.com\/(opus\/|read\/cv)\d+$/)
    }
  })
})

describe('written script', () => {
  const issue = museum.issues.find((i: { issue: number }) => i.issue === 100)
  const source = [
    { id: '_meta', name: '沸反盈天', author: ' Lei ', logo: 'https://example.com/logo.png', background: 'https://example.com/bg.png', firstNight: ['fortune_teller', 'harpy'] },
    '洗衣妇', 'fortune_teller', 'high_priestess', 'harpy', 'imp',
    { id: 'specs', name: '“3D”眼镜', team: 'townsfolk', ability: '每个夜晚，你会得知一些东西。', image: 'https://example.com/specs.png' },
  ]
  const file = buildScriptFile(convertScript(source, index), { issue, file: '第100期《沸反盈天》.json' })

  it('keeps title, author and the museum issue; drops images', () => {
    expect(file[0]).toEqual({
      id: '_meta', name: '沸反盈天', name_zh: '沸反盈天', author: 'Lei', firstNight: ['fortuneteller', 'harpy'], community: true,
      source: { name: '钟楼剧本博物馆', issue: 100, title: '沸反盈天', url: issue.url, index: museum.index, file: '第100期《沸反盈天》.json' },
    })
    expect(file.slice(1, 6)).toEqual(['washerwoman', 'fortuneteller', 'high_priestess', 'harpy', 'imp'])
    expect(file[6]).toEqual({ id: 'specs', name: '“3D”眼镜', team: 'townsfolk', ability: '每个夜晚，你会得知一些东西。' })
  })

  it('loads as a script, community characters as inline definitions', () => {
    const script = editableScriptFromData(file, { slug: 'museum-100', baseSlug: 'museum-100', sourceFile: 'museum-100.json', edition: 'custom' })
    expect(script.title).toBe('沸反盈天')
    expect(script.author).toBe('Lei')
    expect(script.characters).toContain('specs')
    expect(script.meta).toMatchObject({ community: true, source: { issue: 100 } })
    const catalog = { getCharacter: (id: string) => index.byId.get(id) }
    expect(validateScript(file, catalog).ok).toBe(true)
  })

  it('numbers an issue\'s second script', () => {
    const taken = new Set(['museum-315'])
    expect(slugFor(315, taken)).toBe('museum-315-2')
    expect(slugFor(100, taken)).toBe('museum-100')
  })
})

describe('BWIKI character page', () => {
  it('reads 角色信息 and the ability', () => {
    const wikitext = [
      '== 角色能力 ==', '', "'''在你的首个夜晚，你会得知一个在场的爪牙角色。'''", '',
      '== 角色信息 ==', '', '* 英文名：Swordman', '', '* 所属角色合集：[[山雨欲来]]', '', '* 创意来源：苏通染', '', '* 角色类型：镇民',
    ].join('\n')
    expect(parseBwikiCharacter(wikitext)).toEqual({
      english: 'Swordman', collection: '山雨欲来', author: '苏通染', team: 'townsfolk', ability: '在你的首个夜晚，你会得知一个在场的爪牙角色。',
    })
    expect(parseBwikiCharacter('no info')).toEqual({})
  })
})
