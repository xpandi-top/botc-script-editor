import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material'
import App from './App'
import { theme } from './theme'
import { initNative } from './lib/nativeInit'
import './fonts.css'

// On native: await initNative so the Preferences sync-cache is populated
// before React's synchronous useState initialisers run.
// On web: initNative returns immediately (no-op), so no delay.
initNative().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={{
        ':root': {
          // ── Palette tokens ──────────────────────────────────────────────
          '--c-satin-linen':  '#e0dcc9',
          '--c-bistre':       '#37261b',
          '--c-domino':       '#87745b',
          '--c-flint':        '#747469',

          // ── Background layers ───────────────────────────────────────────
          '--bg-page':    '#dcd8c4',
          '--bg-canvas':  '#e0dcc9',
          '--bg-surface': '#e8e5d5',
          '--bg-raised':  '#edeadb',
          '--bg-sunken':  '#d4d0bc',

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

          // ── Typography ──────────────────────────────────────────────────
          '--font-sans':    '"Avenir Next", Avenir, "Helvetica Neue", -apple-system, sans-serif',
          '--font-serif':   'Georgia, "Times New Roman Local", "Times New Roman", serif',
          '--font-zh-sans': '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif',

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
        body: {
          margin: 0,
          minWidth: 320,
          minHeight: '100vh',
          // Parchment: flat linen with subtle vignette depth — no saturated gradients
          background: 'radial-gradient(ellipse at 60% 0%, #e8e5d4 0%, #d8d4c0 100%)',
          colorScheme: 'light',
          color: '#37261b',
        },
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
    </ThemeProvider>
  </React.StrictMode>,
)
})
