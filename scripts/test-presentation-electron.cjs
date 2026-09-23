/** Run after npm run build:native. Uses a disposable profile, never user saves. */
const { _electron: electron } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

async function run() {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'botc-presenter-electron-'))
  let app
  try {
    app = await electron.launch({ args: [path.resolve(__dirname, '..'), `--user-data-dir=${userData}`] })
    const host = await app.firstWindow()
    await host.waitForSelector('[role="tablist"]')
    await host.evaluate(() => {
      localStorage.setItem('botc-tutorial-done', '1')
      localStorage.setItem('botc-ui-language', 'zh')
      localStorage.setItem('botc-storyteller-companion-v5', JSON.stringify({
        selectedDayId: 'native', days: [{
          id: 'native', day: 2, phase: 'public',
          seats: [{ seat: 1, name: 'Native Player', alive: true, characterId: 'baron', customTags: [], stTags: ['NATIVE_SECRET'] }],
        }],
      }))
    })
    await host.reload()
    await host.getByRole('tab', { name: /主持助手|Storyteller/ }).click()
    const opened = app.waitForEvent('window')
    await host.getByRole('button', { name: '打开观众窗口', exact: true }).click()
    const audience = await opened
    await audience.getByTestId('audience-seat-1').waitFor()
    const text = await audience.locator('body').innerText()
    assert.match(text, /Native Player/)
    assert.doesNotMatch(text, /NATIVE_SECRET|男爵/)
    await audience.reload()
    await audience.getByTestId('audience-seat-1').waitFor()
    const closed = audience.waitForEvent('close')
    await host.getByRole('button', { name: '结束演示', exact: true }).click()
    await closed
    console.log('Electron audience: opening, file-origin sync, privacy, refresh, closing passed.')
  } finally {
    if (app) await app.close()
    fs.rmSync(userData, { recursive: true, force: true })
  }
}

run().catch(error => { console.error(error); process.exitCode = 1 })
