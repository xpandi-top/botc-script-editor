import { createTheme, alpha } from '@mui/material/styles'
import { BG, INK, BORDER, STATE, FONT, WEIGHT, SHADOW, MOTION, PALETTE } from './tokens'

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

// ── Radius system ─────────────────────────────────────────────────────────────
// One consistent curve per tier — no random mixing
const R = {
  btn:    10,   // all buttons / toggles / inputs — medium rounded
  card:   12,   // cards / panels
  dialog: 16,   // modals / drawers
  pill:   999,  // navigation tabs / chips — intentional pill
  xs:     4,    // tooltips / tiny badges
} as const

export const theme = createTheme({
  // ── Palette ───────────────────────────────────────────────────────────────
  palette: {
    // Primary = Bistre (dark ink) → high contrast on linen, reads as "stamp"
    primary: {
      main:         PALETTE.bistre,    // #37261b — contained buttons, active states
      light:        PALETTE.domino,    // #87745b — accents, hover tints
      dark:         '#1e140e',         // pressed / deep
      contrastText: PALETTE.satinLinen, // #e0dcc9 — warm off-white text on dark
    },
    // Secondary = Domino (warm brown) — outlined accents, chips
    secondary: {
      main:         PALETTE.domino,
      light:        '#a8917a',
      dark:         PALETTE.bistre,
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
      hover:              STATE.hover,
      selected:           STATE.selected,
      disabled:           STATE.disabled,
      disabledBackground: STATE.disabled,
    },
  },

  // ── Typography ──────────────────────────────────────────────────────────────
  typography: {
    fontFamily:       FONT.sans,
    fontSize:         15,
    htmlFontSize:     16,
    fontWeightRegular: WEIGHT.regular,
    fontWeightMedium:  WEIGHT.medium,
    fontWeightBold:    WEIGHT.semibold,

    h1: { fontFamily: FONT.serif, fontWeight: WEIGHT.bold,     fontSize: '2.4rem',   letterSpacing: '-0.02em',  lineHeight: 1.2  },
    h2: { fontFamily: FONT.serif, fontWeight: WEIGHT.bold,     fontSize: '1.9rem',   letterSpacing: '-0.015em', lineHeight: 1.25 },
    h3: { fontFamily: FONT.serif, fontWeight: WEIGHT.semibold, fontSize: '1.5rem',   letterSpacing: '-0.01em',  lineHeight: 1.3  },
    h4: { fontFamily: FONT.serif, fontWeight: WEIGHT.semibold, fontSize: '1.25rem',  letterSpacing: '-0.005em', lineHeight: 1.35 },
    h5: { fontFamily: FONT.sans,  fontWeight: WEIGHT.semibold, fontSize: '1.1rem',   letterSpacing: '0em',      lineHeight: 1.4  },
    h6: { fontFamily: FONT.sans,  fontWeight: WEIGHT.semibold, fontSize: '0.95rem',  letterSpacing: '0.005em',  lineHeight: 1.4  },

    subtitle1: { fontWeight: WEIGHT.medium,   fontSize: '1rem',     lineHeight: 1.5,  letterSpacing: '0.005em' },
    subtitle2: { fontWeight: WEIGHT.semibold, fontSize: '0.875rem', lineHeight: 1.5,  letterSpacing: '0.01em'  },
    body1:     { fontWeight: WEIGHT.regular,  fontSize: '0.9375rem', lineHeight: 1.6 },
    body2:     { fontWeight: WEIGHT.regular,  fontSize: '0.875rem',  lineHeight: 1.55 },

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
      letterSpacing: '0.01em',
      textTransform: 'none' as const,
    },
  },

  // ── Shape — single base radius (btn tier) ──────────────────────────────────
  shape: { borderRadius: R.btn },
  spacing: 8,

  // ── Components ─────────────────────────────────────────────────────────────
  components: {

    // ── Button ──────────────────────────────────────────────────────────────
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius:  R.btn,
          transition:    `background ${MOTION.mid}, border-color ${MOTION.mid}, color ${MOTION.mid}`,
          minHeight:     36,
        },
        // Contained: dark bistre ink → clear stamp on any linen surface
        contained: {
          background:  PALETTE.bistre,
          color:       PALETTE.satinLinen,
          '&:hover':   { background: '#4a3527' },
          '&:active':  { background: '#1e140e' },
          '&.Mui-disabled': { background: STATE.disabled, color: INK.muted },
        },
        // Outlined: domino border, bistre text — warm but legible
        outlined: {
          borderColor:  PALETTE.domino,
          color:        INK.primary,
          background:   'transparent',
          '&:hover': {
            background:  `rgba(135,116,91,0.10)`,
            borderColor: PALETTE.bistre,
          },
          '&.Mui-disabled': { borderColor: STATE.disabled, color: INK.muted },
        },
        // Text: ghost bistre
        text: {
          color:      INK.primary,
          '&:hover':  { background: STATE.hover },
        },
        sizeSmall: {
          padding:      '2px 10px',
          fontSize:     '0.8rem',
          minHeight:    28,
          borderRadius: R.btn - 2,
        },
        sizeMedium: { padding: '6px 14px' },
        sizeLarge:  { padding: '10px 22px', minHeight: 44, fontSize: '0.95rem' },
      },
    },

    // ── IconButton ───────────────────────────────────────────────────────────
    MuiIconButton: {
      styleOverrides: {
        root: {
          color:        INK.secondary,
          borderRadius: R.btn,
          transition:   `background ${MOTION.fast}, color ${MOTION.fast}`,
          '&:hover':    { background: STATE.hover,  color: INK.primary },
          '&:active':   { background: STATE.active },
          '&.Mui-disabled': { color: INK.muted },
        },
      },
    },

    // ── Card ─────────────────────────────────────────────────────────────────
    MuiCard: {
      styleOverrides: {
        root: {
          background:      BG.surface,
          borderRadius:    R.card,
          border:          `1px solid ${BORDER.mid}`,
          boxShadow:       SHADOW.sm,
          backgroundImage: 'none',
          transition:      `border-color ${MOTION.fast}, box-shadow ${MOTION.fast}`,
          '&:hover': { borderColor: BORDER.strong, boxShadow: SHADOW.md },
        },
      },
    },

    // ── Paper ────────────────────────────────────────────────────────────────
    MuiPaper: {
      styleOverrides: {
        root:       { backgroundImage: 'none', background: BG.surface },
        rounded:    { borderRadius: R.card },
        elevation0: { boxShadow: 'none',        background: BG.surface },
        elevation1: { boxShadow: SHADOW.sm,     background: BG.surface },
        elevation2: { boxShadow: SHADOW.md,     background: BG.raised  },
        elevation3: { boxShadow: SHADOW.lg,     background: BG.raised  },
        elevation4: { boxShadow: SHADOW.float,  background: BG.raised  },
      },
    },

    // ── Tooltip — bistre ink stamp ────────────────────────────────────────────
    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 200, enterNextDelay: 100 },
      styleOverrides: {
        tooltip: {
          background:    PALETTE.bistre,
          color:         PALETTE.satinLinen,
          fontSize:      '0.72rem',
          fontWeight:    WEIGHT.medium,
          letterSpacing: '0.02em',
          borderRadius:  R.xs,
          padding:       '4px 8px',
          boxShadow:     SHADOW.md,
        },
        arrow: { color: PALETTE.bistre },
      },
    },

    // ── Chip — pill only ──────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: R.pill,
          fontWeight:   WEIGHT.medium,
          fontSize:     '0.78rem',
        },
        colorDefault: {
          background:  `rgba(135,116,91,0.12)`,
          color:       INK.primary,
          border:      `1px solid ${BORDER.mid}`,
        },
        colorPrimary: {
          background: PALETTE.bistre,
          color:      PALETTE.satinLinen,
        },
        colorSecondary: {
          background: PALETTE.domino,
          color:      PALETTE.satinLinen,
        },
      },
    },

    // ── Tabs — same radius as buttons for visual consistency ─────────────────
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight:    WEIGHT.medium,
          fontSize:      '0.875rem',
          borderRadius:  R.btn,              // 10px — matches Button/ToggleButton
          border:        `1px solid ${BORDER.subtle}`,
          minHeight:     38,
          minWidth:      44,                 // icon-only: near-square touch target
          padding:       '8px 10px',         // compact for icon-only tabs
          color:         INK.secondary,
          transition:    `background ${MOTION.fast}, color ${MOTION.fast}, border-color ${MOTION.fast}`,
          '& .MuiTab-iconWrapper': { marginBottom: 0 },  // no gap below icon
          '&.Mui-selected': {
            color:       INK.inverse,
            background:  PALETTE.bistre,
            borderColor: PALETTE.bistre,
          },
          '&:hover:not(.Mui-selected)': {
            background:  STATE.hover,
            borderColor: BORDER.mid,
            color:       INK.primary,
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: { display: 'none' },
      },
    },

    // ── Input ────────────────────────────────────────────────────────────────
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background:   BG.raised,    // lightest surface — inputs pop
          borderRadius: R.btn,
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: BORDER.strong },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: PALETTE.domino,
            borderWidth: 2,
          },
        },
        notchedOutline: { borderColor: BORDER.mid },
        input: {
          color: INK.primary,
          '&::placeholder': { color: INK.muted, opacity: 1 },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        icon: { color: INK.secondary },
      },
    },

    // ── Menu ─────────────────────────────────────────────────────────────────
    MuiMenu: {
      styleOverrides: {
        paper: {
          background:   BG.raised,
          borderRadius: R.card,
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
          borderRadius: R.btn - 2,
          margin:       '1px 4px',
          padding:      '6px 10px',
          '&:hover':    { background: STATE.hover },
          '&.Mui-selected': {
            background:  STATE.selected,
            fontWeight:  WEIGHT.semibold,
            '&:hover':   { background: STATE.active },
          },
        },
      },
    },

    // ── Drawer / bottom sheet ────────────────────────────────────────────────
    MuiDrawer: {
      styleOverrides: {
        paper: { background: BG.raised, backgroundImage: 'none', borderColor: BORDER.mid },
      },
    },

    // ── Dialog ───────────────────────────────────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          background:      BG.raised,
          borderRadius:    R.dialog,
          border:          `1px solid ${BORDER.mid}`,
          boxShadow:       SHADOW.float,
          backgroundImage: 'none',
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily:    FONT.serif,
          fontWeight:    WEIGHT.semibold,
          fontSize:      '1.1rem',
          color:         INK.primary,
          paddingBottom: 8,
        },
      },
    },

    // ── Divider ───────────────────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: BORDER.subtle },
      },
    },

    // ── ToggleButton — SAME radius as Button, clear selected ──────────────────
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius:  R.btn,          // matches Button exactly
          color:         INK.secondary,
          border:        `1px solid ${BORDER.mid}`,
          fontWeight:    WEIGHT.medium,
          fontSize:      '0.875rem',
          padding:       '5px 14px',
          background:    BG.raised,      // light surface so it pops
          transition:    `background ${MOTION.fast}, color ${MOTION.fast}, border-color ${MOTION.fast}`,
          '&.Mui-selected': {
            background:  PALETTE.bistre,
            borderColor: PALETTE.bistre,
            color:       PALETTE.satinLinen,
            fontWeight:  WEIGHT.semibold,
            '&:hover':   { background: '#4a3527' },
          },
          '&:hover:not(.Mui-selected)': {
            background:  STATE.hover,
            borderColor: BORDER.strong,
            color:       INK.primary,
          },
        },
      },
    },

    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          gap: 4,                // space between toggle items
        },
        grouped: {
          borderRadius: `${R.btn}px !important`,  // override MUI's border-collapse
          border:       `1px solid ${BORDER.mid} !important`,
        },
      },
    },

    // ── Switch ────────────────────────────────────────────────────────────────
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: PALETTE.domino,
            '& + .MuiSwitch-track': { background: PALETTE.domino, opacity: 0.7 },
          },
        },
        track: { background: INK.muted, opacity: 0.5 },
      },
    },

    // ── Slider ───────────────────────────────────────────────────────────────
    MuiSlider: {
      styleOverrides: {
        thumb: {
          color: PALETTE.bistre,
          '&:hover, &.Mui-active': { boxShadow: `0 0 0 8px ${alpha(PALETTE.bistre, 0.12)}` },
        },
        track: { color: PALETTE.domino },
        rail:  { color: BORDER.mid },
      },
    },

    // ── InputLabel / FormLabel ────────────────────────────────────────────────
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color:      INK.secondary,
          fontWeight: WEIGHT.medium,
          fontSize:   '0.82rem',
          '&.Mui-focused': { color: PALETTE.domino },
        },
      },
    },

    // ── ListItemButton ────────────────────────────────────────────────────────
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: R.btn,
          '&:hover':    { background: STATE.hover },
          '&.Mui-selected': {
            background:   STATE.selected,
            '&:hover':    { background: STATE.active },
          },
        },
      },
    },

    // ── Backdrop ──────────────────────────────────────────────────────────────
    MuiBackdrop: {
      styleOverrides: {
        root: { background: BG.overlay },
      },
    },

    // ── Alert ────────────────────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: R.btn },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { background: BORDER.subtle },
        bar:  { background: PALETTE.domino },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: PALETTE.domino,
          '&.Mui-checked': { color: PALETTE.bistre },
        },
      },
    },

    MuiCssBaseline: {
      styleOverrides: {
        body: { color: INK.primary },
      },
    },
  },
})
