# Improvement Plan

Engineering audit — 2026-05-03. Prioritized by risk × effort ratio.

---

## P1 — Type the `ctx` prop across all StorytellerSub components

**Risk: High** | **Effort: Low** | **Files: ~15 components**

Every Storyteller sub-component receives `{ ctx: any }`. This bypasses TypeScript entirely — property renames in `useStoryteller` silently break consumers at runtime.

**Fix:**
```typescript
// src/components/StorytellerSub/useStoryteller.ts
export type StorytellerContext = ReturnType<typeof useStoryteller>

// Every sub-component:
// Before: ({ ctx }: { ctx: any })
// After:  ({ ctx }: { ctx: StorytellerContext })
```

One type alias. All 15+ components become type-safe instantly.

---

## P2 — Apply DOMPurify to `dangerouslySetInnerHTML`

**Risk: Medium (XSS)** | **Effort: Low** | **Files: 2**

DOMPurify is **already bundled** (9 KB gzipped, `purify.es` chunk) but **never imported**.
Custom script JSON import can inject HTML into ability fields.

**Affected:**
- `src/components/SheetArticle.tsx` — lines rendering `ability` / `abilityAlt`
- `src/components/tabs/CharactersTab.tsx` — `getAbilityText()` output

**Fix:**
```typescript
import DOMPurify from 'dompurify'
// __html: DOMPurify.sanitize(ability)
```

Zero bundle cost. Closes the XSS vector.

---

## P3 — Delete dead files (890 lines)

**Risk: Low (confusion/maintenance)** | **Effort: Trivial**

| File | Lines | Status |
|------|-------|--------|
| `src/components/tabs/SettingsTab.tsx` | 87 | Not imported anywhere. Pre-PrintOptionsDialog era. |
| `src/components/StorytellerSub/Arena/ArenaSeatCharacterPopout.tsx` | 478 | Replaced by `ArenaSeatPlayerModal`. Not imported. |
| `src/components/StorytellerSub/Arena/ArenaSeatSkillPopout.tsx` | 167 | Same. |
| `src/components/StorytellerSub/Arena/ArenaSeatTagPopout.tsx` | 158 | Same. |

Verify with: `grep -r "SettingsTab\|ArenaSeatCharacterPopout\|ArenaSeatSkillPopout\|ArenaSeatTagPopout" src/`
Expected: zero results outside those files themselves.

---

## P4 — Code-split jsPDF + html2canvas (~175 KB gzipped saved)

**Risk: Medium (performance)** | **Effort: Low**

Main bundle is 1,208 KB minified / 323 KB gzipped. jsPDF (127 KB gz) and html2canvas (48 KB gz) account for 54% of gzipped size.

`src/lib/nativePrint.ts` already has dynamic imports but the packages may still be pulled into the main chunk statically elsewhere.

**Fix — `vite.config.ts`:**
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'pdf-libs': ['jspdf', 'html2canvas'],
        'mui': ['@mui/material', '@mui/icons-material'],
      }
    }
  }
}
```

Also verify `nativePrint.ts` imports are inside the async function, not at module top-level.

---

## P5 — Centralize `USER_SCRIPTS_KEY` constant

**Risk: Low (data loss if drifts)** | **Effort: Trivial** | **File: `src/App.tsx:60`**

Currently defined inline inside the component body:
```typescript
const USER_SCRIPTS_KEY = 'BOTC_USER_SCRIPTS'  // re-created every render
```

Move to `src/components/StorytellerSub/constants.ts` alongside `STORAGE_KEY`.

---

## P6 — Fix two `react-hooks/exhaustive-deps` suppressions

**Risk: Medium (stale-closure bugs)** | **Effort: Medium**

Both are suppressed with `// eslint-disable-next-line react-hooks/exhaustive-deps`:

- `src/hooks/useTimerEffect.ts:185` — timer countdown effect
- `src/hooks/useAudioState.ts:21` — audio src change effect

Stale closures in timer/audio effects can cause phase-transition bugs (timer continuing after phase ends, audio not stopping). Audit both effects, add missing deps or move logic to refs.

---

## P7 — Fix type leaks in hook interfaces

**Risk: Medium** | **Effort: Low** | **Files: 2**

```typescript
// src/hooks/useGameExport.ts:10
timerDefaults: any  →  timerDefaults: TimerDefaults

// src/hooks/useGameLifecycle.ts:22
setPickerMode: (m: any) => void  →  setPickerMode: (m: PickerMode) => void
```

Both correct types are already defined in `types.ts`.

---

## P8 — Add `React.memo` to seat components

**Risk: Medium (performance on large games)** | **Effort: Medium**

During night phase, a 1-second timer tick updates `useStoryteller` state, causing every seat in the arena to re-render. With 15+ players, this is 15+ wasted renders per second.

**Prerequisite:** P1 (typed ctx) — needed to write a correct comparison function.

**Files:**
- `src/components/StorytellerSub/Arena/ArenaSeat.tsx`
- `src/components/StorytellerSub/Arena/MobileSeatCard.tsx`

---

## P9 — Write integration tests for `useGameLifecycle` (T-04)

**Risk: High (data loss if regressions)** | **Effort: High**

Phase transitions and `resetCurrentGame` are the highest-stakes code paths. Currently zero coverage. Plan documented in `TESTING-AUTO.md` as T-04.

Target file: `src/__tests__/useGameLifecycle.integration.test.ts`
Use `renderHook` from `@testing-library/react`.

Key scenarios:
- Night → Day transition persists events
- `resetCurrentGame` clears state without corrupting localStorage
- Undo/redo across phase boundaries

---

## P10 — Write tests for `catalog.parseScriptFromData` (T-06)

**Risk: Medium** | **Effort: Medium**

`parseScriptFromData` is the entry point for all user-supplied JSON and is in the XSS path (P2). Zero tests. Plan documented as T-06.

Key scenarios:
- Valid official script JSON
- Legacy format (no `_meta`)
- Malformed / missing fields → graceful fallback
- Custom character with HTML in ability field → confirm sanitization

---

## Summary Table

| # | Item | Risk | Effort | Status |
|---|------|------|--------|--------|
| P1 | Type `ctx: any` → `StorytellerContext` | High | Low | ✅ Done 644ca52 |
| P2 | Apply DOMPurify to dangerouslySetInnerHTML | Medium-XSS | Low | ✅ Done 644ca52 |
| P3 | Delete 4 dead files (890 lines) | Low | Trivial | ✅ Done 644ca52 |
| P4 | Code-split jsPDF/html2canvas | Medium-perf | Low | Not started |
| P5 | Centralize USER_SCRIPTS_KEY | Low | Trivial | ✅ Done 644ca52 |
| P6 | Fix exhaustive-deps suppressions | Medium | Medium | Not started |
| P7 | Fix `any` in hook interfaces | Medium | Low | ✅ Done 644ca52 |
| P8 | React.memo seat components | Medium-perf | Medium | Not started (P1 done) |
| P9 | Test useGameLifecycle (T-04) | High | High | Planned |
| P10 | Test parseScriptFromData (T-06) | Medium | Medium | Planned |

---

## Documentation Notes

- `docs/archive/` — original (pre-compression) versions of DESIGN.md and PLATFORM.md
- `docs/ISSUES.md` — all issues I-38..I-61 marked fixed; current
- `docs/TESTING-AUTO.md` — T-04, T-05, T-06 planned but not started; T-05 (E2E/Puppeteer) has no `e2e/` directory yet
- Missing: data contract doc for `PersistedState` schema (migration planning)
- Missing: `AnalyticsTab` data schema (localStorage contract, GameRecord shape)
