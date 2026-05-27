/**
 * E2E smoke tests — app loads, main tabs work, no JS crash.
 * Runs on both mobile-android (393px) and desktop (1280px) projects.
 */
import { test, expect } from '@playwright/test'
import { waitForAppReady, navigateToTab, collectConsoleErrors } from './helpers'

test.describe('App bootstrap', () => {
  test('loads without JS errors', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await waitForAppReady(page)
    // Filter out non-critical noise (ServiceWorker, canvas, fonts)
    const critical = errors.filter(
      (e) => !e.includes('ServiceWorker') && !e.includes('canvas') && !e.includes('fonts.googleapis')
    )
    expect(critical).toHaveLength(0)
  })

  test('shows navigation tabs or mobile menu', async ({ page }) => {
    await waitForAppReady(page)
    // Desktop: visible tablist with 4+ tabs
    const tablist = page.getByRole('tablist').first()
    const tablistVisible = await tablist.isVisible()
    if (tablistVisible) {
      const count = await tablist.getByRole('tab').count()
      expect(count).toBeGreaterThanOrEqual(4)
    } else {
      // Mobile: logo tap opens a menu with nav items
      const logo = page.locator('img[alt="BOTC Companion"]')
      await expect(logo).toBeVisible()
    }
  })

  test('page title correct', async ({ page }) => {
    await waitForAppReady(page)
    await expect(page).toHaveTitle(/BOTC/i)
  })
})

test.describe('Scripts tab', () => {
  test('renders without crashing', async ({ page }) => {
    await waitForAppReady(page)
    const body = await page.locator('body').textContent()
    expect(body).not.toContain('[object Object]')
  })
})

test.describe('Analytics tab', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page)
    await navigateToTab(page, /^analytics$|数据统计/i)
  })

  test('loads without crash', async ({ page }) => {
    const body = await page.locator('body').textContent()
    expect(body).not.toContain('[object Object]')
    expect(body).not.toContain('undefined')
  })

  test('shows analytics inner tabs (overview, records, etc)', async ({ page }) => {
    // StudioShell renders inner analytics tabs — they use standard MUI Tabs on all viewports
    // Wait a bit for the lazy-loaded analytics content to render
    await page.waitForTimeout(500)
    // Look for inner tab buttons (overview, records, scripts, players, characters)
    const innerTabs = page.getByRole('tab')
    const count = await innerTabs.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })
})

test.describe('Storyteller tab', () => {
  test('renders without crashing', async ({ page }) => {
    await waitForAppReady(page)
    // en: "Storyteller Helper", zh: "主持助手"
    await navigateToTab(page, /storyteller helper|主持助手/i)
    const body = await page.locator('body').textContent()
    expect(body).not.toContain('[object Object]')
  })
})
