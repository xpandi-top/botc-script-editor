# Automated Testing

Companion to [`TESTING.md`](TESTING.md) (manual walkthroughs) and
[`TEST-PLAN.md`](TEST-PLAN.md) (manual per-tab cases). This file covers what runs
without a human: Vitest unit/component tests, Playwright e2e, and the data
validators wired into the build.

> An earlier version of this file was archived in May 2026 as outdated; see
> [`archive/TESTING-AUTO.md`](archive/TESTING-AUTO.md) for that snapshot. The
> stack below is the current one.

---

## Commands

```bash
npm test                # Vitest, single run — the gate most changes need
npm run test:watch      # Vitest watch mode
npm run test:coverage   # V8 coverage report
npm run test:ui         # Vitest UI

npm run test:e2e            # Playwright, all projects
npm run test:e2e:desktop    # desktop project only
npm run test:e2e:mobile     # mobile-android project only
npm run test:e2e:headed     # watch it run
npm run test:e2e:ui         # Playwright UI

npm run verify          # i18n strict + unit tests + build + bundle budget
npm run verify -- --e2e # ...plus desktop and mobile e2e
```

`npm run verify` is the full pre-push gate. `scripts/verify.mjs` runs the steps
in order and stops at the first failure.

---

## Stack

| Layer | Tool |
|-------|------|
| Runner | Vitest 4 (`vitest run`) |
| Environment | jsdom, configured in `vite.config.ts` under `test:` |
| Components | `@testing-library/react` + `user-event` |
| Assertions | `@testing-library/jest-dom` |
| Coverage | `@vitest/coverage-v8` |
| E2E | Playwright 1.60 (`playwright.config.ts`, specs in `e2e/`) |

Puppeteer is still a dependency but drives no tests — Playwright replaced it, and
the only remaining use is `scripts/demo-screenshots.mjs`. E2E projects are
`desktop` and `mobile-android`; the config starts its own dev server unless you
point it at a running one.

---

## Layout

All Vitest specs live in `src/__tests__/`. `.test.ts` for logic, `.test.tsx` for
anything that renders. 37 files, 768 tests as of 2026-08-31.

Roughly four groups:

**Pure logic** — `seats`, `votes`, `voteTokens`, `logFilter`, `catalog`,
`nameDisambiguation`, `sanitizeAbilityHtml`, `nightOrderValues`. No mocking
beyond external I/O.

**Game state and hooks** — `nightPhase`, `stTagFlow`, `playerLog`,
`playerCountChanges`, `gameIdAndSave`, `saveBeforeNewGame`, `storytellerStorage`,
`storytellerFixes`, `gameExport`, `dealCard`, `urlBgm`, `youtubeAudio`,
`bundleIO`.

**Component render** — `uiRender`, `tabRender`, `analyticsRender`,
`statusBadgeAndTags`, `communicationBoard`, `rectangleToken`,
`NominationVoteList`, `namePoolAssignment`, `errorBoundary`, `changelog`,
`scriptFeatures`, `PrintOptionsDialog`, `languageSwitch`, `editionGlossary`,
`editionAttribution`.

**Shipped-data invariants** — `characterPack` and `nightOrderValues` read
`assets/` directly and assert the data is internally consistent: ids unique and
matching filenames, every character has an icon, night order free of unknown ids
and duplicates, jinxes referencing real characters, and the Odyssey pack's
reminder tokens agreeing with the wiki text kept in `assets/almanac/`. These
catch a bad import or re-sync that type checking cannot see.

---

## Validators outside Vitest

| Command | Checks |
|---------|--------|
| `node scripts/validate-revisions.mjs` | Runs as part of `npm run build`. Every character/jinx revision resolves, and `ability` matches `revisions[current_revision]` in both locales. A build fails rather than shipping drifted revision text. |
| `npm run i18n:check` / `:strict` | Locale key parity between `en.json` and `zh.json`. |
| `npm run bundle:check` | Bundle size budget (`scripts/bundle-budget.mjs`). |
| `python3 scripts/odyssey/verify.py` | Network. Re-fetches the Odyssey wiki and compares ability text through a different parser than the importer. Not part of `npm test`. See [`ODYSSEY.md`](ODYSSEY.md). |

---

## Setup file

`src/test/setup.ts` loads `@testing-library/jest-dom` and installs an in-memory
`localStorage` / `sessionStorage`.

The storage shim is not optional: Node 26 defines both globals but resolves them
to `undefined` unless the process is started with `--localstorage-file`, and
those globals shadow the ones jsdom installs. Without the shim every
`localStorage.*` call in a test throws. The shim only fills a global that is
missing or undefined, so it is a no-op where jsdom's own Storage survives.

---

## Conventions

- Query by role or text, never by MUI class names.
- Prefer `userEvent` over `fireEvent` for interaction.
- One `describe` per exported function; one behavior per `it`.
- When a test mocks `../catalog`, mock **every** catalog function the component
  reaches. Spreading `...actual` and overriding one name lets a sibling function
  resolve through the real catalog and quietly defeat the mock — this is what
  broke `scriptFeatures.test.tsx` when `getDisambiguatedName` was added.
- Assert on collected arrays (`expect(problems).toEqual([])`) rather than looping
  assertions, so a failure names every offender at once.

## Not worth testing

- MUI internals, CSS values, `import.meta.glob` loader behavior.
- `useStoryteller.ts` as a unit — too stateful; cover it through components.
