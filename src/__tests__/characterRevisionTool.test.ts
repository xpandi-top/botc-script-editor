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
