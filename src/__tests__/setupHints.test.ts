/**
 * Layout checks for the storyteller's deal (src/core/engine/setupHints.ts):
 * setup abilities change the expected counts, players shown another
 * character need one, the Marionette sits next to the Demon, and bluffs
 * are good and not in play.
 */
import { describe, expect, it } from 'vitest'
import { dealtCounts, setupBracket, setupExpectation, setupHints, suggestShownCharacters, type SetupCheckInput } from '../core/engine/setupHints'
import { getAbilityText, getCharacterById, getDisplayName } from '../catalog'
import type { Team } from '../types'

const getTeam = (id: string) => getCharacterById(id)?.team as Team | undefined
const check = (seats: string[], extra: Partial<SetupCheckInput> = {}, language: 'zh' | 'en' = 'zh') => setupHints({
  players: seats.length,
  seats: Object.fromEntries(seats.map((id, i) => [i + 1, id])),
  getTeam, language,
  name: (id) => getDisplayName(id, language),
  ability: (id) => getAbilityText(id, language),
  ...extra,
})
const warnings = (hints: ReturnType<typeof setupHints>) => hints.filter((h) => h.level === 'warn').map((h) => h.text)

describe('setup expectations', () => {
  it('shift Outsiders and Townsfolk for setup abilities', () => {
    expect(setupExpectation(8, ['baron'])!.expected).toEqual({ townsfolk: [3, 3], outsider: [3, 3], minion: [1, 1], demon: [1, 1] })
    expect(setupExpectation(7, ['godfather'])!.expected.outsider).toEqual([0, 1])
    expect(setupExpectation(9, ['washerwoman'], ['sentinel'])!.expected.outsider).toEqual([1, 3])
    expect(setupExpectation(10, ['legion'])!.free).toEqual(['legion'])
    expect(setupBracket('Each night* … [+1 Outsider]')).toBe('[+1 Outsider]')
    expect(setupBracket('每个夜晚*…［-1外来者］')).toBe('［-1外来者］')
  })

  it('count the Titan in a Minion slot', () => {
    expect(dealtCounts(['titan', 'imp'], getTeam)).toEqual({ townsfolk: 0, outsider: 0, minion: 1, demon: 1 })
  })
})

describe('setup hints', () => {
  const tb8 = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'butler', 'poisoner', 'imp']

  it('pass a legal deal with only reminders', () => {
    expect(warnings(check(tb8))).toEqual([])
  })

  it('explain the Baron and catch counts that ignore it', () => {
    const baron = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'butler', 'baron', 'imp']
    const hints = check(baron)
    expect(hints.find((h) => h.id === 'baron')!.text).toBe('男爵 [+2外来者]：外来者 +2，镇民 -2')
    expect(warnings(hints)).toEqual(['人数配置不对（已计入 男爵）：镇民应为 3，现为 5；外来者应为 3，现为 1。'])
    const fixed = ['washerwoman', 'librarian', 'investigator', 'butler', 'drunk', 'recluse', 'baron', 'imp']
    expect(warnings(check(fixed, { perceived: { 5: 'chef' } }))).toEqual([])
  })

  it('ask what the Drunk and the Lunatic believe they are', () => {
    const drunk = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'drunk', 'poisoner', 'imp']
    expect(warnings(check(drunk))).toEqual(['6 号酒鬼 还没有设置“以为的角色”（应为一个镇民）。'])
    expect(warnings(check(drunk, { perceived: { 6: 'chef' } }))).toEqual(['6 号酒鬼 以为的角色 厨师 已在场，应选不在场的角色。'])
    expect(warnings(check(drunk, { perceived: { 6: 'monk' } }))).toEqual([])
    expect(check(drunk, { perceived: { 6: 'monk' } }).some((h) => h.text.includes('计数时仍算外来者'))).toBe(true)
  })

  it('seat the Marionette next to the Demon', () => {
    const seats = ['washerwoman', 'marionette', 'investigator', 'chef', 'empath', 'monk', 'soldier', 'imp']
    expect(warnings(check(seats, { perceived: { 2: 'mayor' } }))).toContain('2 号提线木偶 没有与恶魔邻座。')
    // Seat 8 and seat 1 are neighbors around the table.
    const ring = ['marionette', 'washerwoman', 'investigator', 'chef', 'empath', 'monk', 'soldier', 'imp']
    expect(warnings(check(ring, { perceived: { 1: 'mayor' } }))).not.toContain('1 号提线木偶 没有与恶魔邻座。')
  })

  it('check the Demon bluffs and characters that come in pairs', () => {
    expect(warnings(check(tb8, { bluffs: ['chef', 'spy', 'monk'] }))).toEqual(['恶魔伪装 厨师 已在场。', '恶魔伪装 间谍 不是善良角色。'])
    expect(check(tb8, { bluffs: ['monk'] }).some((h) => h.text === '还差 2 个恶魔伪装（7 人及以上首夜要给恶魔 3 个不在场的善良角色）。')).toBe(true)
    const choirboy = ['choirboy', 'librarian', 'investigator', 'chef', 'empath', 'butler', 'poisoner', 'imp']
    expect(warnings(check(choirboy))).toContain('唱诗男孩 在场，但 国王 不在场。')
    expect(warnings(check(['chef', 'chef', 'investigator', 'empath', 'monk', 'butler', 'poisoner', 'imp']))).toContain('厨师 被发给了 2 名玩家。')
  })

  it('speak English', () => {
    const baron = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'butler', 'baron', 'imp']
    expect(check(baron, {}, 'en').find((h) => h.id === 'baron')!.text).toBe('Baron [+2 Outsiders]: +2 Outsiders, -2 Townsfolk')
  })
})

describe('shown characters for a new deal', () => {
  it('give the Drunk a not-in-play Townsfolk and the Lunatic the Demon', () => {
    const script = ['chef', 'empath', 'monk', 'soldier', 'drunk', 'lunatic', 'poisoner', 'imp', 'nodashii']
    const seats = { 1: 'chef', 2: 'drunk', 3: 'lunatic', 4: 'poisoner', 5: 'imp' }
    const shown = suggestShownCharacters(seats, script, getTeam, () => 0)
    expect(shown).toEqual({ 2: 'empath', 3: 'imp' })
    // With those set, nothing is missing about what they believe.
    const hints = warnings(setupHints({ players: 5, seats, perceived: shown, getTeam, language: 'zh', name: (id) => id }))
    expect(hints.filter((text) => text.includes('以为'))).toEqual([])
  })
})
