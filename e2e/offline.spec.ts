/**
 * Offline cold start: after one online visit, the installed app (service
 * worker precache + runtime caches) must load and answer AI questions from
 * local data with no server and no network.
 */
import { spawn, type ChildProcess } from 'node:child_process'
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
})
