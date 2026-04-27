import { describe, it, expect } from 'vitest'
import { DEFAULT_PRINT_OPTIONS, FONT_DEFINITIONS, PAGE_SIZE_DEFS, PADDING_MAP } from '../components/PrintOptionsDialog'
import type { PrintOptions, FontKey, PageSize, LanguageLayout } from '../components/PrintOptionsDialog'

describe('PrintOptionsDialog', () => {
  describe('DEFAULT_PRINT_OPTIONS', () => {
    it('has all required fields', () => {
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('pageSize')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('iconSize')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('columns')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('fontKeyEn')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('fontKeyZh')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('fontSize')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('nameFontSize')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('titleFontSize')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('sectionFontSize')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('lineHeight')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('showSectionBg')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('showSectionDivider')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('showIconCircle')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('showCardOutline')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('padding')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('blackAndWhite')
      expect(DEFAULT_PRINT_OPTIONS).toHaveProperty('languageLayout')
    })

    it('has valid default values', () => {
      expect(DEFAULT_PRINT_OPTIONS.pageSize).toBe('a4')
      expect(DEFAULT_PRINT_OPTIONS.iconSize).toBe(48)
      expect(DEFAULT_PRINT_OPTIONS.columns).toBe(2)
      expect(DEFAULT_PRINT_OPTIONS.fontSize).toBe(10)
      expect(DEFAULT_PRINT_OPTIONS.nameFontSize).toBe(11)
      expect(DEFAULT_PRINT_OPTIONS.titleFontSize).toBe(20)
      expect(DEFAULT_PRINT_OPTIONS.showSectionBg).toBe(false)
      expect(DEFAULT_PRINT_OPTIONS.showSectionDivider).toBe(false)
      expect(DEFAULT_PRINT_OPTIONS.showIconCircle).toBe(true)
      expect(DEFAULT_PRINT_OPTIONS.showCardOutline).toBe(false)
    })
  })

  describe('FONT_DEFINITIONS', () => {
    it('contains english fonts', () => {
      const enFonts = FONT_DEFINITIONS.filter((f) => f.lang === 'en' || f.lang === 'both')
      expect(enFonts.length).toBeGreaterThan(0)
    })

    it('contains chinese fonts', () => {
      const zhFonts = FONT_DEFINITIONS.filter((f) => f.lang === 'zh' || f.lang === 'both')
      expect(zhFonts.length).toBeGreaterThan(0)
    })

    it('has unique keys', () => {
      const keys = FONT_DEFINITIONS.map((f) => f.key)
      expect(new Set(keys).size).toBe(FONT_DEFINITIONS.length)
    })

    it('each font has required properties', () => {
      FONT_DEFINITIONS.forEach((font) => {
        expect(font).toHaveProperty('key')
        expect(font).toHaveProperty('label')
        expect(font).toHaveProperty('labelZh')
        expect(font).toHaveProperty('css')
        expect(font).toHaveProperty('lang')
      })
    })
  })

  describe('PAGE_SIZE_DEFS', () => {
    it('has a4 size', () => {
      expect(PAGE_SIZE_DEFS.a4).toBeDefined()
      expect(PAGE_SIZE_DEFS.a4.w).toBe(210)
      expect(PAGE_SIZE_DEFS.a4.h).toBe(297)
    })

    it('has letter size', () => {
      expect(PAGE_SIZE_DEFS.letter).toBeDefined()
      expect(PAGE_SIZE_DEFS.letter.w).toBeCloseTo(215.9)
    })

    it('has a5 size', () => {
      expect(PAGE_SIZE_DEFS.a5).toBeDefined()
      expect(PAGE_SIZE_DEFS.a5.w).toBe(148)
    })

    it('has legal size', () => {
      expect(PAGE_SIZE_DEFS.legal).toBeDefined()
    })
  })

  describe('PADDING_MAP', () => {
    it('has compact padding', () => {
      expect(PADDING_MAP.compact).toBeDefined()
      expect(PADDING_MAP.compact.card).toBe(2)
    })

    it('has normal padding', () => {
      expect(PADDING_MAP.normal).toBeDefined()
      expect(PADDING_MAP.normal.card).toBe(6)
    })

    it('has spacious padding', () => {
      expect(PADDING_MAP.spacious).toBeDefined()
      expect(PADDING_MAP.spacious.card).toBe(12)
    })
  })

  describe('PrintOptions type', () => {
    it('accepts valid page sizes', () => {
      const options: PrintOptions[] = [
        { ...DEFAULT_PRINT_OPTIONS, pageSize: 'a4' },
        { ...DEFAULT_PRINT_OPTIONS, pageSize: 'letter' },
        { ...DEFAULT_PRINT_OPTIONS, pageSize: 'a5' },
        { ...DEFAULT_PRINT_OPTIONS, pageSize: 'legal' },
      ]
      expect(options.length).toBe(4)
    })

    it('accepts valid column values', () => {
      const opt1: PrintOptions = { ...DEFAULT_PRINT_OPTIONS, columns: 1 }
      const opt2: PrintOptions = { ...DEFAULT_PRINT_OPTIONS, columns: 2 }
      expect(opt1.columns).toBe(1)
      expect(opt2.columns).toBe(2)
    })

    it('accepts valid padding values', () => {
      const options: PrintOptions[] = [
        { ...DEFAULT_PRINT_OPTIONS, padding: 'compact' },
        { ...DEFAULT_PRINT_OPTIONS, padding: 'normal' },
        { ...DEFAULT_PRINT_OPTIONS, padding: 'spacious' },
      ]
      expect(options.length).toBe(3)
    })

    it('accepts valid language layouts', () => {
      const options: PrintOptions[] = [
        { ...DEFAULT_PRINT_OPTIONS, languageLayout: 'current' },
        { ...DEFAULT_PRINT_OPTIONS, languageLayout: 'bilingual-mixed' },
        { ...DEFAULT_PRINT_OPTIONS, languageLayout: 'bilingual-separate' },
      ]
      expect(options.length).toBe(3)
    })

    it('accepts font keys', () => {
      const fontKeys: FontKey[] = ['sans', 'serif', 'tnr', 'mono', 'edo', 'kaushan', 'xingkai', 'xinwei']
      fontKeys.forEach((key) => {
        const opt = { ...DEFAULT_PRINT_OPTIONS, fontKeyEn: key, fontKeyZh: key }
        expect(opt.fontKeyEn).toBe(key)
      })
    })
  })
})