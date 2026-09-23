import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { characterById, getJinxStatus, jinxes } from '../catalog'
import { validateScript, type ScriptValidationCatalog } from '../core/script/validate'
import {
  extractScriptCharacters,
  normalizeJinxPairId,
  normalizeScriptJinxOverride,
  normalizeScriptMetaEntry,
} from '../core/script/format'

/** Mini catalog for rule tests. */
const miniCatalog: ScriptValidationCatalog = {
  getCharacter: (id) => ({
    washerwoman: { id, team: 'townsfolk' as const },
    chef: { id, team: 'townsfolk' as const },
    drunk: { id, team: 'outsider' as const },
    poisoner: { id, team: 'minion' as const },
    imp: { id, team: 'demon' as const },
    spy: { id, team: 'minion' as const },
    magician: { id, team: 'townsfolk' as const },
  })[id],
  jinxPairs: [['spy', 'magician']],
}

/** Adapter over the real bundled catalog, as the web app would build it. */
const realCatalog: ScriptValidationCatalog = {
  getCharacter: (id) => {
    const c = characterById[id]
    return c ? { id: c.id, team: c.team, edition: c.edition } : undefined
  },
  jinxPairs: Object.values(jinxes)
    .filter((j) => j.characters.length === 2 && getJinxStatus(j.id) === 'active')
    .map((j) => j.characters),
  allIds: Object.keys(characterById),
}

/**
 * Known data problems in bundled scripts (docs/ISSUES.md). Listed explicitly so
 * a new bad id fails the test, and fixing one reminds you to delete its entry.
 */
const KNOWN_UNKNOWN_IDS: Record<string, string[]> = {
  // I-75: official-style id; the catalog file is high_priestess.json
  'Rochambeau.json': ['highpriestess'],
}

const codes = (r: ReturnType<typeof validateScript>) => r.issues.map((i) => i.code)

describe('core/script/format', () => {
  it('normalizes jinx pair ids regardless of order and whitespace', () => {
    expect(normalizeJinxPairId(' spy :: magician ')).toBe('magician::spy')
    expect(normalizeJinxPairId('spy')).toBeNull()
    expect(normalizeScriptJinxOverride({ characters: ['spy', 'magician'], status: 'inactive' })).toEqual({
      id: 'magician::spy', characters: ['magician', 'spy'], status: 'inactive', reason: '', reason_zh: '',
    })
  })

  it('splits _meta from characters', () => {
    const data = [{ id: '_meta', name: 'X', jinxes: [{ id: 'spy::magician' }] }, 'imp', { id: 'chef' }]
    expect(extractScriptCharacters(data).characters).toEqual(['imp', 'chef'])
    expect(normalizeScriptMetaEntry(data)?.jinxes).toEqual([
      { id: 'magician::spy', characters: ['magician', 'spy'], status: 'active', reason: '', reason_zh: '' },
    ])
  })
})

describe('core/script/validate', () => {
  it('accepts a well-formed script and counts teams', () => {
    const r = validateScript([{ id: '_meta', name: 'Mini' }, 'washerwoman', 'chef', 'drunk', 'poisoner', 'imp'], miniCatalog)
    expect(r.ok).toBe(true)
    expect(r.issues).toEqual([])
    expect(r.teamCounts).toMatchObject({ townsfolk: 2, outsider: 1, minion: 1, demon: 1 })
    expect(r.meta?.name).toBe('Mini')
    expect(r.characters[0]).toEqual({ id: 'washerwoman', team: 'townsfolk', source: 'catalog' })
  })

  it('accepts the legacy { characters } shape', () => {
    expect(validateScript({ title: 'Old', characters: ['washerwoman', 'imp'] }, miniCatalog).ok).toBe(true)
  })

  it('rejects non-script input', () => {
    const r = validateScript('nope', miniCatalog)
    expect(r.ok).toBe(false)
    expect(codes(r)).toEqual(['invalid_format'])
  })

  it('flags empty, malformed, duplicate and unknown entries', () => {
    expect(codes(validateScript([{ id: '_meta', name: 'Empty' }], miniCatalog))).toEqual(['empty_script'])
    const r = validateScript(['imp', 'imp', 42, 'nobody', 'washerwoman'], miniCatalog)
    expect(r.ok).toBe(false)
    expect(r.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid_entry', index: 2 }),
      expect.objectContaining({ code: 'duplicate_character', characterId: 'imp' }),
      expect.objectContaining({ code: 'unknown_character', characterId: 'nobody' }),
    ]))
    expect(r.characters.map((c) => c.id)).toEqual(['imp', 'nobody', 'washerwoman'])
  })

  it('treats inline definitions as custom characters and checks their fields', () => {
    const ok = validateScript(['imp', { id: 'custom_x', name: 'X', team: 'townsfolk', ability: 'Does X.' }], miniCatalog)
    expect(ok.ok).toBe(true)
    expect(ok.characters[1]).toEqual({ id: 'custom_x', team: 'townsfolk', source: 'script' })

    const bad = validateScript(['imp', { id: 'custom_y', name: 'Y', team: 'wizard' }], miniCatalog)
    expect(bad.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'custom_character_missing_field', characterId: 'custom_y' }),
      expect.objectContaining({ code: 'custom_character_invalid_team', characterId: 'custom_y' }),
    ]))
  })

  it('resolves object entries without a definition against the catalog', () => {
    const r = validateScript([{ id: 'imp' }, { id: 'washerwoman' }], miniCatalog)
    expect(r.ok).toBe(true)
    expect(r.characters.every((c) => c.source === 'catalog')).toBe(true)
  })

  it('warns (without failing) when there is no demon or townsfolk', () => {
    const r = validateScript(['drunk'], miniCatalog)
    expect(r.ok).toBe(true)
    expect(codes(r)).toEqual(['no_demon', 'no_townsfolk'])
  })

  it('reports catalog jinxes and honours script-level jinx overrides', () => {
    expect(validateScript(['spy', 'magician', 'imp'], miniCatalog).applicableJinxes).toEqual(['magician::spy'])

    const off = validateScript([{ id: '_meta', name: 'J', jinxes: [{ id: 'spy::magician', status: 'inactive' }] }, 'spy', 'magician', 'imp'], miniCatalog)
    expect(off.applicableJinxes).toEqual([])

    const dangling = validateScript([{ id: '_meta', name: 'J', jinxes: [{ id: 'chef::imp' }] }, 'imp', 'washerwoman'], miniCatalog)
    expect(dangling.issues).toEqual([expect.objectContaining({ code: 'jinx_character_not_in_script', characterId: 'chef' })])
  })
})

describe('core/script/validate — bundled scripts', () => {
  const dir = path.resolve(process.cwd(), 'assets/scripts')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))

  it('finds the bundled scripts', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s has no unexpected validation errors against the catalog', (file) => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    const errors = validateScript(data, realCatalog).issues.filter((i) => i.severity === 'error')
    const known = KNOWN_UNKNOWN_IDS[file] ?? []
    expect(errors.map((e) => e.characterId)).toEqual(known)
    expect(errors.every((e) => e.code === 'unknown_character')).toBe(true)
  })

  it('suggests the catalog id for a near-miss', () => {
    const r = validateScript(['highpriestess', 'imp'], realCatalog)
    expect(r.issues[0]).toMatchObject({ code: 'unknown_character', suggestion: 'high_priestess' })
  })
})
