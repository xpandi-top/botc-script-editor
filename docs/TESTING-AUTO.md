# Automated Testing Framework

Companion to `TESTING.md` (manual). Covers automated unit, component, and integration tests.

---

## Stack

| Layer | Tool | Why |
|-------|------|-----|
| Runner | **Vitest 4** | Vite-native, Jest-compatible API, near-zero config |
| Environment | **jsdom** | Browser DOM simulation for component tests |
| Components | **@testing-library/react 16** | Test via user behavior, not implementation |
| Interactions | **@testing-library/user-event** | Realistic keyboard/mouse event simulation |
| Assertions | **@testing-library/jest-dom** | DOM-specific matchers (`toBeInTheDocument`, etc.) |
| Coverage | **@vitest/coverage-v8** | V8 native coverage, no Babel overhead |
| E2E | **Puppeteer** *(existing)* | Browser automation for critical flows |

---

## Commands

```bash
npm test                # run all tests once (CI mode)
npm run test:watch      # watch mode (dev)
npm run test:coverage   # generate coverage report in dist/coverage/
npm run test:ui         # open Vitest browser UI (experimental)
```

---

## Test Categories

### 1. Unit Tests — Pure Functions

**Target**: logic with no React or DOM dependency.  
**Location**: `src/__tests__/*.test.ts`  
**Speed**: <50 ms per file  

| File | Covers |
|------|--------|
| `seats.test.ts` | `livingNonTravelers`, `eligibleVoters`, `regularSeats`, `travelerSeats`, `findSeat`, `getSeatPosition`, `getSeatAngle` |
| `gameExport.test.ts` | `buildGameExport` — `saveGame`, `confirmEndGame`, record creation, script metadata |

**Rules**:
- No mocking except external I/O (file system, share API)
- One `describe` per exported function
- Each `it` tests one behavior

---

### 2. Component Tests — UI Rendering & Interaction

**Target**: React components, render output, and user interaction.  
**Location**: `src/__tests__/*.test.tsx`  
**Speed**: <200 ms per file  

| File | Covers |
|------|--------|
| `NominationVoteList.test.tsx` | Chip rendering, dead marker (†), NoVote tag, vote toggle callback, checked state, zh labels |

**Rules**:
- Query by accessible role/text, never by CSS class
- Use `userEvent` not `fireEvent` for interactions
- Do not assert on MUI internal class names (brittle)

---

### 3. Integration Tests *(planned)*

**Target**: hooks + state transitions without full app mount.  
**Approach**: `renderHook` from RTL + `act()` for async state.  

Planned coverage:
- `useGameLifecycle` — phase transitions, `loadGameRecord` (no modal side-effect)
- `useGameExport` — full export round-trip with mocked `exportGameFile`

---

### 4. E2E Tests *(Puppeteer, planned)*

**Target**: critical golden-path flows in real browser.  
**Location**: `e2e/`  
**Speed**: 5–30 s per test  

Planned flows:
- New game → night → day → nomination → vote → end game
- Save game → reload page → state restored
- Script import JSON → appears in list → renders sheet

---

## Configuration

### `vite.config.ts` — test block

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['src/test/setup.ts'],
  globals: true,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    include: ['src/utils/**', 'src/hooks/**', 'src/lib/**', 'src/components/**'],
    exclude: ['src/components/StorytellerSub/useStoryteller.ts'],
  },
}
```

### `src/test/setup.ts`

```ts
import '@testing-library/jest-dom'
```

---

## Mocking Strategy

| What | How |
|------|-----|
| `../lib/exportGame` (Capacitor FS + Share) | `vi.mock(...)` returns resolved promise |
| `import.meta.glob` (catalog character data) | Avoid testing `catalog.ts` loaders directly; test downstream consumers with injected data |
| MUI theme provider | Not needed — components render without ThemeProvider in jsdom |
| `localStorage` | jsdom provides it natively; clear in `beforeEach` if state leaks |

---

## Coverage Goals

| Area | Target |
|------|--------|
| `src/utils/` | 100% |
| `src/hooks/useGameExport.ts` | ≥ 90% |
| `src/components/StorytellerSub/Arena/NominationVoteList.tsx` | ≥ 85% |
| Overall | ≥ 60% (pragmatic for a UI-heavy app) |

---

## Status

| ID | Test File | Status |
|----|-----------|--------|
| T-01 | `seats.test.ts` — 19 unit tests | ✅ passing |
| T-02 | `NominationVoteList.test.tsx` — 10 component tests | ✅ passing |
| T-03 | `gameExport.test.ts` — 8 unit tests | ✅ passing |
| T-04 | `useGameLifecycle.integration.test.ts` | 🔲 planned |
| T-05 | `e2e/golden-path.ts` (Puppeteer) | 🔲 planned |
| T-06 | `parseScriptFromData.test.ts` | 🔲 planned |

---

## Adding New Tests

1. Pure logic → `src/__tests__/<name>.test.ts`
2. Component → `src/__tests__/<ComponentName>.test.tsx`
3. File must be co-located or under `src/__tests__/` — Vitest picks up both
4. Run `npm run test:watch` during development

---

## What NOT to Test

- MUI internal rendering (not our code)
- Vite `import.meta.glob` loader internals
- CSS/style values (use visual review instead)
- `useStoryteller.ts` as a unit (too stateful; test at component level or E2E)
