/**
 * Offline cold start: after one online visit, the installed app (service
 * worker precache + runtime caches) must load and answer AI questions from
 * local data with no server and no network.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'

const PORT = 4174
const BASE = `http://localhost:${PORT}/botc-script-editor/`
let server: ChildProcess | null = null

async function startServer() {
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  for (let i = 0; i < 60; i++) {
    if (await fetch(BASE).then((r) => r.ok, () => false)) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('vite preview did not start')
}
function stopServer() {
  server?.kill()
  server = null
}
test.afterAll(stopServer)

async function ask(page: Page, question: string) {
  const input = page.getByPlaceholder(/输入消息|Type a message/)
  await input.fill(question)
  await input.press('Enter')
}

test('loads and answers from local data with no server and no network', async ({ page, context }) => {
  await page.addInitScript(() => localStorage.setItem('botc-tutorial-done', '1'))
  await startServer()

  // Online visit: the service worker installs and takes control.
  await page.goto(BASE)
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  // Opening the assistant loads the wiki excerpts into the runtime cache.
  await page.getByRole('button', { name: /AI 助手|AI Assistant/ }).click()
  await expect(page.getByPlaceholder(/输入消息|Type a message/)).toBeVisible()
  // The wiki excerpts are precached with the app shell.
  await expect.poll(() => page.evaluate(async () => {
    for (const key of await caches.keys()) {
      for (const request of await (await caches.open(key)).keys()) if (request.url.includes('wiki-chunks.json')) return true
    }
    return false
  }), { timeout: 15_000 }).toBe(true)

  // Character guides are not precached: an edition's chunk is cached when first
  // used (here imported directly, as the app's lazy import does) and works offline after.
  const bmrGuide = readdirSync('dist/assets').find((name) => /^almanac-bmr\.zh-.*\.js$/.test(name))!
  await page.evaluate(async (url) => { await import(url) }, `${BASE}assets/${bmrGuide}`)
  await expect.poll(() => page.evaluate(async () => (await (await caches.open('almanac')).keys()).length), { timeout: 15_000 }).toBe(1)

  // Offline: no server, no network.
  stopServer()
  await context.setOffline(true)
  await page.reload()
  await page.waitForSelector('[role="tablist"]', { state: 'attached', timeout: 15_000 })
  await page.getByRole('button', { name: /AI 助手|AI Assistant/ }).click()

  // A rules question: core rules and the character's official text, marked offline.
  await ask(page, '醉酒的共情者晚上会得到什么信息？')
  await expect(page.getByText(/当前离线|Offline; this is local data/).first()).toBeVisible()
  await expect(page.getByText(/醉酒或中毒的玩家没有能力/).first()).toBeVisible()
  // A computed answer.
  await ask(page, '6 个人存活的时候，处决至少需要几票？')
  await expect(page.getByText(/处决至少需要 3 票/).first()).toBeVisible()
  // An open question: an excerpt from the cached wiki, with its source.
  await ask(page, '新手说书人第一次主持要注意什么？')
  await expect(page.getByText(/来源: |Source: /).first()).toBeVisible()
  // A guide question for the cached edition: the 集石 tips, not just the ability.
  await ask(page, '水手这个角色怎么玩？')
  await expect(page.getByText('水手 · 提示与技巧').first()).toBeVisible()
  // An edition never opened online: the ability still answers, without a guide.
  await ask(page, '小恶魔怎么玩？')
  await expect(page.getByText(/每个夜晚\*，你要选择一名玩家：他死亡/).last()).toBeVisible()
  await expect(page.getByText('小恶魔 · 提示与技巧')).toHaveCount(0)
})

// Opt-in: downloads Qwen3 0.6B (~0.4 GB) and needs a GPU with shader-f16.
test('the local model loads from cache and answers with no server and no network', async ({ page, context }) => {
  test.skip(!process.env.BOTC_E2E_WEBGPU, 'set BOTC_E2E_WEBGPU=1 to run (downloads ~0.4 GB)')
  test.setTimeout(600_000)
  await page.addInitScript(() => {
    localStorage.setItem('botc-tutorial-done', '1')
    if (!localStorage.getItem('BOTC_AI_SETTINGS')) {
      localStorage.setItem('BOTC_AI_SETTINGS', JSON.stringify({ provider: 'webllm', model: 'Qwen3-0.6B-q4f16_1-MLC', keys: { groq: '', gemini: '', openrouter: '' } }))
    }
  })
  await startServer()
  await page.goto(BASE)
  const gpu = await page.evaluate(async () => (await navigator.gpu?.requestAdapter())?.features.has('shader-f16') ?? false)
  test.skip(!gpu, 'no GPU with shader-f16')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) await page.reload()

  // Online: download and load once, from the mode chip's settings.
  await page.getByRole('button', { name: /AI 助手|AI Assistant/ }).click()
  await page.getByText(/^(本地 · 离线|Local)/).first().click()
  await page.getByRole('button', { name: /下载并加载模型|Download \/ load model/ }).click()
  await expect(page.getByText(/本地模型已就绪|Local model ready/)).toBeVisible({ timeout: 480_000 })
  await expect(page.getByText(/已完整下载到本机|Fully downloaded/)).toBeVisible({ timeout: 30_000 })

  // Offline: the model loads again from the cache by itself and answers an open question.
  stopServer()
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: /AI 助手|AI Assistant/ }).click()
  await expect(page.getByText(/模型就绪|model ready/).first()).toBeVisible({ timeout: 120_000 })
  await ask(page, '新手说书人第一次主持要注意什么？')
  // A model answer, not the program's "本地资料（未使用模型生成）".
  await expect(page.getByText(/^1\.$|^1\. /).first()).toBeVisible({ timeout: 180_000 })
  await expect(page.getByText(/本地资料（未使用模型生成）|From local data \(no model\)/)).toHaveCount(0)
})

