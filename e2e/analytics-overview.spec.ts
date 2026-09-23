import { test, expect } from '@playwright/test'
import { waitForAppReady, navigateToTab } from './helpers'

test('analytics labels, sample context and partial ratings remain readable', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('botc-storyteller-companion-v5', JSON.stringify({ gameRecords: [
      { id: '1', endedAt: Date.now(), scriptSlug: 'tb', scriptTitle: '暗流涌动', stName: 'Alice', winner: 'good', balanced: 4, days: [], durationMs: 5400000 },
      { id: '2', endedAt: Date.now() - 86400000, scriptSlug: 'tb', scriptTitle: '暗流涌动', stName: 'Alice', winner: null, replay: 5, days: [] },
    ] }))
  })
  await waitForAppReady(page)
  await navigateToTab(page, /数据统计|Analytics/i)
  const tabs = page.getByRole('tablist', { name: '统计分类' })
  for (const name of ['概览', '剧本', '玩家', '角色', '记录']) await expect(tabs.getByRole('tab', { name, exact: true })).toBeVisible()
  await expect(page.getByText(/基于当前筛选的 2 场记录；未记录结果 1 场/)).toBeVisible()
  await expect(page.getByText('各项仅统计已填写评分，未填写不计为零分。')).toBeVisible()
  await expect(page.getByText(/未记录:1/)).toBeVisible()
  await expect(page.getByText(/ST:1/)).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy()
  await page.screenshot({ path: test.info().outputPath('analytics-overview.png'), fullPage: true })
})
