/** Program check of line-ups and scripts in model answers. */
import { describe, it, expect } from 'vitest'
import { checkAnswer } from '../lib/ai/answerCheck'
import { initialScripts } from '../catalog'

const tb = { language: 'zh' as const, characterIds: initialScripts.find((s) => s.slug === 'tb')!.characters }

describe('checkAnswer', () => {
  it('leaves a legal line-up alone, from a list line or the named characters', () => {
    const q = '我们 7 个人玩暗流涌动，帮我挑选这局的在场角色'
    const listed = '推荐如下。\n在场角色: washerwoman, librarian, investigator, chef, empath, poisoner, imp'
    expect(checkAnswer(tb, q, listed)).toEqual({ text: listed, corrected: false })
    const prose = '镇民：洗衣妇、图书管理员、调查员、送葬者、守鸦人；爪牙：投毒者；恶魔：小恶魔。'
    expect(checkAnswer(tb, q, prose).corrected).toBe(false)
  })

  it('appends a legal line-up when the answer breaks the counts or has none', () => {
    const q = '暗流涌动 8 人局，我想让男爵在场，该怎么配？'
    const wrong = '在场角色: washerwoman, librarian, investigator, soldier, undertaker, baron, poisoner, imp'
    const checked = checkAnswer(tb, q, wrong)
    expect(checked.corrected).toBe(true)
    expect(checked.text).toContain('爪牙 2 个（应为 1）')
    expect(checked.text).toMatch(/以下是程序生成的一套合法配置：\n在场角色: .*baron/)
    expect(checkAnswer(tb, q, '男爵会增加外来者。').text).toContain('回答里没有完整的在场角色名单')
  })

  it('checks generated scripts against the request', () => {
    const q = '帮我设计一个适合新手的完整剧本，主要用暗流涌动的角色，必须包含洗衣妇和小恶魔，不要旅行者。'
    const tooSmall = checkAnswer({ language: 'zh' }, q, '剧本角色: washerwoman, imp, beggar')
    expect(tooSmall.corrected).toBe(true)
    expect(tooSmall.text).toContain('包含旅行者')
    expect(tooSmall.text).toMatch(/剧本角色: .*washerwoman.*imp/)
    expect(checkAnswer({ language: 'zh' }, '洗衣妇的能力是什么？', '……').corrected).toBe(false)
  })
})
