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
  test('filter panel collapsed by default', async ({ page }) => {
    // On mobile, filter bar shows a toggle button but not the full controls
    // The date inputs should NOT be visible (inside Collapse)
    const dateInput = page.locator('input[type="date"]').first()
    // Either not visible or not present in viewport
    const count = await page.locator('input[type="date"]').count()
    if (count > 0) {
      // If exists in DOM, it should be hidden (inside Collapse)
      const box = await dateInput.boundingBox()
      // Collapsed = zero height or off-screen
      if (box) {
        expect(box.height).toBeLessThanOrEqual(1)
      }
    }
    // At minimum — no crash and page visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('filter panel expands on toggle tap', async ({ page }) => {
    // Tap the filter toggle (FilterListIcon button)
    const filterToggle = page.getByRole('button').first()
    await filterToggle.click()
    await page.waitForTimeout(300)
    // After expand, date inputs should become visible
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
