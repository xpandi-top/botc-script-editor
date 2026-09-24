/**
 * Character guides (src/core/ai/guides.ts): the wiki page parser that builds
 * them (scripts/guide-parse.mjs), the per-question section choice and
 * budgets, and the index the app reads synchronously (assets/almanac/index.json).
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error — plain ESM build script without type declarations
import { parseGuidePage, cleanInline, sectionIdFor } from '../../scripts/guide-parse.mjs'
import { abilityDiffers, GUIDE_SECTIONS, guideIntent, selectGuide, type CharacterGuide, type GuideIndex } from '../core/ai/guides'
import { getCharacterGuide, getCharacterGuideLanguages, getEditionsWithGlossary, hasCharacterGuide, hasGlossary } from '../catalog'

const ZH_PAGE = `[[File:Sailor.png|link=水手|200px]]

== 背景故事 ==

''“你们随便谁来我都能把他喝到桌子底下去！”''

== 角色能力 ==

'''每个夜晚，你要选择一名存活的玩家：你或他之一会醉酒直到下个黄昏。'''

== 角色简介 ==

水手要么自己醉酒，要么让别人醉酒。只要水手是清醒状态，就不会死亡。

* 每个夜晚，水手需要选择一名玩家，该玩家可能会醉酒。
*如果水手不小心选择了已死亡的玩家，说书人应提醒他重新选择。

== 范例 ==

 [[水手]]选择了[[驱魔人]]，于是说书人决定让[[驱魔人]]醉酒。

 [[水手]]选择了[[主谋]]，但是说书人决定让[[水手]]醉酒。

== 提示标记 ==

* 醉酒

放置时机：在水手夜晚行动并选择了玩家后。

移除时机：在黄昏时。

== 提示与技巧（作为邪恶） ==

* 选择你想醉酒的玩家。

== 伪装成水手 ==

* 你被处决了很可能会死！

== 角色信息 ==

* 英文名：Sailor

* 角色能力类型：[[免死]]、[[醉酒]]
`

const EN_PAGE = `<div class="row">
== Summary ==
"Each night, choose an alive player: either you or they are drunk until dusk. You can't die."

The Sailor is either drunk or getting somebody else drunk.
* Each night, the Sailor chooses a player, who will probably get drunk.
\t\t</div>
== Examples ==

\t\t\t<div class='example'>
\t\t\t\tThe Sailor chooses the {{Good|Exorcist}}, and the Storyteller decides that the {{Good|Exorcist}} is drunk.
\t\t\t</div>

== Bluffing as the Sailor ==

* Unlike a real Sailor, you will probably die if you are executed!
[[Category:Townsfolk]]
`

describe('guide page parser', () => {
  it('maps both wikis\' headings to one set of section ids', () => {
    expect(sectionIdFor('提示与技巧（作为善良）')).toBe('tips')
    expect(sectionIdFor('伪装成水手')).toBe('bluffing')
    expect(sectionIdFor('对抗小恶魔')).toBe('fighting')
    expect(sectionIdFor('How to Run')).toBe('howto')
    expect(sectionIdFor('Bluffing as the Sailor')).toBe('bluffing')
    expect(sectionIdFor('角色能力')).toBe('ability')
    expect(sectionIdFor('角色信息')).toBeNull()
    const ids = new Set(GUIDE_SECTIONS.map((s) => s.id))
    for (const heading of ['背景故事', '角色简介', '范例', '运作方式', '提示标记', '规则细节', 'Summary', 'Examples', 'Tips & Tricks', 'Fighting the Imp']) {
      expect(ids.has(sectionIdFor(heading))).toBe(true)
    }
  })

  it('turns markup into paragraphs', () => {
    const entry = parseGuidePage(ZH_PAGE)
    expect(entry.flavor).toBe('你们随便谁来我都能把他喝到桌子底下去！')
    expect(entry.summary.split('\n\n')).toEqual([
      '水手要么自己醉酒，要么让别人醉酒。只要水手是清醒状态，就不会死亡。',
      '每个夜晚，水手需要选择一名玩家，该玩家可能会醉酒。',
      '如果水手不小心选择了已死亡的玩家，说书人应提醒他重新选择。',
    ])
    expect(entry.examples.split('\n\n')).toEqual([
      '水手选择了驱魔人，于是说书人决定让驱魔人醉酒。',
      '水手选择了主谋，但是说书人决定让水手醉酒。',
    ])
    // One paragraph per token, its notes on their own lines.
    expect(entry.reminder_details).toBe('醉酒\n放置时机：在水手夜晚行动并选择了玩家后。\n移除时机：在黄昏时。')
    expect(entry.tips).toBe('作为邪恶：选择你想醉酒的玩家。')
    expect(entry.bluffing).toBe('你被处决了很可能会死！')
    expect(entry.tags).toEqual(['免死', '醉酒'])
    // The ability the page describes, to spot guides written for another version.
    expect(entry.ability).toBe('每个夜晚，你要选择一名存活的玩家：你或他之一会醉酒直到下个黄昏。')
  })

  it('reads the English wiki\'s layout and drops the quoted ability', () => {
    const entry = parseGuidePage(EN_PAGE)
    expect(entry.ability).toBe("Each night, choose an alive player: either you or they are drunk until dusk. You can't die.")
    expect(entry.summary.split('\n\n')).toEqual([
      'The Sailor is either drunk or getting somebody else drunk.',
      'Each night, the Sailor chooses a player, who will probably get drunk.',
    ])
    expect(entry.examples).toBe('The Sailor chooses the Exorcist, and the Storyteller decides that the Exorcist is drunk.')
    expect(entry.bluffing).toBe('Unlike a real Sailor, you will probably die if you are executed!')
  })

  it('cleans inline markup', () => {
    expect(cleanInline("'''[[镇民|Townsfolk]]''' {{Evil|Devil's Advocate}}<br/>x")).toBe("Townsfolk Devil's Advocate\nx")
  })
})

const GUIDE: CharacterGuide = {
  summary: '水手要么自己醉酒，要么让别人醉酒。只要水手是清醒状态，就不会死亡。\n\n如果水手选择了自己，他失去自己的“不会死亡”能力，直到恢复清醒为止。',
  howto: '每个夜晚，唤醒水手。\n\n如果清醒的水手被处决，宣布该玩家被处决但依然存活。（不要说明原因。）',
  examples: '水手选择了驱魔人，于是说书人决定让驱魔人醉酒。\n\n水手选择了主谋，但是说书人决定让水手醉酒。',
  tips: '通过让其他玩家醉酒来最大化你的生存能力。\n\n你可以通过故意被处决来证明你就是那个水手。',
  bluffing: '你毕竟不是一个真正的水手，你被处决了很可能会死！',
}

describe('guide selection', () => {
  it('routes questions to sections', () => {
    expect(guideIntent('能举个例子吗')?.sections).toEqual(['examples'])
    expect(guideIntent('邪恶玩家怎么伪装成水手')?.intent).toBe('bluffing')
    expect(guideIntent('说书人怎么主持水手')?.intent).toBe('run')
    expect(guideIntent('水手这个角色怎么玩')?.intent).toBe('play')
    expect(guideIntent('水手醉酒的时候被处决会死吗')?.intent).toBe('detail')
    expect(guideIntent('How do I play the Sailor?')?.intent).toBe('play')
    expect(guideIntent('水手的能力是什么')).toBeNull()
    expect(guideIntent('What does the Washerwoman learn?')).toBeNull()
  })

  it('reads the sections a question wants, in order', () => {
    const play = selectGuide(GUIDE, '水手怎么玩', 900)!
    expect(play.sections.map((s) => s.id)).toEqual(['summary', 'tips'])
    // Only the summary's first paragraph; the tips get the rest.
    expect(play.sections[0].text).not.toContain('失去自己')
    expect(play.sections[1].text).toContain('故意被处决')
    expect(selectGuide(GUIDE, '举个例子', 900)!.sections).toEqual([{ id: 'examples', text: GUIDE.examples }])
    expect(selectGuide({ summary: 'x' }, '举个例子', 900)).toBeNull()
  })

  it('ranks paragraphs for a rules detail', () => {
    const detail = selectGuide(GUIDE, '清醒的水手被处决会死吗', 900)!
    expect(detail.sections.map((s) => s.text).join('\n')).toContain('被处决但依然存活')
  })

  it('tells another ability version from rewording', () => {
    expect(abilityDiffers('如果只有三名玩家存活且白天没有人被处决，你的阵营获胜。如果你在夜晚即将死亡，可能会有一名其他玩家代替你死亡。',
      '如果只有三名玩家存活且白天没有人被处决，你的阵营获胜。如果你在夜晚死亡，可能会有一名其他玩家代替你死亡。')).toBe(false)
    expect(abilityDiffers('Each night, you learn how many of your 2 alive neighbors are evil.', 'Each night, you learn how many of your 2 alive neighbours are evil.')).toBe(false)
    expect(abilityDiffers('每个夜晚*，你要选择一名玩家：他死亡。如果你杀死了与爪牙邻近的玩家，下个夜晚你可以选择至多两名玩家：他们死亡。',
      '每个夜晚*，你可以选择至多两名玩家：他们死亡。你选择的玩家数量不能与上个夜晚死亡的玩家数量相同（超过二人时算作二人）。')).toBe(true)
    expect(abilityDiffers(undefined, 'x')).toBe(false)
  })

  it('keeps to the budget, cutting only a first paragraph at a sentence end', () => {
    const long = { tips: `${'这是一句很长的提示。'.repeat(40)}\n\n第二段。` }
    const picked = selectGuide(long, '怎么玩', 100)!
    expect(picked.sections[0].text.length).toBeLessThanOrEqual(100)
    expect(picked.sections[0].text.endsWith('。')).toBe(true)
    expect(picked.sections[0].text).not.toContain('第二段')
  })
})

describe('guide index', () => {
  const dir = join(process.cwd(), 'assets/almanac')
  const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as GuideIndex

  it('matches the files (run `node scripts/build-guides.mjs --index-only` after editing one)', () => {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json').sort()
    expect(Object.keys(index.files).sort()).toEqual(files)
    for (const name of files) {
      const buffer = readFileSync(join(dir, name))
      const data = JSON.parse(buffer.toString('utf8'))
      expect(index.files[name].bytes, name).toBe(buffer.length)
      expect(index.files[name].characters, name).toEqual(Object.keys(data.characters ?? {}).sort())
      expect(index.files[name].terminology, name).toBe(Object.keys(data.terminology ?? {}).length)
    }
  })

  it('answers synchronously which characters and editions have content', async () => {
    expect(hasCharacterGuide('painter')).toBe(true)
    expect(hasCharacterGuide('nope')).toBe(false)
    expect(hasGlossary('odyssey')).toBe(true)
    expect(hasGlossary('tb')).toBe(false)
    expect(getEditionsWithGlossary(['painter', 'washerwoman'])).toEqual(['odyssey'])
    // Odyssey has a (partial, community) English almanac besides the Chinese one.
    const guide = await getCharacterGuide('painter', 'en')
    expect(guide?.language).toBe('en')
    expect(guide?.entry.translated_from).toBe('zh')
    expect((await getCharacterGuide('painter', 'zh'))?.entry.examples).toContain('画家')
    // A Chinese edition has only a Chinese guide: it is used, and says so.
    expect((await getCharacterGuide('dagengren', 'en'))?.language).toBe('zh')
    expect(await getCharacterGuide('dagengren', 'en', { exact: true })).toBeNull()
    expect(getCharacterGuideLanguages('painter', 'en')).toEqual(['en', 'zh'])
    expect(getCharacterGuideLanguages('painter', 'zh')).toEqual(['zh', 'en'])
  })
})
