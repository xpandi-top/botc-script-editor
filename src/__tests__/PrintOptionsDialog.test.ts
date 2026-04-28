import { describe, it, expect } from 'vitest'
import { DEFAULT_PRINT_OPTIONS, FONT_DEFINITIONS, PAGE_SIZE_DEFS, PADDING_MAP } from '../components/PrintOptionsDialog'
import type { PrintOptions, FontKey } from '../components/PrintOptionsDialog'

const REQUIRED_FIELDS = [
  'pageSize', 'iconSize', 'columns', 'fontKeyEn', 'fontKeyZh',
  'fontSize', 'nameFontSize', 'titleFontSize', 'sectionFontSize',
  'lineHeight', 'showSectionBg', 'showSectionDivider', 'showIconCircle',
  'showCardOutline', 'padding', 'blackAndWhite', 'languageLayout',
] as const

const VALID_PAGE_SIZES = ['a4', 'letter', 'a5', 'legal'] as const
const VALID_PADDINGS = ['compact', 'normal', 'spacious'] as const
const VALID_LAYOUTS = ['current', 'bilingual-mixed', 'bilingual-separate'] as const
const VALID_FONT_KEYS: FontKey[] = ['sans', 'serif', 'tnr', 'mono', 'edo', 'kaushan', 'xingkai', 'xinwei']

describe('PrintOptionsDialog', () => {
  describe('DEFAULT_PRINT_OPTIONS', () => {
    it('has all required fields', () => {
      REQUIRED_FIELDS.forEach((field) => {
        expect(DEFAULT_PRINT_OPTIONS).toHaveProperty(field)
      })
    })

    it('has valid defaults', () => {
      const defaults = {
        pageSize: 'letter',
        iconSize: 28,
        columns: 1,
        nameFontSize: 10,
        titleFontSize: 14,
        showSectionBg: false,
        showSectionDivider: true,
        showIconCircle: false,
        showCardOutline: false,
      }
      Object.entries(defaults).forEach(([key, value]) => {
        expect(DEFAULT_PRINT_OPTIONS[key as keyof typeof defaults]).toBe(value)
      })
    })
  })

  describe('FONT_DEFINITIONS', () => {
    it('has unique keys', () => {
      const keys = FONT_DEFINITIONS.map((f) => f.key)
      expect(new Set(keys).size).toBe(FONT_DEFINITIONS.length)
    })

    it('has valid entries with all required properties', () => {
      const requiredProps = ['key', 'label', 'labelZh', 'css', 'lang'] as const
      FONT_DEFINITIONS.forEach((font) => {
        requiredProps.forEach((prop) => expect(font).toHaveProperty(prop))
      })
    })

    it('has fonts for both languages', () => {
      const hasEnglish = FONT_DEFINITIONS.some((f) => f.lang === 'en' || f.lang === 'both')
      const hasChinese = FONT_DEFINITIONS.some((f) => f.lang === 'zh' || f.lang === 'both')
      expect(hasEnglish && hasChinese).toBe(true)
    })
  })

  describe('PAGE_SIZE_DEFS', () => {
    it('has all required sizes', () => {
      VALID_PAGE_SIZES.forEach((size) => {
        expect(PAGE_SIZE_DEFS[size]).toBeDefined()
      })
    })

    it('a4 has correct dimensions', () => {
      expect(PAGE_SIZE_DEFS.a4).toEqual({ label: expect.any(String), w: 210, h: 297 })
    })

    it('letter has correct width', () => {
      expect(PAGE_SIZE_DEFS.letter.w).toBeCloseTo(215.9)
    })
  })

  describe('PADDING_MAP', () => {
    it('has all padding levels', () => {
      VALID_PADDINGS.forEach((padding) => {
        expect(PADDING_MAP[padding]).toBeDefined()
        expect(PADDING_MAP[padding].card).toBeGreaterThan(0)
      })
    })

    it('padding levels are progressively larger', () => {
      const cardValues = VALID_PADDINGS.map((p) => PADDING_MAP[p].card)
      expect(cardValues[0] < cardValues[1] && cardValues[1] < cardValues[2]).toBe(true)
    })
  })

  describe('PrintOptions type', () => {
    it('accepts valid page sizes', () => {
      const options = VALID_PAGE_SIZES.map((size) => ({ ...DEFAULT_PRINT_OPTIONS, pageSize: size }))
      expect(options).toHaveLength(4)
    })

    it('accepts valid column values', () => {
      const options = [1, 2].map((cols) => ({ ...DEFAULT_PRINT_OPTIONS, columns: cols as 1 | 2 }))
      expect(options).toHaveLength(2)
    })

    it('accepts valid padding values', () => {
      const options = VALID_PADDINGS.map((p) => ({ ...DEFAULT_PRINT_OPTIONS, padding: p }))
      expect(options).toHaveLength(3)
    })

    it('accepts valid language layouts', () => {
      const options = VALID_LAYOUTS.map((l) => ({ ...DEFAULT_PRINT_OPTIONS, languageLayout: l }))
      expect(options).toHaveLength(3)
    })

    it('accepts all font keys', () => {
      const options = VALID_FONT_KEYS.map((key) => ({ ...DEFAULT_PRINT_OPTIONS, fontKeyEn: key, fontKeyZh: key }))
      expect(options).toHaveLength(8)
    })
  })
})