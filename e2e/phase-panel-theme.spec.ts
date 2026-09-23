import { test, expect } from '@playwright/test'
import { waitForAppReady, navigateToTab } from './helpers'

for (const theme of ['light', 'dark']) test(`phase controls follow the ${theme} theme`, async ({ page }, info) => {
  await page.addInitScript(mode => {
    localStorage.setItem('botc-theme-mode', mode)
    localStorage.setItem('botc-storyteller-companion-v5', JSON.stringify({
      selectedDayId: 'theme-day', days: [{ id: 'theme-day', day: 1, phase: 'night', publicMode: 'free',
        seats: [{ seat: 1, name: 'Player 1', alive: true, characterId: 'chef', customTags: [], stTags: [] }],
      }],
    }))
  }, theme)
  await waitForAppReady(page)
  await navigateToTab(page, /主持助手|Storyteller/)
  const panel = page.locator('[data-tutorial="st-phase-panel"]')
  if (info.project.name === 'mobile-android') {
    await expect(panel).toBeVisible()
    const headerColor = await page.locator('header').evaluate(el => getComputedStyle(el).backgroundColor)
    await expect(panel).toHaveCSS('background-color', headerColor)
    await expect(panel).toHaveCSS('background-image', 'none')
    await page.screenshot({ path: info.outputPath('phase-night.png') })
  }
  await page.getByRole('button', { name: '公聊', exact: true }).click()
  await expect(page.getByText(/距提名开放/)).toHaveCount(0)
  if (info.project.name === 'mobile-android') {
    await expect(panel).toHaveCSS('background-image', 'none')
    await page.screenshot({ path: info.outputPath('phase-public.png') })
  }
})
