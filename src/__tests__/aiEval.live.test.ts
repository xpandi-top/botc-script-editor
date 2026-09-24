/**
 * Live AI evaluation against a running API worker (opt-in, uses Workers AI
 * neurons). Runs every case in src/lib/ai/eval/cases.ts the way the AI panel
 * does — local retrieval builds the prompt, the hosted runtime answers — and
 * writes a report.
 *
 *   cd worker && npx wrangler dev …                     # or a deployed worker
 *   BOTC_AI_EVAL_URL=http://localhost:8787 npx vitest run src/__tests__/aiEval.live.test.ts
 *
 * Options: BOTC_AI_EVAL_ONLY=id1,id2 or a category (fact, script, …),
 * BOTC_AI_EVAL_OUT=report.md (default ai-eval-report.md).
 */
import fs from 'node:fs'
import { it, expect, vi } from 'vitest'
import { EVAL_CASES } from '../lib/ai/eval/cases'
import { evalContext } from '../lib/ai/eval/contexts'
import { gradeCase } from '../lib/ai/eval/graders'
import { callAi } from '../lib/ai/api'
import { checkAnswer } from '../lib/ai/answerCheck'
import { answerLocally } from '../lib/ai/localAnswer'
import { prepareSystemPrompt } from '../lib/ai/prompts'
import { HOSTED_INPUT_BUDGET } from '../lib/ai/runtime/hosted'
import { estimateTokens } from '../core/ai/contextBudget'

const url = process.env.BOTC_AI_EVAL_URL
const only = process.env.BOTC_AI_EVAL_ONLY?.split(',').map((s) => s.trim()).filter(Boolean)
vi.mock('../lib/googleAuth', () => ({ getValidToken: async () => null }))

it.skipIf(!url)('hosted AI evaluation', async () => {
  vi.stubEnv('VITE_API_URL', url!)
  const cases = EVAL_CASES.filter((c) => !only?.length || only.includes(c.id) || only.includes(c.category) || only.includes(c.difficulty))
  const rows: Array<Record<string, unknown>> = []
  let model = ''
  for (const c of cases) {
    const ctx = evalContext(c)
    const system = await prepareSystemPrompt(ctx, c.question, [], { inputBudget: HOSTED_INPUT_BUDGET })
    const started = Date.now()
    const result = await callAi({
      systemPrompt: system,
      history: [{ role: 'user', parts: [{ text: c.question }] }],
      settings: { provider: 'botc', model: 'default', keys: { groq: '', openrouter: '', gemini: '' } },
      temperature: 0.6,
    })
    const seconds = (Date.now() - started) / 1000
    // As the panel shows it: after the program check of line-ups and scripts,
    // or, when the model fails, the error followed by the local-data answer.
    const checked = result.ok ? checkAnswer(ctx, c.question, result.response.message) : null
    const fallback = result.ok ? null : answerLocally(ctx, c.question)
    const text = result.ok ? checked!.text : `ERROR: ${result.error}${fallback?.found ? `\n\n${fallback.message}` : ''}`
    const grade = gradeCase(c, { text, steps: result.ok ? result.steps : [] })
    if (result.ok && result.usage) model ||= 'hosted'
    rows.push({
      id: c.id, category: c.category, difficulty: c.difficulty, pass: grade.pass,
      failed: grade.checks.filter((r) => !r.pass).map((r) => `${r.label}${r.detail ? ` (${r.detail})` : ''}`).join('; '),
      seconds, promptEstimate: estimateTokens(system),
      promptTokens: result.ok ? result.usage?.promptTokens : undefined,
      neurons: result.ok ? result.usage?.neurons : undefined,
      rounds: result.ok ? result.usage?.rounds : undefined,
      tools: result.ok ? (result.steps ?? []).map((s) => s.tool).join(' → ') : '',
      corrected: !!checked?.corrected,
      fallback: !!fallback?.found,
      answer: text,
    })
    console.log(`${grade.pass ? '✓' : '✗'} ${c.id} (${seconds.toFixed(1)}s${result.ok && result.usage ? `, ${result.usage.neurons} neurons` : ''})${grade.pass ? '' : ` — ${rows.at(-1)!.failed}`}`)
  }

  const passed = rows.filter((r) => r.pass).length
  const sum = (key: string) => rows.reduce((n, r) => n + (Number(r[key]) || 0), 0)
  const status = await fetch(`${url}/v1/ai/status`).then((r) => r.json()).catch(() => null) as { chat?: { model?: string } } | null
  model = status?.chat?.model ?? model
  const summary = `${passed}/${rows.length} passed · model ${model} · ${sum('neurons').toFixed(0)} neurons · ${(sum('seconds') / rows.length).toFixed(1)} s avg`
  const table = [
    '| case | 类别 | 难度 | 结果 | 程序校正 | 未通过的检查 | 秒 | 提示词估算 | 实际输入 token | neurons | 轮次 | 工具 |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.id} | ${r.category} | ${r.difficulty} | ${r.pass ? '✅' : '❌'} | ${r.corrected ? '校正' : r.fallback ? '本地回退' : ''} | ${String(r.failed).replace(/\|/g, '/')} | ${Number(r.seconds).toFixed(1)} | ${r.promptEstimate} | ${r.promptTokens ?? ''} | ${r.neurons ?? ''} | ${r.rounds ?? ''} | ${r.tools} |`),
  ].join('\n')
  const answers = rows.map((r) => `### ${r.id} ${r.pass ? '✅' : '❌'}\n\n${String(r.answer).trim()}\n`).join('\n')
  const out = process.env.BOTC_AI_EVAL_OUT ?? 'ai-eval-report.md'
  fs.writeFileSync(out, `# AI eval — ${new Date().toISOString()}\n\n${summary}\n\n${table}\n\n## Answers\n\n${answers}`)
  fs.writeFileSync(out.replace(/\.md$/, '.json'), JSON.stringify({ summary, model, rows }, null, 2))
  console.log(`\n${summary}\nreport: ${out}`)
  expect(rows.length).toBe(cases.length)
}, 30 * 60_000)
