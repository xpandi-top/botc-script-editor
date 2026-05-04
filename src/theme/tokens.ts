/**
 * BOTC Companion — Design Token System
 * Palette: Satin Linen · Bistre · Domino · Flint
 */

// ── Raw palette ──────────────────────────────────────────────────────────────
export const PALETTE = {
  satinLinen: '#e0dcc9',  // primary background
  bistre:     '#37261b',  // primary ink — text, headings, strong UI
  domino:     '#87745b',  // secondary — interactive accent, borders, captions
  flint:      '#747469',  // muted — disabled, placeholders, ghost UI
} as const

// ── Background layers (deep → raised) ────────────────────────────────────────
// Page is the darkest layer — surfaces must be clearly lighter
export const BG = {
  page:    '#cdc9b5',   // deepest — body/page behind everything
  canvas:  '#e0dcc9',   // satin linen — mid layer (sidebar panels, content bg)
  surface: '#f0ece0',   // warm parchment — cards, list items (clear pop from canvas)
  raised:  '#f7f4ea',   // near-white parchment — drawers, modals, floating panels
  sunken:  '#d8d4c0',   // recessed — inputs, wells
  overlay: 'rgba(55, 38, 27, 0.36)',
} as const

// ── Ink (text) ───────────────────────────────────────────────────────────────
export const INK = {
  primary:   '#37261b',                // bistre — headings, body, labels
  secondary: '#87745b',                // domino — captions, secondary text
  muted:     '#747469',                // flint — disabled, placeholders
  inverse:   '#e0dcc9',                // satin linen — text on dark surfaces
  ghost:     'rgba(55, 38, 27, 0.32)', // very subtle — decorative only
} as const

// ── Borders ──────────────────────────────────────────────────────────────────
export const BORDER = {
  strong:  'rgba(55, 38, 27, 0.24)',   // bistre-tinted — active outlines
  mid:     'rgba(135, 116, 91, 0.30)', // domino — default card borders
  subtle:  'rgba(135, 116, 91, 0.15)', // domino ghost — dividers, inner lines
  focus:   'rgba(135, 116, 91, 0.55)', // domino — focus ring
} as const

// ── Interactive states ────────────────────────────────────────────────────────
export const STATE = {
  hover:    'rgba(55, 38, 27, 0.06)',   // bistre wash — gentle hover
  active:   'rgba(55, 38, 27, 0.13)',   // bistre wash — pressed / active
  selected: 'rgba(135, 116, 91, 0.18)', // domino wash — selected item bg
  disabled: 'rgba(116, 116, 105, 0.35)',// flint — disabled overlay
} as const

// ── Typography ───────────────────────────────────────────────────────────────
export const FONT = {
  // English UI body — humanist sans, even stroke, good legibility
  sans:    '"Avenir Next", Avenir, "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif',
  // Headings / display — classical serif for ritual/manuscript feel
  serif:   'Georgia, "Times New Roman Local", "Times New Roman", serif',
  // Chinese UI body — matches x-height of Avenir well
  zhSans:  '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", "Source Han Sans SC", sans-serif',
  // Chinese display / decorative headings
  zhSerif: 'Xingkai, "STKaiti", "KaiTi", "AR PL UKai CN", serif',
} as const

// Weight scale — keep intentional, not decorative
export const WEIGHT = {
  regular: 400,
  medium:  500,
  semibold: 600,
  bold:    700,
} as const

// ── Spacing (8-point base) ────────────────────────────────────────────────────
export const SPACE = {
  '1': '2px',
  '2': '4px',
  '3': '6px',
  '4': '8px',
  '5': '12px',
  '6': '16px',
  '7': '20px',
  '8': '24px',
  '9': '32px',
  '10': '40px',
  '11': '56px', // minimum mobile touch target
} as const

// ── Border radius ─────────────────────────────────────────────────────────────
export const RADIUS = {
  xs:   '4px',
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '20px',
  pill: '999px',
} as const

// ── Elevation / shadows (warm bistre-tinted, never pure grey) ─────────────────
export const SHADOW = {
  xs:    '0 1px 2px rgba(55, 38, 27, 0.06)',
  sm:    '0 2px 6px rgba(55, 38, 27, 0.08)',
  md:    '0 4px 14px rgba(55, 38, 27, 0.10)',
  lg:    '0 8px 28px rgba(55, 38, 27, 0.13)',
  float: '0 14px 44px rgba(55, 38, 27, 0.18)',
} as const

// ── Motion ────────────────────────────────────────────────────────────────────
export const MOTION = {
  fast: '0.15s ease',
  mid:  '0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '0.38s cubic-bezier(0.4, 0, 0.2, 1)',
  // "deliberate" — for game-phase transitions, not UI micro-interactions
  ritual: '0.50s cubic-bezier(0.22, 1, 0.36, 1)',
} as const
