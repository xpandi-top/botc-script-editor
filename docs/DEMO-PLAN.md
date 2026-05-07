# BOTC Companion — Demo Plan

Quick-reference for producing demo content (screenshots + videos) covering both desktop and mobile views.

---

## 1. Demo Goals

| Goal | Audience |
|------|----------|
| Show core game-orchestration flow | New storytellers / players |
| Highlight ST-only vs public visibility | Privacy-conscious groups |
| Show multi-language support (EN/ZH) | Chinese-speaking communities |
| Demonstrate print / PDF export | Game night organizers |

---

## 2. Tooling Recommendations

### Screenshots

| Tool | Platform | Use |
|------|----------|-----|
| **macOS Screenshot** (`Cmd+Shift+4`) | macOS | Quick per-view grabs |
| **Chrome DevTools** → device toolbar → "Capture screenshot" | Any | Pixel-perfect mobile at exact device size |
| **Playwright / Puppeteer** (scripted) | CI | Automated diff screenshots across builds |

```bash
# Puppeteer one-liner — full-page desktop screenshot
npx puppeteer-cli screenshot http://localhost:5173 --full-page --output docs/demo/desktop-home.png

# Puppeteer mobile (iPhone 14 viewport)
npx puppeteer-cli screenshot http://localhost:5173 \
  --viewport 390x844 --device-scale-factor 3 \
  --output docs/demo/mobile-home.png
```

### Screen Recording / Video

| Tool | Platform | Use |
|------|----------|-----|
| **QuickTime Player** (File → New Screen Recording) | macOS | Full walkthrough video |
| **OBS Studio** | cross-platform | HD capture with scene switching |
| **Chrome DevTools Recorder** | Any | Export interaction as replay / Puppeteer script |
| **Loom** | Any | Quick annotated screen-share |
| **ScreenToGif** | Windows | Animated GIF for README / docs |

---

## 3. Demo Scenes — Desktop (≥ 1280 px)

Run at **1440 × 900** for clean captures. Use dark theme for visual contrast.

### Scene D-1: App Overview

**Goal**: show the 6-tab layout and branding.

Steps:
1. Open `http://localhost:5173` (or prod URL)
2. Screenshot: full header with tabs, icon legend at the bottom of arena, brand logo
3. Hover each tab to show tooltip labels

**Key elements to capture**: app title, tab icons, theme, Feedback + Info icons pinned right.

---

### Scene D-2: Scripts Tab — Browse & Select

**Goal**: show script library and character list.

Steps:
1. Click Scripts tab
2. Expand Official section
3. Click "Trouble Brewing"
4. Screenshot: script panel + character grid
5. Toggle EN → ZH — screenshot again

---

### Scene D-3: New Game Setup

**Goal**: show full game configuration flow.

Steps:
1. Go to Storyteller tab
2. Click New Game button
3. **Players tab**: set 10 players, paste names via comma-fill
4. **Characters tab**: select "GodAbsent" script, click Random assign, set 3 demon bluffs
5. Screenshot: characters tab showing distribution (Calc / Actual / User rows)
6. Click Start New Game
7. Screenshot: arena circle with named seats and character indicators

---

### Scene D-4: Night Phase — Skill Recording

**Goal**: show ST-only skill recording and privacy model.

Steps:
1. Switch phase → Night
2. Click a seat (e.g., Seat 3 — Investigator)
3. Open Night Ability → Know → Players multi-select 2 players
4. Select "Characters" result type — show grouped character picker with amber bluffs
5. Select 2 characters → Save
6. Screenshot: skill logged in event log with 🔒 ST-only badge
7. Open Game Log — show ST-only filter vs public filter diff

---

### Scene D-5: Nomination Phase — Voting

**Goal**: show nomination and vote recording.

Steps:
1. Switch to Day 2, Public phase
2. Enter Nomination phase (click HowToVote icon)
3. Open Nomination Sheet
4. Pick nominator #3, nominee #7
5. Record votes — check/uncheck individual players
6. Mark as PASS
7. Screenshot: nomination history row (green pass card with voter list)
8. Click Next Day (ArrowForwardIos) → screenshot Day 3

---

### Scene D-6: Game Log — Share

**Goal**: show filtered log share.

Steps:
1. Click ViewTimeline (Game Log)
2. Filter: Public only
3. Screenshot: filtered log list
4. Click Share — screenshot the share text output
5. Switch to ST-only filter → share again — show extra ST entries

---

### Scene D-7: Print Studio — PDF Export

**Goal**: show print workflow.

Steps:
1. Go to Print Studio tab
2. Select script
3. Toggle bilingual
4. Adjust font size
5. Screenshot: role card grid
6. Click Print → screenshot print preview dialog

---

## 4. Demo Scenes — Mobile (390 × 844, iPhone 14 viewport)

Use Chrome DevTools → iPhone 14 Pro preset. Capture at 2× scale.

### Scene M-1: Mobile Overview

Steps:
1. Open app at 390 px
2. Screenshot: header with app icon/title + Info/Bug icons right-aligned
3. Screenshot: bottom navigation bar
4. Swipe through tabs

---

### Scene M-2: Mobile Storyteller — Seat Grid

Steps:
1. Open Storyteller tab on mobile
2. Screenshot: top bar (MobileTopBar) with phase + timer
3. Screenshot: PlayerSeatGrid (list layout) with names, character badges, G/E/T/O/M/D annotations
4. Tap a seat → screenshot player modal
5. Record a quick-add event → screenshot event log

---

### Scene M-3: Mobile Phase Control — Nomination

Steps:
1. Enter Nomination phase on mobile
2. Screenshot: PhaseControlPanel showing nomination buttons
3. Tap HowToVote → screenshot nomination sheet bottom sheet
4. Complete a vote → screenshot result

---

### Scene M-4: Mobile Script Panel

Steps:
1. Tap menu → Script panel drawer opens
2. Screenshot: drawer with First Night order
3. Toggle Show Abilities (📖) → screenshot with ability text expanded
4. Tap character → screenshot full ability info dialog

---

## 5. Automated Screenshot Script (Puppeteer)

Install once:
```bash
npm install --save-dev puppeteer
```

Create `scripts/demo-screenshots.mjs`:
```js
import puppeteer from 'puppeteer'
import { mkdirSync } from 'fs'

const BASE = 'http://localhost:5173'
const OUT = 'docs/demo'
mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch()

// ── Desktop ──────────────────────────────────────────────────────
const desk = await browser.newPage()
await desk.setViewport({ width: 1440, height: 900 })

await desk.goto(BASE)
await desk.screenshot({ path: `${OUT}/desktop-scripts.png`, fullPage: false })

await desk.click('[aria-label="Storyteller"]') // tab
await desk.waitForTimeout(500)
await desk.screenshot({ path: `${OUT}/desktop-storyteller.png` })

// ── Mobile ───────────────────────────────────────────────────────
const mob = await browser.newPage()
await mob.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true })

await mob.goto(BASE)
await mob.screenshot({ path: `${OUT}/mobile-home.png` })

await mob.goto(`${BASE}?tab=storyteller`)
await mob.screenshot({ path: `${OUT}/mobile-storyteller.png` })

await browser.close()
console.log('Screenshots saved to', OUT)
```

Run:
```bash
npm run dev &   # start dev server first
node scripts/demo-screenshots.mjs
```

---

## 6. Video Recording Workflow

### Quick walkthrough (~3 min)

1. **Record** using QuickTime (macOS) or OBS at 1440 × 900
2. **Script** (narration outline):
   - 0:00 — App overview, tabs, language toggle
   - 0:30 — New game setup (script, player names, random assign)
   - 1:00 — Night phase: skill recording, character picker, demon bluffs
   - 1:45 — Nomination: voting, pass/fail, nomination history
   - 2:15 — Game log: filter ST-only vs public, share
   - 2:45 — Print Studio: PDF export
3. **Edit** in iMovie / DaVinci Resolve: add captions for key actions
4. **Export**: 1080p MP4 for web; 720p GIF (≤ 30s) for README

### Mobile companion clip (~1 min)

Use QuickTime → iPhone mirror (Lightning/USB) or iOS screen record:
1. Open app in Safari on device
2. Record: tap through seats, nomination sheet, script drawer
3. Trim to 60 s, add side-by-side with desktop if needed

---

## 7. Asset Checklist

Before publishing demos, verify:

- [ ] No real player names or private game data visible
- [ ] Demo uses a well-known script (Trouble Brewing or Bad Moon Rising)
- [ ] Both EN and ZH versions captured
- [ ] Dark theme and light theme shown
- [ ] Mobile screenshots at correct resolution (390 px logical / 2–3× physical)
- [ ] PDF export shows complete character set
- [ ] Game log share text reviewed before screenshot
