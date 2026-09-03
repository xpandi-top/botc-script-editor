export type FontKey = 'sans' | 'serif' | 'tnr' | 'mono' | 'edo' | 'kaushan' | 'xingkai' | 'xinwei'
export type PageSize = 'a4' | 'letter' | 'a5' | 'legal'
export type LanguageLayout = 'current' | 'bilingual-mixed' | 'bilingual-separate'

export type FontDef = { key: FontKey; label: string; labelZh: string; css: string; lang: 'en' | 'zh' | 'both' }

export const FONT_DEFINITIONS: FontDef[] = [
  { key: 'sans',    label: 'Sans-serif',       labelZh: '无衬线（系统）',  css: '"Avenir Next", system-ui, sans-serif',              lang: 'both' },
  { key: 'serif',   label: 'Serif',            labelZh: '衬线 Georgia',    css: 'Georgia, serif',                                   lang: 'both' },
  { key: 'tnr',     label: 'Times New Roman',  labelZh: 'Times New Roman', css: '"Times New Roman Local", "Times New Roman", serif', lang: 'both' },
  { key: 'mono',    label: 'Monospace',        labelZh: '等宽',            css: '"Courier New", Courier, monospace',                 lang: 'en'   },
  { key: 'edo',     label: 'Edo (decorative)', labelZh: 'Edo 装饰英文',    css: 'Edo, sans-serif',                                  lang: 'en'   },
  { key: 'kaushan', label: 'Kaushan Script',   labelZh: 'Kaushan 手写',    css: '"Kaushan Script", cursive',                        lang: 'en'   },
  { key: 'xingkai', label: 'Xingkai 行楷',     labelZh: '行楷',            css: 'Xingkai, sans-serif',                              lang: 'zh'   },
  { key: 'xinwei',  label: 'Xinwei 新魏',      labelZh: '新魏',            css: 'Xinwei, sans-serif',                               lang: 'zh'   },
]

export const FONT_CSS: Record<FontKey, string> = Object.fromEntries(
  FONT_DEFINITIONS.map((f) => [f.key, f.css])
) as Record<FontKey, string>

// Width × height in mm, portrait
export const PAGE_SIZE_DEFS: Record<PageSize, { label: string; w: number; h: number }> = {
  a4:     { label: 'A4  (210 × 297 mm)',   w: 210,   h: 297   },
  letter: { label: 'Letter (8.5 × 11 in)', w: 215.9, h: 279.4 },
  a5:     { label: 'A5  (148 × 210 mm)',   w: 148,   h: 210   },
  legal:  { label: 'Legal (8.5 × 14 in)', w: 215.9, h: 355.6 },
}

// px at 96 dpi (1 mm ≈ 3.7795px) — full page size, margins applied via CSS padding
export const PAGE_PREVIEW_WIDTH_PX: Record<PageSize, number> = {
  a4:     Math.round(210   * 3.7795),
  letter: Math.round(215.9 * 3.7795),
  a5:     Math.round(148   * 3.7795),
  legal:  Math.round(215.9 * 3.7795),
}

export const PAGE_PREVIEW_HEIGHT_PX: Record<PageSize, number> = {
  a4:     Math.round(297   * 3.7795),
  letter: Math.round(279.4 * 3.7795),
  a5:     Math.round(210   * 3.7795),
  legal:  Math.round(355.6 * 3.7795),
}

export type WakeOrderMode  = 'side' | 'bottom' | 'none'
export type TitleAlign     = 'left' | 'center' | 'right'
export type SectionStyle   = 'chip' | 'line' | 'inline'  // inline = ─── Townsfolk ───

export type PrintOptions = {
  pageSize: PageSize
  iconSize: number
  wakeIconSize: number
  columns: 1 | 2
  fontKeyEn: FontKey        // body/EN font
  fontKeyZh: FontKey        // ZH-specific font
  fontSize: number          // body font size (pt)
  nameFontSize: number      // character name font size (pt)
  titleFontSize: number     // script title (pt)
  sectionFontSize: number   // section header e.g. Townsfolk (pt)
  lineHeight: number        // text line height multiplier
  showSectionBg: boolean    // legacy — use sectionStyle instead
  showSectionDivider: boolean // legacy — use sectionStyle instead
  sectionStyle: SectionStyle  // 'chip' | 'line' | 'inline'
  showIconCircle: boolean   // show circle background behind icon
  showCardOutline: boolean  // show border/outline around character cards
  padding: 'compact' | 'normal' | 'spacious'
  rowSpacing: number        // gap between character rows (and columns, in 2-col mode), px
  blackAndWhite: boolean
  languageLayout: LanguageLayout
  // ── New in v2 ──────────────────────────────────────────────────────────────
  wakeOrder: WakeOrderMode  // 'side' (columns) | 'bottom' (rows) | 'none'
  titleAlign: TitleAlign    // 'left' | 'center' | 'right'
  showAuthor: boolean       // append author to title line
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  pageSize: 'letter',
  iconSize: 28,
  wakeIconSize: 28,
  columns: 1,
  fontKeyEn: 'sans',
  fontKeyZh: 'sans',
  fontSize: 9,
  nameFontSize: 10,
  titleFontSize: 14,
  sectionFontSize: 7,
  lineHeight: 1,
  showSectionBg: false,
  showSectionDivider: true,
  sectionStyle: 'inline',
  showIconCircle: false,
  showCardOutline: false,
  padding: 'compact',
  rowSpacing: 2,
  blackAndWhite: false,
  languageLayout: 'bilingual-separate',
  wakeOrder: 'side',
  titleAlign: 'left',
  showAuthor: true,
}

export const PADDING_MAP: Record<PrintOptions['padding'], { card: number; sectionMb: number; outerPadding: number }> = {
  compact:  { card: 2,  sectionMb: 0.5, outerPadding: 8  },
  normal:   { card: 6,  sectionMb: 1,   outerPadding: 12 },
  spacious: { card: 12, sectionMb: 2,   outerPadding: 16 },
}
