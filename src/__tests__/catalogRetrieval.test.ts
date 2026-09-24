import { afterEach, describe, expect, it, vi } from 'vitest'
import { allCharacterFiles, getAbilityText, getDisplayName } from '../catalog'
import { retrieveCatalog, formatCatalogRetrieval } from '../lib/ai/catalogRetrieval'
import { buildSystemPrompt, prepareSystemPrompt } from '../lib/ai/prompts'
import { estimateTokens, GROQ_INPUT_BUDGET } from '../core/ai/contextBudget'
import { callAi } from '../lib/ai/api'

const ctx = { type: 'general' as const, title: 'Chat', language: 'zh' as const, fields: [] }
afterEach(() => vi.unstubAllGlobals())

describe('catalog prequery', () => {
  it.each(['奥德赛的角色包', 'Odyssey character pack', 'ODYSSEY 有多少角色？'])('retrieves the complete local pack for %s', (query) => {
    const result = retrieveCatalog(query, 'zh')
    const roster = allCharacterFiles.filter((c) => c.edition === 'odyssey')
    expect(result.editionIds).toEqual(['odyssey'])
    expect(roster).toHaveLength(119)
    expect(result.facts).toContain(`Exact local catalog count (all teams, not retrieval hits): ${roster.length}`)
    expect(result.facts).toContain('townsfolk=51')
    expect(result.facts).toContain('太一')
    const formatted = formatCatalogRetrieval(result)
    expect(formatted).toContain('Complete local roster')
    for (const c of roster) expect(formatted).toContain(getDisplayName(c.id, 'zh'))
    expect(estimateTokens(formatted)).toBeLessThanOrEqual(1900)
  })
  it('resolves a follow-up from user history, but an explicit new entity takes precedence', () => {
    expect(retrieveCatalog('它有多少角色？', 'zh', ['奥德赛角色包']).editionIds).toEqual(['odyssey'])
    expect(retrieveCatalog('How many characters?', 'en', ['Odyssey']).editionIds).toEqual(['odyssey'])
    expect(retrieveCatalog('黯月初升有多少角色？', 'zh', ['奥德赛角色包']).editionIds).toEqual(['bmr'])
    expect(retrieveCatalog('什么是提名？', 'zh', ['奥德赛角色包']).editionIds).toEqual([])
    expect(retrieveCatalog('不存在的角色包有多少角色？', 'zh', ['奥德赛角色包']).editionIds).toEqual([])
  })
  it('fetches the current exact ability and its provenance for a named character', () => {
    const result = retrieveCatalog('奥德赛仲裁者的能力是什么？', 'zh')
    expect(result.characterIds).toContain('arbiter')
    expect(formatCatalogRetrieval(result)).toContain(getAbilityText('arbiter', 'zh'))
    expect(formatCatalogRetrieval(result)).toContain('assets/characters/individual/arbiter.json')
    expect(retrieveCatalog('这种幻想能实现吗', 'zh').characterIds).not.toContain('illus')
  })
  it('injects the catalog into the general chat system prompt and forbids guessing', () => {
    const prompt = buildSystemPrompt(ctx, '奥德赛有多少角色？')
    expect(prompt).toContain('119')
    expect(prompt).toContain('LOCAL CATALOG RESULTS')
    expect(prompt).toContain('不得使用训练记忆补全')
    expect(prompt).not.toContain('再从训练记忆回答')
    expect(estimateTokens(prompt)).toBeLessThan(GROQ_INPUT_BUDGET - 100)
  })
  it('loads the local almanac for a pack-specific rule even when the wiki is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    const prompt = await prepareSystemPrompt(ctx, '奥德赛的审判日是什么意思？')
    expect(prompt).toContain('首个存活玩家不足5名')
    expect(prompt).toContain('xbqrdhrclcivp0i3')
    expect(estimateTokens(prompt)).toBeLessThan(GROQ_INPUT_BUDGET - 100)
  })
  it('resolves local terminology without requiring the edition name', async () => {
    const prompt = await prepareSystemPrompt(ctx, '审判日是什么意思？')
    expect(prompt).toContain('Local edition: 奥德赛')
    expect(prompt).toContain('首个存活玩家不足5名')
  })
  it.each(['character', 'script', 'storyteller', 'gamelog', 'analysis', 'general'] as const)('keeps pack results in the %s prompt within budget', (type) => {
    const prompt = buildSystemPrompt({ ...ctx, type, serialized: '角色能力及记录。'.repeat(500) }, '奥德赛角色包有哪些角色？')
    expect(prompt).toContain('Exact local catalog count (all teams, not retrieval hits): 119')
    expect(estimateTokens(prompt)).toBeLessThan(GROQ_INPUT_BUDGET - 100)
  })
  it('sends retrieved data in the actual chat request rather than only constructing it', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"message":"119"}' } }] })))
    vi.stubGlobal('fetch', fetchMock)
    const query = '它一共有多少角色？'
    const prompt = await prepareSystemPrompt(ctx, query, ['奥德赛角色包'])
    await callAi({ systemPrompt: prompt, history: [{ role: 'user', parts: [{ text: query }] }], settings: { provider: 'groq', model: 'qwen/qwen3.8-27b', keys: { groq: 'test-key', gemini: '', openrouter: '' } } })
    const init = (fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit])[1]
    const body = JSON.parse(init.body as string)
    expect(body.messages[0].content).toContain('Exact local catalog count (all teams, not retrieval hits): 119')
    expect(body.messages.at(-1).content).toBe(query)
  })
})
