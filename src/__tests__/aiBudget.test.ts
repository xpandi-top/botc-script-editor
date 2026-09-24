import { afterEach, describe, expect, it, vi } from 'vitest'
import { budgetHistory, estimateTokens, GROQ_INPUT_BUDGET, messageTokens, selectContext } from '../core/ai/contextBudget'
import { getDefaultModel, loadAiSettings, migrateAiSettings, PROVIDER_MODELS } from '../lib/aiSettings'
import { buildSystemPrompt } from '../lib/ai/prompts'
import { initWikiSearch } from '../lib/wikiSearch'
import { geminiGenerate } from '../lib/gemini'
import type { AiSettings } from '../lib/aiSettings'

const user = (text: string) => ({ role: 'user' as const, parts: [{ text }] })
const model = (text: string) => ({ role: 'model' as const, parts: [{ text }] })
const settings: AiSettings = { provider: 'groq', model: getDefaultModel('groq'), keys: { groq: 'test-key', gemini: '', openrouter: '' } }
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('Groq models', () => {
  it('defaults to Qwen and migrates retired stored choices while retaining keys', () => {
    vi.stubEnv('VITE_AI_PROVIDER', 'groq')
    expect(getDefaultModel('groq')).toBe('qwen/qwen3.8-27b')
    expect(PROVIDER_MODELS.groq.map((m) => m.id)).toEqual(['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'])
    for (const retired of ['gemma2-9b-it', 'mixtral-8x7b-32768', 'llama-3.3-70b-versatile']) {
      localStorage.setItem('BOTC_AI_SETTINGS', JSON.stringify({ ...settings, model: retired }))
      expect(loadAiSettings().model).toBe(settings.model)
      migrateAiSettings()
      expect(JSON.parse(localStorage.getItem('BOTC_AI_SETTINGS')!)).toEqual(settings)
    }
  })
  it('preserves a supported user choice', () => {
    vi.stubEnv('VITE_AI_PROVIDER', 'groq')
    localStorage.setItem('BOTC_AI_SETTINGS', JSON.stringify({ ...settings, model: 'openai/gpt-oss-120b' }))
    migrateAiSettings()
    expect(loadAiSettings().model).toBe('openai/gpt-oss-120b')
  })
})

describe('local context retrieval and request budget', () => {
  it('finds a relevant Chinese passage near the end without requiring spaces', () => {
    const relevant = '中毒：中毒玩家没有能力，但说书人仍然假装能力有效。'
    const source = ['当前游戏', ...Array.from({ length: 60 }, (_, i) => `第${i}天：讨论了旅行者的流放。`), relevant].join('\n\n')
    const selected = selectContext(source, '中毒玩家能力如何生效', 250)
    expect(selected).toContain(relevant)
    expect(selected).not.toBe(source)
    expect(estimateTokens(selected)).toBeLessThanOrEqual(250)
    expect(selected).toContain('omitted material is unknown')
  })
  it('drops oldest whole turns without modifying the latest question or original history', () => {
    const contents = [user('old '.repeat(500)), model('old answer'), user('recent'), model('recent answer'), user('current question')]
    const kept = budgetHistory('instructions', contents, 200)
    expect(kept).toEqual(contents.slice(2))
    expect(contents).toHaveLength(5)
    expect(estimateTokens('instructions') + kept.reduce((n, m) => n + messageTokens(m), 32)).toBeLessThanOrEqual(200)
  })
  it('rejects an oversized current question instead of silently truncating it', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(geminiGenerate({ contents: [user('中'.repeat(8000))] }, settings)).rejects.toThrow('分段提交')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('keeps all prompt types bounded with Chinese wiki, glossary, examples and page data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ version: 1, chunks: [
      { id: 'poison', page: 'Poison', heading: '中毒', url: 'https://example.test/poison', text: Array.from({ length: 100 }, (_, i) => `中毒说明${i}：能力失效，说书人仍然假装能力有效。`).join('\n'), wordCount: 1 },
    ] }))))
    expect(await initWikiSearch()).toBe(true)
    for (const type of ['character', 'script', 'storyteller', 'gamelog', 'analysis', 'general'] as const) {
      const prompt = buildSystemPrompt({ type, title: '测试', language: 'zh', fields: [{ key: 'team', label: '阵营', value: 'townsfolk' }], serialized: Array.from({ length: 100 }, (_, i) => `中毒玩家${i}：今晚没有能力，说书人仍然假装能力有效。`).join('\n\n') }, '中毒能力')
      expect(estimateTokens(prompt) + messageTokens(user('中毒能力')) + 32, type).toBeLessThanOrEqual(GROQ_INPUT_BUDGET)
      expect(prompt).toContain('"message"')
      if (type === 'character') expect(prompt).toContain('FILLS FORMAT')
    }
  })
  it('fits the local model prompt into its 4K window, with rules and wiki evidence', async () => {
    const { prepareSystemPrompt } = await import('../lib/ai/prompts')
    const { estimateQwenTokens } = await import('../core/ai/contextBudget')
    const { WEBLLM_INPUT_BUDGET } = await import('../lib/ai/runtime/webllmModels')
    const { EVAL_CASES } = await import('../lib/ai/eval/cases')
    const { evalContext } = await import('../lib/ai/eval/contexts')
    const game = evalContext(EVAL_CASES.find((x) => x.id === 'situation-scarlet-woman')!)
    for (const q of ['新手说书人第一次主持要注意什么？', '有什么剧本休闲可以玩的', '我们 7 个人玩暗流涌动，帮我挑选这局的在场角色', '醉酒的共情者晚上会得到什么信息？']) {
      const prompt = await prepareSystemPrompt(game, q, [], { local: true })
      expect(estimateQwenTokens(prompt) + estimateQwenTokens(q) + 48, q).toBeLessThanOrEqual(WEBLLM_INPUT_BUDGET)
    }
    // Relevant core rules reach the local model too (the wiki index is shared across tests).
    expect(await prepareSystemPrompt(game, '醉酒的共情者晚上会得到什么信息？', [], { local: true })).toContain('醉酒或中毒的玩家没有能力')
  })
  it.each(['zh', 'en'] as const)('fits a large %s game context and long history into the outbound request', async (language) => {
    const relevant = language === 'zh' ? '中毒玩家：小明被投毒，今晚没有能力。' : 'Poisoned player: Alice has no ability tonight.'
    const query = language === 'zh' ? '中毒玩家今晚能使用能力吗？' : 'Can the poisoned player use their ability tonight?'
    const system = buildSystemPrompt({ type: 'storyteller', title: 'Game', language, fields: [], serialized: Array.from({ length: 200 }, (_, i) => `Day ${i}: unrelated discussion`).join('\n\n') + '\n\n' + relevant }, query)
    expect(system).toContain(relevant)
    expect(system).toContain('"message"')
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"message":"ok"}' } }] })))
    vi.stubGlobal('fetch', fetchMock)
    await geminiGenerate({ systemInstruction: system, contents: [...Array.from({ length: 20 }, () => [user('old question'.repeat(80)), model('old answer'.repeat(80))]).flat(), user(query)] }, settings)
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.model).toBe('qwen/qwen3.8-27b')
    expect(body.messages.at(-1).content).toBe(query)
    expect(body.messages.length).toBeLessThan(42)
    const tokens = body.messages.reduce((n: number, m: { content: string }) => n + estimateTokens(m.content) + 16, 16)
    expect(tokens).toBeLessThanOrEqual(GROQ_INPUT_BUDGET)
  })
})
