# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # TypeScript check + Vite build
npm run preview      # Preview production build

# Add a character ability revision to assets/characters/individual/<id>.json
# (becomes current; --keep-current adds an alternative; a language left out keeps its text):
npm run add-revision -- <char_id> --en "text" --zh "text" [--revision v2026-09] [--note "why"]

# AI answer feedback (👍/👎, shared conversations): stats + draft eval cases, from the
# Google Form's Sheets export (--csv) or from D1 (--days)
(cd worker && npm run feedback -- --csv responses.csv)

# Re-check reminder tokens against the official roles.json (English) and the
# 集石 wiki 提示标记 sections (Chinese); add `-- --write` to update the files
npm run sync-reminders

# Character guides (how to play / examples / how to run / bluffing) for the AI and the
# almanac panel, from the 集石 and official wikis → assets/almanac/ (see docs/AI-CONTENT.md);
# `-- --refresh` refetches. Coverage + freshness report:
npm run build:guides
node scripts/audit-ai-content.mjs --online

# Ability texts vs official roles.json (English) and the 集石 wiki (Chinese), classified
# (errata / spelling / translation / new version / wiki older) — review, then add-revision
npm run check-abilities
```

```bash
npm test                # run all automated tests (Vitest)
npm run test:watch      # watch mode
npm run test:coverage   # coverage report
```

See [`docs/TESTING-AUTO.md`](docs/TESTING-AUTO.md) for the automated test architecture, and [`docs/TESTING.md`](docs/TESTING.md) / [`docs/TEST-PLAN.md`](docs/TEST-PLAN.md) for the manual passes.

`npm run verify` is the full pre-push gate (i18n strict check + unit tests + production build + bundle budget); add `-- --e2e` for the Playwright smoke tests.

## Architecture

**Blood on the Clocktower** script viewer + storyteller game orchestration tool. Two main domains:

1. **Script Viewer** — browse/edit/export character scripts to PDF
2. **Storyteller Helper** — full game orchestration: night phases, nominations, votes, history

### Entry Points

- `src/main.tsx` — React root, MUI theme injection
- `src/App.tsx` — tab router (scripts | characters | storyteller | analytics | printstudio)
- `src/components/StorytellerHelper.tsx` — storyteller game launcher

### State Management

- **Script viewer**: local `useState` in `App.tsx` (script list, active script, language, edit mode)
- **Game state**: `src/components/StorytellerSub/useStoryteller.ts` — persisted to localStorage key `botc-storyteller-companion-v5`; provides undo/redo via `useHistory`
- Sub-hooks split concerns: `useGameLifecycle` (phase transitions), `useGameActions` (votes/skills/events), `useUIState`, `useAudioState`

### Data Loading

`src/catalog.ts` uses Vite `import.meta.glob()` to eagerly load all:
- `/assets/characters/*.json` — character definitions (id, team, edition, revisions, jinxes)
- `/assets/scripts/*.json` — script definitions
- `/assets/icons/*` — character icon images
- `/assets/locales/{en,zh}.json` — UI strings + character abilities

Utility functions in `catalog.ts`: `getDisplayName`, `getAbilityText`, `getCurrentRevision`, etc.

### Game State Shape

State organized as: `days[] → phases (night|private|public|nomination) → events[]`. Each event logged with timestamp and visibility (`public` | `st-only`).

### Localization

Two-language (en/zh). Locale files contain UI strings, character abilities, jinx reasons. Language toggled globally via `App.tsx`.

### Key Files

| File | Purpose |
|------|---------|
| `src/catalog.ts` | All data loading + character utility functions |
| `src/types.ts` | Core types: `Team`, `CharacterEntry`, `EditableScript`, etc. |
| `src/components/StorytellerSub/useStoryteller.ts` | Main game state hook |
| `src/utils/seats.ts` | Game logic (eligible voters, living non-travelers) |
| `src/theme/index.ts` | MUI theme config |
| `src/components/StorytellerSub/` | 12 components for game UI (Arena, Modals, RightConsole, etc.) |

### Tech Stack

- **React 19** + **TypeScript 5.8** + **Vite 6**
- **Material UI (MUI) 9** + Emotion for all UI components
- Puppeteer installed but no test scripts configured

## API / MCP Roadmap

See [`docs/ARCHITECTURE-API.md`](docs/ARCHITECTURE-API.md) for the plan to expose scripts, characters and storyteller automation to agents (REST + MCP on Cloudflare free tier). Game rules, stats and script parsing are being extracted into `src/core/`, which must stay framework-free: no React/MUI/Firebase, no DOM or `localStorage`, no `import.meta` (enforced by `npm run core:check` and `src/__tests__/coreBoundary.test.ts`). Keep old import paths working through re-exports while migrating.

The API/MCP server lives in `worker/` (Cloudflare Worker, own `package.json`; `cd worker && npm install && npm test`). It imports `src/core` directly and reads a catalog snapshot generated by `npm run build:catalog` (`scripts/catalog-data.mjs`); `src/__tests__/coreCatalog.test.ts` keeps that snapshot equivalent to `src/catalog.ts`.

## Issue Tracking

See [`docs/ISSUES.md`](docs/ISSUES.md) for open/fixed bugs and features.

## Character Packs

See [`docs/ODYSSEY.md`](docs/ODYSSEY.md) for the Odyssey (`edition: "odyssey"`) import — what was added, what is still missing (English text, almanac fields, new vote-token/Judgment-Day mechanics), and how to re-sync from the source wiki.
