import { test, expect } from '@playwright/test'
import { navigateToTab, waitForAppReady } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Do not reseed on reload: verify that the audience cannot overwrite this save.
    if (localStorage.getItem('botc-storyteller-companion-v5')) return
    localStorage.setItem('botc-storyteller-companion-v5', JSON.stringify({
      selectedDayId: 'presentation-day', days: [{
        id: 'presentation-day', day: 2, phase: 'public', publicFreeSeconds: 300,
        seats: ['baron', 'chef', 'imp', 'drunk', 'empath', 'beggar'].map((id, i) => ({
          seat: i + 1, name: `Player ${i + 1}`, alive: true, characterId: id,
          isTraveler: i === 5, teamTag: null,
          customTags: i === 0 ? ['PUBLIC_TAG'] : [], stTags: ['PRIVATE_TAG'], note: 'PRIVATE_NOTE',
        })),
      }],
    }))
  })
  await waitForAppReady(page)
  await navigateToTab(page, /主持助手|Storyteller/)
})

test('audience stays public through live updates, refresh, private dialogs, and presentation lifecycle', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await expect(page.locator('[data-alignment]')).toHaveCount(0)
  const popupEvent = page.waitForEvent('popup')
  await page.getByRole('button', { name: '打开观众窗口', exact: true }).click()
  const audience = await popupEvent
  audience.on('pageerror', e => errors.push(e.message))
  await expect(audience.getByTestId('audience-seat-1')).toContainText('PUBLIC_TAG')
  await expect(audience.getByRole('img', { name: '乞丐', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: '男爵', exact: true })).toBeVisible()
  await expect(page.getByText('PRIVATE_TAG', { exact: true }).first()).toBeVisible()
  await expect(audience.locator('body')).not.toContainText(/PRIVATE_TAG|PRIVATE_NOTE|男爵/)
  await expect(audience.locator('[data-alignment]')).toHaveCount(0)
  await expect(audience.getByRole('tablist')).toHaveCount(0)
  await expect(audience.locator('audio')).toHaveCount(0)
  await expect(audience.getByTestId('audience-timer')).toHaveText('05:00')

  // Only the host advances time. Both views display the same remaining seconds.
  const hostPlay = page.locator('[data-tutorial="st-arena"]').getByTestId('PlayArrowIcon').locator('..')
  if (testInfo.project.name === 'desktop') {
    await hostPlay.click()
    await expect(audience.getByTestId('audience-timer')).not.toHaveText('05:00')
    await page.locator('[data-tutorial="st-arena"]').getByTestId('PauseIcon').locator('..').click()
  }
  const storedBefore = await page.evaluate(() => localStorage.getItem('botc-storyteller-companion-v5'))
  await audience.reload()
  await expect(audience.getByTestId('audience-seat-1')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('botc-storyteller-companion-v5'))).toBe(storedBefore)

  await page.getByRole('img', { name: '男爵', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(audience.getByRole('dialog')).toHaveCount(0)
  await expect(audience.locator('body')).not.toContainText(/PRIVATE_TAG|PRIVATE_NOTE|男爵/)
  await page.getByRole('dialog').getByRole('button', { name: '死亡', exact: true }).click()
  await expect(audience.getByTestId('audience-seat-1')).toContainText('死亡')
  await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).click()
  await page.getByRole('button', { name: '私聊', exact: true }).click()
  await expect(audience.getByTestId('audience-timer')).toHaveText('03:00')
  await expect(page.getByRole('img', { name: '男爵', exact: true })).toBeVisible()
  await audience.screenshot({ path: testInfo.outputPath('audience.png'), fullPage: true })
  await page.screenshot({ path: testInfo.outputPath('presenter.png'), fullPage: true })

  await audience.close()
  await expect(page.getByRole('button', { name: '打开观众窗口', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: '男爵', exact: true })).toHaveCount(0)
  const secondPopup = page.waitForEvent('popup')
  await page.getByRole('button', { name: '打开观众窗口', exact: true }).click()
  const secondAudience = await secondPopup
  await expect(secondAudience.getByTestId('audience-seat-1')).toBeVisible()
  await page.getByRole('button', { name: '结束演示', exact: true }).click()
  await expect.poll(() => secondAudience.isClosed()).toBe(true)
  await expect(page.getByRole('img', { name: '男爵', exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('blocked popups do not reveal roles, and direct audience routes never load a game', async ({ page, context }) => {
  await page.evaluate(() => { window.open = () => null })
  await page.getByRole('button', { name: '打开观众窗口', exact: true }).click()
  await expect(page.getByText(/无法打开观众窗口/)).toBeVisible()
  await expect(page.locator('[data-alignment]')).toHaveCount(0)
  const orphan = await context.newPage()
  await orphan.goto('/?audience=unconnected&lang=zh')
  await expect(orphan.getByText(/等待说书人连接/)).toBeVisible()
  await expect(orphan.locator('body')).not.toContainText(/Player 1|PRIVATE_TAG/)
  await expect(orphan.getByRole('tablist')).toHaveCount(0)
})

test('closing the host clears the audience view', async ({ page }) => {
  const popupEvent = page.waitForEvent('popup')
  await page.getByRole('button', { name: '打开观众窗口', exact: true }).click()
  const audience = await popupEvent
  await expect(audience.getByTestId('audience-seat-1')).toBeVisible()
  await page.close()
  await expect(audience.getByTestId('audience-seat-1')).toHaveCount(0, { timeout: 16_000 })
})
