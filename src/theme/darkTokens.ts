/**
 * BOTC Companion — Dark Theme Tokens
 * Palette: Deep Bistre · Crimson · Ashen · Warm Parchment
 * #1B1512 · #2A211D · #5A4436 · #8B6E57 · #6B1414
 */

export const DARK_PALETTE = {
  crimson:   '#6B1414',  // primary accent — blood red
  bloodRose: '#8B2525',  // lighter primary hover
  ashen:     '#8B6E57',  // secondary interactive
  deepBrown: '#5A4436',  // muted / borders
  parchment: '#D4C9BC',  // warm light text
} as const

export const DARK_BG = {
  page:    '#1B1512',  // body
  canvas:  '#201814',  // sidebars
  surface: '#2A211D',  // cards / papers
  raised:  '#342820',  // modals / drawers
  sunken:  '#130F0C',  // inputs / wells
  overlay: 'rgba(0, 0, 0, 0.65)',
} as const

export const DARK_INK = {
  primary:   '#E0D4C8',  // warm light — headings, body
  secondary: '#8B6E57',  // muted warm — captions
  muted:     '#5A4436',  // very muted — disabled
  inverse:   '#1B1512',  // dark inverse — text on light surfaces
  ghost:     'rgba(224, 212, 200, 0.18)',
} as const

export const DARK_BORDER = {
  strong:  'rgba(139, 110, 87, 0.50)',
  mid:     'rgba(90, 68, 54, 0.65)',
  subtle:  'rgba(90, 68, 54, 0.32)',
  focus:   'rgba(139, 110, 87, 0.80)',
} as const

export const DARK_STATE = {
  hover:    'rgba(139, 110, 87, 0.12)',
  active:   'rgba(139, 110, 87, 0.22)',
  selected: 'rgba(107, 20, 20, 0.32)',
  disabled: 'rgba(90, 68, 54, 0.30)',
} as const
