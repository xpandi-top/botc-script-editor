# Changelog

Release timeline for BOTC Companion — features, fixes, and improvements.

---

## [Unreleased]

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
