# BOTC Webapp Rewrite - PRD (Full Rewrite)

## 1. Project Overview

**Project Name:** BOTC Script Viewer
**Type:** Single Page Application (Blood on the Clocktower tool)
**Current Stack:** React 19 + TypeScript + Vite + 6780-line custom CSS
**Target Stack:** React 19 + TypeScript + Vite + UI Framework

---

## 2. Problem Statement

- **Current Issues:**
  - 6780-line CSS file (maintenance nightmare)
  - BEM naming inconsistent across components
  - No reusability - every component has custom CSS
  - Hard to maintain responsive layouts
  - No accessibility built-in

- **Goal:** Rebuild with UI framework to eliminate 90%+ custom CSS tokens

---

## 3. UI Framework Options

| Framework | Pros | Cons | Recommendation |
|-----------|------|------|-----------------|
| **Material UI (MUI)** | You know it, huge component library, well-maintained | Larger bundle (~40KB), opinionated design | ✅ **Recommended** |
| **Chakra UI** | Good DX, accessible, themeable | Smaller community than MUI | Alternative |
| **Mantine** | Modern, great hooks, no runtime | Less mature | Alternative |
| **Ant Design** | Great for dashboards | Heavy, Chinese-centric | Not recommended |

**Recommendation:** Start with **MUI v5/v6** since you already know it.

---

## 4. Design Tokens (MUI Theme)

Only define what differs from MUI defaults:

```ts
// src/theme/index.ts
import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: { main: '#853f22' },
    secondary: { main: '#c4733a' },
    background: { default: '#f6f1e7', paper: '#fffdf8' },
    text: { primary: '#17202a', secondary: 'rgba(23, 32, 42, 0.55)' },
  },
  typography: {
    fontFamily: '"Avenir Next", Avenir, "Segoe UI", sans-serif',
    h1: { fontFamily: 'Georgia, "Times New Roman", serif' },
  },
  shape: { borderRadius: 12 },
  spacing: 8, // MUI 8px base
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 999 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 18, boxShadow: '0 2px 12px rgba(57,43,24,0.10)' },
      },
    },
  },
})
```

### Tokens to Override (vs MUI defaults)
| Token | MUI Default | Our Value |
|-------|-------------|-----------|
| primary | #1976d2 | #853f22 |
| borderRadius | 4px | 12px / 18px / 22px |
| spacing | 8px | keep 8px base |

**Token Count:** ~12 tokens (vs ~40 in current CSS)

---

## 5. Component Mapping (Current → MUI)

| Current BEM | MUI Component | Notes |
|-------------|---------------|-------|
| `.script-card` | `Card` + `Button` | Use clickable Card |
| `.tab-button` | `ToggleButton` | Use MUI ToggleButtons |
| `.editor-field` | `FormControl` | Stack label + input |
| `.script-list` | `List` | Use List with ListItemButton |
| `.browser-panel` | `Paper` + `Box` | Use elevation |
| `.viewer-panel` | `Paper` | Keep as Paper |
| `.print-button` | `Button variant="contained"` | Primary button |
| `.secondary-button` | `Button variant="outlined"` | Outlined button |
| `.filter-chip` | `Chip` | Use MUI Chip |
| `.browser-card` | `Card` + `Grid` | Card with media |
| `.toggle-field` | `FormControlLabel` | Checkbox with label |
| `.app-shell` | `Container` + `Box` | Main layout |
| `.app-grid` | `Grid` | Use Grid v2 |

---

## 6. Page Layouts to Rewrite

### 6.1 Main App (App.tsx)
- `AppBar` for header
- `Tabs` for navigation
- `Container` for main content
- `Grid` for sidebar + content

### 6.2 Script List (ScriptList.tsx)
- Map over scripts → `Card` (clickable)
- Use `CardContent` for text
- Use `CardActionArea` for click handler

### 6.3 Script Editor (ScriptEditor.tsx)
- `TextField` for inputs
- `Select` from `@mui/material`
- `Grid` for field layouts
- Custom character picker (keep, just style with MUI)

### 6.4 Character Browser (CharacterBrowser.tsx)
- `TextField` for search
- `Chip` for filters
- `Grid` (Grid v2) for card layout
- `Drawer` for side panel

### 6.5 Print Sheet (SheetArticle.tsx)
- Keep mostly as-is (print CSS specific)
- Use MUI for form controls

### 6.6 Storyteller Helper (StorytellerHelper.tsx)
- `Drawer` for left panel
- `Drawer` for right side + toolbar
- `Dialog` for modals
- `Tooltip` for hints
- Custom arena (keep, minimal MUI use)

---

## 7. Custom Components to Create

Only create when MUI doesn't fit:

| Component | Purpose | When Needed |
|-----------|---------|--------------|
| CharacterIcon | 72px character avatar | Reuse across pages |
| NightOrderGrid | Custom night order table | No MUI equivalent |
| TeamBadge | Team color badge | Visual only |
| PrintLayout | Print-specific wrapper | Print view |

---

## 8. Migration Phases

### Phase 1: Setup (1 hour)
- Install `@mui/material @emotion/react @emotion/styled`
- Create `src/theme/index.ts`
- Wrap app with `ThemeProvider`

### Phase 2: Replace Main Layout (2 hours)
- App.tsx: AppBar, Tabs, Container
- Replace `.app-shell`, `.app-grid`

### Phase 3: Replace Cards & Buttons (3 hours)
- All Card components
- All Button components
- ToggleButtons

### Phase 4: Replace Forms (3 hours)
- All TextField, Select, Checkbox
- Form layouts

### Phase 5: Replace Complex (4 hours)
- Browser with Drawer
- Storyteller Helper panels

### Phase 6: Cleanup (1 hour)
- Remove unused CSS
- Test all interactions

---

## 9. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Custom CSS lines | 6780 | <500 |
| CSS tokens | ~40 | ~12 |
| Component props for styling | Many | ~2-3 (variant, size) |
| Bundle size | ~150KB JS + 30KB CSS | ~200KB JS (includes MUI) |

---

## 10. Out of Scope

- Business logic / hooks (keep as-is)
- Character data structure (keep as-is)
- PDF export logic (keep as-is)
- Localization (keep as-is)