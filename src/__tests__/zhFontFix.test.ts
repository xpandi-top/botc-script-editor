/**
 * ZCOOL XiaoWei renders a few characters (回 among them) as solid blocks, so the
 * default Chinese font stack puts "ZCOOL XiaoWei Fix" (src/fonts.css) first.
 * scripts/zh-font-fix.py builds that font; these checks keep the CSS, the font
 * file and the font stacks in step with the script's BROKEN list.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ZH_OPTIONS } from '../hooks/useFontSettings'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

const broken = [...read('scripts/zh-font-fix.py').match(/^BROKEN = '(.+)'$/m)![1]]
const face = read('src/fonts.css')
  .match(/@font-face\s*{[^}]*'ZCOOL XiaoWei Fix'[^}]*}/)![0]

function unicodeRange(css: string): string[] {
  const range = css.match(/unicode-range:\s*([^;]+);/)![1]
  return range.split(',').flatMap((part) => {
    const [lo, hi = lo] = part.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h, 16))
    return Array.from({ length: hi - lo + 1 }, (_, i) => String.fromCodePoint(lo + i))
  })
}

describe('ZCOOL XiaoWei fix font', () => {
  it('routes exactly the broken code points to the fix font', () => {
    expect(broken).toContain('回')
    expect(unicodeRange(face).sort()).toEqual([...broken].sort())
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
