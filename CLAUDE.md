# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # TypeScript check + Vite build
npm run preview      # Preview production build

# Add character ability revision (custom Vite plugin script):
npm run add-revision -- <char_id> --en "text" --zh "text"
```

No lint or test scripts configured.

## Architecture

**Blood on the Clocktower** script viewer + storyteller game orchestration tool. Two main domains:

1. **Script Viewer** — browse/edit/export character scripts to PDF
2. **Storyteller Helper** — full game orchestration: night phases, nominations, votes, history

### Entry Points

- `src/main.tsx` — React root, MUI theme injection
- `src/App.tsx` — tab router (scripts | characters | settings | storyteller)
- `src/components/StorytellerHelper.tsx` — storyteller game launcher

### State Management

- **Script viewer**: local `useState` in `App.tsx` (script list, active script, language, edit mode)
- **Game state**: `src/hooks/useStoryteller.ts` — persisted to localStorage key `BOTC_ST_STORAGE`; provides undo/redo via `useHistory`
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
| `src/hooks/useStoryteller.ts` | Main game state hook (~41KB) |
| `src/utils/seats.ts` | Game logic (eligible voters, living non-travelers) |
| `src/theme/index.ts` | MUI theme config |
| `src/components/StorytellerSub/` | 12 components for game UI (Arena, Modals, RightConsole, etc.) |

### Tech Stack

- **React 19** + **TypeScript 5.8** + **Vite 6**
- **Material UI (MUI) 9** + Emotion for all UI components
- Puppeteer installed but no test scripts configured

## Issue Tracking

See [`docs/ISSUES.md`](docs/ISSUES.md) for open/fixed bugs and features.
