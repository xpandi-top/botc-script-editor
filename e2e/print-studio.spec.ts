import { test, expect, type Locator } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { waitForAppReady, navigateToTab } from './helpers'

async function expectContainedTokens(pages: Locator) {
  const failures = await pages.evaluateAll(elements => elements.flatMap((element, pageIndex) => {
    const bounds = element.getBoundingClientRect()
    const tokens = Array.from(element.querySelectorAll('svg')).map(svg => svg.getBoundingClientRect())
    const errors: string[] = []
    tokens.forEach((rect, i) => {
      if (rect.left < bounds.left - 0.1 || rect.top < bounds.top - 0.1 || rect.right > bounds.right + 0.1 || rect.bottom > bounds.bottom + 0.1) {
        errors.push(`Page ${pageIndex}, token ${i} exceeds page`)
      }

    })
    return errors
  }))
  expect(failures).toEqual([])
}

test('token PDF downloads with packed pages and centered icons without opening print', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Desktop PDF export regression')
  await waitForAppReady(page)
  await navigateToTab(page, /剧本|Scripts/)
  await expect(page.locator('.print-portal')).toHaveCount(1)
  await navigateToTab(page, /打印工坊|Print Studio/)
  await page.getByRole('button', { name: /^(全选|Select all)$/ }).click()
  const previewPages = page.locator('#root [data-token-page]')
  await expect(previewPages.first()).toBeVisible()

  for (const shape of ['圆形', '六边形', '方形', '矩形']) {
    await page.getByRole('button', { name: shape, exact: true }).click()
    await expectContainedTokens(previewPages)
  }

  await page.getByRole('button', { name: '隐藏', exact: true }).click()
  for (const shape of ['圆形', '六边形', '方形']) {
    await page.getByRole('button', { name: shape, exact: true }).click()
    const offsets = await previewPages.locator('svg').evaluateAll(tokens => tokens.flatMap(svg => {
      const icon = svg.querySelector('image')
      if (!icon) return []
      return [Math.abs(Number(icon.getAttribute('y')) + Number(icon.getAttribute('height')) / 2 - Number(svg.getAttribute('height')) / 2)]
    }))
    expect(offsets.length).toBeGreaterThan(0)
    expect(offsets.every(offset => offset < 0.01)).toBe(true)
  }

  await page.getByRole('button', { name: '圆形', exact: true }).click()
  // Keep the original paper-saving honeycomb arrangement (four tokens per row).
  const packing = await previewPages.first().locator('svg').evaluateAll(tokens => {
    const a = tokens[0].getBoundingClientRect()
    const b = tokens[4].getBoundingClientRect()
    return { dx: b.x - a.x, dy: b.y - a.y, size: a.width }
  })
  expect(packing.dx).toBeCloseTo(packing.size / 2, 1)
  expect(packing.dy).toBeCloseTo(packing.size * Math.sqrt(3) / 2, 1)

  // Smaller paper exercises multi-page output.
  await page.getByRole('combobox').filter({ hasText: 'Letter' }).click()
  await page.getByRole('option', { name: /A5/ }).click()
  expect(await previewPages.count()).toBeGreaterThan(1)
  const pageCount = await previewPages.count()
  await page.evaluate(() => { window.print = () => { document.body.dataset.printCalled = 'true' } })
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 PDF' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/-tokens\.pdf$/)
  const file = testInfo.outputPath('tokens.pdf')
  await download.saveAs(file)
  await expect(page.locator('body')).not.toHaveAttribute('data-print-called', 'true')
  await expect(page.locator('.token-print-portal')).toHaveCount(1)
  await expect(page.locator('.token-print-portal')).toBeHidden()
  await expect(page.locator('.print-portal')).toBeHidden()
  const pdf = await readFile(file)
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
  expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(pageCount)
  await expect(page.getByRole('button', { name: '导出 PDF' })).toBeEnabled()
  // Exercise SVG foreignObject ability text and embedded decorative fonts too.
  await page.getByRole('button', { name: 'EN', exact: true }).last().click()
  await page.getByRole('combobox').filter({ hasText: '无衬线（系统）' }).first().click()
  await page.getByRole('option', { name: 'Edo 装饰英文' }).click()
  for (const shape of ['六边形', '矩形']) {
    await page.getByRole('button', { name: shape, exact: true }).click()
    const nextDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出 PDF' }).click()
    const result = await nextDownload
    const path = testInfo.outputPath(`${shape}.pdf`)
    await result.saveAs(path)
    const bytes = await readFile(path)
    expect(bytes.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(await previewPages.count())
    await expect(page.locator('body')).not.toHaveAttribute('data-print-called', 'true')
  }

})

test('downloads tokens while the mobile settings panel hides the preview', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-android', 'Mobile hidden-preview regression')
  await waitForAppReady(page)
  await navigateToTab(page, /打印工坊|Print Studio/)
  await page.getByRole('button', { name: /^(全选|Select all)$/ }).click()
  await expect(page.locator('#root [data-token-page]').first()).toBeHidden()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 PDF' }).click()
  const result = await downloaded
  expect(result.suggestedFilename()).toMatch(/-tokens\.pdf$/)
  expect(await result.failure()).toBeNull()
  await expect(page.locator('.token-print-portal')).toBeHidden()
})

test('print menus expose search recovery, collapsible options and mobile preview navigation', async ({ page }, testInfo) => {
  await waitForAppReady(page)
  await navigateToTab(page, /打印工坊|Print Studio/)
  await page.getByRole('button', { name: /^(全选|Select all)$/ }).click()

  const selected = page.getByRole('checkbox', { checked: true })
  const selectedCount = await selected.count()
  expect(selectedCount).toBeGreaterThan(0)
  await page.getByRole('textbox', { name: /按名称、ID 或能力搜索|Search by name/ }).fill('no-character-matches-this-query')
  await expect(page.getByText(/^(无结果|No matches)$/)).toBeVisible()
  await expect(page.getByRole('button', { name: /选择匹配角色|Select matching/ })).toBeDisabled()
  await page.getByRole('button', { name: /重置筛选|Reset filters/ }).click()
  await expect(selected).toHaveCount(selectedCount)

  const shapes = page.getByRole('button', { name: /形状与大小|Shape & Size/i })
  await shapes.click()
  await expect(shapes).toHaveAttribute('aria-expanded', 'false')
  await shapes.click()
  await expect(page.getByRole('button', { name: /^(圆形|Circle)$/ })).toHaveAttribute('aria-pressed', 'true')

  if (testInfo.project.name === 'mobile-android') {
    await page.getByRole('button', { name: /^(预览|Preview)$/ }).click()
    await expect(page.locator('#root [data-token-page]').first()).toBeVisible()
    await page.getByRole('button', { name: /^(PDF 设置|PDF Settings)$/ }).click()
    await expect(page.locator('#root [data-token-page]').first()).toBeHidden()
    await expect(selected).toHaveCount(selectedCount)
  }

  await page.getByRole('button', { name: /^(剧本单|Script sheet)$/ }).click()
  await expect(page.getByRole('button', { name: /中英同页|Bilingual on one sheet/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /中英分页|Separate language sheets/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /导出 PDF|^Print$/ })).toBeEnabled()
  if (testInfo.project.name === 'mobile-android') {
    await page.getByRole('button', { name: /^(预览|Preview)$/ }).click()
    await expect(page.locator('#sheet-print-settings')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /导出 PDF|^Print$/ })).toBeEnabled()
    await page.getByRole('button', { name: /^(PDF 设置|PDF Settings)$/ }).click()
    await expect(page.getByRole('button', { name: /中英同页|Bilingual on one sheet/ })).toBeVisible()
  }
})
