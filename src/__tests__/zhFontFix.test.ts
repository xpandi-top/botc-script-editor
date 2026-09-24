/**
 * Chinese font options that draw some characters wrong (scripts/zh-font-fix.py
 * --check finds them) are patched in src/fonts.css:
 * - ZCOOL XiaoWei paints a few holes solid (回 shows as ■), so the default stack
 *   puts "ZCOOL XiaoWei Fix" first; these checks keep the CSS, the font file and
 *   the font stacks in step with the script's BROKEN list.
 * - Xingkai and Xinwei map some code points to blank glyphs; their unicode-range
 *   must leave those out so the next font draws them.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ZH_OPTIONS } from '../hooks/useFontSettings'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')
const fontsCss = read('src/fonts.css')

function fontFace(family: string): string {
  return fontsCss.match(new RegExp(`@font-face\\s*{[^}]*font-family:\\s*'${family}';[^}]*}`))![0]
}

function unicodeRanges(face: string): [number, number][] {
  const range = face.match(/unicode-range:\s*([^;]+);/)![1]
  return range.split(',').map((part) => {
    const [lo, hi = lo] = part.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h, 16))
    return [lo, hi]
  })
}

const covers = (ranges: [number, number][], char: string) =>
  ranges.some(([lo, hi]) => lo <= char.codePointAt(0)! && char.codePointAt(0)! <= hi)

/** Characters a TrueType font maps (Windows BMP cmap) to a glyph with no outline. */
function blankGlyphs(font: Buffer): string[] {
  const tables: Record<string, number> = {}
  for (let i = 0; i < font.readUInt16BE(4); i++) {
    const record = 12 + i * 16
    tables[font.toString('latin1', record, record + 4)] = font.readUInt32BE(record + 8)
  }
  const longLoca = font.readInt16BE(tables.head + 50) === 1
  const glyphStart = (glyph: number) =>
    longLoca ? font.readUInt32BE(tables.loca + glyph * 4) : font.readUInt16BE(tables.loca + glyph * 2) * 2

  let cmap = -1
  for (let i = 0; i < font.readUInt16BE(tables.cmap + 2); i++) {
    const record = tables.cmap + 4 + i * 8
    if (font.readUInt16BE(record) === 3 && font.readUInt16BE(record + 2) === 1) {
      cmap = tables.cmap + font.readUInt32BE(record + 4)
    }
  }
  expect(font.readUInt16BE(cmap)).toBe(4)
  const segments = font.readUInt16BE(cmap + 6) / 2
  const ends = cmap + 14, starts = ends + segments * 2 + 2
  const deltas = starts + segments * 2, rangeOffsets = deltas + segments * 2

  const blanks: string[] = []
  for (let s = 0; s < segments; s++) {
    const start = font.readUInt16BE(starts + s * 2), end = font.readUInt16BE(ends + s * 2)
    const delta = font.readInt16BE(deltas + s * 2), offset = font.readUInt16BE(rangeOffsets + s * 2)
    for (let code = start; code <= end && code !== 0xffff; code++) {
      let glyph = offset === 0 ? code : font.readUInt16BE(rangeOffsets + s * 2 + offset + (code - start) * 2)
      if (glyph === 0) continue
      glyph = (glyph + delta) & 0xffff
      const char = String.fromCodePoint(code)
      if (glyphStart(glyph) === glyphStart(glyph + 1) && !/[\p{Z}\p{C}]/u.test(char)) blanks.push(char)
    }
  }
  return blanks
}

describe('ZCOOL XiaoWei fix font', () => {
  const broken = [...read('scripts/zh-font-fix.py').match(/^BROKEN = '(.+)'$/m)![1]]
  const face = fontFace('ZCOOL XiaoWei Fix')

  it('routes exactly the broken code points to the fix font', () => {
    expect(broken).toContain('回')
    const routed = unicodeRanges(face).flatMap(([lo, hi]) =>
      Array.from({ length: hi - lo + 1 }, (_, i) => String.fromCodePoint(lo + i)))
    expect(routed.sort()).toEqual([...broken].sort())
  })

  it('points at a woff2 file that exists', () => {
    const url = face.match(/url\('([^']+)'\)/)![1]
    const file = readFileSync(resolve(root, url.replace(/^\//, '')))
    expect(file.subarray(0, 4).toString('latin1')).toBe('wOF2')
  })

  it('puts the fix font first in the default Chinese font stack', () => {
    const option = ZH_OPTIONS.find((o) => o.id === 'zcool-xiaowei')!
    expect(option.css).toBe('"ZCOOL XiaoWei Fix", "ZCOOL XiaoWei"')
    const initial = read('src/main.tsx').match(/'--font-zh':\s*'([^']+)'/)![1]
    expect(initial).toBe(option.css)
  })
})

describe.each(['Xingkai', 'Xinwei'])('%s blank glyphs', (family) => {
  const face = fontFace(family)
  const url = face.match(/url\('([^']+)'\)/)![1]
  const blanks = blankGlyphs(readFileSync(resolve(root, url.replace(/^\//, ''))))
  const ranges = unicodeRanges(face)

  it('leaves every blank glyph out of the unicode-range', () => {
    expect(blanks).toContain('â')
    expect(blanks.filter((c) => covers(ranges, c))).toEqual([])
  })

  it('still covers the characters the font does draw', () => {
    for (const char of ['A', 'é', 'ü', '·', '回', '，']) expect(covers(ranges, char)).toBe(true)
  })
})
