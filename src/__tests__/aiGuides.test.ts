/**
 * Guide passages in model prompts (src/lib/ai/prompts.ts): a "怎么玩 / 举个例子"
 * question gives the model the guide text itself, sized for the runtime,
 * instead of the ability alone (which a small model then embroidered).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prepareSystemPrompt } from '../lib/ai/prompts'
import { answerLocally, loadCharacterGuides } from '../lib/ai/localAnswer'
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
    // 打更人 (a Chinese edition) has only a Chinese guide.
    const forModel = await loadCharacterGuides('How do I play the Firewatcher?', 'en', [], { crossLanguage: true })
    expect(forModel.dagengren).toContain('Chinese source')
    expect(forModel.dagengren).toContain('打更人')
    const forReader = await loadCharacterGuides('How do I play the Firewatcher?', 'en')
    expect(forReader.dagengren).toMatch(/the guide exists only in Chinese\. Source: https:\/\//)
    // Official characters have an English guide of their own.
    expect((await loadCharacterGuides('How do I play the Sailor?', 'en')).sailor).toContain('Source: https://wiki.bloodontheclocktower.com/Sailor')
  })

  it('answer English questions about Odyssey characters from the community translation', async () => {
    const play = await loadCharacterGuides('How do I play the Painter?', 'en')
    expect(play.painter).toContain('**Painter · Tips & tricks**')
    expect(play.painter).toContain('If you are the Painter')
    expect(play.painter).not.toMatch(/[一-鿿]/)
    expect(play.painter).toContain('Source (unofficial community translation of the Chinese almanac): https://www.yuque.com/')
    const bluff = await loadCharacterGuides('How should I bluff as the Herald?', 'en')
    expect(bluff.herald).toContain('**Herald · Bluffing**')
    expect(bluff.herald).toMatch(/Outsider/)
    // Chinese questions still get the author's own text.
    expect((await loadCharacterGuides('画家怎么玩？', 'zh')).painter).toContain('如果你是画家')
    // The ability itself is labelled as unofficial too.
    const answer = answerLocally(general('en'), 'What is the Painter\'s ability?')
    expect(answer.message).toContain('You start knowing an in-play character.')
    expect(answer.message).toContain('(Unofficial community translation.)')
  })

  it('fall back to the Chinese almanac for the sections the translation lacks', async () => {
    // "How to run" is not translated: a model gets the Chinese to translate, a reader the link.
    const forModel = await loadCharacterGuides('How does the Storyteller run the Painter?', 'en', [], { crossLanguage: true })
    expect(forModel.painter).toContain('**Painter · How to run** (Chinese source; translate, do not quote as official English)')
    expect(forModel.painter).toContain('最近得知')
    const forReader = await loadCharacterGuides('How does the Storyteller run the Painter?', 'en')
    expect(forReader.painter).toMatch(/this part of the guide exists only in Chinese\. Source: https:\/\/www\.yuque\.com/)
  })

  it('say when a guide was written for another version of the ability', async () => {
    // The wiki describes the first 戏子; the current one is the 山雨欲来 release.
    const xizi = await loadCharacterGuides('戏子怎么玩？', 'zh')
    expect(xizi.xizi).toMatch(/^注：这份攻略依据的能力文本是“所有戏子互相认识。/)
    // The 暴君 now uses the wiki's version: no note.
    expect((await loadCharacterGuides('暴君怎么玩？', 'zh')).baojun).not.toContain('注：')
    expect((await loadCharacterGuides('水手怎么玩？', 'zh')).sailor).not.toContain('注：')
    expect((await loadCharacterGuides('纹章官怎么玩？', 'zh')).herald).not.toContain('注：')
  })

  it('mark guides from the community wiki', async () => {
    // 刀客 has no 集石 page; its guide comes from BWIKI.
    const daoke = (await loadCharacterGuides('刀客怎么玩？', 'zh')).daoke
    expect(daoke).toContain('来源（社区 wiki，非官方）: https://wiki.biligame.com/bloodontheclocktower/')
    expect((await loadCharacterGuides('水手怎么玩？', 'zh')).sailor).not.toContain('社区')
  })

  it('are not loaded for questions a guide does not answer', async () => {
    expect(await loadCharacterGuides('水手的能力是什么？', 'zh')).toEqual({})
    const prompt = await prepareSystemPrompt(general('zh'), '水手的能力是什么？', [], { local: true })
    expect(prompt).not.toContain('提示与技巧')
  })
})
