/**
 * Guide passages in model prompts (src/lib/ai/prompts.ts): a "怎么玩 / 举个例子"
 * question gives the model the guide text itself, sized for the runtime,
 * instead of the ability alone (which a small model then embroidered).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prepareSystemPrompt } from '../lib/ai/prompts'
import { loadCharacterGuides } from '../lib/ai/localAnswer'
import { emptyMeta } from '../lib/ai/trace'
import { estimateQwenTokens, estimateTokens, GROQ_INPUT_BUDGET } from '../core/ai/contextBudget'
import { WEBLLM_INPUT_BUDGET } from '../lib/ai/runtime/webllmModels'
import { HOSTED_INPUT_BUDGET } from '../lib/ai/runtime/hosted'
import type { AiContext } from '../lib/ai/types'

const general = (language: 'zh' | 'en'): AiContext => ({ type: 'general', title: '', language, fields: [] })

describe('guide passages in prompts', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') })) })

  it('fit the local 4K window, with the tips themselves', async () => {
    const meta = emptyMeta()
    const prompt = await prepareSystemPrompt(general('zh'), '水手这个角色怎么玩', [], { local: true, meta })
    expect(prompt).toContain('水手 · 提示与技巧')
    expect(prompt).toContain('clocktower-wiki.gstonegames.com')
    expect(meta.guides).toEqual(['sailor'])
    expect(estimateQwenTokens(prompt)).toBeLessThan(WEBLLM_INPUT_BUDGET - 400)
    // A follow-up keeps the character and switches to the examples.
    const examples = await prepareSystemPrompt(general('zh'), '能举个例子吗', ['水手这个角色怎么玩'], { local: true })
    expect(examples).toContain('水手 · 范例')
    expect(examples).toContain('驱魔人')
    expect(estimateQwenTokens(examples)).toBeLessThan(WEBLLM_INPUT_BUDGET - 400)
  })

  it('stay within the Groq budget and grow with the hosted one', async () => {
    const groq = await prepareSystemPrompt(general('zh'), '水手这个角色怎么玩', [])
    expect(groq).toContain('水手 · 提示与技巧')
    expect(estimateTokens(groq)).toBeLessThan(GROQ_INPUT_BUDGET - 200)
    const hosted = await prepareSystemPrompt(general('zh'), '水手这个角色怎么玩', [], { inputBudget: HOSTED_INPUT_BUDGET })
    expect(hosted.length).toBeGreaterThan(groq.length)
    expect(estimateTokens(hosted)).toBeLessThan(HOSTED_INPUT_BUDGET)
  })

  it('give a model the other language\'s guide to translate, and a reader only the link', async () => {
    const forModel = await loadCharacterGuides('How do I play the Painter?', 'en', [], { crossLanguage: true })
    expect(forModel.painter).toContain('Chinese source')
    expect(forModel.painter).toContain('画家')
    const forReader = await loadCharacterGuides('How do I play the Painter?', 'en')
    expect(forReader.painter).toMatch(/only in Chinese\. Source: https:\/\/www\.yuque\.com/)
    // Official characters have an English guide of their own.
    expect((await loadCharacterGuides('How do I play the Sailor?', 'en')).sailor).toContain('Source: https://wiki.bloodontheclocktower.com/Sailor')
  })

  it('say when a guide was written for another version of the ability', async () => {
    // The wiki's 暴君 kills one player a night; ours chooses up to two.
    const baojun = await loadCharacterGuides('暴君怎么玩？', 'zh')
    expect(baojun.baojun).toMatch(/^注：这份攻略依据的能力文本是“每个夜晚\*，你要选择一名玩家：他死亡。/)
    expect((await loadCharacterGuides('水手怎么玩？', 'zh')).sailor).not.toContain('注：')
    expect((await loadCharacterGuides('纹章官怎么玩？', 'zh')).herald).not.toContain('注：')
  })

  it('are not loaded for questions a guide does not answer', async () => {
    expect(await loadCharacterGuides('水手的能力是什么？', 'zh')).toEqual({})
    const prompt = await prepareSystemPrompt(general('zh'), '水手的能力是什么？', [], { local: true })
    expect(prompt).not.toContain('提示与技巧')
  })
})
