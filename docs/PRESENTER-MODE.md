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

In the storyteller tab, click **Open audience window**. This also enables the
private storyteller view, including during daytime. The switch can disable it
without interrupting the audience. **End presentation**, or closing the audience
window, returns the host to its ordinary visibility settings. Existing night
visibility controls remain available.

The audience route has no editing or game navigation. Only its fullscreen button
is interactive. Refresh reconnects to the current host; if the host stops sending,
the board is replaced by a connection message after 12 seconds. Keep the host
window open. Reloading the host requires opening a new audience window.

Electron allows only this specific local audience route to create another app
window. Existing external-link behavior is unchanged. Each host uses a fresh
session identifier, so separate host windows do not mix their broadcasts.

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
