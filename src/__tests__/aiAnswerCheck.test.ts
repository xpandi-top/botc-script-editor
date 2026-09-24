/** Program check of line-ups and scripts in model answers. */
import { describe, it, expect } from 'vitest'
import { checkAnswer } from '../lib/ai/answerCheck'
import { getAbilityText, getDisplayName, initialScripts } from '../catalog'

const tb = { language: 'zh' as const, characterIds: initialScripts.find((s) => s.slug === 'tb')!.characters }

describe('checkAnswer', () => {
  it('leaves a legal line-up alone, from a list line or the named characters', async () => {
    const q = '我们 7 个人玩暗流涌动，帮我挑选这局的在场角色'
    const listed = '推荐如下。\n在场角色: washerwoman, librarian, investigator, chef, empath, poisoner, imp'
    expect(checkAnswer(tb, q, listed)).toEqual({ text: listed, corrected: false })
    const prose = '镇民：洗衣妇、图书管理员、调查员、送葬者、守鸦人；爪牙：投毒者；恶魔：小恶魔。'
    expect(checkAnswer(tb, q, prose).corrected).toBe(false)
    // The program's own line-up in prose, with another character mentioned in passing.
    const { planRequest } = await import('../lib/ai/ruleFacts')
    const plan = planRequest(q, tb)
    const adopted = `推荐：${plan!.kind === 'setup' ? plan!.plan!.inPlay.map((id) => getDisplayName(id, 'zh')).join('、') : ''}。如果想加入男爵，要相应增加外来者。`
    expect(checkAnswer(tb, q, adopted).corrected).toBe(false)
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

describe('ability descriptions', () => {
  it('appends the real text for made-up abilities, and leaves quotes alone', () => {
    const made = '7 人配置\n- 镇长：你可以将你的投票权增加 2 票。\n- 小恶魔：每个夜晚*，你要选择一名玩家：他死亡。如果你以这种方式自杀，一名爪牙会变成小恶魔。\n- 厨师：适合新手，信息简单。'
    const checked = checkAnswer(tb, '镇长和小恶魔是什么能力', made)
    expect(checked.corrected).toBe(true)
    expect(checked.text).toContain(`- 镇长：${getAbilityText('mayor', 'zh')}`)
    // Only the made-up one: the exact quote and the advice line are left alone.
    const appended = checked.text.split('能力原文')[1]
    expect(appended).not.toMatch(/小恶魔|厨师/)
    // The description on the line after the name.
    const nested = checkAnswer(tb, '能力是什么', '- Soldier（士兵）：\n  - 你可以将你的投票权增加 1 票。')
    expect(nested.text).toContain(`- 士兵：${getAbilityText('soldier', 'zh')}`)
    const quoted = `洗衣妇：${getAbilityText('washerwoman', 'zh')}\nEmpath: ${getAbilityText('empath', 'en')}`
    expect(checkAnswer(tb, '洗衣妇的能力', quoted).corrected).toBe(false)
  })
})

describe('follow-ups about a recommended script', () => {
  const alVsAl = { language: 'zh' as const, characterIds: initialScripts.find((s) => s.slug === 'al_vs_al')!.characters }
  const recommendation = '推荐《暗流涌动》：官方建议新手先玩暗流涌动。暗流涌动只有 1 个恶魔。'

  it('plans for the script the assistant just recommended', async () => {
    const { planRequest } = await import('../lib/ai/ruleFacts')
    const plan = planRequest('那 7 个人玩它，帮我挑选在场角色', { ...alVsAl, previousQueries: ['官方的剧本哪个最适合入门？'], lastAnswer: recommendation })
    expect(plan?.kind === 'setup' && plan.plan!.inPlay.every((id) => tb.characterIds.includes(id))).toBe(true)
  })

  it('corrects a line-up that is not on the script the heading names', () => {
    // Legal for the page's script, but the answer says it is a Trouble Brewing line-up.
    const plan = checkAnswer(alVsAl, '7 个人玩，帮我挑选在场角色', '').text
    const pageLineUp = plan.match(/在场角色: ([^（]+)/)![1].split(', ')
    const answer = `暗流涌动（tb）7 人配置\n${pageLineUp.map((id) => getDisplayName(id, 'zh')).join('、')}`
    const checked = checkAnswer(alVsAl, '第一个适合几个人玩？给我一套 7 人的配置', answer, [], recommendation)
    expect(checked.corrected).toBe(true)
    expect(checked.text).toMatch(/在场角色: .*imp/)
  })

  it('accepts a legal line-up for the script the answer is about', () => {
    const answer = '7 人局《暗流涌动》推荐：洗衣妇、图书管理员、调查员、厨师、共情者、投毒者、小恶魔。'
    expect(checkAnswer(alVsAl, '那 7 个人玩它，帮我挑选在场角色', answer, ['官方的剧本哪个最适合入门？']).corrected).toBe(false)
  })
})
