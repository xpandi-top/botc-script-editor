# Issues Tracker

Format: `[ID] Status — Description`
Status: `open` | `fixed` | `wontfix`

---

## I-43 — Script tab: no JSON import option

**Status:** fixed  
**Area:** ScriptsTab  
**Detail:** No "Load from JSON" button in script list sidebar. Users cannot import community scripts at runtime. Need to add file-input that reads a `.json` script and appends it to the editable scripts list.

---

## I-44 — Wake order uses actual character (correct; no fix needed)

**Status:** wontfix  
**Area:** ArenaSeat, MobileSeatCard  
**Detail:** `playerWakeOrder` computed via `seat.characterId` (actual character), not `seat.userCharacterId` (perceived). This is correct ST behavior. Original report was a misunderstanding.

---

## I-45 — Records sidebar: buttons overflow on long filenames

**Status:** fixed  
**Area:** RightConsoleRecords  
**Detail:** Record header row uses `justifyContent: space-between` with inline buttons. Long `recordName` pushes buttons off-screen. Fix: wrap buttons below name, or truncate name with `noWrap` ellipsis.

---

## I-46 — EndGame modal crash: endGameResult null (CRITICAL)

**Status:** fixed  
**Area:** ModalsEndGame  
**Detail:** Crash at line 79 `egr.winner` when `endGameResult` is null. Triggered by clicking Save Game without prior game-end survey. Guard `if (!isVisible || !egr) return null` at line 24.

---

## I-47 — Nomination vote chips missing name/alive/no-vote info

**Status:** fixed  
**Area:** NominationVoteList  
**Detail:** Each voter chip shows only `#seat` number. Should show: player name, alive/dead marker, and "No Vote" tag if `seat.hasNoVote`.

---

## I-48 — Load record auto-opens Save Game modal

**Status:** fixed  
**Area:** Modals/index.tsx, useGameLifecycle.ts  
**Detail:** `loadGameRecord` sets `endGameResult` (for pre-fill). Dialog used `open={!!endGameResult}` so it opened immediately. Fixed by switching to `open={!!showEndGameModal}` — dialog only opens when explicitly triggered. Also added `setShowEndGameModal(false)` in `loadGameRecord` to close if already open.

---

## Previous Issues (I-38 to I-42) — Fixed

| ID | Issue | Status |
|----|-------|--------|
| I-38 | Phase-switch sound not respecting toggle | fixed |
| I-39 | Mobile font/button sizes too small | fixed |
| I-40 | Wake order visible only on selected card | fixed |
| I-41 | BGM local upload missing from settings | fixed |
| I-42 | Duplicate game action buttons in mobile bottom sheet | fixed |
