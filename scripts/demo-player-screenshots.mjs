/** Real host/guest UI with a local service fixture. Requires the Vite dev server.
 * npm run demo:players — no online rooms or player messages are created.
 */
import { chromium, expect } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'
import { DEMO_STATE } from './demo-data.mjs'
const base = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5173/'
const out = 'docs/demo/product'
const browser = await chromium.launch()
try {
  const context = await browser.newContext({viewport:{width:1440,height:1080}})
  const errors = []
  context.on('page', page => page.on('pageerror', e => errors.push(e.message)))
  const service = await readFile(new URL('./demo-deal-service.mjs', import.meta.url), 'utf8')
  let intercepted = false
  await context.route(/\/src\/lib\/DealSession\.ts(?:\?.*)?$/, route => {
    intercepted = true
    return route.fulfill({contentType:'text/javascript', body:service})
  })
  // Fail closed: fixture mistakes must never create a real Firebase session.
  await context.route(/https:\/\/[^/]*(?:googleapis\.com|firebaseio\.com)\//, route => route.abort())
  await context.addInitScript(({state, origin}) => {
    if (location.origin !== origin || window.top !== window) return
    localStorage.setItem('botc-ui-language','zh')
    localStorage.setItem('botc-tutorial-done','1')
    if (!localStorage.getItem('botc-storyteller-companion-v5'))
      localStorage.setItem('botc-storyteller-companion-v5',JSON.stringify(state))
  }, {state:DEMO_STATE, origin:new URL(base).origin})
  await mkdir(out,{recursive:true})
  const shot = async (page,name) => {
    await page.evaluate(() => document.fonts.ready)
    await page.locator('img').evaluateAll(imgs => Promise.all(imgs.map(i => i.decode().catch(() => {}))))
    await page.screenshot({path:`${out}/${name}.png`,animations:'disabled'})
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    console.log(`Captured ${name}`)
  }
  const host = await context.newPage()
  await host.goto(`${base}?s=tb`)
  await host.getByRole('tab',{name:/主持助手/}).click()
  await host.getByRole('button',{name:'玩家分配',exact:true}).first().click()
  if (!intercepted) throw new Error('Demo service not installed. Use the Vite dev server, not a production preview.')
  await host.getByRole('button',{name:'认领座位',exact:true}).click()
  const guest = await context.newPage()
  await guest.setViewportSize({width:390,height:844})
  await guest.goto(`${base}?deal=demo-room`)
  await guest.getByText('#1',{exact:true}).waitFor()
  await shot(guest,'seat-claim')
  await guest.getByText('#1',{exact:true}).click()
  await guest.getByRole('textbox').fill('Alice')
  await shot(guest,'seat-confirm')
  await guest.getByRole('button',{name:/认领.*座位/}).click()
  await expect(guest.getByText(/等待说书人/)).toBeVisible()
  const send = host.getByRole('button',{name:/发送已分配|发送角色/}).first()
  await expect(send).toBeEnabled()
  await send.scrollIntoViewIfNeeded()
  await shot(host,'deal-roles')
  await send.click()
  await guest.getByRole('button',{name:/查看我的角色|显示我的角色/}).click()
  await expect(guest.getByText('洗衣妇',{exact:true})).toBeVisible()
  await shot(guest,'role-reveal')
  await host.keyboard.press('Escape')
  // Stage the nomination through the same service boundary; the player's tap is real UI input.
  const voteTime = new Date('2026-09-24T19:30:00Z')
  await host.clock.setFixedTime(voteTime)
  await guest.clock.setFixedTime(voteTime)
  await host.evaluate(async () => {
    const service = await import('/src/lib/DealSession.ts')
    await service.createDealVoteSession('demo-room',{actorSeat:3,targetSeat:10,requiredVotes:5,
      votingOrder:[1,2,3,4,5,6,7,8,9,10],noVoteSeats:[],perPlayerSeconds:10,
      seatLabels:{1:'#1 Alice',3:'#3 Carol',10:'#10 Jack'}})
  })
  await expect(guest.getByRole('button',{name:'赞同',exact:true})).toBeEnabled()
  await expect(guest.getByText('洗衣妇',{exact:true})).toHaveCount(0)
  await expect(guest.getByText('10s',{exact:true})).toBeVisible()
  await shot(guest,'player-vote')
  await guest.getByRole('button',{name:'赞同',exact:true}).click()
  await expect.poll(() => host.evaluate(() => JSON.parse(localStorage.getItem('botc-demo-deal-service')).responses[0]?.response)).toBe('agree')
  await expect(guest.getByText('你已投票: 赞同',{exact:true})).toBeVisible()
  await shot(guest,'vote-submitted')
  expect(errors).toEqual([])
} finally {await browser.close()}
