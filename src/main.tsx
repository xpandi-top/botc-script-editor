import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material'
import App from './App'
import { theme } from './theme'
import { initNative } from './lib/nativeInit'
import './fonts.css'

initNative()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={{
        ':root': {
          '--color-primary':        '#853f22',
          '--color-primary-mid':    'rgba(133, 63, 34, 0.18)',
          '--color-primary-light':  'rgba(133, 63, 34, 0.08)',
          '--color-ink':            '#17202a',
          '--color-ink-soft':       'rgba(23, 32, 42, 0.55)',
          '--color-border':         'rgba(23, 32, 42, 0.10)',
          '--color-surface':        'rgba(255, 251, 245, 0.96)',
          '--color-surface-raised': 'rgba(255, 255, 255, 0.82)',
          '--sp-xs':  '0.25rem',
          '--sp-sm':  '0.5rem',
          '--sp-md':  '0.75rem',
          '--sp-lg':  '1rem',
          '--sp-xl':  '1.5rem',
          '--sp-2xl': '2rem',
          '--fs-xs':  '0.68rem',
          '--fs-sm':  '0.8rem',
          '--fs-md':  '0.95rem',
          '--fs-lg':  '1.1rem',
          '--fs-xl':  '1.25rem',
          '--fs-2xl': '1.5rem',
          '--radius-sm':   '10px',
          '--radius-md':   '18px',
          '--radius-lg':   '22px',
          '--radius-pill': '999px',
          '--transition-fast': '0.18s ease',
          '--transition-med':  '0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          '--transition-slow': '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          '--shadow-card':  '0 2px 12px rgba(57, 43, 24, 0.10)',
          '--shadow-float': '0 8px 32px rgba(57, 43, 24, 0.16)',
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
          background: 'radial-gradient(circle at top, rgba(245, 198, 117, 0.4), transparent 28%), linear-gradient(180deg, #f6f1e7 0%, #efe6d4 100%)',
          colorScheme: 'light',
        },
        a: { color: 'inherit' },
        button: { font: 'inherit' },
        '#root': { minHeight: '100vh' },
        '@media screen': {
          '.print-portal': { display: 'none' },
        },
        '@media print': {
          '#root': { display: 'none' },
          '.print-portal': { display: 'block' },
          '.print-portal .MuiPaper-root': { boxShadow: 'none' },
          '.print-portal .sheet-root': { boxShadow: 'none', border: 'none' },
        },
      }} />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
