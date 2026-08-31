# Changelog

Release timeline for BOTC Companion — features, fixes, and improvements.

---

## 2026-08-30 — Odyssey Character Pack (latest)

### Added
- **《奥德赛 Odyssey》 character pack** — 119 custom characters imported from the official wiki as a new `odyssey` edition (51 Townsfolk, 21 Outsiders, 24 Minions, 18 Demons, 3 Fabled, 2 Loric).
  - Chinese names, ability text, first/other-night storyteller prompts, `setup` flags (17 characters), and 208 reminder tokens.
  - 119 character icons at 400x400 (PNG8).
  - Night order positions derived from the wiki's night-order values and preceding-character anchors — 33 first-night and 72 other-night entries.
- **Odyssey script** — `assets/scripts/odyssey.json` listing the full pack.
- **6 Odyssey jinxes** (EN + ZH) — Hanged Man x Puck, Ettin x Hell's Outcast, Doll x Snitch, Devil's Advocate x White Knight, Cerberus x Mastermind, Damsel x Sphinx.
- **Odyssey almanac data** — `assets/almanac/odyssey.zh.json` holds the full wiki text per character (background, summary, examples, how-it-works, rules detail, tips) plus 10 Odyssey glossary terms. Not bundled into the frontend yet; kept for a future almanac view.
- **Sync tooling + docs** — `scripts/odyssey/` reproduces the import from the source wiki; `docs/ODYSSEY.md` records what landed, what is still missing, and which gaps need app changes.

### Notes
- Odyssey characters are Chinese-only for now. English name is present; ability text falls back to Chinese. Night prompts do **not** fall back, so the English storyteller flow is blank for these characters until translated.
- Reminder tokens are single-language project-wide, so Odyssey tokens stay Chinese in the English UI.
- Odyssey's vote-token rules differ from official (a dead player may hold multiple vote tokens and spend several in one nomination); the vote controller does not model this yet.

---

## 2026-05-30 — Latest Feature Notifications

### Added
- **Latest feature notification** — the app header now shows a compact `New` badge when the bundled changelog has an unread latest release; opening the changelog marks it as seen on that browser.
- **Dated changelog sections** — changelog releases are grouped into collapsible date/title panels, with the latest release expanded by default.

### Tests
- Added parser and UI coverage for latest-release detection, unread badge behavior, and expandable changelog dates.

---

## 2026-05-28 — Communication Board + Rectangle Token

### Added
- **Communication Board** — new fullscreen dialog accessible from the day-navigation controls (← Day N → 💬); designed for silent ST-to-player communication during night phases
  - **Text board** — whiteboard-style large-text display; auto-scales font (56 px → 24 px) based on content length
  - **Draw board** — freehand canvas with pen / eraser tools, 8 color swatches + custom color picker, stroke-size slider, 20-step undo, clear button; DPR-aware for crisp Retina / mobile rendering
  - **19 predefined phrase chips** (EN + ZH): _Use Your Ability Tonight?_, _Meet Your Fellow Minions_, _You are Good / Evil_, _Same / Different Alignment_, _Characters are in play / NOT in play_, _Choose N Players / Characters_, _You are [Character]_, _This Character is [Character]_, _I made a mistake_, _Wake up_, _Go to sleep_, _Shake your head Yes / No_, and more
  - **Parameterized phrases** — number phrases show ±1 stepper (1–20); character phrases show single-select Autocomplete; multi-character phrases show multi-select Autocomplete with icon thumbnails
  - **Custom text input** — Enter key or Add button appends freeform text to board
  - Dialog renders at `zIndex: 1400` (fullscreen, covers ST board entirely); Autocomplete poppers at `zIndex: 1500` to stay visible above dialog
- **Print Studio — Rectangle token shape** — new `rectangle` shape option alongside circle / hexagon / square
  - Configurable card width (40–150 mm) and height (15–80 mm) via sliders
  - Icon occupies a square region equal to card height; positioned left or right (toggle)
  - Remaining space shows character name + ability text in a `foreignObject` text area
  - All existing options (background, border, watermark, name/ability display, B&W, wake indicators) work identically to other shapes
  - Grid layout recalculates per-page token count using card dimensions

### Fixed
- **Communication Board — Autocomplete dropdown invisible** — popper `zIndex` raised to 1500; previously the MUI default (1300) rendered the dropdown behind the fullscreen dialog (1400)

### Tests
- **62 new render tests** across two new test files:
  - `communicationBoard.test.tsx` — 35 tests: import sanity, closed state, desktop + mobile (EN + ZH), phrase interactions (plain / number / character / multi-char), custom input, draw tab canvas, close button
  - `rectangleToken.test.tsx` — 27 tests: `SingleToken` SVG output for all rect configs (icon position, name modes, ability modes, sizes, overrideLabel), `TokenOptionsPanel` shows Width/Height sliders for rectangle and Diameter slider for circle, desktop + mobile viewports

---

## 2026-05-28

### Added
- **Card Deal — QR code for share link** — host dashboard now shows a QR code dialog for the deal share URL; supports Copy link and Download PNG buttons
- **Card Deal — game-ID linkage** — each game gets a stable `gameId` (16-char random token) generated when the setup panel opens; deal sessions are stored under `botc-deal-game-<gameId>` so each game has its own deal slot — editing game 1 shows its deal, opening new game 2 shows none; backward-compatible (old installs fall back to global key)
- **Save checkpoint MUI dialog** — replaced browser-native `window.prompt` with a styled MUI `Dialog` + `TextField` for checkpoint name input; auto-generates name on empty submit

### Changed
- **Phase switch buttons show icon + label** — `PhaseControlPanel` and `ArenaCenterContent` toggle buttons now display icon (1.5 rem) above text label; layout: `flexDirection: column`
- **Mobile seat card tag rendering** — extracted `resolveTagDisplay` pure function shared by desktop `ArenaSeat` and mobile `MobileSeatCard`; fixes raw `📝Wrong::librarian` string shown on mobile while desktop rendered correctly
- **Share links on native/DMG builds** — `buildShareUrl` now rejects `capacitor:`, `file:`, `app:`, and `localhost` origins; uses `VITE_APP_URL` from `.env.native`; eliminates `localhost` links on Android/DMG
- **Save game filename** — auto-generated record names and JSON export filenames now follow `<ScriptTitle>_YYYY_MM_DD_<gameId>` format (underscores throughout, no slashes)
- **Save checkpoint upsert** — "Save current progress" always overwrites the same record (keyed `game-<gameId>`) instead of creating a new one each click

### Fixed
- **Deal card show/hide toggle** — fixed: toggle was gated on `(showFaceUp || claimed)`; now correctly uses `showFaceUp` alone
- **Deal card set-unclaimed Firestore error** — `markCardUnclaimedByHost` changed from `null` to `deleteField()` for all claim fields; Firestore Rule 3 added to allow clearing all 6 fields in one write
- **Stale card display after unclaim** — `claimed` check changed from `!== null` to `!= null`; `deleteField()` produces `undefined` in snapshot, which `!== null` incorrectly treated as claimed
- **Claimed card count** — `claimedCount` filter corrected from `!== null` to `!= null`

---

## 2026-05-24

### Added
- **Edit Players in-game** — Storyteller toolbar now wires "Edit Players" action to `openCharacterEditor`; replaces the stale `AutoStories` icon with the correct edit icon; no more dead button during active game
- **TYPE_SCALE tokens + 6 UI wrapper components** — `src/theme/tokens.ts` exports a `TYPE_SCALE` map (`micro` → `ui`) and `WEIGHT` constants; six purpose-built wrappers in `src/components/ui/` (`FieldLabel`, `SectionLabel`, `StatValue`, `MonoText`, `MicroChip`, `CompactButton`) replace ad-hoc inline `sx` typography throughout the codebase

### Changed
- **Full i18n migration** — all remaining hardcoded strings and zh ternaries replaced with `t()`/`tpl()` calls; locale files (`en.json`, `zh.json`) are now the single source of truth for every UI label
- **Sticky app header** — app header fixed at top; dead components and deprecated legacy types removed; unused code pruned
- **O(1) icon lookup, memoized arena seats, lazy-loaded heavy tabs** — `catalog.ts` switches to Map-based icon lookup; Arena component wraps seat calculations in `useMemo`; CharactersTab and AnalyticsStudio loaded lazily to cut initial bundle
- **Pinned revision propagation across UI** — `getAbilityTextForScript` used consistently in all display paths; immutable catalog update helpers extracted; pinned revision now respected in script viewer, PDF preview, and token studio

### Fixed
- **Token Print Studio ignores pinned revisions** — `TokenPageGrid` and `TokenOptionsPanel` now call `getAbilityTextForScript(id, lang, pinnedRevisions)` instead of `getAbilityText`; custom character abilities and per-script pinned revision overrides render correctly in both the live preview and the print portal

### Chore
- Outdated source files archived to `docs/archive/`
- Dead components, stale imports, and legacy type aliases removed across codebase

---

## 2026-05-23

### Added
- **Script share links** — Share button (📤) in Scripts tab toolbar generates shareable URLs:
  - Built-in scripts: stable permanent link (`?t=scripts&s=<slug>`) — never expires
  - Custom scripts: Firebase 24h short link (`?ss=<shortId>`) via Firestore
- **Custom characters embedded in share payload** — scripts using global-registry custom chars now include full character data (EN+ZH name, ability, icon, night order, reminders, jinxes) in the share payload; recipients see all custom roles without needing the original author's localStorage
- **Bilingual custom characters in shared scripts** — `name_zh` / `ability_zh` fields added to `ScriptCharacterItem` and `ResolvedScriptCharacter`; shared custom chars render correctly in both EN and ZH
- **Script tags preserved in download/import** — `tags` field round-trips through exported JSON (`_meta.tags`); restored on import
- **Hide ability toggle** — Scripts tab toolbar toggle (📋 icon) shows icon + name only, hiding ability text; defaults to enabled on mobile; bilingual

### Changed
- **URL-based navigation** — active tab synced to `?t=<tab>` in URL at all times; `?s=<slug>` included when a built-in script is open; opening a direct link restores the correct tab and script
- **AI context serialization** — character and script contexts now use rich BotC-specific format:
  - Character: team-role semantics, filled/empty field status, night info, new-character marker
  - Script: ALL characters grouped by team with full ability text, typical 15-player composition reference, per-team count summary
- **AI prompt design hints** — BotC ability design principles (sentence count, night order, team-specific guidance) injected into character chat system prompt

### Fixed
- **`Invalid URL` in Capacitor / file:// context** — `buildShareUrl` and `updateUrlParams` now guard against `window.location.origin === "null"`; fall back to `href.split('?')[0]` for base URL construction
- **Share link showing localhost** — `VITE_APP_URL` read from `.env.production` at build time; dev builds use `window.location`, production builds use the configured URL
- **`?ss=` redirect to wrong script** — URL sync `useEffect` now skips while Firebase short-link resolution is pending (`scriptLinkPending` flag); prevents `?ss=` being overwritten before the script loads
- **Raw base64 in `?ss=`** — removed `isLocalhost()` bypass that put full encoded data in the URL; always attempt Firebase; detect short ID vs raw encoded by length (`≤20 chars` = short ID, decode directly otherwise)

---

## 2026-05-19

### Added — AI Agent _(Experimental)_

> **Status: Experimental** — feature is opt-in via the ✨ FAB. Requires a Groq, OpenRouter, or Gemini API key stored in localStorage. May produce incorrect output; always review before applying.

- **Context-aware AI chat** (`AiChatDialog`) — floating ✨ FAB opens a chat panel that knows the currently open character form; agent can suggest, translate, and fill individual fields
- **Structured fill cards** — agent responses with `fills: [{ field, value, label }]` render as per-field Apply/Skip cards; fills are applied directly to the form without copy-paste
- **Fill log** — collapsible panel records every AI fill with timestamp, field, old/new value, model used; supports per-entry undo and Markdown export
- **BotC glossary injection** — 30+ EN↔ZH game terms (Storyteller, Demon, Minion, …) injected into every system prompt for consistent terminology
- **Runtime provider/model switching** — settings panel in dialog switches between Groq / OpenRouter / Gemini and any model in the provider's list without restart; keys stored only in `localStorage`
- **TF-IDF catalog search** (`botcSearch.ts`) — lazy-built sparse index over 239 catalog characters; `getTeamExamples`, `getTranslationPairs`, `findSimilarByTFIDF` for few-shot retrieval
- **Few-shot prompt injection** — `suggestAbility` injects same-team examples + TF-IDF similar chars; `translateText` injects catalog translation pairs; chat system prompt includes team examples and translation pairs when a character form is open
- **Translation memory** (`translationMemory.ts`) — confirmed EN→ZH fills auto-stored to `BOTC_TRANSLATION_MEMORY` localStorage; retrieved as few-shot context on subsequent translations; max 200 entries
- **Semantic vector search** (`botcVectorSearch.ts`) — loads pre-computed Gemini embeddings from `/public/embeddings.json` if present; cosine similarity for query; falls back to TF-IDF silently
- **Embedding pre-compute script** (`scripts/build-embeddings.mjs`) — `npm run build-embeddings` calls Gemini `text-embedding-004` batchEmbedContents for all chars; writes `public/embeddings.json`
- **`experimental` badge** — FAB shows `EXP` / `实验` superscript chip; dialog title shows "Experimental" / "实验性功能" chip

---

## 2026-05-19

### Added
- **Locale-aware night reminders (zh + en)** — `firstNightReminder` / `otherNightReminder` migrated from top-level strings to `en` / `zh` locale sections in all 141 character JSON files. Chinese reminder text sourced from the clocktower-wiki night order page (~80 official characters). New `getNightReminder(id, language, night)` catalog export returns zh with en fallback.
- **Character-linked reminder tags** — ST Tags and Public Tags sections in the player modal now include a character picker. Selecting a character shows its reminder tokens as quick-add chips; the resulting tag stores `📝label::charId` and renders with the character's portrait icon. Works in both ST and Public tag flows.
- **`MINION_INFO` / `DEMON_INFO` zh reminders** — First Night placeholder rows in NightOrderPreview now show Chinese reminder text from the wiki when language is zh.

### Changed
- **NightOrderPreview rows are clickable** — clicking any character row (when a reminder exists) opens a Popover anchored below the row showing the character name and full ST reminder in the current language. `···` indicator marks rows that have a reminder. Book-icon toggle still available for showing all reminders inline simultaneously.
- **Wake-order badge uses Popover** — replaced MUI `Tooltip` (clipped by card overflow) with a portal-rendered `Popover`. Clicking the `#N` number opens the ST night reminder for that seat's character in the current language; click again or outside to close.
- **Reminder tag zh translation** — `translateStTag` now falls through to `translateReminderZh` (80+ entry map) for zh mode, so all standard BotC reminder token labels render in Chinese.
- **Public tag log format** — add/remove tag log entries now show `[icon:charId] CharName:Label` (with inline character portrait) instead of the raw `📝label::charId` storage string.

### Fixed
- **Wake-order number click area too small** — increased padding on `#N` badge; active state shown via background highlight when popover is open.
- **`nominated` / `nominating` missing from zh reminder map** — added to `REMINDER_ZH_MAP`.

---

## 2026-05-17

### Added
- **Deal card active-session reopen** — the Characters tab now shows an `Open <sessionId>` button next to `Deal Cards` for the current host dashboard; `Deal Cards` still creates a fresh session
- **Deal card seat entry** — players can optionally enter their seat number before claiming a card; Storyteller assignment still overrides player-entered seats
- **Storyteller claim controls** — host dashboard can mark individual cards claimed or unclaimed, including clearing seat/name assignment when a card is reset
- **Delete from name pool** — each name chip in the Players tab now shows a × button to permanently remove that name from the pool
- **Fabled / Loric characters in new/edit game modal** — Settings tab now includes a collapsible Fabled & Loric picker with search; selected characters shown as cards with icon, name, and ability text; count badge in section header; selections persisted to `stFabledIds` on game start/apply
- **Storyteller name moved into game modal** — ST name field lives in the Settings tab of the new/edit game modal instead of the global Settings tab; persisted to `localStorage` as before

### Changed
- **Deal card Firebase rules documentation** — documented `claimedBySeat`, host assignment, and host claim/unclaim update fields for the Firestore rules used by deal sessions
- **New/edit game modal tab order** — Settings tab is now first (was last); removed `Allow Duplicate Characters`, `Allow Empty Characters`, `Allow Same Names` checkboxes (always-allow behaviour)
- **ST popup settings trimmed** — Storyteller Name field removed from the ST right-panel settings section (now in modal)

### Fixed
- **Deal card claim bounce** — successful claims now show the claimed character card instead of returning to the name/seat form; claim conflicts stay on the card grid with a warning
- **Deal card apply-to-game mapping** — host assignments use confirmed ST seats first and fall back to player-entered seats, expanding player count when needed
- **YouTube BGM on iOS Safari (second attempt)** — previous src-swap approach failed because modifying `.src` on an already-mounted iframe triggers an async page reload; iOS Safari's user-gesture window has already closed by the time the new URL's media starts. Fix: `sendYTCommand` now creates a fresh `<iframe>` element via vanilla DOM synchronously within the click handler, sets `autoplay=1` in `src`, and appends it to `document.body` — iOS permits autoplay when iframe is created+src-set within the gesture. Stop = remove element from DOM. React-managed "always-mounted" iOS iframe removed.
- **YouTube BGM auto-starts on iOS when URL is first added** — `handleUrlTrackAdd` now calls `sendYTCommand('playVideo')` immediately after setting `ytEmbedSrcRef`, while still inside the ✓ button tap gesture
- **Player count change mid-game not applying** — `applyGameChanges` now removes excess seats when count decreases and adds new blank seats when count increases; previously only updated properties on existing seats
- **New game panel defaults to 9 players** — `_doOpenNewGamePanel` now inherits player/traveler count from the current game instead of hardcoding 9
- **React hooks violation in game modal** — `useMemo`/`useState` calls moved before early `return null` guard; fixed runtime error when opening new/edit game panel
- **YouTube BGM on iOS Safari (third attempt)** — abandoned vanilla-DOM fresh-iframe approach (iOS blocks autoplay for cross-origin iframes regardless of gesture timing); replaced with persistent React mini-player (160×90, bottom-right corner): `ref` connects it to `sendYTCommand` postMessage, `visibility:hidden` keeps iframe alive when paused without unloading it, `sandbox` without `allow-top-navigation` blocks tap-to-YouTube-app redirect; user taps ▶ once to unlock the iframe's media context, then our play/pause buttons control via postMessage
- **YouTube BGM play/pause buttons now control iOS mini-player** — `sendYTCommand` rewired to postMessage to the persistent mini-player ref instead of creating/removing DOM iframes; pause/resume work after user's first tap
- **Tapping iOS mini-player no longer opens YouTube app** — `sandbox` attribute without `allow-top-navigation` prevents iframe from redirecting parent or launching YouTube app on tap
- **YouTube embed URL includes `origin` param** — aligns with YouTube IFrame API recommendation; embed URL now includes `origin=<page-origin>` for better API reliability

---

## 2026-05-15

### Added
- **Button labels in phase control panel** — Setup, Log, New, Save, Vote, Next labels shown below each icon for discoverability; nomination-phase buttons also labeled
- **Print Studio step in onboarding tutorial** — tutorial now spotlights the Print Studio tab (step 15 desktop, step 6 mobile) and explains PDF export

### Fixed
- **YouTube BGM play/stop on desktop** — restored original mount/unmount approach: iframe with `autoplay=1` mounts when playing, unmounts when stopped; postMessage-based control was unreliable and is removed for desktop
- **YouTube BGM on mobile Safari** — platform-split strategy: iOS pre-loads the iframe (always mounted, no `autoplay`); tapping play synchronously sets `iframe.src` to include `autoplay=1`, which iOS treats as a user-initiated navigation and permits; stop removes `autoplay=1` from src; `sandbox` attribute removed (it overrides `allow="autoplay"` on iOS Safari)

### Tests
- `youtubeAudio.test.ts` — updated to match platform-split architecture; covers URL params, `sendYTCommand` no-op on desktop, src-swap URL construction for iOS, YouTube vs audio track routing

---

## 2026-05-15

### Added
- **Interactive onboarding tutorial** — first-time visitors get a step-by-step spotlight tour; desktop: 14 steps (Scripts, Characters, Search, Info, Storyteller arena, roles, New Game, seating, night phase, Save Record, Analytics, add record, records table, done); mobile: 5 simplified steps; bilingual (EN/ZH); ESC or Skip to dismiss; re-trigger from ℹ️ info panel via 🎓 button; progress persisted in `localStorage`
- **Tutorial deep-dives for Storyteller + Analytics tabs** — spotlight highlights phase control panel, new game button, save button, arena seating, records table, and add-record button in sequence; tab auto-switches during tour so user sees live UI

### Fixed
- **Tutorial tab selectors** — MUI `<Tab>` doesn't forward `value` prop to DOM; added `data-tutorial="tab-X"` attributes to each tab element so spotlight targeting works reliably

---

## 2026-05-15

### Added  
- **New Game + Save Record buttons in phase control panel** — both buttons appear inline in the ST settings/log row on mobile; no extra row
- **In-app changelog page** — full-screen overlay accessible from the ℹ️ info panel; renders `CHANGELOG.md` with section colors, LATEST badge, back button; not shown in tab nav

### Fixed
- **Mobile Safari scroll lock after leaving Storyteller tab** — `scrollTo(0,0)` and `overflow:hidden` now in one effect; scroll runs before lock so Safari can't trap the page at a non-zero position
- **Storyteller header not visible on entry** — scroll-to-top guaranteed before overflow lock; ST full-screen layout always starts at viewport origin
- **Tab remount lag** — Analytics and Storyteller tabs stay mounted after first visit; switch uses CSS `display` toggle, no cold-start cost on return

---

## 2026-05-15

### Added
- **Script version displayed in sidebar** — script list rows show `v{version}` badge next to title; font sizes increased for better readability
- **Version persists across import/export** — `version` stored in `_meta` entry of exported JSON; `parseScriptFromData` restores it on import; round-trip safe
- **Changelog link in info panel** — tapping the ℹ️ info button now shows a "📋 Changelog" link to this file

### Changed
- **Script sidebar row sizing** — title `0.8→0.875rem`, version/author `0.65→0.75rem`, `text.disabled→text.secondary` for improved contrast
- **Records expand/collapse** — Collapse animation `300→150ms`; `unmountOnExit` so hidden panels don't stay in DOM; `RecordRowDetail` + `QuickEditPanel` wrapped in `React.memo`
- **Tab switching no longer causes remount** — Analytics and Storyteller tabs stay mounted after first visit; subsequent switches use CSS `display` toggle instead of full unmount/remount

### Fixed
- **Record detail panel hard to read on dark theme** — day labels (`primary.main` → `text.primary`), section backgrounds (`rgba(0,0,0,0.02)` → `action.hover/selected`), "Quick Edit" label (`warning.dark` → `warning.main`), all secondary labels moved to `text.primary` with opacity
- **MUI Chip `avatar` + `icon` warning** — MVP trophy chip no longer sets both props simultaneously; trophy appears in `avatar` slot when no character icon, or inline in `label` when character icon is present
- **Sort button hover tooltip** — removed "排序" tooltip from sort dropdown button in Scripts tab sidebar

### Security
- **YouTube iframe sandboxed** — added `sandbox="allow-scripts allow-same-origin allow-presentation"` to prevent iframe from navigating parent window
- **YouTube video ID validation** — regex now anchors to `[\w-]{1,32}` only; prevents path-traversal style IDs from reaching iframe `src`
- **`importJinxesJson` unguarded parse** — JSON.parse now wrapped in try-catch; type-checks result is a plain object before processing
- **File import size limit** — script JSON import now rejects files larger than 5 MB

---

## 2026-05-15

### Added
- **Script versioning** — `version` field on `EditableScript`; new scripts default to `1.0`; editable via Version text field in Script Info section of Script Editor
- **Download filename uses script name + version** — `{Title}_v{version}.json` (e.g. `Trouble_Brewing_v1.0.json`); falls back to title-only when no version set
- **Filter scripts by character** — search box in Scripts tab now matches character EN/ZH names within the script's character list

---

## 2026-05-15

### Fixed
- **Name pool assigns to wrong seat** — clicking a pool chip always assigned to the first available seat, ignoring which field was focused. Fix: `focusedSeatRef` (useRef) tracks last-focused seat; pool chip container uses `onMouseDown preventDefault` to keep TextField focus; chip click now assigns to the focused seat and falls back to first empty seat only when nothing is focused.

### Tests
- `uiRender.test.tsx` (53) — render sanity for `CharacterCircle`, `LogDetailText`, `VoteButtonGroup`, `RoundRobinIndicator`, `NominationHistory`, `PlayerNightLog`; `noText()` helper asserts no `undefined`/`[object Object]` DOM leakage
- `namePoolAssignment.test.tsx` (14) — no-focus fallback, focused-seat assignment, overwrite, all-filled no-op, focus-change between clicks, pure logic unit tests

---

## 2026-05-15

### Added
- **Drunk/poisoned MUI icon badges** — `StatusBadge` component uses `LocalBarIcon` / `ScienceIcon`; click-to-popover shows enlarged label + icon, matching other tag chips
- **Source character icon on ST tags** — when a skill applies `drunk::washerwoman`, the Washerwoman portrait appears on the drunk badge
- **Script tags redesign** — replaced WIP/Balanced/Experimental/Needs Review/Archived with `favorite` / `good` / `bad` / `excellent`; each tag has a MUI icon (⭐/👍/👎/✨) and EN/ZH label; font size increased
- **Tag-based script filter** — left-panel filter chips now use predefined tags (Favorite/Good/Bad/Excellent) + any custom tags; edition filter removed; chips render in active language
- **`red_herring` locale key** — added EN "Red Herring" and ZH "干扰项" to both locale files and `UiKey` union

### Changed
- **ST tag i18n** — `translateStTag()` + `ST_TAG_KEY_MAP` centralize tag label translation; drunk/poisoned/protected/used/red herring shown in active language throughout (seat cards, player modal, event log)
- **i18n centralization continued** — fixed remaining hardcoded `zh ? '…' : '…'` ternaries in Storyteller components; game-term locale keys added (`nomination`, `execution`, `vote`, `drunk`, `poisoned`, `demon_bluffs`, etc.)
- **Night phase gating** — drunk/poisoned badges only visible during night phase with "show characters" enabled (was always visible)

### Fixed
- **`t2 is not a function` crash in BgmBar** — `audioTracks.map((t) =>` shadowed `const t = makeT(language)`; renamed to `track`
- **`t2 is not a function` crash in ArenaSeatPlayerModal** — three `map((t) =>` callbacks shadowed translation function; renamed to `skillKey` / `tag`
- **ST tags showing English in Chinese mode** — player modal default tag list and existing stTags list now use `translateStTag(label, language)` for display
- **Event log ST tag entries in English** — `stTagDetail()` in `useGameActions` now calls `translateStTag` for label and `logPhrase` for verb; ZH logs show Chinese labels
- **ZH translation correction** — "red herring" was `障眼法`; corrected to `干扰项`

### Tests
- 135 new unit/integration tests added (410 total, 16 files)
- `languageSwitch.test.ts` (42) — `logPhrase`, `logDetail`, `makeT`, `translateStTag` EN↔ZH coverage
- `stTagFlow.test.ts` (27) — ST tag parse format, add/remove log strings EN/ZH, case-insensitive lookup
- `nightPhase.test.ts` (13) — dense-rank wake-order algorithm, night order registry structure
- `uiRender.test.tsx` (53) — render sanity for `CharacterCircle`, `LogDetailText`, `VoteButtonGroup`, `RoundRobinIndicator`, `NominationHistory`, `PlayerNightLog`; `noText()` helper asserts no `undefined`/`[object Object]` DOM leakage

---

## 2026-05-14

### Added
- **Jinx Manager dialog** — view, search, edit all 131+ jinx pairs from Characters tab; toggle active/inactive, edit EN/ZH rule text inline
- **Portable jinx file management** — export merged `jinxes.json` (source + overrides), re-import to restore; single file replaces split locale approach
- **Jinxes button** in Characters tab toolbar (next to Night Order)

### Changed
- **i18n centralization** — replaced ~100 hardcoded `zh ? '...' : '...'` ternaries across 6 components with `t()` / `tpl()` backed by `en.json` / `zh.json`
- Added `makeTpl(language)` helper to `lib/t.ts` for interpolated template strings

---

## 2026-05-13

### Added
- **Jinx analysis panel** in Character Revision Panel — shows all active jinx partners with partner icon and rule text
- **Visual jinx pair editor** in Script Editor — two-character Autocomplete pickers, symmetric A::B storage, canonical DB reason preview, status toggle chip
- **A::B symmetry enforcement** — pair IDs always sorted alphabetically; editing either side auto-normalizes

### Added
- **Night Order Manager drag-and-drop** — drag handle to reorder; click `+` to insert character after any row
- **Download button** moved inside Night Order Manager dialog
- **Script Editor UX overhaul** — accordion layout (Script Info, Characters, Notes, Advanced), responsive character picker grid, sticky selected-characters panel

### Fixed
- Custom characters not appearing in random seat assignment
- Pinned script revision not shown in Storyteller panels (was showing current revision instead)
- Unknown character IDs in script not visible in edit mode — now shows warning with Remove/Create Custom actions

---

## 2026-05-12

### Added
- Night Order Manager dialog (Characters tab) — view and edit wake order for first night / other nights
- Night order JSON download
- Per-character JSON file structure + download/upload packs
- Single character JSON import (adds as custom or overrides existing)
- Auto-create v1 revision on custom character save

### Fixed
- Night order position label on custom characters
- Custom chars included in wake order
- Laggy dialog inputs; AND filter logic for character search
- Deleted custom char still appearing in list
- Custom character selection showing wrong detail panel
- Custom chars in edition download dropdown

---

## 2026-05 (earlier)

### Added
- **Firebase Firestore short links** — 24h expiry share URLs for game logs and analytics
- **Natural language event log** — EN and ZH narrative entries with inline character icons
- **Save/load game** — checkpoint saves with export to JSON; full game setup data (demon bluffs) preserved
- **Analytics tab** — overview, per-player stats, records, character/script breakdowns, share link generation
- **Google Drive sync** — optional cloud backup (requires user OAuth2 credentials)

### Fixed
- Share payload — include MVP, ST name, ratings; strip icon tokens; whitelist analytics fields
- Print — bilingual-separate EN page showing ZH descriptions
- Storyteller — horizontal scroll on small screens; persist script selection across refresh; character popout repositioning

---

## 2026-04 and earlier

### Added
- **Storyteller Helper** — full game orchestration: night phases, nominations, votes, ST tags, event logging
- **Script Viewer** — browse, edit, and export character scripts to PDF
- **Print Studio** — PDF export with font/layout options, bilingual support
- **Characters tab** — browse all characters, revision history, custom character creation/editing
- **Custom characters** — create with icon upload, EN/ZH names/abilities, team, edition, night order positions
- **Jinx system** — per-script jinx overrides in script editor
- Night phase features, countdown timers, alarm sounds
- Mobile layout support

---

## Format

Each entry grouped by date. Types:
- **Added** — new feature or capability
- **Changed** — behavior or UX change to existing feature
- **Fixed** — bug fix
- **Removed** — deprecated feature removed
- **Refactor** — internal code change, no user-visible effect
