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

  it('says when nothing local matches', () => {
    const c = EVAL_CASES[0]
    const answer = answerLocally(evalContext(c), 'zzzz qqqq')
    expect(answer.found).toBe(false)
    expect(answer.message).toContain('没有找到')
  })
})
