/**
 * P0 — ST tag flow: log entry strings produced for add/remove ST tag events.
 *
 * The actual log detail string is assembled in useGameActions.ts `stTagDetail()`:
 *   `#${seat} ${verb}: ${iconPart}${translatedLabel}`
 *
 * We test the pure-function layer:
 *   - translateStTag(label, lang)  → locale-correct label
 *   - logPhrase(lang, 'addST'/'removeST')  → locale-correct verb
 *   - combined format matches expected log string
 *
 * Also covers raw stTag format parsing (📝label::sourceCharId).
 */
import { describe, it, expect } from 'vitest'
import { translateStTag } from '../components/StorytellerSub/Arena/ArenaSeatComponents'
import { logPhrase } from '../utils/logI18n'

// ── Helper: replicate stTagDetail logic from useGameActions ───────────────────

function parseStTag(t: string): { label: string; sourceCharId: string | null } {
  const body = t.startsWith('📝') ? t.slice(2) : t
  const sep = body.indexOf('::')
  return sep === -1
    ? { label: body, sourceCharId: null }
    : { label: body.slice(0, sep), sourceCharId: body.slice(sep + 2) || null }
}

function stTagDetail(tag: string, seatNumber: number, added: boolean, language: string): string {
  const { label, sourceCharId } = parseStTag(tag)
  const translatedLabel = translateStTag(label, language)
  const verb = logPhrase(language as any, added ? 'addST' : 'removeST')
  const iconPart = sourceCharId ? `[icon:${sourceCharId}] ` : ''
  return `#${seatNumber} ${verb}: ${iconPart}${translatedLabel}`
}

// ── parseStTag ────────────────────────────────────────────────────────────────

describe('parseStTag — raw format', () => {
  it('plain tag (no prefix, no source)', () => {
    expect(parseStTag('drunk')).toEqual({ label: 'drunk', sourceCharId: null })
  })

  it('prefixed tag without source', () => {
    expect(parseStTag('📝drunk')).toEqual({ label: 'drunk', sourceCharId: null })
  })

  it('prefixed tag with source char', () => {
    expect(parseStTag('📝drunk::washerwoman')).toEqual({ label: 'drunk', sourceCharId: 'washerwoman' })
  })

  it('tag with source but no emoji prefix', () => {
    expect(parseStTag('poisoned::scarlet_woman')).toEqual({ label: 'poisoned', sourceCharId: 'scarlet_woman' })
  })

  it('source char empty string → null', () => {
    expect(parseStTag('📝protected::')).toEqual({ label: 'protected', sourceCharId: null })
  })

  it('custom tag no source', () => {
    expect(parseStTag('red herring')).toEqual({ label: 'red herring', sourceCharId: null })
  })
})

// ── stTagDetail — EN ──────────────────────────────────────────────────────────

describe('stTagDetail — EN', () => {
  it('add drunk — plain', () => {
    expect(stTagDetail('drunk', 3, true, 'en')).toBe('#3 tagged: Drunk')
  })

  it('remove drunk — plain', () => {
    expect(stTagDetail('drunk', 3, false, 'en')).toBe('#3 tag removed: Drunk')
  })

  it('add poisoned — with source char', () => {
    expect(stTagDetail('📝poisoned::poisoner', 5, true, 'en')).toBe('#5 tagged: [icon:poisoner] Poisoned')
  })

  it('remove poisoned — with source char', () => {
    expect(stTagDetail('📝poisoned::poisoner', 5, false, 'en')).toBe('#5 tag removed: [icon:poisoner] Poisoned')
  })

  it('add drunk — with washerwoman source', () => {
    expect(stTagDetail('📝drunk::washerwoman', 2, true, 'en')).toBe('#2 tagged: [icon:washerwoman] Drunk')
  })

  it('add protected', () => {
    expect(stTagDetail('protected', 1, true, 'en')).toBe('#1 tagged: Protected')
  })

  it('add used', () => {
    expect(stTagDetail('used', 7, true, 'en')).toBe('#7 tagged: Used')
  })

  it('add red herring', () => {
    expect(stTagDetail('red herring', 4, true, 'en')).toBe('#4 tagged: Red Herring')
  })

  it('unknown custom tag — falls back to raw label', () => {
    expect(stTagDetail('my custom tag', 6, true, 'en')).toBe('#6 tagged: my custom tag')
  })
})

// ── stTagDetail — ZH ──────────────────────────────────────────────────────────

describe('stTagDetail — ZH', () => {
  it('add drunk — plain', () => {
    expect(stTagDetail('drunk', 3, true, 'zh')).toBe('#3 添加标签: 醉酒')
  })

  it('remove drunk — plain', () => {
    expect(stTagDetail('drunk', 3, false, 'zh')).toBe('#3 移除标签: 醉酒')
  })

  it('add poisoned — with source char', () => {
    expect(stTagDetail('📝poisoned::poisoner', 5, true, 'zh')).toBe('#5 添加标签: [icon:poisoner] 中毒')
  })

  it('remove poisoned — with source char', () => {
    expect(stTagDetail('📝poisoned::poisoner', 5, false, 'zh')).toBe('#5 移除标签: [icon:poisoner] 中毒')
  })

  it('add drunk — with washerwoman source', () => {
    expect(stTagDetail('📝drunk::washerwoman', 2, true, 'zh')).toBe('#2 添加标签: [icon:washerwoman] 醉酒')
  })

  it('add protected', () => {
    expect(stTagDetail('protected', 1, true, 'zh')).toBe('#1 添加标签: 受保护')
  })

  it('add used', () => {
    expect(stTagDetail('used', 7, true, 'zh')).toBe('#7 添加标签: 已使用')
  })

  it('add red herring', () => {
    expect(stTagDetail('red herring', 4, true, 'zh')).toBe('#4 添加标签: 干扰项')
  })

  it('unknown custom tag — falls back to raw label', () => {
    expect(stTagDetail('my custom tag', 6, true, 'zh')).toBe('#6 添加标签: my custom tag')
  })
})

// ── Case-insensitive tag matching ─────────────────────────────────────────────

describe('stTagDetail — case insensitive label matching', () => {
  it('Drunk (capital) → still translates EN', () => {
    expect(stTagDetail('Drunk', 1, true, 'en')).toBe('#1 tagged: Drunk')
  })

  it('Drunk (capital) → still translates ZH', () => {
    expect(stTagDetail('Drunk', 1, true, 'zh')).toBe('#1 添加标签: 醉酒')
  })

  it('POISONED (all caps) → still translates ZH', () => {
    expect(stTagDetail('POISONED', 2, true, 'zh')).toBe('#2 添加标签: 中毒')
  })
})
