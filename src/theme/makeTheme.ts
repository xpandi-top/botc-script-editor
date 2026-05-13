import { createTheme, alpha } from '@mui/material/styles'
import { PALETTE, BG, INK, BORDER, STATE, FONT, WEIGHT, SHADOW, MOTION } from './tokens'
import { DARK_PALETTE, DARK_BG, DARK_INK, DARK_BORDER, DARK_STATE } from './darkTokens'

const R = {
  btn:    10,
  card:   12,
  dialog: 16,
  pill:   999,
  xs:     4,
} as const

export type ThemeMode = 'light' | 'dark' | 'system'

/** Resolve 'system' to the actual light/dark preference. */
export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function makeTheme(mode: ThemeMode) {
  const resolved = resolveMode(mode)
  const isDark = resolved === 'dark'

  const bg    = isDark ? DARK_BG    : BG
  const ink   = isDark ? DARK_INK   : INK
  const bdr   = isDark ? DARK_BORDER : BORDER
  const state = isDark ? DARK_STATE  : STATE

  // Primary: blood-red in dark, bistre in light
  const primary = isDark
    ? { main: DARK_PALETTE.crimson, light: DARK_PALETTE.ashen, dark: '#4a0d0d', contrastText: '#F0E8E0' }
    : { main: PALETTE.bistre,       light: PALETTE.domino,     dark: '#1e140e', contrastText: PALETTE.satinLinen }

  const secondary = isDark
    ? { main: DARK_PALETTE.ashen, light: '#a8856d', dark: DARK_PALETTE.deepBrown, contrastText: '#F0E8E0' }
    : { main: PALETTE.domino,     light: '#a8917a', dark: PALETTE.bistre,         contrastText: PALETTE.satinLinen }

  const darkShadow = {
    xs:    '0 1px 2px rgba(0,0,0,0.30)',
    sm:    '0 2px 6px rgba(0,0,0,0.40)',
    md:    '0 4px 14px rgba(0,0,0,0.50)',
    lg:    '0 8px 28px rgba(0,0,0,0.60)',
    float: '0 14px 44px rgba(0,0,0,0.70)',
  }
  const shadow = isDark ? darkShadow : SHADOW

  return createTheme({
    palette: {
      mode: resolved,
      primary,
      secondary,
      background: { default: bg.page, paper: bg.surface },
      text: { primary: ink.primary, secondary: ink.secondary, disabled: ink.muted },
      divider: bdr.subtle,
      surface: { main: bg.raised, raised: bg.raised, sunken: bg.sunken },
      ink:     { primary: ink.primary, secondary: ink.secondary, muted: ink.muted, inverse: ink.inverse },
      action: {
        hover:              state.hover,
        selected:           state.selected,
        disabled:           state.disabled,
        disabledBackground: state.disabled,
      },
    },

    typography: {
      fontFamily:        FONT.sans,
      fontSize:          17,
      htmlFontSize:      16,
      fontWeightRegular: WEIGHT.regular,
      fontWeightMedium:  WEIGHT.medium,
      fontWeightBold:    WEIGHT.semibold,
      h1: { fontFamily: FONT.serif, fontWeight: WEIGHT.bold,     fontSize: '2.6rem',   letterSpacing: '-0.02em',  lineHeight: 1.2  },
      h2: { fontFamily: FONT.serif, fontWeight: WEIGHT.bold,     fontSize: '2.1rem',   letterSpacing: '-0.015em', lineHeight: 1.25 },
      h3: { fontFamily: FONT.serif, fontWeight: WEIGHT.semibold, fontSize: '1.7rem',   letterSpacing: '-0.01em',  lineHeight: 1.3  },
      h4: { fontFamily: FONT.serif, fontWeight: WEIGHT.semibold, fontSize: '1.4rem',   letterSpacing: '-0.005em', lineHeight: 1.35 },
      h5: { fontFamily: FONT.sans,  fontWeight: WEIGHT.semibold, fontSize: '1.2rem',   letterSpacing: '0em',      lineHeight: 1.4  },
      h6: { fontFamily: FONT.sans,  fontWeight: WEIGHT.semibold, fontSize: '1.05rem',  letterSpacing: '0.005em',  lineHeight: 1.4  },
      subtitle1: { fontWeight: WEIGHT.medium,   fontSize: '1.1rem',    lineHeight: 1.5,  letterSpacing: '0.005em' },
      subtitle2: { fontWeight: WEIGHT.semibold, fontSize: '0.95rem',   lineHeight: 1.5,  letterSpacing: '0.01em'  },
      body1:     { fontWeight: WEIGHT.regular,  fontSize: '1.0625rem', lineHeight: 1.6 },
      body2:     { fontWeight: WEIGHT.regular,  fontSize: '1rem',      lineHeight: 1.55 },
      caption:  { fontWeight: WEIGHT.medium,  fontSize: '0.82rem', letterSpacing: '0.03em', lineHeight: 1.4, color: ink.secondary },
      overline: { fontWeight: WEIGHT.semibold, fontSize: '0.78rem', letterSpacing: '0.1em',  lineHeight: 1.4, color: ink.secondary },
      button:   { fontWeight: WEIGHT.semibold, fontSize: '0.95rem', letterSpacing: '0.01em', textTransform: 'none' as const },
    },

    shape:   { borderRadius: R.btn },
    spacing: 8,

    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius:  R.btn,
            transition:    `background ${MOTION.mid}, border-color ${MOTION.mid}, color ${MOTION.mid}`,
            minHeight:     36,
          },
          contained: {
            background: primary.main,
            color:      primary.contrastText,
            '&:hover':  { background: isDark ? DARK_PALETTE.bloodRose : '#4a3527' },
            '&:active': { background: isDark ? '#4a0d0d' : '#1e140e' },
            '&.Mui-disabled': { background: state.disabled, color: ink.muted },
          },
          outlined: {
            borderColor: secondary.main,
            color:       ink.primary,
            background:  'transparent',
            '&:hover': {
              background:  state.hover,
              borderColor: primary.main,
            },
            '&.Mui-disabled': { borderColor: state.disabled, color: ink.muted },
          },
          text: {
            color:     ink.primary,
            '&:hover': { background: state.hover },
          },
          sizeSmall:  { padding: '4px 12px',  fontSize: '0.88rem', minHeight: 32, borderRadius: R.btn - 2 },
          sizeMedium: { padding: '8px 16px' },
          sizeLarge:  { padding: '12px 24px', minHeight: 48, fontSize: '1.05rem' },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            color:        ink.secondary,
            borderRadius: R.btn,
            transition:   `background ${MOTION.fast}, color ${MOTION.fast}`,
            '&:hover':    { background: state.hover, color: ink.primary },
            '&:active':   { background: state.active },
            '&.Mui-disabled': { color: ink.muted },
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            background:      bg.surface,
            borderRadius:    R.card,
            border:          `1px solid ${bdr.mid}`,
            boxShadow:       shadow.sm,
            backgroundImage: 'none',
            transition:      `border-color ${MOTION.fast}, box-shadow ${MOTION.fast}`,
            '&:hover': { borderColor: bdr.strong, boxShadow: shadow.md },
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root:       { backgroundImage: 'none', background: bg.surface },
          rounded:    { borderRadius: R.card },
          elevation0: { boxShadow: 'none',      background: bg.surface },
          elevation1: { boxShadow: shadow.sm,   background: bg.surface },
          elevation2: { boxShadow: shadow.md,   background: bg.raised  },
          elevation3: { boxShadow: shadow.lg,   background: bg.raised  },
          elevation4: { boxShadow: shadow.float,background: bg.raised  },
        },
      },

      MuiTooltip: {
        defaultProps: { arrow: true, enterDelay: 200, enterNextDelay: 100 },
        styleOverrides: {
          tooltip: {
            background:    isDark ? DARK_BG.raised : PALETTE.bistre,
            color:         isDark ? DARK_INK.primary : PALETTE.satinLinen,
            fontSize:      '0.8rem',
            fontWeight:    WEIGHT.medium,
            letterSpacing: '0.02em',
            borderRadius:  R.xs,
            padding:       '4px 8px',
            boxShadow:     shadow.md,
            border:        isDark ? `1px solid ${DARK_BORDER.mid}` : 'none',
          },
          arrow: { color: isDark ? DARK_BG.raised : PALETTE.bistre },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: { borderRadius: R.pill, fontWeight: WEIGHT.medium, fontSize: '0.85rem' },
          colorDefault: { background: state.selected, color: ink.primary, border: `1px solid ${bdr.mid}` },
          colorPrimary: { background: primary.main,   color: primary.contrastText },
          colorSecondary: { background: secondary.main, color: secondary.contrastText },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight:    WEIGHT.medium,
            fontSize:      '0.95rem',
            borderRadius:  R.btn,
            border:        `1px solid ${bdr.subtle}`,
            minHeight:     38,
            minWidth:      44,
            padding:       '8px 10px',
            color:         ink.secondary,
            transition:    `background ${MOTION.fast}, color ${MOTION.fast}, border-color ${MOTION.fast}`,
            '& .MuiTab-iconWrapper': { marginBottom: 0 },
            '&.Mui-selected': { color: primary.contrastText, background: primary.main, borderColor: primary.main },
            '&:hover:not(.Mui-selected)': { background: state.hover, borderColor: bdr.mid, color: ink.primary },
          },
        },
      },
      MuiTabs: { styleOverrides: { indicator: { display: 'none' } } },

      MuiTextField:     { defaultProps: { variant: 'outlined', size: 'small' } },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            background:   bg.raised,
            borderRadius: R.btn,
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: bdr.strong },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: secondary.main, borderWidth: 2 },
          },
          notchedOutline: { borderColor: bdr.mid },
          input: {
            color: ink.primary,
            '&::placeholder': { color: ink.muted, opacity: 1 },
          },
        },
      },
      MuiSelect: { styleOverrides: { icon: { color: ink.secondary } } },

      MuiMenu: {
        styleOverrides: {
          paper: { background: bg.raised, borderRadius: R.card, border: `1px solid ${bdr.mid}`, boxShadow: shadow.lg },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize:     '0.95rem',
            color:        ink.primary,
            borderRadius: R.btn - 2,
            margin:       '1px 4px',
            padding:      '6px 10px',
            '&:hover':    { background: state.hover },
            '&.Mui-selected': {
              background:  state.selected,
              fontWeight:  WEIGHT.semibold,
              '&:hover':   { background: state.active },
            },
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: { background: bg.raised, backgroundImage: 'none', borderColor: bdr.mid },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { background: bg.raised, borderRadius: R.dialog, border: `1px solid ${bdr.mid}`, boxShadow: shadow.float, backgroundImage: 'none' },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontFamily: FONT.serif, fontWeight: WEIGHT.semibold, fontSize: '1.25rem', color: ink.primary, paddingBottom: 8 },
        },
      },

      MuiDivider:       { styleOverrides: { root: { borderColor: bdr.subtle } } },

      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius:  R.btn,
            color:         ink.secondary,
            border:        `1px solid ${bdr.mid}`,
            fontWeight:    WEIGHT.medium,
            fontSize:      '0.95rem',
            padding:       '7px 14px',
            background:    bg.raised,
            transition:    `background ${MOTION.fast}, color ${MOTION.fast}, border-color ${MOTION.fast}`,
            '&.Mui-selected': {
              background:  primary.main,
              borderColor: primary.main,
              color:       primary.contrastText,
              fontWeight:  WEIGHT.semibold,
              '&:hover':   { background: isDark ? DARK_PALETTE.bloodRose : '#4a3527' },
            },
            '&:hover:not(.Mui-selected)': { background: state.hover, borderColor: bdr.strong, color: ink.primary },
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root:    { gap: 4 },
          grouped: { borderRadius: `${R.btn}px !important`, border: `1px solid ${bdr.mid} !important` },
        },
      },

      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': {
              color: secondary.main,
              '& + .MuiSwitch-track': { background: secondary.main, opacity: 0.7 },
            },
          },
          track: { background: ink.muted, opacity: 0.5 },
        },
      },

      MuiSlider: {
        styleOverrides: {
          thumb: { color: primary.main, '&:hover, &.Mui-active': { boxShadow: `0 0 0 8px ${alpha(primary.main, 0.12)}` } },
          track: { color: secondary.main },
          rail:  { color: bdr.mid },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: { color: ink.secondary, fontWeight: WEIGHT.medium, fontSize: '0.9rem', '&.Mui-focused': { color: secondary.main } },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: R.btn,
            '&:hover':    { background: state.hover },
            '&.Mui-selected': { background: state.selected, '&:hover': { background: state.active } },
          },
        },
      },

      MuiBackdrop:    { styleOverrides: { root: { background: bg.overlay } } },
      MuiAlert:       { styleOverrides: { root: { borderRadius: R.btn } } },
      MuiLinearProgress: {
        styleOverrides: { root: { background: bdr.subtle }, bar: { background: secondary.main } },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: { color: secondary.main, '&.Mui-checked': { color: primary.main } },
        },
      },
      MuiCssBaseline: { styleOverrides: { body: { color: ink.primary } } },

      MuiBottomNavigation: {
        styleOverrides: {
          root: { background: bg.raised },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            color: isDark ? DARK_PALETTE.ashen : ink.muted,
            '&.Mui-selected': { color: isDark ? DARK_PALETTE.parchment : primary.main },
          },
        },
      },
    },
  })
}
