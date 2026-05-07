/**
 * Demo screenshot automation — captures all scenes from DEMO-PLAN.md
 *
 * Usage:
 *   npm run dev &   # ensure dev server is running on :5173
 *   node scripts/demo-screenshots.mjs
 *
 * Output: docs/demo/
 */

import puppeteer from 'puppeteer'
import { mkdirSync } from 'fs'
import { join } from 'path'

const BASE = 'http://localhost:5173'
const OUT  = 'docs/demo'
mkdirSync(OUT, { recursive: true })

// Tab indices (desktop Tabs component order)
const TAB = { scripts: 0, characters: 1, storyteller: 2, analytics: 3, printstudio: 4, settings: 5 }

// ── helpers ──────────────────────────────────────────────────────────────────

async function shot(page, name) {
  const file = join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log(`  ✓  ${file}`)
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/** Click the Nth desktop tab (0-based). */
async function clickTab(page, index) {
  await page.evaluate((idx) => {
    const tabs = document.querySelectorAll('[role="tab"]')
    if (tabs[idx]) tabs[idx].click()
  }, index)
  await wait(700)
}

/** Click first button containing a specific MUI icon data-testid. */
async function clickIcon(page, testId) {
  await page.evaluate((id) => {
    const icon = document.querySelector(`[data-testid="${id}"]`)
    if (icon) {
      const btn = icon.closest('button')
      if (btn) btn.click()
    }
  }, testId)
  await wait(500)
}

/** Set localStorage keys and reload page. */
async function setupPage(page) {
  await page.evaluate(() => {
    localStorage.setItem('botc-ui-language', 'en')
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await wait(800)
}

// ── Demo game state seeded into localStorage ──────────────────────────────────

const DEMO_PLAYERS = ['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Hank','Iris','Jack']
const DEMO_CHARS   = ['washerwoman','librarian','investigator','chef','empath','fortuneteller','butler','drunk','poisoner','imp']

function makeSeat(i, name, charId, alive = true) {
  return {
    seat: i + 1, name, alive, isTraveler: false, isExecuted: false,
    hasNoVote: i === 4, customTags: [], stTags: [],
    characterId: charId, userCharacterId: null, teamTag: null, note: '',
  }
}
const DEMO_SEATS = DEMO_PLAYERS.map((name, i) => makeSeat(i, name, DEMO_CHARS[i], i !== 2))

const DEMO_STATE = {
  selectedDayId: 'day-1',
  days: [{
    id: 'day-1', day: 1, phase: 'night', publicMode: 'free',
    nominationStep: 'waitingForNomination',
    privateSeconds: 300, publicFreeSeconds: 300, publicRoundRobinSeconds: 120,
    publicElapsedSeconds: 600, nominationWaitSeconds: 60,
    nominationActorSeconds: 60, nominationTargetSeconds: 60,
    currentSpeakerSeat: null, roundRobinSpokenSeats: [],
    seats: DEMO_SEATS,
    voteDraft: {
      actor: 1, target: 10, voters: [1, 2, 4, 6, 7],
      noVoters: [], note: '', manualPassed: null,
      nominationResult: 'succeed', isExile: false, voteCountOverride: null,
    },
    votingState: null,
    voteHistory: [{
      id: '1700000001000', actor: 3, target: 8,
      voters: [3, 5, 9], voteCount: 3, requiredVotes: 5,
      passed: false, note: '', overridden: false,
    }],
    skillHistory: [{
      id: '1700000000500', actor: 3, roleId: 'investigator',
      targets: [1, 7], targetNotes: {},
      statement: 'One of these is the Poisoner',
      note: '', result: 'success',
      activatedDuringPhase: 'night', visibility: 'st-only',
    }],
    eventLog: [
      { id: 'e1', timestamp: 1700000000000, phase: 'night',      kind: 'phaseTransition', detail: 'Night 1 began' },
      { id: 'e2', timestamp: 1700000000100, phase: 'private',    kind: 'phaseTransition', detail: 'Day 1 private chat' },
      { id: 'e3', timestamp: 1700000000200, phase: 'public',     kind: 'phaseTransition', detail: 'Day 1 public debate' },
      { id: 'e4', timestamp: 1700000000300, phase: 'night',      kind: 'tagChange',       detail: 'Carol marked dead', visibility: 'st-only' },
    ],
    nightVisitedSeats: [3, 8, 10], gameEnded: false,
    demonBluffs: ['saint', 'virgin', 'monk'],
  }],
  timerDefaults: {
    privateSeconds: 300, publicFreeSeconds: 300, publicRoundRobinSeconds: 120,
    nominationDelayMinutes: 0, nominationWaitSeconds: 60,
    nominationActorSeconds: 60, nominationTargetSeconds: 60,
    nominationVoteSeconds: 10, alarmSound: 'bell',
  },
  customTagPool: [], playerNamePool: DEMO_PLAYERS, gameRecords: [],
  stFabledIds: [], stCustomRules: '', stName: 'Demo ST', endGameResult: null,
}

async function seedState(page) {
  await page.evaluate((state) => {
    localStorage.setItem('botc-storyteller-companion-v5', JSON.stringify(state))
    localStorage.setItem('botc-ui-language', 'en')
  }, DEMO_STATE)
  await page.reload({ waitUntil: 'networkidle2' })
  await wait(900)
}

// ── Main ──────────────────────────────────────────────────────────────────────

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: null,
})

// ════════════════════════════════════════════════════════════════════════════
// DESKTOP  1440 × 900
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Desktop (1440×900) ──')
const desk = await browser.newPage()
await desk.setViewport({ width: 1440, height: 900 })

// navigate, force EN, wait for render
await desk.goto(BASE, { waitUntil: 'networkidle2' })
await setupPage(desk)

// D-1: App overview — Scripts tab
await shot(desk, 'desktop-D1-scripts-overview')

// D-2: Click Trouble Brewing — find the BUTTON whose full text is "Trouble Brewing"
await desk.evaluate(() => {
  const btn = [...document.querySelectorAll('button')]
    .find(b => b.textContent?.trim() === 'Trouble Brewing')
  if (btn) btn.click()
  else {
    // fallback: any element with exact text
    const el = [...document.querySelectorAll('*')]
      .find(e => e.children.length < 3 && e.textContent?.trim() === 'Trouble Brewing')
    if (el) el.click()
  }
})
await wait(700)
await shot(desk, 'desktop-D2-script-trouble-brewing')

// D-2 ZH: toggle language
await desk.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const zh = btns.find(b => /zh|中文|chinese/i.test(b.textContent ?? '') || /zh/i.test(b.getAttribute('aria-label') ?? ''))
  if (zh) zh.click()
  else {
    // Try toggle button group: find button after current active lang button
    const langBtns = [...document.querySelectorAll('[role="group"] button, .MuiToggleButtonGroup-root button')]
    if (langBtns.length >= 2) langBtns[1].click()
  }
})
await wait(500)
await shot(desk, 'desktop-D2-script-trouble-brewing-zh')

// Restore EN
await desk.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const en = btns.find(b => /^en$/i.test(b.textContent?.trim() ?? '') || /english/i.test(b.textContent ?? ''))
  if (en) en.click()
  else {
    const langBtns = [...document.querySelectorAll('[role="group"] button, .MuiToggleButtonGroup-root button')]
    if (langBtns.length >= 2) langBtns[0].click()
  }
})
await wait(400)

// D-3..D-5: Storyteller arena with seeded game state
console.log('  Seeding demo game state…')
await seedState(desk)
await clickTab(desk, TAB.storyteller)
await wait(700)

// Enable Show Characters (button only visible in night phase — state starts in night)
await desk.evaluate(() => {
  const btn = [...document.querySelectorAll('button')]
    .find(b => b.title === 'Show Characters' || b.getAttribute('aria-label') === 'Show Characters')
  if (btn) btn.click()
  else {
    // fallback: VisibilityIcon inside night controls
    const icon = document.querySelector('[data-testid="VisibilityIcon"]')
    icon?.closest('button')?.click()
  }
})
await wait(1500)  // let character images fully load
await shot(desk, 'desktop-D3-arena-night-phase')

// Switch to nomination for nomination scenes
await desk.evaluate(() => {
  const btns = [...document.querySelectorAll('.MuiToggleButton-root')]
  const nom = btns.find(b => /nomin|提名/i.test(b.textContent ?? ''))
  if (nom) nom.click()
})
await wait(600)
await shot(desk, 'desktop-D3-arena-overview')

// D-4: Open nomination sheet
await clickIcon(desk, 'HowToVoteIcon')
await wait(400)
await shot(desk, 'desktop-D4-nomination-sheet')

// Close (Escape)
await desk.keyboard.press('Escape')
await wait(400)

// D-5: Arena in nomination phase (wide shot)
await shot(desk, 'desktop-D5-arena-nomination-phase')

// D-6: Game Log
console.log('  Scene D-6: Game Log')
await clickIcon(desk, 'ViewTimelineIcon')
await wait(500)
await shot(desk, 'desktop-D6-game-log-all')

// Filter ST-only to show private entries
await desk.evaluate(() => {
  const chips = [...document.querySelectorAll('[role="button"], button, .MuiChip-root')]
    .find(e => /st.only|storyteller only/i.test(e.textContent ?? ''))
  if (chips) chips.click()
})
await wait(300)
await shot(desk, 'desktop-D6-game-log-st-only')

// Filter public
await desk.evaluate(() => {
  const chips = [...document.querySelectorAll('[role="button"], button, .MuiChip-root')]
    .find(e => /^public$/i.test(e.textContent?.trim() ?? ''))
  if (chips) chips.click()
})
await wait(300)
await shot(desk, 'desktop-D6-game-log-public-only')

await desk.keyboard.press('Escape')
await wait(400)

// D-7: Print Studio
console.log('  Scene D-7: Print Studio')
await clickTab(desk, TAB.printstudio)
await wait(1000)
await shot(desk, 'desktop-D7-print-studio')

// Characters tab
console.log('  Characters tab')
await clickTab(desk, TAB.characters)
await wait(700)
await shot(desk, 'desktop-characters-tab')

// Settings tab
console.log('  Settings tab')
await clickTab(desk, TAB.settings)
await wait(600)
await shot(desk, 'desktop-settings-tab')

// ════════════════════════════════════════════════════════════════════════════
// MOBILE  390 × 844  (iPhone 14 viewport, 2× scale)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Mobile (390×844) ──')
const mob = await browser.newPage()
await mob.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

// M-1: Mobile overview — Scripts tab
await mob.goto(BASE, { waitUntil: 'networkidle2' })
await setupPage(mob)
await shot(mob, 'mobile-M1-scripts-overview')

// M-2..M-4: Seed game state, go to Storyteller
console.log('  Seeding demo state on mobile…')
await seedState(mob)

// Mobile bottom nav — find storyteller tab by index
await mob.evaluate(() => {
  const tabs = document.querySelectorAll('[role="tab"]')
  if (tabs[2]) tabs[2].click()  // storyteller = index 2
})
await wait(900)
// Mobile: enable Show Characters (VisibilityOffIcon → click to show)
await mob.evaluate(() => {
  const btn = [...document.querySelectorAll('button')]
    .find(b => b.title === 'Show Characters' || b.getAttribute('aria-label') === 'Show Characters')
  if (btn) btn.click()
  else {
    const icon = document.querySelector('[data-testid="VisibilityOffIcon"], [data-testid="VisibilityIcon"]')
    icon?.closest('button')?.click()
  }
})
await wait(1200)
await shot(mob, 'mobile-M2-storyteller-seat-grid')

// M-3: Phase control + nomination
await shot(mob, 'mobile-M3-phase-control')
await clickIcon(mob, 'HowToVoteIcon')
await wait(600)
await shot(mob, 'mobile-M3-nomination-sheet')
await mob.keyboard.press('Escape')
await wait(300)

// M-4: Script panel (ST Setup drawer)
console.log('  Scene M-4: Script panel')
await clickIcon(mob, 'AutoStoriesIcon')
await wait(600)
await shot(mob, 'mobile-M4-st-setup-panel')

// ════════════════════════════════════════════════════════════════════════════
// DARK THEME  (desktop)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Dark theme variants ──')
const dark = await browser.newPage()
await dark.setViewport({ width: 1440, height: 900 })
await dark.goto(BASE, { waitUntil: 'networkidle2' })
// Set dark mode in localStorage before seeding
await dark.evaluate(() => {
  localStorage.setItem('botc-ui-language', 'en')
  // MUI theme key (check app's key)
  localStorage.setItem('botc-theme-mode', 'dark')
  // Try common keys
  localStorage.setItem('mui-mode', 'dark')
  localStorage.setItem('colorMode', 'dark')
  localStorage.setItem('themeMode', 'dark')
})
await seedState(dark)

// Toggle dark via Settings tab
await clickTab(dark, TAB.settings)
await wait(500)
// Click dark mode toggle
await dark.evaluate(() => {
  const switches = [...document.querySelectorAll('input[type="checkbox"], [role="switch"]')]
  const darkSwitch = switches.find(s => {
    const label = s.closest('label, [role="row"]')?.textContent ?? s.getAttribute('aria-label') ?? ''
    return /dark|theme|mode/i.test(label)
  })
  if (darkSwitch) darkSwitch.click()
  else {
    // Try toggle buttons
    const btns = [...document.querySelectorAll('button')]
    const dark = btns.find(b => /dark/i.test(b.textContent ?? '') || /dark/i.test(b.getAttribute('aria-label') ?? ''))
    if (dark) dark.click()
  }
})
await wait(700)
await clickTab(dark, TAB.storyteller)
await wait(700)
// Show Characters (dark page also starts in night from DEMO_STATE)
await dark.evaluate(() => {
  const btn = [...document.querySelectorAll('button')]
    .find(b => b.title === 'Show Characters' || b.getAttribute('aria-label') === 'Show Characters')
  if (btn) btn.click()
  else document.querySelector('[data-testid="VisibilityIcon"]')?.closest('button')?.click()
})
await wait(1500)
await shot(dark, 'desktop-dark-storyteller')

await clickTab(dark, TAB.scripts)
await wait(500)
await shot(dark, 'desktop-dark-scripts')

await browser.close()

// ── Summary ───────────────────────────────────────────────────────────────────
const allFiles = [
  'desktop-D1-scripts-overview',
  'desktop-D2-script-trouble-brewing',
  'desktop-D2-script-trouble-brewing-zh',
  'desktop-D3-arena-overview',
  'desktop-D3-arena-night-phase',
  'desktop-D4-nomination-sheet',
  'desktop-D5-arena-nomination-phase',
  'desktop-D6-game-log-all',
  'desktop-D6-game-log-st-only',
  'desktop-D6-game-log-public-only',
  'desktop-D7-print-studio',
  'desktop-characters-tab',
  'desktop-settings-tab',
  'mobile-M1-scripts-overview',
  'mobile-M2-storyteller-seat-grid',
  'mobile-M3-phase-control',
  'mobile-M3-nomination-sheet',
  'mobile-M4-st-setup-panel',
  'desktop-dark-storyteller',
  'desktop-dark-scripts',
]
console.log(`\n✅  Done — ${allFiles.length} screenshots in ${OUT}/`)
