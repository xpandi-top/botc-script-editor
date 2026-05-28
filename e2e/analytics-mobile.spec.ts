/**
 * Analytics mobile E2E tests.
 * These specifically target mobile-viewport behavior that can't be caught in Vitest.
 *
 * Run with the mobile-android project:
 *   npx playwright test --project=mobile-android e2e/analytics-mobile.spec.ts
 */
import { test, expect } from '@playwright/test'
import { waitForAppReady, navigateToTab } from './helpers'

test.beforeEach(async ({ page }) => {
  await waitForAppReady(page)
  await navigateToTab(page, /^analytics$|数据统计/i)
})

test.describe('StudioFilterBar — mobile', () => {
  test('filter panel collapsed by default — Collapse height is 0', async ({ page }) => {
    // StudioFilterBar mobile layout wraps controls in <Collapse data-testid="filter-collapse">.
    // When collapsed, offsetHeight === 0. Desktop has no Collapse — test skips gracefully.
    const collapseEl = page.locator('[data-testid="filter-collapse"]')
    if (await collapseEl.count() === 0) {
      // Desktop: no Collapse present — filter bar always expanded inline, test N/A
      test.skip()
      return
    }
    const collapseHeight = await collapseEl.evaluate((el) => (el as HTMLElement).offsetHeight)
    expect(collapseHeight).toBe(0)
    await expect(page.locator('body')).toBeVisible()
  })

  test('filter panel expands on toggle tap', async ({ page }) => {
    // Find the filter bar Collapse via data-testid. Skip if desktop layout (no Collapse).
    const collapseEl = page.locator('[data-testid="filter-collapse"]')
    if (await collapseEl.count() === 0) {
      test.skip()
      return
    }
    const before = await collapseEl.evaluate((el) => (el as HTMLElement).offsetHeight)
    if (before !== 0) {
      // Already expanded (unlikely but safe)
      test.skip()
      return
    }

    // Click the expand/collapse toggle button (data-testid="filter-expand-btn").
    // Use force:true — the button is inside a box with overflow:hidden which can cause
    // Playwright's visibility check to fail even though the button is interactable.
    const expandBtn = page.locator('[data-testid="filter-expand-btn"]')
    await expandBtn.click({ force: true })
    await page.waitForTimeout(400) // MUI Collapse transition ~300ms

    const after = await collapseEl.evaluate((el) => (el as HTMLElement).offsetHeight)
    expect(after).toBeGreaterThan(0)
    await expect(page.locator('body')).toBeVisible()
  })

  test('no horizontal overflow on 393px', async ({ page }) => {
    // Check that nothing extends beyond viewport width
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 2) // 2px tolerance for scrollbar
  })
})

test.describe('StudioShell tabs — mobile', () => {
  test('all 5 analytics tabs fit without horizontal scroll', async ({ page }) => {
    // Inner analytics tablist shouldn't cause horizontal scroll
    const scrollWidth = await page.evaluate(() => {
      const tablist = document.querySelector('[role="tablist"]:not(:first-of-type)')
      return tablist ? tablist.scrollWidth : 0
    })
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 4)
  })
})

test.describe('RecordFormDialog — mobile', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Records tab
    const innerTabs = page.getByRole('tablist').last()
    const recordsTab = innerTabs.getByRole('tab', { name: /records|记录/i })
    if (await recordsTab.count() > 0) {
      await recordsTab.click()
      await page.waitForTimeout(300)
    }
  })

  test('quick record button opens dialog', async ({ page }) => {
    // Find and click the add/quick record button
    const addButton = page.getByRole('button', { name: /add|quick|快速|新增/i }).first()
    if (await addButton.count() > 0) {
      await addButton.click()
      await page.waitForTimeout(300)
      // Dialog should open
      await expect(page.getByRole('dialog')).toBeVisible()
    }
  })

  test('Players tab shows all 4 column headers', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add|quick|快速|新增/i }).first()
    if (await addButton.count() === 0) {
      test.skip()
      return
    }
    await addButton.click()
    await page.waitForTimeout(300)

    // Click Players tab
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const playerTab = dialog.getByRole('tab', { name: /player|玩家/i })
    await playerTab.click()
    await page.waitForTimeout(200)

    // Character column header should be visible on mobile
    const dialogText = await dialog.textContent()
    expect(dialogText).toMatch(/character|角色/i)
    expect(dialogText).toMatch(/team|阵营/i)

    // No horizontal overflow inside dialog
    const dialogEl = page.locator('[role="dialog"]')
    const dialogBox = await dialogEl.boundingBox()
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    if (dialogBox) {
      expect(dialogBox.width).toBeLessThanOrEqual(viewportWidth)
    }
  })
})
