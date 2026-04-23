# BOTC Companion — Multi-Platform Design & Roadmap

## Platform Strategy

### Target Platforms

| Platform | Packaging | Primary Input | Priority |
|----------|-----------|--------------|----------|
| Web (desktop) | Browser | Mouse + keyboard | Current |
| Tablet (iPad/Android) | Capacitor / PWA | Touch | Phase 1 |
| Phone (iOS/Android) | Capacitor | Touch | Phase 2 |
| macOS | Tauri or Capacitor Mac | Mouse + keyboard | Phase 3 |

### Technology Approach

Keep React + Vite + MUI as core. No rewrite.

**Capacitor** wraps existing web build into native iOS/Android shells:
- Access native APIs (file system, haptics, status bar, safe area)
- App Store + Play Store distribution
- Same codebase as web

**Tauri** for macOS desktop:
- Smaller binary than Electron
- Native menu bar, file system access
- Same web build

**PWA** as fallback: offline support, add-to-homescreen for Android/iOS browsers before Capacitor integrated.

---

## Responsive Breakpoints

```
xs   < 600px    — Phone portrait
sm   600–899px  — Phone landscape / small tablet
md   900–1199px — Tablet portrait / large phone landscape
lg   1200–1535px — Tablet landscape / small laptop
xl   ≥ 1536px  — Desktop / large display
```

MUI v9 `useMediaQuery` / `sx` breakpoint props drive all layout switching.

---

## Mobile UI Redesign — Storyteller

### Current Layout (tablet/desktop)

```
┌───────────────────────────────────────────┐
│  CompactToolbar                           │
├──────────────────────┬────────────────────┤
│                      │                    │
│   Arena (circular    │  RightConsole      │
│   seats + center     │  (sidebar)         │
│   phase controls)    │                    │
│                      │                    │
└──────────────────────┴────────────────────┘
```

### Mobile Layout (xs / sm portrait) — new design

```
┌─────────────────────────────────┐
│  MobileTopBar (1 row, compact)  │  ~56px
│  [☰ Menu] [Script] [Phase badge]│
├─────────────────────────────────┤
│                                 │
│   Player Seats Grid             │  flex: 1, scrollable
│   (1 col xs / 2 col sm)         │
│   Each card: seat# name tags    │
│                                 │
├─────────────────────────────────┤
│  Phase Control Panel            │  ~40% screen height
│  [Day N · Phase · Timer]        │  fixed bottom sheet
│  [Phase-specific actions]       │
│  [Nomination sheet if active]   │
└─────────────────────────────────┘
```

### Mobile Phase Panel — states

**Night**
```
┌─────────────────────────────────┐
│  🌙 Night 1                     │
│  [Wake Order]  [Show Character] │
│  [▶ Play Music]  [Edit Notes]   │
└─────────────────────────────────┘
```

**Private / Public**
```
┌─────────────────────────────────┐
│  ☀️ Day 1 · Public  ●●●●○ 04:32 │
│  [Free / Round Robin]           │
│  [Enable Nomination]            │
└─────────────────────────────────┘
```

**Nomination active**
```
┌─────────────────────────────────┐
│  ⚖️ Nomination  ●●○○ 01:12      │
│  [Nominator ▼]  [Nominee ▼]     │
│  Threshold: 5   [Yes] [No]      │
│  [Record]       [Clear]         │
└─────────────────────────────────┘
```

### Mobile Top Bar

```
[☰]  Script Name · Day N   [Phase Badge]  [Undo]
```

`☰` opens bottom drawer replacing RightConsole (Player / Day / Game / Settings tabs).

### Player Seat Card — mobile

```
┌──────────────────────────────┐
│ [icon] 3 · Alice   ● alive   │
│ 💀Imp  [poisoned]            │
└──────────────────────────────┘
```

Tap card → expands inline tag editor (no modal). Long-press → full player detail bottom sheet.

---

## Tablet Layout (md — portrait / lg — landscape)

Portrait: current Arena circular layout, RightConsole not pinned; swipe right to open drawer.
Landscape: current layout preserved (Arena + RightConsole side by side).

---

## Known Issues Backlog

| # | Issue | Area | Priority | Status |
|---|-------|------|----------|--------|
| I-1 | Script editor changes don't sync to active storyteller game | Script↔ST sync | High | ✅ Fixed (P1) — removed `key={uiLanguage}` forced remount; `scriptOptions` prop is live |
| I-2 | Export format lacks round/nomination structure (flat event list) | Export | High | Open — Phase 2 (P2-9) |
| I-3 | Chinese locale missing some dynamic strings (tags, phase names) | i18n | Medium | Open — Phase 1 partial |
| I-4 | Arena seats overflow on small viewports (circular layout unresponsive) | Mobile UI | High | ✅ Fixed (P0+P1) — circular hidden at xs/sm, replaced with PlayerSeatGrid |
| I-5 | RightConsole inaccessible on small screens (no drawer/modal fallback) | Mobile UI | High | ✅ Fixed (P0) — RightConsole already Drawer; toggle in MobileTopBar |
| I-6 | localStorage cap risk: large game histories may exceed 5MB quota | State | Medium | Open — Phase 2 (P2-5) |
| I-7 | No offline asset caching (icons/audio fail without network on PWA) | PWA | Medium | ✅ Fixed (P0) — vite-plugin-pwa caches icons + locales via workbox |
| I-8 | useStoryteller.ts is ~41KB monolith — slow HMR, hard to maintain | Code quality | Low | Open — Phase 4 (P4-1) |
| I-9 | App header + tab bar padding/font too large on mobile, wastes vertical space | Mobile UI | High | ✅ Fixed — responsive `py/px` on Container/Paper; title hidden xs; tabs scrollable with smaller font/height |
| I-10 | Dialogs (New Game, End Game, Export, Edit Players) not full-screen on mobile — overflow/clipped | Mobile UI | High | ✅ Fixed — `fullScreen={isMobile}` on all large dialogs; `borderRadius: 0` on mobile |
| I-11 | Wake order number (`#N`) not rendered in MobileSeatCard — only checkbox icon visible | Mobile UI | Medium | ✅ Fixed — `playerWakeOrder` computed from `nightOrder`; number span rendered beside checkbox |
| I-12 | Character button in MobileSeatCard absent when char assigned — cannot open character popout | Mobile UI | Medium | ✅ Fixed — button renders whenever `isNightPhase && nightShowCharacter`; shows icon+name or "+Assign" |
| I-13 | Mobile seat grid content clipped on left — `mx: -3` negates desktop padding but mobile container already has `px: 0` | Mobile UI | High | ✅ Fixed — `mx/mt` changed to `{ xs: 0, sm: -3 }` in StorytellerHelper |
| I-14 | Language selector font/size too large on mobile — `FormControl` lacks responsive sizing | Mobile UI | Medium | ✅ Fixed — responsive `minWidth`, `fontSize`, `py` on input and label |
| I-15 | App title hidden + print button absent on mobile — no way to access print on phone | Mobile UI | High | ✅ Fixed — title now responsive (visible xs); icon-only print button on xs, full button on sm+ |
| I-16 | Print outputs entire page (all tabs/lists) instead of only the active script sheet | Print | High | ✅ Fixed — `@media print` in GlobalStyles: `body * { visibility: hidden }`, `.print-sheet * { visibility: visible }` |
| I-17 | Nomination panel inline in PhaseControlPanel — cramped; should be a fullscreen Dialog popup on mobile | Mobile UI | Medium | ✅ Fixed — `MobileNominationPanel` wrapped in fullScreen `Dialog` with nomination-colored header |
| I-18 | Phase toggle button text too small (`0.65rem`) in PhaseControlPanel — hard to read | Mobile UI | Medium | ✅ Fixed — increased to `0.78rem`, px `1`, py `0.375` |
| I-19 | BGM play/stop not visible in mobile night phase — audio controls unlabeled and appear missing | Mobile UI | High | ✅ Fixed — replaced icon-only buttons with labeled "BGM" + "停止/Stop" buttons with icons |
| I-20 | Print CSS broken — hidden print sheets use `display: none`, blocking `visibility: visible` override | Print | High | ✅ Fixed — container changed to `position: absolute; visibility: hidden; height: 0; overflow: hidden` |
| I-21 | Left script list panel has no hide/collapse toggle — always visible, wastes space | Scripts UI | Medium | ✅ Fixed — hamburger toggle in content panel header; `MenuIcon`/`MenuOpenIcon` with close button in list panel |
| I-22 | Mobile ScriptsTab: left panel occupies full width first, content panel hidden below fold | Mobile UI | High | ✅ Fixed — mobile defaults `listOpenMobile=false`; selecting script auto-closes list on mobile |
| I-23 | Print outputs two pages (EN + ZH) when only one language needed | Print | High | ✅ Fixed — print container renders only active `uiLanguage` instead of both languages |
| I-24 | Jinx rules hidden under other content — `position: absolute; height: 0` print container interferes with layout | Print | High | ✅ Fixed — changed to `createPortal` into `document.body`; `#root` hidden in print, portal shown |
| I-25 | Script tab character descriptions truncated — ability text clipped mid-sentence | Scripts UI | High | ✅ Fixed — removed `WebkitLineClamp: 2` from SheetArticle character ability text |
| I-26 | Mobile — New Game / Edit Players / Save Game buttons not accessible; should be in hamburger menu | Mobile UI | High | ✅ Fixed — New/Players/End/Export action buttons added to RightConsole icon bar; close drawer on tap |
| I-27 | No default BGM selection in settings — user must pick BGM every session | Settings | Medium | ✅ Fixed — "Default BGM" dropdown in Settings panel; persisted in `timerDefaults.defaultBgmSrc`; updates `selectedAudioSrc` immediately |
| I-28 | Mobile seat card always shows character icon — should only show when "Show Character" is active | Mobile UI | Medium | ✅ Fixed — `charIcon` render gated on `isNightPhase && nightShowCharacter` |
| I-29 | Player seat grid is single column on mobile — 2-column layout would fit more info | Mobile UI | Medium | ✅ Fixed — `gridTemplateColumns: 'repeat(2, 1fr)'` for all breakpoints |
| I-30 | Mobile seat card always shows ability/status buttons — should be hidden and revealed on card tap | Mobile UI | High | ✅ Fixed — action buttons wrapped in `{isSelected && ...}` block; tap card to reveal |
| I-31 | Storyteller helper font size too small — all text in mobile game view hard to read | Mobile UI | High | ✅ Fixed — increased seat#/name/tag/button font sizes across MobileSeatCard |
| I-32 | Mobile hamburger/menu button on left side — should be on right side, right of undo button | Mobile UI | Medium | ✅ Fixed — MenuIcon moved to after UndoIcon in MobileTopBar |
| I-33 | No phase-switch sound effect or settings toggle to enable/disable it | Feature | Low | ✅ Fixed — Web Audio API ding plays on phase change; toggle in Settings (`phaseSwitchSoundEnabled`, default on) |
| I-34 | Mobile seat card missing quick "Add Note" button — requires opening full player sheet | Mobile UI | Medium | Open |
| I-35 | Player card has no event history view — no way to see skill uses / nominations for a player | Feature | Low | Open |
| I-36 | Ability/skill modal not centered on screen — appears off-position | Mobile UI | High | ✅ Fixed — removed manual `position: fixed; top/left` overrides; mobile uses `fullScreen` prop |
| I-37 | Skill/ability modal input loses focus when typing — field blurs on each keystroke | Bug | Critical | ✅ Fixed — `SkillPopoutContent` was a nested function component (remounts on each render); replaced with JSX variable |
| I-38 | Phase switch sound plays even when disabled in settings — toggle UI inconsistent with behavior | Bug | High | ✅ Fixed — Switch `checked` used `!!undefined = false` so appeared OFF while sound played; changed to `!== false` so default is visually ON |
| I-39 | Mobile PhaseControlPanel and seat card buttons/fonts too small — hard to tap and read | Mobile UI | Medium | ✅ Fixed — increased `btnSx` font/padding, phase toggle font size, MobileSeatCard action button sizes |
| I-40 | Wake order only shows on selected card; visited checkbox too small | Mobile UI | Medium | ✅ Fixed — wake order number + visited checkbox moved outside `{isSelected &&}` block, always visible in night mode; checkbox padding enlarged |
| I-41 | No local file upload option for default BGM — only preset tracks available | Feature | Low | ✅ Fixed — added file upload button in Settings BGM section; saves blob URL to `timerDefaults.defaultBgmSrc` |
| I-42 | New Game / Edit Players / End Game buttons in mobile bottom sheet — duplicate of hamburger menu actions | Mobile UI | Medium | ✅ Fixed — removed "Game actions row" from PhaseControlPanel; accessible via hamburger menu (RightConsole) |

---

## Phases & Roadmap

### Phase 0 — Foundation ✅ DONE

Goal: Make codebase platform-ready without changing features.

- [x] **P0-1** Add MUI breakpoint hooks to all layout components — no layout change, wire up `isMobile`, `isTablet` booleans
- [x] **P0-2** Extract `useBreakpoint()` hook returning `{ isMobile, isTablet, isDesktop }` → `src/hooks/useBreakpoint.ts`
- [x] **P0-3** Add viewport meta tag + safe-area CSS vars → `index.html` (`viewport-fit=cover`, apple/android meta), `main.tsx` (`--safe-top/bottom/left/right`)
- [x] **P0-4** Configure PWA via `vite-plugin-pwa` → `vite.config.ts`: manifest, workbox service worker, offline cache of icons + locales
- [x] **P0-5** Fix I-4: Arena circular layout hidden at xs/sm; mobile fallback renders `ArenaCenter` only (Phase 1 replaced with full grid)
- [x] **P0-6** Fix I-5: RightConsole already uses MUI `Drawer`; toggle accessible via `MobileTopBar` menu button

Deliverable: PWA installable; mobile opens without horizontal overflow; desktop unchanged.

---

### Phase 1 — Mobile Storyteller UI ✅ DONE

Goal: Full mobile-optimized storyteller experience.

- [x] **P1-1** `MobileTopBar` → `src/components/StorytellerSub/MobileTopBar.tsx` — alive/total, script chip, phase badge, undo, menu toggle
- [x] **P1-2** `MobileSeatCard` + `PlayerSeatGrid` → `Arena/MobileSeatCard.tsx`, `Arena/PlayerSeatGrid.tsx` — 1-col xs / 2-col sm scrollable grid; reuses tag/skill/character popouts
- [x] **P1-3** `PhaseControlPanel` → `Arena/PhaseControlPanel.tsx` — dark phase-colored fixed bottom sheet, collapsible drag handle, all phase controls (night/private/public/nomination)
- [x] **P1-4** `MobileNominationPanel` → `Arena/MobileNominationPanel.tsx` — compact nomination embedded in PhaseControlPanel (no Dialog)
- [x] **P1-5** Inline tag editor via existing `ArenaSeatTagPopout` (portal-rendered, works from MobileSeatCard)
- [x] **P1-6** RightConsole drawer accessible via `MobileTopBar` menu button on mobile
- [x] **P1-7** Fix I-1: removed `key={uiLanguage}` from `StorytellerHelper` in `App.tsx` — no forced remount on language change; `scriptOptions` prop propagates live script changes
- [x] **P1-8** Fix I-3: partial — all i18n keys already bilingual in `src/i18n/index.ts`; hardcoded ZH strings in components use inline ternaries (acceptable for now)
- [x] **ArenaCenter** `minWidth: 700 / minHeight: 600` removed (was causing desktop overflow too)
- [x] `StorytellerHelper` mobile path uses `100dvh` flex column; desktop path unchanged

Deliverable: storyteller fully usable on phone in portrait mode.

---

### Phase 2 — Native iOS & Android (2–3 weeks)

Goal: App Store / Play Store ready builds.

- [x] **P2-1** Add Capacitor: installed `@capacitor/core`, `@capacitor/cli`, `@capacitor/preferences`, `@capacitor/status-bar`, `@capacitor/filesystem`, `@capacitor/share`; `npx cap init` completed; `npx cap add ios/android` pending Xcode.app + Android Studio install
- [x] **P2-2** Configure `capacitor.config.ts`: appId `com.hyp.botcstoryteller`, webDir `dist-native`, StatusBar/SplashScreen plugin config, iOS contentInset, Android backgroundColor
- [x] **P2-3** Integrate `@capacitor/status-bar`: `src/lib/nativeInit.ts` calls `StatusBar.setStyle/setBackgroundColor` on native platform; wired into `main.tsx`
- [ ] **P2-4** Replace browser `<audio>` with `@capacitor/sound` (background audio on iOS) — HTML audio works in WebView for now; revisit if background audio needed
- [x] **P2-5** Storage adapter `src/lib/storage.ts`: async `storage.getItem/setItem/removeItem` uses `@capacitor/preferences` on native, `localStorage` on web — ready to migrate call sites
- [x] **P2-6** File export adapter `src/lib/exportGame.ts`: uses `@capacitor/filesystem` + `@capacitor/share` on native, browser download on web; wired into `useGameExport.ts`
- [x] **P2-7** Native build: `vite.config.ts` supports `--mode native` (base `/`, outDir `dist-native`, no PWA plugin); `npm run build:native` + `npm run cap:sync` scripts added
- [ ] **P2-8** App icons + splash screens for iOS/Android — needs `@capacitor/assets` + source images
- [ ] **P2-9** Fix I-2: restructure export format to `{ days: [{ phases: [{ events: [] }] }] }` — add migration for old format

Deliverable: TestFlight + internal Play Store track builds.

---

### Phase 3 — macOS + Tablet Polish (2 weeks)

Goal: Desktop native feel; tablet layout tuned.

- [ ] **P3-1** Tauri setup for macOS: `cargo tauri init`, configure `tauri.conf.json`
- [ ] **P3-2** macOS menu bar (File / Game / Edit / View) via Tauri menu API
- [ ] **P3-3** Native file open/save dialogs via Tauri FS plugin (replaces browser file input)
- [ ] **P3-4** Tablet portrait: swipe-right gesture to open RightConsole drawer (Hammerjs or Pointer Events API)
- [ ] **P3-5** Tablet landscape: confirm current layout stable at all md/lg sizes; fix edge cases
- [ ] **P3-6** Keyboard shortcuts for storyteller actions (macOS/tablet with keyboard): `N` = next phase, `U` = undo, `Space` = play/pause music

Deliverable: macOS DMG distributable; tablet experience polished.

---

### Phase 4 — Code Quality & Optimization (ongoing / parallel)

Goal: Reduce tech debt, improve maintainability.

- [ ] **P4-1** Fix I-8: split `useStoryteller.ts` — extract `useNominationState`, `useVoteActions`, `usePhaseTransitions` as separate files called by thin orchestrator
- [ ] **P4-2** Memoize heavy renders: `React.memo` on `ArenaSeat`, `PlayerSeatGrid` rows; `useMemo` for character lookup maps in `catalog.ts`
- [ ] **P4-3** Lazy-load `StorytellerHelper` and script editor tabs (code splitting via `React.lazy`)
- [ ] **P4-4** Audit MUI `sx` prop usage — extract repeated patterns to `theme.components` overrides
- [ ] **P4-5** Add Storybook (or Ladle) for Arena/Seat/PhasePanel components — visual regression baseline before mobile work

---

## Summary Timeline

```
Week 1–2:   Phase 0  — Foundation + PWA
Week 3–5:   Phase 1  — Mobile Storyteller UI
Week 6–8:   Phase 2  — Capacitor iOS/Android
Week 9–10:  Phase 3  — macOS + Tablet polish
Ongoing:    Phase 4  — Code quality (parallel to all phases)
```

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Capacitor over React Native | Keep existing React+MUI codebase; no full rewrite |
| Tauri over Electron for macOS | Smaller binary (~5MB vs ~150MB), Rust security model |
| PWA first before Capacitor | Validate mobile UX before committing to App Store overhead |
| Bottom sheet phase panel (not modal) | Persistent visibility — ST needs controls always reachable |
| Inline tag editor (not modal on mobile) | Modals stack badly on small screens; one interaction layer cheaper |
| `@capacitor/preferences` over localStorage | Native key-value store, no 5MB quota, no origin restriction |