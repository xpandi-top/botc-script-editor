import React from 'react'
import ReactDOM from 'react-dom/client'
import { CssBaseline, GlobalStyles, useTheme } from '@mui/material'
import App from './App'
import { ThemeModeProvider } from './context/ThemeMode'
import { initNative } from './lib/nativeInit'
import { migrateAiSettings } from './lib/aiSettings'
import './fonts.css'

/** Injects CSS variables and body background that react to the active MUI theme */
function ThemeGlobalStyles() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  return (
    <GlobalStyles styles={{
      ':root': {
        colorScheme: isDark ? 'dark' : 'light',
        // Background layers
        '--bg-page':    theme.palette.background.default,
        '--bg-surface': theme.palette.background.paper,
        '--bg-raised':  (theme.palette as any).surface?.raised ?? theme.palette.background.paper,
        '--bg-sunken':  (theme.palette as any).surface?.sunken ?? theme.palette.background.default,
      },
      body: {
        margin: 0,
        minWidth: 320,
        minHeight: '100vh',
        background: isDark
          ? 'linear-gradient(160deg, #1B1512 0%, #241C18 100%)'
          : 'linear-gradient(160deg, #e8e5d8 0%, #dedad0 100%)',
        color: theme.palette.text.primary,
        colorScheme: isDark ? 'dark' : 'light',
      },
    }} />
  )
}

// On native: await initNative so the Preferences sync-cache is populated
// before React's synchronous useState initialisers run.
// On web: initNative returns immediately (no-op), so no delay.
migrateAiSettings()
initNative().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <CssBaseline />
      <ThemeGlobalStyles />
      <GlobalStyles styles={{
        ':root': {
          // ── Palette tokens ──────────────────────────────────────────────
          '--c-satin-linen':  '#e0dcc9',
          '--c-bistre':       '#37261b',
          '--c-domino':       '#87745b',
          '--c-flint':        '#747469',

          // ── Background layers ───────────────────────────────────────────
          '--bg-page':    '#e0dcc9',
          '--bg-canvas':  '#e8e5d8',
          '--bg-surface': '#f3f0e6',
          '--bg-raised':  '#f8f6ef',
          '--bg-sunken':  '#d8d4c0',

          // ── Ink ─────────────────────────────────────────────────────────
          '--ink-1':       '#37261b',
          '--ink-2':       '#87745b',
          '--ink-3':       '#747469',
          '--ink-inverse': '#e0dcc9',

          // ── Borders ─────────────────────────────────────────────────────
          '--border-strong':  'rgba(55, 38, 27, 0.24)',
          '--border-mid':     'rgba(135, 116, 91, 0.30)',
          '--border-subtle':  'rgba(135, 116, 91, 0.15)',

          // ── States ──────────────────────────────────────────────────────
          '--state-hover':    'rgba(55, 38, 27, 0.06)',
          '--state-active':   'rgba(55, 38, 27, 0.13)',
          '--state-selected': 'rgba(135, 116, 91, 0.18)',

          // ── Typography — defaults; overridden at runtime by useFontSettings ──
          '--font-en-body':    '"EB Garamond"',
          '--font-en-display': '"Cinzel"',
          '--font-zh':         '"ZCOOL XiaoWei"',

          // ── Spacing (8-point) ────────────────────────────────────────────
          '--sp-1': '2px',   '--sp-2': '4px',   '--sp-3': '6px',
          '--sp-4': '8px',   '--sp-5': '12px',  '--sp-6': '16px',
          '--sp-7': '20px',  '--sp-8': '24px',  '--sp-9': '32px',
          '--sp-10': '40px', '--sp-11': '56px',

          // ── Radius ───────────────────────────────────────────────────────
          '--r-xs': '4px',  '--r-sm': '8px',   '--r-md': '12px',
          '--r-lg': '16px', '--r-xl': '20px',  '--r-pill': '999px',

          // ── Shadows ──────────────────────────────────────────────────────
          '--shadow-xs':    '0 1px 2px rgba(55, 38, 27, 0.06)',
          '--shadow-sm':    '0 2px 6px rgba(55, 38, 27, 0.08)',
          '--shadow-md':    '0 4px 14px rgba(55, 38, 27, 0.10)',
          '--shadow-lg':    '0 8px 28px rgba(55, 38, 27, 0.13)',
          '--shadow-float': '0 14px 44px rgba(55, 38, 27, 0.18)',

          // ── Motion ───────────────────────────────────────────────────────
          '--motion-fast':   '0.15s ease',
          '--motion-mid':    '0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '--motion-slow':   '0.38s cubic-bezier(0.4, 0, 0.2, 1)',
          '--motion-ritual': '0.50s cubic-bezier(0.22, 1, 0.36, 1)',

          // ── Safe areas ───────────────────────────────────────────────────
          '--safe-top':    'env(safe-area-inset-top, 0px)',
          '--safe-bottom': 'env(safe-area-inset-bottom, 0px)',
          '--safe-left':   'env(safe-area-inset-left, 0px)',
          '--safe-right':  'env(safe-area-inset-right, 0px)',
        },
        '*, *::before, *::after': { boxSizing: 'border-box' },
        // body background + color set dynamically by ThemeGlobalStyles above
        a: { color: 'inherit' },
        button: { font: 'inherit' },
        '#root': { minHeight: '100vh' },
        '@media screen': {
          '.print-portal': { display: 'none' },
          '.token-print-portal': { display: 'none' },
        },
        '@media print': {
          '#root': { display: 'none' },
          '.print-portal': { display: 'block' },
          '.print-portal .MuiPaper-root': { boxShadow: 'none' },
          '.print-portal .sheet-root': { boxShadow: 'none', border: 'none' },
          '.token-print-portal': { display: 'block' },
        },
      }} />
      <App />
    </ThemeModeProvider>
  </React.StrictMode>,
)
})
