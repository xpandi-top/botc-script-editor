import { test, expect } from '@playwright/test'
import { waitForAppReady } from './helpers'

for (const theme of ['light', 'dark']) test(`navigation uses visible labels and indicators without overflow (${theme})`, async ({ page }, info) => {
  await page.addInitScript(mode => localStorage.setItem('botc-theme-mode', mode), theme)
  await waitForAppReady(page)
  const mobile = info.project.name === 'mobile-android'
  if (mobile) {
    const nav = page.getByRole('navigation', { name: '主导航', exact: true })
    await expect(nav.getByRole('button')).toHaveCount(6)
    for (const label of ['剧本', '角色', '主持', '统计', '打印', '设置']) {
      await expect(nav.getByText(label, { exact: true })).toBeVisible()
    }
    await nav.getByRole('button', { name: '角色', exact: true }).click()
    await expect(nav.getByRole('button', { name: '角色', exact: true })).toHaveAttribute('aria-current', 'page')
  } else {
    const nav = page.getByRole('tablist', { name: '主导航', exact: true })
    await expect(nav.getByRole('tab')).toHaveCount(6)
    await expect(nav.getByRole('tab', { name: '全部角色' })).toContainText('角色')
    await nav.getByRole('tab', { name: '全部角色' }).click()
    await expect(nav.getByRole('tab', { name: '全部角色' })).toHaveAttribute('aria-selected', 'true')
    await page.mouse.move(0, 0)
    await expect(nav.getByRole('tab', { name: '全部角色' })).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(page.locator('header .MuiTabs-indicator')).toBeVisible()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy()
  await page.screenshot({ path: info.outputPath('navigation.png'), animations: 'disabled' })
  if (!mobile) {
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.getByRole('tab', { name: '设置' })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy()
    await page.screenshot({ path: info.outputPath('navigation-tablet.png'), animations: 'disabled' })
  }
})
