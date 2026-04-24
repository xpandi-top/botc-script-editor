export type FontKey = 'sans' | 'serif' | 'tnr' | 'mono' | 'edo' | 'kaushan' | 'xingkai' | 'xinwei'
export type PageSize = 'a4' | 'letter' | 'a5' | 'legal'

export type FontDef = { key: FontKey; label: string; labelZh: string; css: string; lang: 'en' | 'zh' | 'both' }

export const FONT_DEFINITIONS: FontDef[] = [
  { key: 'sans',    label: 'Sans-serif',       labelZh: '无衬线（系统）',   css: '"Avenir Next", system-ui, sans-serif',           lang: 'both' },
  { key: 'serif',   label: 'Serif',            labelZh: '衬线 Georgia',     css: 'Georgia, serif',                                lang: 'both' },
  { key: 'tnr',     label: 'Times New Roman',  labelZh: 'Times New Roman',  css: '"Times New Roman Local", "Times New Roman", serif', lang: 'both' },
  { key: 'mono',    label: 'Monospace',        labelZh: '等宽',             css: '"Courier New", Courier, monospace',              lang: 'en' },
  { key: 'edo',     label: 'Edo (decorative)', labelZh: 'Edo 装饰英文',     css: 'Edo, sans-serif',                               lang: 'en' },
  { key: 'kaushan', label: 'Kaushan Script',   labelZh: 'Kaushan 手写',     css: '"Kaushan Script", cursive',                     lang: 'en' },
  { key: 'xingkai', label: 'Xingkai 行楷',     labelZh: '行楷',             css: 'Xingkai, sans-serif',                           lang: 'zh' },
  { key: 'xinwei',  label: 'Xinwei 新魏',      labelZh: '新魏',             css: 'Xinwei, sans-serif',                            lang: 'zh' },
]

export const FONT_CSS: Record<FontKey, string> = Object.fromEntries(
  FONT_DEFINITIONS.map((f) => [f.key, f.css])
) as Record<FontKey, string>

// Width × height in mm, portrait
export const PAGE_SIZE_DEFS: Record<PageSize, { label: string; w: number; h: number }> = {
  a4:     { label: 'A4  (210 × 297 mm)',    w: 210,   h: 297   },
  letter: { label: 'Letter (8.5 × 11 in)',  w: 215.9, h: 279.4 },
  a5:     { label: 'A5  (148 × 210 mm)',    w: 148,   h: 210   },
  legal:  { label: 'Legal (8.5 × 14 in)',   w: 215.9, h: 355.6 },
}

// px at 96 dpi (1 mm ≈ 3.7795px), minus ~30mm total margin
export const PAGE_PREVIEW_WIDTH_PX: Record<PageSize, number> = {
  a4:     Math.round((210  - 30) * 3.7795),
  letter: Math.round((215.9 - 30) * 3.7795),
  a5:     Math.round((148  - 20) * 3.7795),
  legal:  Math.round((215.9 - 30) * 3.7795),
}

export const PAGE_PREVIEW_HEIGHT_PX: Record<PageSize, number> = {
  a4:     Math.round((297  - 30) * 3.7795),
  letter: Math.round((279.4 - 30) * 3.7795),
  a5:     Math.round((210  - 20) * 3.7795),
  legal:  Math.round((355.6 - 30) * 3.7795),
}

export type PrintOptions = {
  pageSize: PageSize
  iconSize: number
  columns: 1 | 2
  fontKey: FontKey
  fontSize: number
  padding: 'compact' | 'normal' | 'spacious'
  blackAndWhite: boolean
  bilingual: boolean
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  pageSize: 'a4',
  iconSize: 48,
  columns: 2,
  fontKey: 'sans',
  fontSize: 10,
  padding: 'normal',
  blackAndWhite: false,
  bilingual: false,
}

export const PADDING_MAP: Record<PrintOptions['padding'], number> = {
  compact: 6,
  normal: 10,
  spacious: 16,
}

export function applyPrintOptionsToPortal(opts: PrintOptions) {
  // Inject @page CSS for correct paper size
  let styleEl = document.getElementById('po-page-style') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'po-page-style'
    document.head.appendChild(styleEl)
  }
  const { w, h } = PAGE_SIZE_DEFS[opts.pageSize]
  styleEl.textContent = `@media print { @page { size: ${w}mm ${h}mm; margin: 15mm; } }`
}
