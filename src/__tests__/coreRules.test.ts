/**
 * The rules text every AI prompt and the rules search rely on. Each check is
 * a point the official glossary states and models (or earlier prompt text)
 * got wrong.
 */
import { describe, it, expect } from 'vitest'
import { CORE_RULES, coreRuleSections } from '../core/ai/rules'
import { CHARACTER_DISTRIBUTION } from '../core/engine/setup'
import { buildScriptContext } from '../lib/ai/context'
import { initialScripts } from '../catalog'

const { en, zh } = CORE_RULES

describe('core rules', () => {
  it('executes on at least half the alive players, never "more than half"', () => {
    expect(en).toContain('at least half the number of alive players')
    expect(en).toContain('6 alive → 3 votes')
    expect(zh).toContain('至少达到存活玩家数的一半')
    expect(zh).toContain('6 人存活需 3 票')
    expect(en).not.toMatch(/more than half|simple majority/i)
    expect(zh).not.toMatch(/超过半数|过半/)
  })

  it('evil wins with two players alive at any time, Travellers not counted', () => {
    expect(en).toContain('Evil wins when just two players are alive (Travellers do not count)')
    expect(zh).toContain('仅剩两名玩家存活时邪恶获胜（旅行者不计入）')
    expect(en).not.toMatch(/start of the day|before any execution/i)
  })

  it('first-night info: Minions learn each other and the Demon, only with 7+ players', () => {
    expect(en).toContain('the Minions learn which players are Minions and which player is the Demon')
    expect(en).toContain('With 5 or 6 players there is no Minion info or Demon info')
    expect(en).not.toMatch(/in some editions/i)
  })

  it('Travellers have an alignment chosen by the Storyteller; exile is not a vote', () => {
    expect(en).not.toMatch(/neutral or any alignment/i)
    expect(en).toContain('the Storyteller chooses its alignment')
    expect(en).toContain('An exile is not a vote and not an execution')
    expect(zh).toContain('流放不是投票，也不是处决')
  })

  it('explains that a script is a character pool, with the official counts per player count', () => {
    expect(en).toContain('A script is the list of characters the Storyteller may use, not a story')
    expect(zh).toContain('剧本上的角色不会全部上场')
    for (const [players, d] of Object.entries(CHARACTER_DISTRIBUTION)) {
      expect(en).toContain(`${players}: ${d.townsfolk}/${d.outsider}/${d.minion}/${d.demon}`)
      expect(zh).toContain(`${players}人: ${d.townsfolk}/${d.outsider}/${d.minion}/${d.demon}`)
    }
    expect(CHARACTER_DISTRIBUTION[15]).toEqual({ townsfolk: 9, outsider: 2, minion: 3, demon: 1 })
  })

  it('uses the right example characters in Chinese', () => {
    expect(zh).toContain('醉酒的共情者')
    expect(zh).not.toContain('醉酒的占卜师')
  })

  it('has the same sections in both languages', () => {
    expect(coreRuleSections('zh')).toHaveLength(coreRuleSections('en').length)
    expect(coreRuleSections('en').map((s) => s.heading)).toContain('NOMINATIONS, VOTES & EXECUTION')
  })

  it('script context states the official counts, not a wrong 15-player line-up', () => {
    const ctx = buildScriptContext({ script: initialScripts.find((s) => s.slug === 'tb')!, language: 'zh' })
    expect(ctx.serialized).toContain('15人 9/2/3/1')
    expect(ctx.serialized).not.toContain('2爪牙, 1恶魔')
  })
})
