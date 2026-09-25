/** Rebuild README screenshots from fictional data in an isolated browser.
 * Start `npm run dev`, then `npm run demo:screenshots`.
 * Optional: DEMO_BASE_URL=http://127.0.0.1:4173/botc-script-editor/
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { DEMO_STATE } from './demo-data.mjs'

const base = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5173/'
const out = 'docs/demo/product'
await mkdir(out, { recursive: true })
const browser = await chromium.launch()
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 })
  await context.addInitScript((state) => {
    if (localStorage.getItem('botc-demo-seeded')) return
    localStorage.setItem('botc-demo-seeded', '1')
    localStorage.setItem('botc-tutorial-done', '1')
    localStorage.setItem('botc-ui-language', 'en')
    localStorage.setItem('botc-theme-mode', 'light')
    localStorage.setItem('botc-storyteller-companion-v5', JSON.stringify(state))
  }, DEMO_STATE)
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${base}${base.includes('?') ? '&' : '?'}s=tb`)
  const nav = async (name) => {
    const tab = page.getByRole('tab', { name: new RegExp(name, 'i') })
    if (await tab.isVisible()) await tab.click()
    else {
      await page.getByRole('img', { name: 'BOTC Companion', exact: true }).click()
      await page.getByRole('menuitem', { name: new RegExp(name, 'i') }).click()
    }
  }
  const shot = async (surface, name) => {
    await surface.evaluate(() => document.fonts.ready)
    await surface.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode().catch(() => {}))))
    await surface.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' })
    if (await surface.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(`Horizontal overflow: ${name}`)
    console.log(`Captured ${name}`)
  }
  await nav('Scripts')
  await page.getByRole('tab', { name: 'Scripts', exact: true }).waitFor()
  await shot(page, 'scripts')
  await nav('Settings')
  await page.getByRole('button', { name: /Dark.*Crimson/i }).click()
  await nav('Storyteller')
  await page.getByRole('button', { name: 'Show Characters', exact: true }).click()
  await page.getByRole('img', { name: 'Washerwoman', exact: true }).first().waitFor()
  await page.getByRole('button', { name: 'Show Wake Order', exact: true }).click()
  await shot(page, 'storyteller')
  await nav('Settings')
  await page.getByRole('button', { name: /Light.*Parchment/i }).click()
  await nav('Storyteller')
  await page.getByRole('button', { name: 'Player Assignments', exact: true }).first().click()
  await page.getByRole('dialog').waitFor()
  await shot(page, 'assignments')
  await page.keyboard.press('Escape')
  const popup = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Open audience window', exact: true }).click()
  const audience = await popup
  await audience.getByTestId('audience-seat-1').waitFor()
  await shot(audience, 'audience')
  await page.getByRole('button', { name: 'End presentation', exact: true }).click()
  await page.getByRole('button', { name: 'Open audience window', exact: true }).waitFor()
  await nav('Analytics')
  await page.getByRole('tab', { name: 'Overview', exact: true }).waitFor()
  await shot(page, 'analytics')
  await nav('Storyteller')
  await page.setViewportSize({ width: 390, height: 844 })
  const reveal = page.getByRole('button', { name: 'Show Characters', exact: true })
  const hide = page.getByRole('button', { name: 'Hide Characters', exact: true })
  await reveal.or(hide).waitFor()
  if (await reveal.isVisible()) await reveal.click()
  await hide.waitFor()
  await shot(page, 'mobile')
  await page.setViewportSize({ width: 1440, height: 1080 })
  await nav('Print Studio')
  await page.getByRole('button', { name: 'All', exact: true }).last().click()
  await page.locator('#root [data-token-page] svg').first().waitFor()
  await shot(page, 'print-studio')
  if (errors.length) throw new Error(errors.join('\n'))
} finally {
  await browser.close()
}
