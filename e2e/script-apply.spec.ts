import { test, expect } from '@playwright/test'
import { navigateToTab, waitForAppReady } from './helpers'

test('live script selection is staged, discarded on close, and persisted only on Apply', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('botc-storyteller-companion-v5')) return
    localStorage.setItem('botc-ui-language', 'en')
    localStorage.setItem('botc-storyteller-companion-v5', JSON.stringify({
      activeScriptSlug: 'tb', selectedDayId: 'test-day', days: [{
        id: 'test-day', day: 1, phase: 'night',
        seats: ['chef', 'empath', 'monk', 'poisoner', 'imp'].map((id, i) => ({
          seat: i + 1, name: `Player ${i + 1}`, alive: true, characterId: id,
          customTags: [], stTags: [],
        })),
      }],
    }))
  })
  await waitForAppReady(page)
  await navigateToTab(page, /Storyteller/)
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('botc-storyteller-companion-v5')!))
  const initial = await saved()
  const open = async () => {
    const desktop = page.getByRole('button', { name: 'Player Assignments', exact: true }).first()
    if (await desktop.isVisible()) await desktop.click()
    else await page.getByRole('button', { name: 'Edit Characters', exact: true }).click()
  }
  const dialog = page.getByRole('dialog')
  const picker = dialog.getByRole('combobox').first()
  const apply = dialog.getByRole('button', { name: /^Apply changes/i })
  const select = async (name: string) => {
    await picker.click()
    await page.getByRole('option', { name, exact: true }).click()
  }
  await open()
  await expect(apply).toBeDisabled()
  await select('Bad Moon Rising')
  await expect(apply).toBeEnabled()
  expect((await saved()).activeScriptSlug).toBe('tb')
  await select('Trouble Brewing')
  await expect(apply).toBeDisabled()
  await select('Bad Moon Rising')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await open()
  await expect(picker).toContainText('Trouble Brewing')
  await expect(apply).toBeDisabled()
  await select('Bad Moon Rising')
  await apply.click()
  await expect(apply).toBeDisabled()
  await expect.poll(async () => (await saved()).activeScriptSlug).toBe('bmr')
  expect((await saved()).days[0].seats).toEqual(initial.days[0].seats)
  await page.reload()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'ST', exact: true }).or(page.getByRole('tab', { name: /Storyteller/ })).filter({ visible: true }).click()
  await open()
  await expect(picker).toContainText('Bad Moon Rising')
})
