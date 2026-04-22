# BOTC Companion — Manual Testing Guide

Covers all target platforms. Run after each phase milestone. Each section maps to a platform + key scenarios.

---

## Setup

### Dev Server

```bash
npm run dev        # http://localhost:5173
npm run build && npm run preview   # production build preview
```

### Browser DevTools — Simulate Mobile

Chrome / Edge:
1. DevTools → Toggle Device Toolbar (`Ctrl+Shift+M` / `Cmd+Shift+M`)
2. Select device or set custom dimensions
3. Reload after changing device (some media queries fire on load)

Useful presets:

| Device | Width | Use for |
|--------|-------|---------|
| iPhone SE | 375 × 667 | xs breakpoint |
| iPhone 14 Pro | 393 × 852 | xs, notch safe-area |
| Pixel 7 | 412 × 915 | xs Android |
| iPad Mini | 768 × 1024 | md portrait |
| iPad Pro 12.9" | 1024 × 1366 | md/lg landscape |
| Laptop 1280px | 1280 × 800 | lg desktop |

---

## Phase 0 — Foundation Checks

### P0-A: No Horizontal Overflow on Mobile

**Device**: 375px wide (iPhone SE)
**Steps**:
1. Open storyteller tab
2. Scroll horizontally — confirm NO horizontal scrollbar
3. Confirm main content fits within viewport width
4. Rotate to landscape (667 × 375) — repeat check

**Pass**: No overflow. Content stacks or clips cleanly.
**Fail**: Horizontal scrollbar appears, or content bleeds outside viewport.

---

### P0-B: Arena — Mobile Fallback

**Device**: 375 × 667 (xs)
**Steps**:
1. Start a game (or load saved game with seats)
2. Confirm circular seat layout is NOT shown
3. Confirm phase controls (ArenaCenter) render: day number, phase name, phase action buttons

**Pass**: Phase controls visible, no circular overflow.
**Fail**: Blank area, circular layout overflows, or JS error in console.

---

### P0-C: PWA Install

**Browser**: Chrome on Android or Safari on iOS (use real device or BrowserStack)
**Steps**:
1. Open production build URL
2. Chrome Android: tap ⋮ menu → "Add to Home screen" prompt should appear
3. Safari iOS: tap Share → "Add to Home Screen"
4. Launch from home screen icon — confirm app opens in standalone mode (no browser chrome)
5. Toggle device to airplane mode — reload app — confirm it loads from cache

**Pass**: Installs, launches standalone, loads offline.
**Fail**: Install prompt missing, online-only, or crashes on launch.

---

### P0-D: Safe Area (Notch / Home Indicator)

**Device**: iPhone 14 Pro (notch) or any Android with punch-hole camera
**Method**: Safari on real device or Xcode Simulator
**Steps**:
1. Open app in standalone PWA mode (added to home screen)
2. Confirm top content is not hidden behind status bar / notch
3. Confirm bottom content is not hidden behind home indicator bar
4. Rotate landscape — confirm side safe-area insets respected (content not behind notch on left)

**Pass**: All UI visible, no clipping by system chrome.
**Fail**: Toolbar cut off at top, buttons hidden behind home bar.

---

### P0-E: RightConsole Drawer — Mobile Access

**Device**: 375 × 667
**Steps**:
1. Open storyteller tab
2. Find and tap the Menu toggle button (hamburger icon) in the toolbar
3. Confirm right-side drawer slides in
4. Tap "Log" icon — confirm log panel expands
5. Tap backdrop — confirm drawer closes
6. Tap toggle again — confirm reopens

**Pass**: Drawer opens/closes, log accessible.
**Fail**: Button not visible, drawer doesn't open, backdrop doesn't close.

---

## Web — Desktop (lg / xl)

### WD-1: Script Viewer

- [ ] Browse script list — all scripts load
- [ ] Click script — character list renders with icons
- [ ] Toggle language (EN / ZH) — all text switches including abilities
- [ ] Edit mode: add/remove character — script updates
- [ ] Export to PDF — file downloads, content correct

### WD-2: Storyteller — Game Setup

- [ ] Click Storyteller tab
- [ ] New Game → set player count 7, traveler 1 → enter names → assign characters → confirm
- [ ] Seats render correctly in circular layout
- [ ] All player names visible with seat numbers

### WD-3: Storyteller — Night Phase

- [ ] Start Night — phase banner shows "Night 1"
- [ ] Wake Order panel opens correctly
- [ ] Character ability overlay opens per seat
- [ ] BGM plays / pauses
- [ ] End Night → transitions to Private

### WD-4: Storyteller — Day Phase

- [ ] Private phase: timer counts down
- [ ] Switch to Public: timer resets
- [ ] Round Robin mode: seat pointer advances on button click
- [ ] Enable Nomination → nomination sheet appears

### WD-5: Nomination + Voting

- [ ] Select nominator and nominee from dropdowns
- [ ] Vote threshold displays correctly (≥ half alive)
- [ ] Click Yes/No per voter — count updates
- [ ] Record vote — log entry created
- [ ] Next Day — day counter increments

### WD-6: Tag Management

- [ ] Click seat → tag editor opens
- [ ] Add "Poisoned" tag — chip appears on seat card
- [ ] Add character tag (💀charId) — icon chip renders
- [ ] Remove tag — chip disappears
- [ ] Tags persist after switching phases

### WD-7: Undo / Redo

- [ ] Perform action (add tag, record vote)
- [ ] Ctrl+Z or Undo button — action reverts
- [ ] Redo — action re-applies
- [ ] Undo across phase boundary — confirm state correct

### WD-8: Language Toggle

- [ ] Switch to ZH — UI strings all Chinese
- [ ] Switch back to EN — reverts
- [ ] Character abilities display in selected language
- [ ] Phase names in correct language

### WD-9: Save / Export / Load

- [ ] Save game — success toast / no error
- [ ] Export JSON — file downloads with correct structure
- [ ] Records panel — saved game appears
- [ ] Load saved game — state restores correctly

### WD-10: Audio Player

- [ ] Add local audio file — track appears in list
- [ ] Play / pause — audio responds
- [ ] Volume slider — audio level changes
- [ ] Track name displays

---

## Tablet — Portrait (md: ~768–899px)

Simulate with DevTools at 768 × 1024.

### TB-1: Layout

- [ ] Circular seat layout visible (not mobile fallback)
- [ ] CompactToolbar visible, not clipped
- [ ] RightConsole drawer toggle accessible
- [ ] No horizontal overflow

### TB-2: Touch Targets

- [ ] All buttons ≥ 44 × 44px tap target
- [ ] Seat cards tappable — tag editor opens
- [ ] Nomination dropdowns usable by touch

### TB-3: Rotation

- [ ] Portrait → Landscape: layout adjusts, no broken state
- [ ] Landscape → Portrait: reverts cleanly
- [ ] Phase state preserved across rotation

---

## Tablet — Landscape (lg: ~1024–1199px)

Simulate at 1024 × 768.

### TL-1: Layout

- [ ] Arena + RightConsole side-by-side (not stacked)
- [ ] Circular layout renders at correct scale
- [ ] RightConsole pinned (not drawer-only)

### TL-2: All WD features

Run WD-2 through WD-10 at this viewport — confirm no regressions.

---

## Phone — Portrait (xs: < 600px)

Simulate at 375 × 667 and 393 × 852.

### PH-1: Layout Structure

- [ ] Circular Arena NOT shown
- [ ] Phase controls (ArenaCenter) visible
- [ ] CompactToolbar visible and usable
- [ ] No horizontal scroll

### PH-2: Phase Controls Usable

- [ ] Night phase controls render and respond
- [ ] Day phase timer visible
- [ ] Nomination sheet reachable (via toolbar or phase panel)

### PH-3: Right Console

- [ ] Menu toggle visible in toolbar
- [ ] Drawer opens on tap
- [ ] Log, Settings, Records all load inside drawer
- [ ] Drawer closes on backdrop tap

### PH-4: Modals

- [ ] New Game modal opens full-screen or near-full on mobile
- [ ] Scrollable if content taller than screen
- [ ] Inputs usable — keyboard doesn't cover submit buttons
- [ ] Close button reachable

### PH-5: Landscape Phone (sm)

- [ ] 667 × 375: no overflow
- [ ] Phase controls still visible
- [ ] Toolbar doesn't clip

---

## Phone — Landscape (sm: 600–899px)

Simulate at 667 × 375 (iPhone SE landscape).

### PL-1: Layout

- [ ] Content fits without overflow
- [ ] Phase controls accessible
- [ ] Toolbar functional

---

## PWA — Android (Chrome)

> Use real device or BrowserStack. URL must be HTTPS.

### AW-1: Install

- [ ] Banner / "Add to Home Screen" appears
- [ ] Icon installs on home screen
- [ ] App opens in standalone (no browser address bar)

### AW-2: Offline

- [ ] Load app once online
- [ ] Toggle airplane mode
- [ ] Kill and reopen app — loads from service worker cache
- [ ] Character icons load from cache
- [ ] Locale strings (en/zh) load from cache

### AW-3: Storage

- [ ] Save game — persists after app close and reopen
- [ ] Multiple saves — all appear in Records
- [ ] No storage quota error after 10+ saves

### AW-4: Back Button

- [ ] Android back button: closes modals/drawers before navigating away
- [ ] Does not exit app unexpectedly while in game

---

## PWA — iOS (Safari)

> Requires real device or Xcode Simulator with Safari.

### IS-1: Install

- [ ] Share → "Add to Home Screen" available
- [ ] Icon appears on home screen
- [ ] Opens in standalone (no Safari chrome)

### IS-2: Safe Area

- [ ] Status bar area not covered by content (top)
- [ ] Home indicator area not covered (bottom)
- [ ] Landscape: notch area not covered (left side)

### IS-3: Audio

- [ ] BGM plays after user interaction (iOS requires gesture before audio)
- [ ] Audio continues when screen dims (may require native Capacitor in Phase 2)

### IS-4: Offline

- [ ] App loads offline after first visit
- [ ] Game state persists across sessions

---

## macOS (Phase 3 — Tauri)

> Not applicable until Phase 3 ships. Checklist for when Tauri build ready.

### MC-1: Build & Launch

- [ ] `cargo tauri build` succeeds
- [ ] DMG mounts, app installs to /Applications
- [ ] App launches without Gatekeeper block (or signed correctly)

### MC-2: Menu Bar

- [ ] File menu: New Game, Export, Quit
- [ ] Game menu: End Game, Undo
- [ ] View menu: Toggle right panel, Toggle language

### MC-3: Native File Dialogs

- [ ] Export: native Save panel opens, file saved at chosen path
- [ ] Import audio: native Open panel opens, track loads

### MC-4: Keyboard Shortcuts

- [ ] `Cmd+Z` — undo
- [ ] `N` — next phase (when in game)
- [ ] `Space` — play/pause music
- [ ] `Cmd+,` — open settings

### MC-5: Window Management

- [ ] Resize window — layout responds at breakpoints
- [ ] Minimize / hide — app state preserved on restore
- [ ] Full screen — layout scales to xl breakpoint

---

## Regression Checklist (run after every phase)

After each phase milestone, run this abbreviated set to catch regressions:

- [ ] Web desktop: new game → night → day → nomination → vote → end game (full flow)
- [ ] Language toggle EN↔ZH at each phase of above flow
- [ ] Save and reload game
- [ ] Export JSON — validate structure is correct
- [ ] Mobile 375px: phase controls visible, no overflow
- [ ] Tablet 768px: circular arena visible, drawer accessible
- [ ] PWA offline load (clear cache first, load once online, go offline, reload)

---

## Known Failing (pre-fix)

| ID | Test | Expected Fail Until |
|----|------|---------------------|
| I-1 | Edit script while game active → switch to storyteller → changes reflected | Phase 1 (P1-7) |
| I-2 | Export JSON → open in editor → check structure has phases/rounds | Phase 2 (P2-9) |
| I-3 | ZH locale: all dynamic strings (tag names, phase transitions) in Chinese | Phase 1 (P1-8) |
| I-6 | Save 50+ games → no quota error on mobile browser | Phase 2 (P2-5) |
| I-7 | PWA: icons load offline without prior network load | Phase 2 (P2-7) |

---

## Bug Report Format

When filing a bug, include:

```
Platform: [Chrome 125 / Safari iOS 17.4 / Android Chrome / PWA standalone]
Device:   [iPhone 14 Pro / Pixel 7 / iPad Mini / DevTools 375x667]
Phase:    [Night / Day-Public / Nomination / etc.]
Steps:
  1.
  2.
  3.
Expected:
Actual:
Screenshot / console errors: [attach]
```
