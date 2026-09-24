/**
 * The no-model answer (localAnswer.ts) on every evaluation case marked
 * offline: local data and program-computed facts alone must pass.
 */
import { describe, it, expect } from 'vitest'
import { EVAL_CASES } from '../lib/ai/eval/cases'
import { evalContext } from '../lib/ai/eval/contexts'
import { gradeCase } from '../lib/ai/eval/graders'
import { answerLocally } from '../lib/ai/localAnswer'
import { initialScripts } from '../catalog'

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

  it('answers questions about the current script from the program', () => {
    const game = evalContext(EVAL_CASES.find((x) => x.id === 'situation-scarlet-woman')!)
    const bmr = { ...game, characterIds: initialScripts.find((s) => s.slug === 'bmr')!.characters }
    const order = answerLocally(bmr, '第一个夜晚的唤醒顺序是什么？')
    expect(order.definitive).toBe(true)
    expect(order.message).toMatch(/当前剧本第一个夜晚的唤醒顺序：爪牙信息 → .*恶魔信息 → .*侍女/)
    const drunk = answerLocally(bmr, '这个剧本有哪些角色会让人醉酒或中毒？').message
    expect(drunk).toMatch(/水手：/)
    expect(drunk).toMatch(/普卡：/)
    expect(drunk).not.toContain('官方建议') // not script advice
    expect(answerLocally(bmr, '这个剧本里有哪些相克？').message).toContain('当前剧本的角色之间没有相克规则')
    // A pack with jinxes, named in the question.
    expect(answerLocally(game, '暗流涌动有哪些爪牙？').message).toContain('爪牙（4）：男爵、投毒者、红唇女郎、间谍')
    expect(answerLocally(bmr, '教授能复活谁？').message).not.toContain('阵营与胜负')
  })

  it('answers the conversation that went wrong with a small local model', async () => {
    const general = evalContext(EVAL_CASES.find((x) => x.id === 'fact-ability-washerwoman')!)
    const { retrieveCatalog } = await import('../lib/ai/catalogRetrieval')
    const { loadCharacterGuides } = await import('../lib/ai/localAnswer')
    const earlier = ['水手这个角色怎么玩']
    // "能举个例子吗" continues with 水手.
    expect(retrieveCatalog('能举个例子吗', 'zh', earlier).characterIds).toContain('sailor')
    // "醉着是什么意思": the rule, exactly, not a model's guess.
    const term = answerLocally(general, '醉着是什么意思', earlier)
    expect(term.definitive).toBe(true)
    expect(term.message).toContain('醉酒或中毒的玩家没有能力，但以为自己有')
    // "血染里的醉确定是这个意思吗": the rule first, not only 水手's text carried over.
    const sure = answerLocally(general, '血染里的醉确定是这个意思吗？', [...earlier, '能举个例子吗', '醉着是什么意思'])
    expect(sure.message.indexOf('醉酒或中毒的玩家没有能力')).toBeGreaterThan(0)
    expect(sure.message).not.toContain('水手 / Sailor')
    // Examples and tips from a pack's almanac, for a guide question.
    const guides = await loadCharacterGuides('纹章官怎么玩？', 'zh')
    expect(guides.herald).toContain('纹章官 · 玩法技巧')
    const examples = await loadCharacterGuides('能举个例子吗', 'zh', ['纹章官怎么玩？'])
    const answer = answerLocally(general, '能举个例子吗', ['纹章官怎么玩？'], undefined, examples)
    expect(answer.message).toContain('纹章官 · 范例')
    expect(answer.definitive).toBe(true)
  })

  it('says when nothing local matches', () => {
    const c = EVAL_CASES[0]
    const answer = answerLocally(evalContext(c), 'zzzz qqqq')
    expect(answer.found).toBe(false)
    expect(answer.message).toContain('没有找到')
  })
})
