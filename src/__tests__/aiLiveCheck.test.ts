import { expect, it } from 'vitest'
import { prepareSystemPrompt } from '../lib/ai/prompts'
import { geminiGenerate } from '../lib/gemini'

// Opt-in only: this test makes a paid/provider-metered request.
// BOTC_LIVE_AI_TEST=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/__tests__/aiLiveCheck.test.ts
it.skipIf(process.env.BOTC_LIVE_AI_TEST !== '1')('live Qwen corrects an earlier unsupported Odyssey claim from retrieved local data', async () => {
  const query = '它一共有多少角色？作者是谁？请根据本地数据简短回答。'
  const systemInstruction = await prepareSystemPrompt({ type: 'general', title: 'Chat', language: 'zh', fields: [] }, query, ['奥德赛角色包'])
  const response = await geminiGenerate({
    systemInstruction,
    contents: [
      { role: 'user', parts: [{ text: '奥德赛角色包' }] },
      { role: 'model', parts: [{ text: '根据训练记忆，奥德赛是官方角色包，通常包含20个角色。' }] },
      { role: 'user', parts: [{ text: query }] },
    ],
    temperature: 0,
    maxOutputTokens: 2048,
  }, { provider: 'groq', model: 'qwen/qwen3.8-27b', keys: {
    groq: process.env.VITE_GROQ_API_KEY || process.env.VITE_AI_API_KEY || '', gemini: '', openrouter: '',
  } })
  expect(response.text).toContain('119')
  expect(response.text).toMatch(/太一|Taiyi/i)
}, 60000)
