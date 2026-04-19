# BOTC Webapp Rewrite - Technical Design (MUI)

## 1. Target Tech Stack

```json
{
  "dependencies": {
    "@mui/material": "^6.x",
    "@emotion/react": "^11.x",
    "@emotion/styled": "^11.x",
    "@mui/icons-material": "^6.x",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.x",
    "@types/react-dom": "^19.0.x",
    "@vitejs/plugin-react": "^5.0.x",
    "typescript": "^5.8.x",
    "vite": "^6.3.x"
  }
}
```

---

## 2. Project Structure

```
src/
├── main.tsx                 # App entry + ThemeProvider
├── App.tsx                  # Main app with routing/tabs
├── theme/
│   └── index.ts             # MUI theme configuration
├── components/
│   ├── ui/                  # Reusable UI components
│   │   ├── CharacterIcon.tsx
│   │   ├── TeamBadge.tsx
│   │   └── index.ts
│   ├── ScriptList.tsx       # Script card list
│   ├── ScriptEditor.tsx     # Script editing form
│   ├── CharacterBrowser.tsx # Character browser + search
│   ├── FilterCheckbox.tsx   # Filter controls
│   ├── SheetArticle.tsx     # Print sheet view
│   └── StorytellerHelper.tsx # Storyteller modal
├── hooks/                   # Keep existing
├── i18n/                    # Keep existing
├── utils/                   # Keep existing (non-UI)
├── catalog.ts               # Keep existing
└── types.ts                 # Keep existing
```

---

## 3. Theme Configuration

### src/theme/index.ts
```ts
import { createTheme, alpha } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    surface: { main: string; raised: string }
  }
  interface PaletteOptions {
    surface?: { main: string; raised: string }
  }
}

export const theme = createTheme({
  palette: {
    primary: { main: '#853f22' },
    secondary: { main: '#c4733a' },
    background: {
      default: '#f6f1e7',
      paper: '#fffdf8',
    },
    text: {
      primary: '#17202a',
      secondary: 'rgba(23, 32, 42, 0.55)',
    },
    surface: {
      main: 'rgba(255, 251, 245, 0.96)',
      raised: 'rgba(255, 255, 255, 0.82)',
    },
    divider: 'rgba(23, 32, 42, 0.10)',
  },
  typography: {
    fontFamily: '"Avenir Next", Avenir, "Segoe UI", sans-serif',
    h1: { fontFamily: 'Georgia, "Times New Roman", serif' },
    h2: { fontFamily: 'Georgia, "Times New Roman", serif' },
    h3: { fontFamily: 'Georgia, "Times New Roman", serif' },
  },
  shape: { borderRadius: 12 },
  spacing: 8,
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 999,
          padding: '0.75rem 1rem',
        },
        containedPrimary: {
          background: '#853f22',
          color: '#fffaf2',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(57,43,24,0.10)',
          background: '#fffdf8',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 18,
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 999,
          border: '1px solid rgba(23, 32, 42, 0.12)',
        },
      },
    },
  },
})
```

---

## 4. Component Migration Guide

### 4.1 ScriptList.tsx
```tsx
import { Card, CardContent, Typography, CardActionArea } from '@mui/material'

// Before: <button className="script-card">
// After:
<Card sx={{ 
  cursor: 'pointer',
  '&:hover': { transform: 'translateY(-1px)' },
  border: isActive ? '1px solid #853f22' : '1px solid rgba(23,32,42,0.1)',
  background: isActive ? 'linear-gradient(180deg, #fff6eb 0%, #fffdf8 100%)' : '#fffdf8',
}}>
  <CardActionArea onClick={onSelect}>
    <CardContent>
      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        Script
      </Typography>
      <Typography variant="h6">{title}</Typography>
    </CardContent>
  </CardActionArea>
</Card>
```

### 4.2 ToggleButton.tsx
```tsx
import { ToggleButton, ToggleButtonGroup } from '@mui/material'

// Instead of custom ToggleButton, use MUI ToggleButtonGroup
<ToggleButtonGroup value={active} exclusive onChange={() => {}}>
  <ToggleButton value="left">Left</ToggleButton>
  <ToggleButton value="center">Center</ToggleButton>
</ToggleButtonGroup>
```

### 4.3 Form Fields (editor-field)
```tsx
import { TextField, FormControl, FormLabel, FormHelperText } from '@mui/material'

<FormControl fullWidth>
  <FormLabel sx={{ fontSize: '0.88rem', color: 'rgba(23,32,42,0.72)' }}>
    {label}
  </FormLabel>
  <TextField {...props} />
</FormControl>
```

### 4.4 Browser Panel
```tsx
import { Paper, Box, Typography } from '@mui/material'

<Paper elevation={0} sx={{ 
  border: '1px solid rgba(23,32,42,0.12)',
  borderRadius: 22,
  p: 2,
  background: 'rgba(255,251,245,0.9)',
}}>
  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
    <Typography variant="h5">Title</Typography>
  </Box>
  {/* content */}
</Paper>
```

---

## 5. Installation Steps

```bash
# Install MUI + Emotion
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material

# Remove old CSS dependency (after migration)
# Delete or reduce src/styles.css
```

---

## 6. Testing Setup (Optional)

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to package.json:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

---

## 7. Migration Checklist

- [ ] Install MUI dependencies
- [ ] Create theme/index.ts with custom tokens
- [ ] Wrap App with ThemeProvider in main.tsx
- [ ] Replace App.tsx layout (AppBar, Tabs, Container)
- [ ] Replace ScriptList with Card components
- [ ] Replace ScriptEditor form fields
- [ ] Replace CharacterBrowser with Grid + Drawer
- [ ] Replace FilterCheckbox with Chip/ChipGroup
- [ ] Replace StorytellerHelper panels with Drawer/Dialog
- [ ] Delete/reduce styles.css
- [ ] Test all interactions

---

## 8. Bundle Impact

| Package | Size (gzipped) |
|---------|----------------|
| @mui/material | ~35KB |
| @emotion/react | ~8KB |
| @emotion/styled | ~6KB |
| @mui/icons-material | ~15KB (tree-shake) |
| **Total** | ~60-70KB |

Replaces ~30KB custom CSS, net +30-40KB (acceptable).

---

## 9. Key Differences from Current

| Aspect | Current | MUI Target |
|--------|---------|------------|
| Styling | BEM in styles.css | Theme + sx prop |
| Responsive | Custom media queries | useMediaQuery hook |
| Accessibility | None | Built-in (ARIA) |
| Keyboard nav | None | Built-in |
| Dark mode | Not supported | Theme extension ready |