/**
 * Character revision tooling (scripts/add-character-revision.mjs,
 * scripts/revision-helpers.mjs) on the per-character files: a new revision
 * becomes current or stays an alternative, a language left out keeps its
 * text, and every character file passes validation (run by `npm run build`).
 */
import { describe, expect, it } from 'vitest'
// @ts-expect-error — plain ESM build script without type declarations
import { addRevision } from '../../scripts/add-character-revision.mjs'
// @ts-expect-error — plain ESM build script without type declarations
import { validateAllRevisions } from '../../scripts/revision-helpers.mjs'

const mayor = {
  id: 'mayor', team: 'townsfolk', edition: 'tb', current_revision: 'v1',
  revisions: [{ id: 'v1', note: '' }],
  en: { name: 'Mayor', ability: 'If you die at night, another player might die instead.', revisions: { v1: 'If you die at night, another player might die instead.' } },
  zh: { name: '镇长', ability: '如果你在夜晚死亡，可能会有一名其他玩家代替你死亡。', revisions: { v1: '如果你在夜晚死亡，可能会有一名其他玩家代替你死亡。' } },
}

describe('add-character-revision', () => {
  it('adds a current revision, keeping the other language\'s text', () => {
    const next = addRevision(mayor, { revision: 'v2026-09', note: '集石官方中文译文', texts: { zh: '如果你在夜晚即将死亡，可能会有一名其他玩家代替你死亡。' } })
    expect(next.current_revision).toBe('v2026-09')
    expect(next.revisions.map((r: { id: string }) => r.id)).toEqual(['v1', 'v2026-09'])
    expect(next.zh.ability).toContain('即将死亡')
    expect(next.zh.revisions.v1).toBe(mayor.zh.ability)
    expect(next.en.revisions['v2026-09']).toBe(mayor.en.ability)
    expect(Object.keys(next)).toEqual(Object.keys(mayor))
  })

  it('can add an alternative without changing the current one', () => {
    const next = addRevision(mayor, { revision: 'v2', texts: { en: 'Other text.' }, keepCurrent: true })
    expect(next.current_revision).toBe('v1')
    expect(next.en.ability).toBe(mayor.en.ability)
    expect(next.en.revisions.v2).toBe('Other text.')
  })

  it('refuses a duplicate revision id', () => {
    expect(() => addRevision(mayor, { revision: 'v1', texts: { en: 'x' } })).toThrow(/already exists/)
  })
})

describe('character files', () => {
  it('all pass revision validation', () => {
    expect(() => validateAllRevisions()).not.toThrow()
  })
})

describe('check-abilities', async () => {
  // @ts-expect-error — plain ESM build script without type declarations
  const { classify } = await import('../../scripts/check-abilities.mjs')
  const character = (en: string, zh: Record<string, string>, current = 'v1') => ({
    id: 'x', current_revision: current,
    en: { ability: en, revisions: { [current]: en } },
    zh: { ability: zh[current], revisions: zh },
  })

  it('tells spelling from errata in English', () => {
    expect(classify(character('Your 2 alive neighbours are evil.', { v1: '甲' }), { ability: 'Your 2 alive neighbors are evil.' }, null)[0].kind).toBe('en-wording')
    expect(classify(character('If executed, you win.', { v1: '甲' }), { ability: 'If executed, evil wins.' }, null)[0].kind).toBe('en-errata')
  })

  it('tells an outdated wiki, rewording and another version apart in Chinese', () => {
    const older = character('Each Minion gets 3 bluffs.', { v1: '爪牙会在首个夜晚得知三个不在场的角色。', v2: '每名爪牙会得到三个伪装。' }, 'v2')
    expect(classify(older, null, '爪牙会在其首个夜晚得知三个不在场的角色。')[0].kind).toBe('zh-older')
    const wording = character('If you die at night, another player might die instead.', { v1: '如果你在夜晚死亡，可能会有一名其他玩家代替你死亡。' })
    expect(classify(wording, null, '如果你在夜晚即将死亡，可能会有一名其他玩家代替你死亡。')[0].kind).toBe('zh-wording')
    const version = character('Choose up to 2 players.', { v1: '每个夜晚*，你可以选择至多两名玩家：他们死亡。' })
    expect(classify(version, null, '每个夜晚*，你要选择一名玩家：他死亡。如果你杀死了与爪牙邻近的玩家，下个夜晚可以选择两名。')[0].kind).toBe('zh-version')
  })
})
