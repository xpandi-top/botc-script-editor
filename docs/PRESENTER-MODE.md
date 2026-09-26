# Presenter mode — first release

## Plan

1. Add a dedicated audience route with a read-only circular table, public player
   status, phase, countdown, and nominations. Keep the existing game UI unchanged.
2. Publish an explicit allowlist of public fields from the host over a unique
   per-window BroadcastChannel. Never mount the game hook or load game storage in
   the audience route. The host alone owns timers, audio, persistence, and actions.
3. Add an opt-in private presenter view, independent of day/night. Restore normal
   visibility when presentation ends. Keep ordinary single-window behavior.
4. Test public payload privacy, live updates, refresh, window lifecycle, and the
   existing privacy flow; run the repository verification gate before committing.

## Scope

Use an extended desktop and move the audience window to the external display, or
share only that window in Zoom. This release does not select displays automatically
or provide remote-device audience links. Audio remains in the host window.
The audience receives public custom tags, but never storyteller tags, non-traveler
identities, alignments, notes, private actions, bluff roles, or complete game data.
It is a presentation surface on the host's computer, not an authentication boundary
against someone with access to that computer's browser storage.

## Usage

In the storyteller tab, click **Audience** (投屏) in the game rail beside the
arena; on phones and portrait tablets open the ☰ menu first. This also enables the
private storyteller view, including during daytime. While presenting, a status
strip above the arena holds the private-view switch, **Show audience window** and
**End presentation**. The switch can disable the private view without interrupting
the audience. **End presentation**, or closing the audience window, returns the
host to its ordinary visibility settings. Existing night
visibility controls remain available.

The audience route has no editing or game navigation. Only its fullscreen button
is interactive. Refresh reconnects to the current host; if the host stops sending,
the board is replaced by a connection message after 12 seconds. Keep the host
window open. Reloading the host requires opening a new audience window.

Electron allows only this specific local audience route to create another app
window. Existing external-link behavior is unchanged. Each host uses a fresh
session identifier, so separate host windows do not mix their broadcasts.

### Daily nomination history

The audience shows every day of the current game's nomination history in reverse day
order (newest first), including days with no records. Wide windows display it in a scrollable
sidebar alongside the table; narrower windows place it below the table. Each day lists nominators and nominees; records are newest first. Each
entry includes the day's player names, nomination/exile type, vote count and
threshold, voting seats, and explicit result. Advancing the day and refreshing the audience
retain earlier records. Vote notes and private historical player fields are
excluded from the public payload.

Follow-up validation: `npm run verify` passed with 787 unit tests. All 10
presentation/privacy desktop and mobile E2E cases passed, including advancing
to another day and refreshing with historical nominations. The two daily-history
cases were also rerun after correcting the nomination label. Reviewed the wide
audience layout with its daily-history sidebar.

## Verification

- `npm run verify -- --native`: passed strict locale validation, 786 unit tests
  across 41 files, production build, bundle budget, and native build.
- `npx playwright test e2e/presentation.spec.ts e2e/storyteller-privacy.spec.ts --workers=2`:
  all 8 desktop/mobile tests passed. The 6 presentation cases were rerun after
  layout refinements and adding live death-status coverage; all passed.
- `node scripts/test-presentation-electron.cjs`: native window opening,
  file-origin synchronization, secret exclusion, refresh, and closing verified
  using an isolated temporary profile.
- Reviewed screenshots of audience and presenter layouts.
- Physical external monitors and an actual Zoom meeting were not exercised.


### Claimed names and player privacy

Claimed names now synchronize to game seats across all days, even with the
assignment dialog closed. Creating a claim session takes effect without reloading
and switching games disconnects the old roster. Guest character cards stay hidden
on load and on live role delivery; each new remote nomination also hides an open
card. Guests may explicitly reopen it. Remote votes use 10 seconds per player,
independently of the nominee speech timer; new local timer defaults are 10 seconds.

Validation: full verification passed (793 unit tests, locale validation, build,
bundle budget), plus 10 desktop/mobile presentation and privacy cases. Focused
regressions cover live roster subscription/session changes, ten-second remote
vote requests, hidden live role delivery, hiding on new nominations, and descending
daily/within-day history. Cloud callbacks are mocked in unit tests; no live
Firestore game was modified for testing.
