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

## I-49 — Character Popout: Multi-target skill panel

**Status:** fixed  
**Area:** ArenaSeatCharacterPopout  
**Detail:** Add a skill action section below character assignment. Workflow:
1. Skill type dropdown: Know / Guess / Add Tag / Remove Tag / Change Character
2. Target player checkboxes — all seats, showing seat#, name, actual char, perceived char, current tags
3. Skill config per type:
   - Know / Guess → select Good / Evil / Character (dropdown) / Other (text field)
   - Add Tag → text input or tag pool chips
   - Remove Tag → show existing tags of selected players
   - Change Character → character dropdown from current script
4. "Mark as successful" toggle + Save button
5. On save with success:
   - Add Tag → append stTag to each target seat (logged)
   - Remove Tag → remove selected tag from each target seat (logged)
   - Change Character → set both `characterId` AND `userCharacterId` on target seats (logged)
   - Know / Guess → log entry only, no state change

---

## I-50 — ST Tags: Move display to player card (night + show-char only)

**Status:** fixed  
**Area:** ArenaSeatComponents, MobileSeatCard, ArenaSeatCharacterPopout  
**Detail:** Currently stTags shown only inside character popout. Move display to player card. Show stTag chips on the card only when `isNightPhase && nightShowCharacter`. Remove stTag display block from the character popout (keep the ability to add/remove via skill panel in I-49). Tags render as small chips with ST-only styling.

---

## I-51 — Night phase per-player event log button

**Status:** fixed  
**Area:** ArenaSeatComponents, MobileSeatCard  
**Detail:** Add a log button on player cards (night phase only, near character button). Opens a modal showing event history **for that player only**:
- Filter eventLog entries where `detail` contains `#${seat.seat}` (as actor or target)
- Also include voteHistory records where `actor === seat.seat || target === seat.seat`
- Also include skillHistory records where `actor === seat.seat || targets.includes(seat.seat)`
- Grouped by day (descending: current day first, day 1 last)
- Within each day, events sorted descending by timestamp
- Display format: day header → event lines like "poisoned by #3", "executed", "nominated #5"

---

## I-52 — Print optimization dialog

**Status:** fixed  
**Area:** ScriptsTab, SheetArticle, App  
**Detail:** Print button triggers `window.print()` directly with no customization. Need a pre-print dialog with:
1. Icon size slider (currently 32px — too small for B&W print)
2. 1-column vs 2-column layout toggle
3. Font family selector (sans / serif / mono)
4. Font size slider (currently `pdfFontSize` state exists but unconnected)
5. Padding/density selector (compact / normal / spacious)
6. Black & white mode (grayscale filter + remove color tints)
7. Bilingual export (show both EN and ZH ability text per character)
On confirm: apply options to print portal then call `window.print()`.

---

## Previous Issues (I-38 to I-42) — Fixed

| ID | Issue | Status |
|----|-------|--------|
| I-38 | Phase-switch sound not respecting toggle | fixed |
| I-39 | Mobile font/button sizes too small | fixed |
| I-40 | Wake order visible only on selected card | fixed |
| I-41 | BGM local upload missing from settings | fixed |
| I-42 | Duplicate game action buttons in mobile bottom sheet | fixed |

---

## I-53 — PrintStudio + PrintPreview: mobile/tablet optimization

**Status:** open  
**Area:** PrintStudio/PrintStudioPage.tsx, PrintPreviewPage.tsx  
**Detail:** Both pages assume wide desktop layout. On mobile/tablet: settings panel overlaps content, sliders too cramped, preview canvas overflows viewport. Fix: responsive layout (stack panel below on mobile, hide panel behind toggle on tablet), full-width preview on small screens.

---

## I-54 — ST: Next Day should start at Night phase, reset reveal flags

**Status:** fixed  
**Area:** useGameLifecycle.ts, constants.ts  
**Detail:** `createDayState` sets `phase: 'private'`. On Next Day: should start at `phase: 'night'`. Also reset `showCharacters` and `showWakeOrder` UI flags to false on day transition.

---

## I-55 — ST: Storyteller icon in compact toolbar (fabled/loric + custom rules)

**Status:** open  
**Area:** CompactToolbar.tsx  
**Detail:** Add centered round-circle icon button for storyteller. Click opens panel to: assign fabled/loric characters, enter custom rules text. When not editing: click shows current assignment read-only.

---

## I-56 — ST: Player card character circle redesign

**Status:** fixed  
**Area:** Arena/ArenaSeat, Arena/MobileSeatCard  
**Detail:** Per image: replace character icon tab with circle above player card. When showCharacters=true: circle shows character icon + name. When false: circle shows "?". Mobile: circle overlaps left edge of card. Remove old tab-style character icon reveal.

---

## I-57 — ST: Game records / DDB analytics tab

**Status:** open  
**Area:** New tab — src/components/tabs/AnalyticsTab.tsx  
**Detail:** New tab showing gaming records analysis:
1. Win rates (evil/good) — total, per script, per player, per character
2. Per player: characters played, scripts played, evil/good split, win rate
3. Per record: script info, character info
4. Per script: aggregated stats
Data source: saved game records in localStorage.

---

## I-58 — ST: Consolidate Ability + Status into single button/modal

**Status:** fixed  
**Area:** Arena/ArenaSeat.tsx, Arena/MobileSeatCard.tsx, Arena/ArenaSeatPlayerModal.tsx  
**Detail:** Merged Ability + Status into single "Actions" button opening one Dialog (ArenaSeatPlayerModal) with MUI Tabs. Ability tab: full skill form when skillOverlay active, else "Use Ability" button. Status tab: alive/executed/traveler/noVote toggles, custom tag input, tag pool, character-as-tag section. Rendered via createPortal. Old ArenaSeatTagPopout/ArenaSeatSkillPopout removed from both seat components.
