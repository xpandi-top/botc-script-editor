import { describe, it, expect } from 'vitest'
import { slugify, toTitleCase, parseScriptFromData } from '../catalog'

// ── slugify ──────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it.each([
    ['Trouble Brewing',            'trouble-brewing'],
    ['Bad Moon Rising',            'bad-moon-rising'],
    ['  leading and trailing  ',   'leading-and-trailing'],
    ['UPPERCASE',                   'uppercase'],
    ['multiple   spaces',           'multiple-spaces'],
    ['special!@#chars',             'special-chars'],
    ['already-slugified',           'already-slugified'],
    ['mixed_CASE-string',           'mixed-case-string'],
    ['a',                           'a'],
    ['123 numbers',                 '123-numbers'],
    ['---leading-dashes',           'leading-dashes'],
    ['trailing-dashes---',          'trailing-dashes'],
  ])('slugify(%s) → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected)
  })

  it('empty string → empty string', () => {
    expect(slugify('')).toBe('')
  })

  it('only special chars → empty string', () => {
    expect(slugify('!@#$%')).toBe('')
  })

  it('does not produce leading or trailing hyphens', () => {
    const result = slugify('  !hello world!  ')
    expect(result).not.toMatch(/^-|-$/)
  })
})

// ── toTitleCase ───────────────────────────────────────────────────────────────

describe('toTitleCase', () => {
  it.each([
    ['trouble-brewing',    'Trouble Brewing'],
    ['bad_moon_rising',    'Bad Moon Rising'],
    ['god-absent',         'God Absent'],
    ['already Title Case', 'Already Title Case'],
    ['singleword',         'Singleword'],
    ['a-b-c',              'A B C'],
    ['UPPERCASE',          'UPPERCASE'],
  ])('toTitleCase(%s) → %s', (input, expected) => {
    expect(toTitleCase(input)).toBe(expected)
  })

  it('replaces hyphens and underscores with spaces', () => {
    expect(toTitleCase('foo-bar_baz')).toBe('Foo Bar Baz')
  })

  it('empty string → empty string', () => {
    expect(toTitleCase('')).toBe('')
  })
})

// ── parseScriptFromData ───────────────────────────────────────────────────────
// Tests the JSON array format (official BOTC script format)

describe('parseScriptFromData — array format', () => {
  const minimalMeta = { id: '_meta', name: 'Test Script' }

  it('extracts title from _meta entry', () => {
    const data = [minimalMeta, { id: 'imp' }, { id: 'washerwoman' }]
    const result = parseScriptFromData(data, 'test-script.json')
    expect(result.title).toBe('Test Script')
  })

  it('derives slug from filename when no collision', () => {
    const data = [minimalMeta, { id: 'imp' }]
    const result = parseScriptFromData(data, 'my-unique-script-xyz99.json')
    expect(result.slug).toBe('my-unique-script-xyz99')
  })

  it('collects character ids', () => {
    const data = [minimalMeta, { id: 'imp' }, { id: 'washerwoman' }, { id: 'baron' }]
    const result = parseScriptFromData(data, 'test-chars.json')
    expect(result.characters).toContain('imp')
    expect(result.characters).toContain('washerwoman')
    expect(result.characters).toContain('baron')
  })

  it('handles plain string character ids in array', () => {
    const data = [minimalMeta, 'imp', 'washerwoman']
    const result = parseScriptFromData(data, 'string-ids.json')
    expect(result.characters).toEqual(expect.arrayContaining(['imp', 'washerwoman']))
  })

  it('sets author from meta when present', () => {
    const data = [{ id: '_meta', name: 'Auth Script', author: 'TestAuthor' }]
    const result = parseScriptFromData(data, 'auth.json')
    expect(result.author).toBe('TestAuthor')
  })

  it('falls back to toTitleCase(slug) when meta name absent', () => {
    const data = [{ id: 'imp' }] // no _meta entry
    const result = parseScriptFromData(data, 'my-custom-script.json')
    expect(result.title).toBe('My Custom Script')
  })

  it('includes custom characters (entries with name or ability)', () => {
    const data = [
      minimalMeta,
      { id: 'customguy', name: 'Custom Guy', ability: 'Does stuff.' },
    ]
    const result = parseScriptFromData(data, 'custom-chars.json')
    expect(result.customCharacters).toHaveLength(1)
    expect(result.customCharacters[0].id).toBe('customguy')
  })

  it('does not include _meta in characters list', () => {
    const data = [minimalMeta, { id: 'imp' }]
    const result = parseScriptFromData(data, 'no-meta-in-chars.json')
    expect(result.characters).not.toContain('_meta')
  })

  it('sourceFile matches filename', () => {
    const data = [minimalMeta]
    const result = parseScriptFromData(data, 'my-file.json')
    expect(result.sourceFile).toBe('my-file.json')
  })
})

describe('parseScriptFromData — object format (legacy)', () => {
  it('parses title from object', () => {
    const data = { title: 'Object Script', characters: ['imp', 'baron'] }
    const result = parseScriptFromData(data, 'obj.json')
    expect(result.title).toBe('Object Script')
    expect(result.characters).toEqual(['imp', 'baron'])
  })

  it('falls back to filename title when no title field', () => {
    const data = { characters: ['imp'] }
    const result = parseScriptFromData(data, 'unnamed-script.json')
    expect(result.title).toBe('Unnamed Script')
  })

  it('uses edition field when present', () => {
    const data = { title: 'Custom', edition: 'custom', characters: [] }
    const result = parseScriptFromData(data, 'edition-test.json')
    expect(result.edition).toBe('custom')
  })
})
