/**
 * The no-model answer (localAnswer.ts) on every evaluation case marked
 * offline: local data and program-computed facts alone must pass.
 */
import { describe, it, expect } from 'vitest'
import { EVAL_CASES } from '../lib/ai/eval/cases'
import { evalContext } from '../lib/ai/eval/contexts'
import { gradeCase } from '../lib/ai/eval/graders'
import { answerLocally } from '../lib/ai/localAnswer'

describe('offline answers (no model)', () => {
  for (const c of EVAL_CASES.filter((x) => x.offline)) {
    it(c.id, () => {
      const answer = answerLocally(evalContext(c), c.question)
      expect(answer.found).toBe(true)
      const failed = gradeCase(c, { text: answer.message }).checks.filter((r) => !r.pass)
      expect(failed, answer.message).toEqual([])
    })
  }

  it('marks exact answers, which need no model, and stays on topic', () => {
    // A page with a game in progress: its state only matters to questions about the game.
    const game = evalContext(EVAL_CASES.find((x) => x.id === 'situation-scarlet-woman')!)
    for (const q of ['洗衣妇的能力是什么？', '6 个人存活的时候，处决至少需要几票？', '有什么剧本休闲可以玩的', '我们 7 个人玩暗流涌动，帮我挑选这局的在场角色']) {
      expect(answerLocally(game, q).definitive, q).toBe(true)
    }
    const votes = answerLocally(game, '6 个人存活的时候，处决至少需要几票？').message
    expect(votes).toContain('至少需要 3 票')
    expect(votes).not.toMatch(/当前存活|来源/)
    const casual = answerLocally(game, '有什么剧本休闲可以玩的').message
    expect(casual).not.toMatch(/当前存活|邪恶立即获胜/)
    expect(casual).not.toContain('来源: ')
    expect(answerLocally(game, '现在处决恶魔会怎样？').message).toContain('红唇女郎')
    expect(answerLocally(game, '新手说书人第一次主持要注意什么？').definitive).toBe(false)
    expect(answerLocally(game, '洗衣妇和图书管理员有什么区别？').definitive).toBe(false)
  })

  it('says when nothing local matches', () => {
    const c = EVAL_CASES[0]
    const answer = answerLocally(evalContext(c), 'zzzz qqqq')
    expect(answer.found).toBe(false)
    expect(answer.message).toContain('没有找到')
  })
})
