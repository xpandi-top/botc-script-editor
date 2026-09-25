/**
 * Community character packs (scripts/pack-import.mjs, used by
 * scripts/import-packs.mjs): Bloodstar script entries become character files
 * with stable local ids, translations pair up by order or by map, copies of
 * existing characters are left out, and night wakers go into the shipped
 * night order as one block.
 */
import { describe, expect, it } from 'vitest'
import {
  alignByMap, alignByOrder, characterFile, commonSuffix, editionCredit, existingCopies, insertNightOrder, localId, packEntries, removeFromNightOrder,
  // @ts-expect-error — plain ESM build script without type declarations
} from '../../scripts/pack-import.mjs'

const hagrid = {
  id: 'hagrid_hp2_2', name: 'Hagrid', team: 'townsfolk', ability: 'You start knowing a player is Ron, Hermione, Harry or Neville.',
  firstNightReminder: 'Wake Hagrid and point at a player who is a Gryffindor', reminders: ['Gryffindor', ''], firstNight: 20, image: 'https://example.com/h.png',
}
const newt = { id: 'newtscamander_hp2_2', name: 'Newt Scamander', team: 'traveller', ability: 'During your arrival approach the storyteller.', setup: true, otherNight: 21 }

describe('pack entries and ids', () => {
  it('keeps characters with a known team and a name', () => {
    const { meta, characters } = packEntries([
      { id: '_meta', name: 'The Chamber of Secrets', author: 'JJ and Mas' },
      hagrid, newt,
      { id: '18_x', team: 'jinxes', name: '北斗&淵上之物', ability: '…' },
      { id: 'blank', team: 'townsfolk', name: ' ' },
      'washerwoman',
    ])
    expect(meta.author).toBe('JJ and Mas')
    expect(characters.map((c: { id: string }) => c.id)).toEqual(['hagrid_hp2_2', 'newtscamander_hp2_2'])
  })

  it('drops the project suffix Bloodstar adds to every id', () => {
    expect(commonSuffix(['hagrid_hp2_2', 'ronweasley_hp2_2', 'the_deatheaters_hp2_2'])).toBe('hp2_2')
    expect(commonSuffix(['_sjjl5', '1_sjjl5', '12_sjjl5'])).toBe('sjjl5')
    expect(localId('hp', 'hagrid_hp2_2', 'hp2_2')).toBe('hp_hagrid')
    expect(localId('sjjl', '_sjjl5', 'sjjl5')).toBe('sjjl_0')
    expect(localId('sjjl', '12_sjjl5', 'sjjl5')).toBe('sjjl_12')
    expect(localId('lotr', 'palantr_ringbearer', 'ringbearer')).toBe('lotr_palantr')
  })
})

describe('character files', () => {
  it('writes the entry\'s language block, reminder tokens without blanks and the team spelled as the app does', () => {
    const file = characterFile(hagrid, { id: 'hp_hagrid', edition: 'community-hp', language: 'en' })
    expect(file).toEqual({
      id: 'hp_hagrid', team: 'townsfolk', edition: 'community-hp', current_revision: 'v1', setup: false,
      reminders: ['Gryffindor'], revisions: [{ id: 'v1', note: '' }],
      en: {
        name: 'Hagrid', ability: hagrid.ability, revisions: { v1: hagrid.ability },
        firstNightReminder: hagrid.firstNightReminder, reminders: ['Gryffindor'],
      },
    })
    expect(characterFile(newt, { id: 'hp_newt', edition: 'community-hp', language: 'en' })).toMatchObject({ team: 'traveler', setup: true })
  })

  it('adds the translation as the other language', () => {
    const file = characterFile(hagrid, { id: 'hp_hagrid', edition: 'community-hp', language: 'en', translation: { name: '海格', ability: '在你的首个夜晚……' } })
    expect(file.zh).toEqual({ name: '海格', ability: '在你的首个夜晚……', revisions: { v1: '在你的首个夜晚……' } })
    const nameOnly = characterFile(hagrid, { id: 'hp_hagrid', edition: 'community-hp', language: 'en', translation: { name: '海格' } })
    expect(nameOnly.zh).toEqual({ name: '海格' })
  })
})

describe('translations', () => {
  const source = [{ id: 'a', team: 'townsfolk' }, { id: 'b', team: 'minion' }, { id: 'c', team: 'demon' }]

  it('pairs a translated copy by position, not where the teams differ', () => {
    const { pairs, mismatches } = alignByOrder(source, [{ id: '1', team: 'townsfolk', name: '甲' }, { id: '2', team: 'outsider', name: '乙' }])
    expect([...pairs.keys()]).toEqual(['a'])
    expect(mismatches).toEqual(['b', 'c'])
  })

  it('pairs by a map, ignoring notes and reporting unknown ids', () => {
    const { pairs, unknown } = alignByMap(source, { $source: 'BWIKI', a: { name: '甲' }, z: { name: '无' } })
    expect(pairs.get('a')).toEqual({ team: 'townsfolk', name: '甲' })
    expect(unknown).toEqual(['z'])
  })
})

describe('copies of existing characters', () => {
  it('leaves out an entry with an existing name and ability, keeps same-named new characters', () => {
    const existing = [{ id: 'geling', zh: { name: '歌伶', ability: '每局游戏限一次，在白天时，你可以提议所有玩家观看你的演出。' } }, { id: 'scarecrow', zh: { name: '稻草人', ability: '你以为你是一个镇民角色，但其实你不是。' } }]
    const copies = existingCopies([
      { id: '11_sjjl5', name: '歌伶', ability: '每局游戏限一次，在白天时，你可以提议所有玩家观看你的演出' },
      { id: '15_sjjl5', name: '稻草人', ability: '你要公开声明自己是稻草人。' },
    ], existing)
    expect([...copies]).toEqual([['11_sjjl5', 'geling']])
  })
})

describe('night order', () => {
  const base = {
    first_night: ['DUSK', 'MINION_INFO', 'DEMON_INFO', 'poisoner', 'washerwoman', 'DAWN'],
    other_nights: ['DUSK', 'poisoner', 'imp', 'empath', 'DAWN'],
  }

  it('inserts a pack as one block in its own order before the Washerwoman and the Imp', () => {
    const out = insertNightOrder(base, [
      { id: 'hp_hermione', firstNight: 21, otherNight: 14 },
      { id: 'hp_voldemort', firstNight: 11, otherNight: 10 },
      { id: 'hp_neville' },
    ])
    expect(out.first_night).toEqual(['DUSK', 'MINION_INFO', 'DEMON_INFO', 'poisoner', 'hp_voldemort', 'hp_hermione', 'washerwoman', 'DAWN'])
    expect(out.other_nights).toEqual(['DUSK', 'poisoner', 'hp_voldemort', 'hp_hermione', 'imp', 'empath', 'DAWN'])
    expect(out.order.first_night).toMatchObject({ DUSK: 10, hp_voldemort: 50, washerwoman: 70 })
    expect(out.source_order.other_nights).toEqual({ hp_hermione: 14, hp_voldemort: 10 })
    expect(base.first_night).toHaveLength(6) // input untouched
  })

  it('removes a pack before re-importing it', () => {
    const out = removeFromNightOrder(insertNightOrder(base, [{ id: 'hp_a', firstNight: 1 }]), ['hp_a'])
    expect(out.first_night).toEqual(base.first_night)
    expect(out.source_order.first_night).toEqual({})
  })
})

describe('credit', () => {
  it('marks the pack community, requires attribution and keeps the source', () => {
    expect(editionCredit({ edition: 'community-hp', name_en: 'Harry Potter', name_zh: '哈利·波特', author_en: 'JJ & Mas', source: 'https://example.com' })).toMatchObject({
      id: 'community-hp', name_en: 'Harry Potter', name_zh: '哈利·波特', author_en: 'JJ & Mas', source: 'https://example.com', requiresAttribution: true, community: true,
      terms_zh: expect.stringContaining('非官方'),
    })
  })
})
