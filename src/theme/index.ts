import { createTheme } from '@mui/material/styles'

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
          textTransform: 'none' as const,
          borderRadius: 999,
          padding: '0.75rem 1rem',
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
      defaultProps: { variant: 'outlined' as const, size: 'small' as const },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          borderRadius: 999,
          border: '1px solid rgba(23, 32, 42, 0.12)',
        },
      },
    },
  },
})