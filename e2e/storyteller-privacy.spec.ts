import { test, expect } from '@playwright/test'
import { waitForAppReady, navigateToTab } from './helpers'

test('alignment editing, private night actions, and daytime hiding', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('botc-storyteller-companion-v5', JSON.stringify({
      selectedDayId: 'test-day', days: [{
        id: 'test-day', day: 2, phase: 'night',
        seats: ['baron', 'chef', 'imp', 'drunk', 'empath', 'monk'].map((id, i) => ({
          seat: i + 1, name: `Player ${i + 1}`, alive: true, characterId: id,
          teamTag: null, customTags: [], stTags: [],
        })),
        skillHistory: [{ id: '12345', actor: 1, targets: [], roleId: 'baron', statement: 'SECRET_NIGHT_RESULT', activatedDuringPhase: 'night', visibility: 'public' }],
      }],
    }))
  })
  await waitForAppReady(page)
  await navigateToTab(page, /主持助手|Storyteller/)
  await expect(page.locator('[data-alignment]')).toHaveCount(0)
  await page.getByRole('button', { name: '显示角色', exact: true }).click()
  await expect(page.locator('[data-alignment="evil"]')).toHaveCount(2)
  await page.getByRole('img', { name: '男爵', exact: true }).click()
  const modal = page.getByRole('dialog')
  await expect(modal.getByText('本夜无需常规唤醒')).toBeVisible()
  await modal.getByRole('button', { name: '邪恶', exact: true }).click()
  await modal.getByRole('group', { name: '当前阵营' }).getByRole('button', { name: '善良' }).click()
  await expect(modal.locator('[data-alignment="good"]')).toBeVisible()
  await expect(modal.getByText('与角色默认阵营不同')).toBeVisible()
  await modal.getByRole('button', { name: '撤销', exact: true }).click()
  await expect(modal.locator('[data-alignment="evil"]')).toBeVisible()
  await modal.getByRole('button', { name: '邪恶', exact: true }).click()
  await modal.getByRole('group', { name: '当前阵营' }).getByRole('button', { name: '善良' }).click()

  await page.screenshot({ path: test.info().outputPath('night-card.png') })
  await modal.getByRole('button', { name: '手动记录行动' }).click()
  await modal.getByRole('button', { name: '告知内容', exact: true }).click()
  await modal.getByPlaceholder('信息内容').fill('NEW_PRIVATE_RESULT')
  await modal.getByRole('button', { name: '保存', exact: true }).click()
  await modal.getByRole('button', { name: '事件日志' }).click()
  await expect(modal.getByText(/NEW_PRIVATE_RESULT/)).toBeVisible()
  await expect(modal.getByText(/SECRET_NIGHT_RESULT/)).toBeVisible()
  await modal.getByRole('button', { name: '关闭', exact: true }).click()

  // Hiding characters hides all secrets, even if a private-log filter was selected.
  await page.getByRole('button', { name: '隐藏角色', exact: true }).click()
  await expect(page.locator('[data-alignment]')).toHaveCount(0)
  await expect(page.getByRole('img', { name: '男爵', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '#1 Player 1', exact: true }).click()
  await expect(modal.locator('[data-alignment]')).toHaveCount(0)
  await modal.getByRole('button', { name: '事件日志' }).click()
  await expect(modal.getByText(/SECRET_NIGHT_RESULT|NEW_PRIVATE_RESULT/)).toHaveCount(0)
  await modal.getByRole('button', { name: '关闭', exact: true }).click()
  await page.getByRole('button', { name: '显示角色', exact: true }).click()
  await page.getByRole('button', { name: '私聊', exact: true }).click()
  await expect(page.locator('[data-alignment]')).toHaveCount(0)
  await expect(page.getByRole('img', { name: '男爵', exact: true })).toHaveCount(0)
  // Clicking the hidden character opens a public-only detail card.
  await page.getByRole('button', { name: '#1 Player 1', exact: true }).click()
  await expect(modal.getByText('今夜行动 · 仅说书人')).toHaveCount(0)
  await expect(modal.locator('[data-alignment]')).toHaveCount(0)
  await modal.getByRole('button', { name: '事件日志' }).click()
  await expect(modal.getByText(/SECRET_NIGHT_RESULT|NEW_PRIVATE_RESULT/)).toHaveCount(0)
  await page.screenshot({ path: test.info().outputPath('day-card.png') })
})
