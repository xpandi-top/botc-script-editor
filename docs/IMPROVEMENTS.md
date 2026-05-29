# BOTC Webapp Improvement Plan

Audit date: 2026-05-28.

This plan is intentionally behavior-preserving. Each item should land behind existing UI flows, with tests proving no current functionality regressed.

## Current Evidence

- Source size is concentrated in a few large modules: `ArenaSeatPlayerModal.tsx` (1325 lines), `catalog.ts` (1124), `App.tsx` (1105), `CharactersTab.tsx` (1098), `lib/ai/skills.ts` (918).
- Production build passes, but warns about large chunks. Current notable chunks: main `index` 1228.62 kB min / 337.34 kB gzip, `vendor` 643.88 kB / 197.79 kB, `jspdf` 390.65 kB / 127.33 kB, `html2canvas` 202.38 kB / 47.71 kB.
- PWA precache currently includes 291 entries / 43.7 MiB. Large static assets include 4 MB Chinese fonts, 4-7 MB SVG backgrounds, duplicated audio under `audio/` and `public/audio/`, and several large PDFs under ignored `assets/pdfs/`.
- Security posture is partially hardened: DOMPurify is used for ability HTML; Electron has `nodeIntegration: false`, `contextIsolation: true`, and external-link handling. Remaining risks are client-side secrets, token storage, broad localStorage usage, and Electron URL validation.
- Test coverage exists across unit/render/e2e, including mobile analytics E2E. Multi-platform build scripts exist for web, native, Android, and Electron.
- `i18n` now has terminology guardrails via `assets/locales/terminology.json` and `npm run i18n:check:strict`.

## P0 — Guardrails Before Large Refactors

**Goal:** make future cleanup safe and measurable.

1. Add CI/local gates that run:
   - `npm run i18n:check:strict`
   - `npm test`
   - `npm run build`
   - `npm run verify` runs the core local gate.
   - `npm run verify -- --e2e` also runs desktop and mobile Playwright smoke tests.
2. Add a bundle-size budget step:
   - Parse Vite output or add a lightweight bundle analyzer.
   - Track main JS gzip, vendor gzip, PWA precache size, and largest static asset.
   - Set initial warning thresholds from current evidence, then lower over time.
3. Add a regression checklist for behavior-preserving changes:
   - scripts browse/edit/print
   - storyteller new game, night/day/nomination flow
   - analytics records
   - settings/cloud sync
   - web/mobile/electron/native build impact

Acceptance:
- CI or local `npm run verify` equivalent can run the core checks with one command.
- Bundle-size changes are visible in every performance-related PR.

## P1 — Component Management & Extensibility

**Goal:** split large UI surfaces into stable, typed feature modules without changing behavior.

1. Break up high-risk components by responsibility:
   - `ArenaSeatPlayerModal`: character panel, public tags, ST tags, ability action form, status controls, event log.
   - `App`: route/tab shell, script state, sharing/import, cloud sync, print preview state.
   - `CharactersTab`: filters/list, pack import dialog, revision controls, character detail.
2. Keep orchestration hooks as the boundary:
   - Continue using `useStoryteller` as the state owner, but expose smaller typed command groups: phase, seats, tags, records, audio, setup.
   - Avoid passing broad `ctx` into new components when a narrower prop group is enough.
3. Establish feature folders for new work:
   - `components/StorytellerSub/Arena/*` for arena UI only.
   - `components/StorytellerSub/Modals/*` for modal workflows.
   - shared pure helpers under `utils/` or `lib/`, not inside components.
4. Reduce `any` usage in active UI files:
   - Prioritize RightConsole, nomination, modal, and seat components.
   - Replace callback state updaters with `DayState`, `StorytellerSeat`, `VoteDraft`, `SkillRecord`, and `GameRecord` types.

Acceptance:
- No feature module grows beyond roughly 500 lines unless it is a data/config file.
- New components have typed props and narrow boundaries.
- Existing render/unit tests pass after each extraction.

## P2 — Security Hardening

**Goal:** reduce exposure from user-supplied data, client secrets, and native shell boundaries.

1. Keep all rendered ability/custom HTML behind DOMPurify.
   - Add tests for custom character/script import containing event handlers, links, scripts, and SVG HTML.
2. Treat frontend API keys and Google OAuth client secrets as public.
   - Keep the existing Vite warning.
   - Document that public deployments should use a server-side OAuth proxy.
   - Avoid storing provider API keys in exported backups unless explicitly requested.
3. Harden Electron bridge:
   - Validate `openExternal` URL schemes to `https:` plus known `http://localhost` OAuth callbacks only.
   - Avoid allowing arbitrary `file:`, custom protocol, or javascript-like schemes through IPC.
4. Audit persisted sensitive values:
   - Host deal tokens, OAuth verifier/state, AI keys, and Drive user info should have documented storage keys, expiry expectations, and export/import behavior.
5. Add a dependency/security check cadence:
   - Run `npm audit` before releases.
   - Track Electron, Firebase, Capacitor, and Vite updates as high-priority security dependencies.

Acceptance:
- Malicious script/character HTML does not execute in Sheet, Characters, Print, or Analytics surfaces.
- Electron IPC cannot open unsafe schemes.
- Storage/export behavior for tokens and keys is documented.

## P3 — Performance & Bundle Size

**Goal:** reduce first-load cost and PWA/native package weight while preserving offline behavior.

1. Split heavy optional paths:
   - Keep `jspdf` and `html2canvas` lazy-loaded for print/export/share paths.
   - Investigate why they are emitted as standalone chunks and confirm they are not fetched on initial app load.
   - Consider a manual chunk for export libraries only if runtime loading stays lazy and no React/MUI init race returns.
2. Reduce main chunk pressure:
   - Move script/catalog-heavy work behind feature lazy loads where possible.
   - Avoid importing `catalog.ts` in app shell utilities that can defer until a tab loads.
   - Consider splitting immutable character data from helper functions.
3. Optimize static assets:
   - Replace oversized SVG backgrounds with optimized raster/WebP/AVIF or compressed SVG variants.
   - Subset or lazy-load large Chinese fonts (`xinwei`, `xingkai`) instead of shipping both up front.
   - Decide whether `audio/` duplicates `public/audio/`; keep one runtime source.
   - Keep `assets/pdfs/` ignored and out of web/PWA bundles unless a feature explicitly serves them.
4. Reduce PWA precache size:
   - Precache only shell-critical assets.
   - Move optional audio/fonts/icons to runtime cache with expiration.
   - Track precache size in the bundle budget.
5. Runtime rendering:
   - Keep `React.memo` on seat cards and test with 20 seats.
   - Memoize expensive selectors in `useStats`, script filtering, and character search.
   - Avoid timer ticks causing unrelated panels/modals to re-render.

Acceptance:
- Initial JS gzip and PWA precache size trend downward.
- Storyteller with 20 seats remains responsive during timers and nomination voting.
- Mobile analytics remains free of horizontal overflow.

## P4 — Multi-Platform Reliability

**Goal:** make web, PWA, Android, iOS, and Electron behavior explicit and testable.

1. Maintain separate verification lanes:
   - Web: `npm run build`, `npm run test:e2e:desktop`
   - Mobile web: `npm run test:e2e:mobile`
   - Native: `npm run build:native`
   - Android: `npm run android:apk` or `npm run android:build`
   - Electron: `npm run electron:build`
2. Add platform smoke checks:
   - App boot
   - language/theme persistence
   - local backup export/import
   - print/export path
   - Google Drive sync settings page
   - audio playback controls
3. Define platform-specific storage behavior:
   - Web uses `localStorage`.
   - Native uses Capacitor Preferences via the storage adapter where possible.
   - Electron OAuth loopback uses IPC bridge and local app storage.
4. Add viewport matrix to E2E:
   - 393 x 851 mobile
   - 768 x 1024 tablet
   - 1280 x 800 desktop
   - high-density mobile screenshot smoke for arena and print preview.

Acceptance:
- Each supported platform has a documented minimum smoke command.
- Layout checks cover mobile, tablet, and desktop for scripts, storyteller, analytics, print, and settings.

## P5 — Cleanup & Repository Hygiene

**Goal:** remove confusion and reduce accidental bloat.

1. Remove generated/local noise:
   - Delete existing `.DS_Store` files outside `.git`, `node_modules`, generated outputs, and ignored folders.
   - Keep `.DS_Store`, `dist`, `dist-native`, `coverage`, `ios`, Android build outputs, and local env files ignored.
2. Confirm dead files before removal:
   - `ArenaSeatCharacterPopout.tsx`, `ArenaSeatSkillPopout.tsx`, and `ArenaSeatTagPopout.tsx` currently appear unreferenced.
   - Remove only after `rg` confirms no imports and after storyteller render tests pass.
   - Do not remove `SettingsTab.tsx`; it is actively imported by `App` and tested.
3. Remove stale compatibility modules:
   - `src/i18n/index.ts` appears unused after migration to `lib/t.ts`; verify with imports and remove only if no external tooling depends on it.
4. Consolidate duplicated public assets:
   - Compare `audio/` and `public/audio/`; remove one source or document why both are required.
   - Keep source assets out of `public/` unless the runtime fetches them directly.
5. Archive policy:
   - Keep `docs/archive/` for historically useful design notes.
   - Move obsolete issue notes into archive instead of mixing fixed historical items with active plans.

Acceptance:
- `git ls-files` no longer includes unused source files after confirmed removal.
- No tracked generated output or OS files.
- Asset duplication has a documented owner or is removed.

## P6 — Data, Storage & Migration Management

**Goal:** make localStorage/Preferences data safe to evolve.

1. Create a storage contract doc for:
   - game state
   - records
   - custom characters
   - user scripts
   - script metadata/folders
   - character pack/revision/jinx overrides
   - cloud sync metadata
   - AI settings and API keys
2. Add versioned migration helpers:
   - Validate persisted JSON shape before use.
   - Keep corrupt-data fallbacks from losing existing records.
   - Log recoverable parse failures only in development.
3. Test import/export contracts:
   - Backup merge vs replace.
   - Unknown future fields.
   - Duplicate IDs.
   - Cross-platform native storage migration.

Acceptance:
- Every persisted key has an owner, schema, and migration policy.
- Backup import/export tests cover corrupt and partial data.

## P7 — Test Coverage Roadmap

**Goal:** cover high-risk behavior, not just rendering.

1. Add integration tests for `useGameLifecycle`:
   - start game
   - night to day transitions
   - next day carries correct state
   - reset game
   - load saved record without opening save modal
2. Add parser/security tests for `parseScriptFromData`:
   - official script
   - legacy script
   - custom characters
   - malformed JSON-like shapes
   - HTML injection payloads retained as safe text/rendered sanitized downstream
3. Expand E2E:
   - Storyteller new game and nomination flow.
   - Print preview open/close and export settings.
   - Settings cloud sync form smoke without real auth.
   - Offline/PWA reload smoke if feasible.
4. Add visual/screenshot smoke for:
   - mobile storyteller arena
   - desktop storyteller arena
   - analytics mobile
   - print preview

Acceptance:
- Critical user flows have at least one automated test at unit, integration, or E2E level.
- E2E failures capture traces/screenshots in CI.

## Suggested Order

1. P0 guardrails and verification command.
2. P5 cleanup of confirmed dead/noise files.
3. P2 security tests and Electron URL hardening.
4. P1 component extraction, starting with `ArenaSeatPlayerModal`.
5. P3 asset and bundle-size work.
6. P4 platform smoke matrix.
7. P6 storage contracts and migrations.
8. P7 deeper integration/E2E coverage.

## Do Not Break

- Existing locale keys and i18n checker behavior.
- Existing saved localStorage data.
- Script import/export compatibility.
- PWA base path `/botc-script-editor/`.
- Native relative asset paths in `dist-native`.
- Current web, Android, and Electron build entrypoints.
