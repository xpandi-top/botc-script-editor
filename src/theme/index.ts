import { createTheme, alpha } from '@mui/material/styles'
import { BG, INK, BORDER, STATE, FONT, WEIGHT, RADIUS, SHADOW, MOTION, PALETTE } from './tokens'

declare module '@mui/material/styles' {
  interface Palette {
    surface: { main: string; raised: string; sunken: string }
    ink: { primary: string; secondary: string; muted: string; inverse: string }
  }
  interface PaletteOptions {
    surface?: { main: string; raised: string; sunken: string }
    ink?: { primary: string; secondary: string; muted: string; inverse: string }
  }
}

export const theme = createTheme({
  // ── Palette ────────────────────────────────────────────────────────────────
  palette: {
    // Domino as interactive primary (warm, readable on linen bg)
    primary: {
      main:          PALETTE.domino,    // #87745b
      dark:          PALETTE.bistre,    // #37261b — hover / active
      light:         '#a8917a',
      contrastText:  PALETTE.satinLinen,
    },
    // Bistre as secondary (dark ink for strong actions)
    secondary: {
      main:         PALETTE.bistre,
      light:        '#5a3e2e',
      dark:         '#1e140e',
      contrastText: PALETTE.satinLinen,
    },
    background: {
      default: BG.page,
      paper:   BG.surface,
    },
    text: {
      primary:   INK.primary,
      secondary: INK.secondary,
      disabled:  INK.muted,
    },
    divider: BORDER.subtle,
    surface: {
      main:   BG.raised,
      raised: BG.raised,
      sunken: BG.sunken,
    },
    ink: {
      primary:   INK.primary,
      secondary: INK.secondary,
      muted:     INK.muted,
      inverse:   INK.inverse,
    },
    action: {
      hover:           STATE.hover,
      selected:        STATE.selected,
      disabled:        STATE.disabled,
      disabledBackground: STATE.disabled,
    },
  },

  // ── Typography ──────────────────────────────────────────────────────────────
  typography: {
    fontFamily: FONT.sans,
    fontSize: 15,           // base 15px (MUI default 14 is too small for this aesthetic)
    htmlFontSize: 16,
    fontWeightRegular:  WEIGHT.regular,
    fontWeightMedium:   WEIGHT.medium,
    fontWeightBold:     WEIGHT.semibold,

    // Headings — serif, deliberate spacing
    h1: { fontFamily: FONT.serif, fontWeight: WEIGHT.bold,     fontSize: '2.4rem',  letterSpacing: '-0.02em', lineHeight: 1.2 },
    h2: { fontFamily: FONT.serif, fontWeight: WEIGHT.bold,     fontSize: '1.9rem',  letterSpacing: '-0.015em', lineHeight: 1.25 },
    h3: { fontFamily: FONT.serif, fontWeight: WEIGHT.semibold, fontSize: '1.5rem',  letterSpacing: '-0.01em',  lineHeight: 1.3 },
    h4: { fontFamily: FONT.serif, fontWeight: WEIGHT.semibold, fontSize: '1.25rem', letterSpacing: '-0.005em', lineHeight: 1.35 },
    h5: { fontFamily: FONT.sans,  fontWeight: WEIGHT.semibold, fontSize: '1.1rem',  letterSpacing: '0em',      lineHeight: 1.4 },
    h6: { fontFamily: FONT.sans,  fontWeight: WEIGHT.semibold, fontSize: '0.95rem', letterSpacing: '0.005em',  lineHeight: 1.4 },

    // UI text — readable, measured
    subtitle1: { fontWeight: WEIGHT.medium,   fontSize: '1rem',    lineHeight: 1.5,  letterSpacing: '0.005em' },
    subtitle2: { fontWeight: WEIGHT.semibold, fontSize: '0.875rem', lineHeight: 1.5, letterSpacing: '0.01em'  },
    body1:     { fontWeight: WEIGHT.regular,  fontSize: '0.9375rem', lineHeight: 1.6 },
    body2:     { fontWeight: WEIGHT.regular,  fontSize: '0.875rem',  lineHeight: 1.55 },

    // Labels
    caption: {
      fontWeight:    WEIGHT.medium,
      fontSize:      '0.75rem',
      letterSpacing: '0.03em',
      lineHeight:    1.4,
      color:         INK.secondary,
    },
    overline: {
      fontWeight:    WEIGHT.semibold,
      fontSize:      '0.7rem',
      letterSpacing: '0.1em',
      lineHeight:    1.4,
      color:         INK.secondary,
    },

    button: {
      fontWeight:    WEIGHT.semibold,
      fontSize:      '0.875rem',
      letterSpacing: '0.02em',
      textTransform: 'none' as const,
    },
  },

  // ── Shape ──────────────────────────────────────────────────────────────────
  shape: { borderRadius: 10 },
  spacing: 8,

  // ── Components ─────────────────────────────────────────────────────────────
  components: {

    // Button — ink-on-linen aesthetic, deliberate press feel
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius:  RADIUS.sm,
          transition:    `background ${MOTION.mid}, border-color ${MOTION.mid}, color ${MOTION.mid}`,
          minHeight: 36,
        },
        // Contained: domino fill → bistre on hover (deepening ink)
        contained: {
          background:   PALETTE.domino,
          color:        PALETTE.satinLinen,
          '&:hover': {
            background: PALETTE.bistre,
          },
          '&:active': {
            background: '#1e140e',
          },
          '&.Mui-disabled': {
            background: STATE.disabled,
            color:      INK.muted,
          },
        },
        // Outlined: domino border → bistre fill on hover
        outlined: {
          borderColor: PALETTE.domino,
          color:       PALETTE.bistre,
          '&:hover': {
            background:  STATE.hover,
            borderColor: PALETTE.bistre,
          },
          '&.Mui-disabled': {
            borderColor: STATE.disabled,
            color:       INK.muted,
          },
        },
        // Text: ghost → subtle wash
        text: {
          color: PALETTE.bistre,
          '&:hover': {
            background: STATE.hover,
          },
        },
        // Size variants — compact for dense UI
        sizeSmall: {
          padding:    '3px 10px',
          fontSize:   '0.8rem',
          minHeight:  30,
          borderRadius: RADIUS.xs,
        },
        sizeMedium: {
          padding: '6px 14px',
        },
        sizeLarge: {
          padding:   '10px 22px',
          minHeight: 44,
          fontSize:  '0.95rem',
        },
      },
    },

    // IconButton — ghost by default, ink on hover
    MuiIconButton: {
      styleOverrides: {
        root: {
          color:      INK.secondary,
          transition: `background ${MOTION.fast}, color ${MOTION.fast}`,
          borderRadius: RADIUS.xs,
          '&:hover': {
            background: STATE.hover,
            color:      INK.primary,
          },
          '&:active': {
            background: STATE.active,
          },
          '&.Mui-disabled': {
            color: INK.muted,
          },
        },
      },
    },

    // Card / Paper — warm linen surface
    MuiCard: {
      styleOverrides: {
        root: {
          background:   BG.surface,
          borderRadius: RADIUS.md,
          border:       `1px solid ${BORDER.mid}`,
          boxShadow:    SHADOW.sm,
          backgroundImage: 'none',
          '&:hover': {
            borderColor: BORDER.strong,
            boxShadow:   SHADOW.md,
          },
          transition: `border-color ${MOTION.fast}, box-shadow ${MOTION.fast}`,
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background:      BG.surface,  // warm parchment — pops from linen page
        },
        rounded: {
          borderRadius: RADIUS.md,
        },
        elevation0: { boxShadow: 'none',       background: BG.surface },
        elevation1: { boxShadow: SHADOW.sm,    background: BG.surface },
        elevation2: { boxShadow: SHADOW.md,    background: BG.raised  },
        elevation3: { boxShadow: SHADOW.lg,    background: BG.raised  },
        elevation4: { boxShadow: SHADOW.float, background: BG.raised  },
      },
    },

    // Tooltip — bistre ink block, linen text
    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 200, enterNextDelay: 100 },
      styleOverrides: {
        tooltip: {
          background:   PALETTE.bistre,
          color:        PALETTE.satinLinen,
          fontSize:     '0.72rem',
          fontWeight:   WEIGHT.medium,
          letterSpacing: '0.02em',
          borderRadius:  RADIUS.xs,
          padding:       '4px 8px',
          boxShadow:     SHADOW.md,
        },
        arrow: {
          color: PALETTE.bistre,
        },
      },
    },

    // Chip — pill labels in domino palette
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.pill,
          fontWeight:   WEIGHT.medium,
          fontSize:     '0.75rem',
        },
        colorDefault: {
          background:  STATE.selected,
          color:       INK.primary,
          borderColor: BORDER.mid,
        },
        colorPrimary: {
          background:  PALETTE.domino,
          color:       PALETTE.satinLinen,
        },
      },
    },

    // Tabs — pill style, domino active
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight:    WEIGHT.medium,
          fontSize:      '0.82rem',
          borderRadius:  RADIUS.pill,
          border:        `1px solid ${BORDER.subtle}`,
          minHeight:     34,
          padding:       '4px 12px',
          color:         INK.secondary,
          transition:    `background ${MOTION.fast}, color ${MOTION.fast}, border-color ${MOTION.fast}`,
          '&.Mui-selected': {
            color:       INK.primary,
            background:  STATE.selected,
            borderColor: BORDER.mid,
          },
          '&:hover:not(.Mui-selected)': {
            background:  STATE.hover,
            borderColor: BORDER.mid,
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          display: 'none', // pill border replaces indicator
        },
      },
    },

    // TextField — sunken input surface
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background:   BG.sunken,
          borderRadius: RADIUS.sm,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: BORDER.strong,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: PALETTE.domino,
            borderWidth:  2,
          },
        },
        notchedOutline: {
          borderColor: BORDER.mid,
        },
        input: {
          color: INK.primary,
          '&::placeholder': {
            color:   INK.muted,
            opacity: 1,
          },
        },
      },
    },

    // Select — matches input style
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: INK.secondary,
        },
      },
    },

    // Menu / Dropdown
    MuiMenu: {
      styleOverrides: {
        paper: {
          background:   BG.raised,
          borderRadius: RADIUS.md,
          border:       `1px solid ${BORDER.mid}`,
          boxShadow:    SHADOW.lg,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize:     '0.875rem',
          color:        INK.primary,
          borderRadius: RADIUS.xs,
          margin:       '1px 4px',
          padding:      '6px 10px',
          '&:hover': {
            background: STATE.hover,
          },
          '&.Mui-selected': {
            background: STATE.selected,
            color:      INK.primary,
            fontWeight: WEIGHT.semibold,
            '&:hover': {
              background: STATE.active,
            },
          },
        },
      },
    },

    // Drawer / Bottom sheet — raised linen panel
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background:  BG.raised,
          backgroundImage: 'none',
          borderColor: BORDER.mid,
        },
      },
    },

    // Dialog — modal floating panel
    MuiDialog: {
      styleOverrides: {
        paper: {
          background:   BG.raised,
          borderRadius: RADIUS.lg,
          border:       `1px solid ${BORDER.mid}`,
          boxShadow:    SHADOW.float,
          backgroundImage: 'none',
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily:  FONT.serif,
          fontWeight:  WEIGHT.semibold,
          fontSize:    '1.1rem',
          color:       INK.primary,
          paddingBottom: 8,
        },
      },
    },

    // Divider — subtle bistre tint
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: BORDER.subtle,
        },
      },
    },

    // Switch — domino active state
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: PALETTE.domino,
            '& + .MuiSwitch-track': {
              background:  PALETTE.domino,
              opacity:     0.7,
            },
          },
        },
        track: {
          background: INK.muted,
          opacity:    0.5,
        },
      },
    },

    // Slider — domino track
    MuiSlider: {
      styleOverrides: {
        thumb: {
          color: PALETTE.domino,
          '&:hover, &.Mui-active': {
            boxShadow: `0 0 0 8px ${alpha(PALETTE.domino, 0.16)}`,
          },
        },
        track: { color: PALETTE.domino },
        rail:  { color: BORDER.mid },
      },
    },

    // Snackbar / Alert
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.sm,
        },
      },
    },

    // LinearProgress
    MuiLinearProgress: {
      styleOverrides: {
        root:       { background: BORDER.subtle },
        bar:        { background: PALETTE.domino },
      },
    },

    // ToggleButton — same as outlined button logic
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius:  RADIUS.xs,
          color:         INK.secondary,
          border:        `1px solid ${BORDER.mid}`,
          fontWeight:    WEIGHT.medium,
          fontSize:      '0.8rem',
          padding:       '3px 10px',
          '&.Mui-selected': {
            background:  STATE.selected,
            borderColor: BORDER.strong,
            color:       INK.primary,
            fontWeight:  WEIGHT.semibold,
            '&:hover': {
              background: STATE.active,
            },
          },
          '&:hover': {
            background: STATE.hover,
          },
        },
      },
    },

    // FormLabel / InputLabel
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color:      INK.secondary,
          fontWeight: WEIGHT.medium,
          fontSize:   '0.82rem',
          '&.Mui-focused': {
            color: PALETTE.domino,
          },
        },
      },
    },

    // ListItem
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.sm,
          '&:hover': { background: STATE.hover },
          '&.Mui-selected': {
            background: STATE.selected,
            '&:hover':  { background: STATE.active },
          },
        },
      },
    },

    // Backdrop — warm dark
    MuiBackdrop: {
      styleOverrides: {
        root: {
          background: BG.overlay,
        },
      },
    },

    // CssBaseline — handled in GlobalStyles, but body color here
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          color: INK.primary,
        },
      },
    },
  },
})
