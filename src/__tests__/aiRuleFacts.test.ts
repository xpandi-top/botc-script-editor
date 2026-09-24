/** Rule numbers the program computes for the model, and the page state it always keeps. */
import { describe, it, expect } from 'vitest'
import { computeRuleFacts } from '../lib/ai/ruleFacts'
import { initialScripts } from '../catalog'
import { EVAL_CASES } from '../lib/ai/eval/cases'
import { evalContext } from '../lib/ai/eval/contexts'
import { buildSystemPrompt } from '../lib/ai/prompts'
import { selectContext } from '../core/ai/contextBudget'
import { gradeCase } from '../lib/ai/eval/graders'

const tb = initialScripts.find((s) => s.slug === 'tb')!.characters

describe('computed rule facts', () => {
  it('votes to execute from the alive count', () => {
    expect(computeRuleFacts('6 个人存活的时候，处决至少需要几票？', 'zh')).toContain('6 名存活玩家时，处决至少需要 3 票')
    expect(computeRuleFacts('How many votes to execute with 7 players alive?', 'en')).toContain('at least 4 votes')
  })

  it('in-play counts for a player count, with setup modifiers from the script', () => {
    const facts = computeRuleFacts('暗流涌动 8 人局，我想让男爵在场，该怎么配？', 'zh', { characterIds: tb })
    expect(facts).toContain('8 人局的在场角色：镇民 5 / 外来者 1 / 爪牙 1 / 恶魔 1')
    expect(facts).toContain('若男爵（爪牙，[+2外来者]）在场：镇民 3 / 外来者 3 / 爪牙 1 / 恶魔 1')
    expect(computeRuleFacts('How many Outsiders are in play in a 9-player game by default?', 'en')).toContain('9-player game has in play: 5 Townsfolk / 2 Outsiders / 1 Minions / 1 Demon')
  })

  it('stays out of unrelated questions', () => {
    expect(computeRuleFacts('洗衣妇的能力是什么？', 'zh', { characterIds: tb })).toBe('')
    expect(computeRuleFacts('奥德赛有 119 个角色吗？', 'zh')).toBe('')
  })

  it('reaches the prompt', () => {
    const c = EVAL_CASES.find((x) => x.id === 'setup-tb-8-baron')!
    expect(buildSystemPrompt(evalContext(c), c.question)).toContain('若男爵（爪牙，[+2外来者]）在场')
  })
})

describe('page state in the prompt', () => {
  it('keeps the seats of a game whatever the question', () => {
    const c = EVAL_CASES.find((x) => x.id === 'situation-mayor')!
    const prompt = buildSystemPrompt(evalContext(c), c.question)
    expect(prompt).toContain('#2 P2: 镇长 [mayor, 镇民] — 存活')
    expect(prompt).toContain('存活玩家: 3 人（不含旅行者）；今天处决至少需要 2 票')
  })

  it('keeps the first paragraph whole unless it cannot fit', () => {
    const first = Array.from({ length: 30 }, (_, i) => `seat ${i}: alive`).join('\n')
    const text = `${first}\n\n${Array.from({ length: 40 }, (_, i) => `note ${i} about drunk players`).join('\n\n')}`
    expect(selectContext(text, 'drunk', 800).startsWith(first)).toBe(true)
    // Too big for the budget: fall back to line selection rather than dropping it.
    const tight = selectContext(text, 'drunk', 60)
    expect(tight).toContain('seat 0: alive')
    expect(tight).not.toContain('seat 29: alive')
  })
})

describe('program facts answer the hard cases on their own', () => {
  for (const id of ['setup-tb-7', 'setup-tb-8-baron', 'script-newbie-tb', 'script-teensy-odyssey', 'situation-scarlet-woman', 'situation-mayor', 'situation-evil-close']) {
    it(id, () => {
      const c = EVAL_CASES.find((x) => x.id === id)!
      const facts = computeRuleFacts(c.question, c.language, evalContext(c))
      const grade = gradeCase(c, { text: facts })
      expect(grade.checks.filter((r) => !r.pass), facts).toEqual([])
    })
  }
})
