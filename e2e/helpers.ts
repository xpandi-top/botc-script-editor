/**
 * Shared E2E helpers.
 */
import type { Page } from '@playwright/test'

/** Skip the first-run tutorial overlay by setting localStorage before navigation. */
export async function skipTutorial(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('botc-tutorial-done', '1')
  })
}

/**
 * Navigate to the app and wait for it to finish initial render.
 * Works on both desktop (visible tablist) and mobile (tablist attached but display:none).
 */
export async function waitForAppReady(page: Page, { tutorial = true } = {}) {
  if (tutorial) await skipTutorial(page)
  await page.goto('/')
  // 'attached' works for both:
  //   desktop — tablist visible
  //   mobile  — tablist in DOM but display:none (xs layout uses hamburger menu)
  await page.waitForSelector('[role="tablist"]', { state: 'attached', timeout: 15_000 })
}

/**
 * Navigate to a main tab, handling both desktop (MUI Tabs) and mobile (logo-tap menu).
 *
 * Desktop: MUI Tabs visible, click directly.
 * Mobile: tabs hidden behind a Menu that opens when tapping the app logo/title.
 */
export async function navigateToTab(page: Page, tabLabel: RegExp) {
  // On desktop, the MUI Tabs are visible (display flex on sm+)
  const desktopTab = page.getByRole('tab', { name: tabLabel })
  if (await desktopTab.isVisible()) {
    await desktopTab.click()
    await page.waitForTimeout(300)
    return
  }

  // On mobile, tap the app logo (img[alt="BOTC Companion"]) to open nav menu
  const logo = page.locator('img[alt="BOTC Companion"]')
  await logo.click()
  await page.waitForTimeout(200)

  // Click the matching MenuItem
  const menuItem = page.getByRole('menuitem', { name: tabLabel })
  await menuItem.waitFor({ state: 'visible', timeout: 5_000 })
  await menuItem.click()
  await page.waitForTimeout(400)
}

/** Assert no JS errors fired during the current page state. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return errors
}
