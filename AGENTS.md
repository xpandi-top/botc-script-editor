# AGENTS.md

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build       # Validates revisions -> tsc -b -> vite build
npm run test       # vitest run
npm run test:watch  # vitest watch mode
npm run add-revision -- <char_id> --en "text" --zh "text"  # Add character ability revision
```

## Architecture

Two main domains:
1. **Script Viewer** - browse/edit/export character scripts to PDF
2. **Storyteller Helper** - game orchestration (night phases, nominations, votes, history)

Entry: `src/main.tsx`. State: `src/hooks/useStoryteller.ts` (~41KB), persisted to localStorage key `BOTC_ST_STORAGE`.

Data loaded via `src/catalog.ts` using Vite `import.meta.glob()`:
- `/assets/characters/*.json` - character definitions
- `/assets/scripts/*.json` - script definitions
- `/assets/locales/{en,zh}.json` - UI + abilities

## Tech Stack

React 19 + TypeScript 5.8 + Vite 6 + MUI 9 + Vitest

## Testing

- Tests use Vitest with `@testing-library/react`
- Run with `npm test` or `npm run test:watch`