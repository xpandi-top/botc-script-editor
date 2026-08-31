import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CharacterFileEntry, Team } from '../types'

/**
 * Structural invariants for the shipped character data.
 *
 * These are data checks, not behaviour checks — they catch a pack import or
 * re-sync that silently drops a field, mislabels a team, or points the night
 * order at a character that no longer exists.
 */

const root = process.cwd()
const charactersDir = path.join(root, 'assets', 'characters', 'individual')
const iconsDir = path.join(root, 'assets', 'icons')

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

const characterFiles = fs
  .readdirSync(charactersDir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => ({ name, entry: readJson<CharacterFileEntry>(path.join(charactersDir, name)) }))

const byId = new Map(characterFiles.map(({ entry }) => [entry.id, entry]))
const iconIds = new Set(
  fs.readdirSync(iconsDir).map((name) => name.replace(/\.[^.]+$/, '')),
)

const TEAMS: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric']

const nightOrder = readJson<{ first_night: string[]; other_nights: string[] }>(
  path.join(root, 'assets', 'characters', 'night-order.json'),
)
const jinxes = readJson<Record<string, { characters: string[] }>>(
  path.join(root, 'assets', 'jinxes.json'),
)

describe('character files', () => {
  it('use their id as the filename', () => {
    const mismatched = characterFiles
      .filter(({ name, entry }) => name !== `${entry.id}.json`)
      .map(({ name, entry }) => `${name} declares id "${entry.id}"`)
    expect(mismatched).toEqual([])
  })

  it('have unique ids', () => {
    const seen = new Set<string>()
    const duplicates = characterFiles
      .map(({ entry }) => entry.id)
      .filter((id) => (seen.has(id) ? true : (seen.add(id), false)))
    expect(duplicates).toEqual([])
  })

  it('declare a known team and a non-empty edition', () => {
    const invalid = characterFiles
      .filter(({ entry }) => !TEAMS.includes(entry.team) || !entry.edition)
      .map(({ entry }) => `${entry.id}: team=${entry.team} edition=${entry.edition}`)
    expect(invalid).toEqual([])
  })

  it('have an icon', () => {
    const missing = characterFiles
      .filter(({ entry }) => !iconIds.has(entry.id))
      .map(({ entry }) => entry.id)
    expect(missing).toEqual([])
  })

  it('point current_revision at a listed revision', () => {
    const broken = characterFiles
      .filter(({ entry }) => entry.current_revision)
      .filter(({ entry }) => !entry.revisions?.some((r) => r.id === entry.current_revision))
      .map(({ entry }) => `${entry.id} → ${entry.current_revision}`)
    expect(broken).toEqual([])
  })

  it('keep reminder tokens as non-empty strings', () => {
    const bad: string[] = []
    for (const { entry } of characterFiles) {
      const lists = [
        entry.reminders, entry.remindersGlobal,
        entry.en?.reminders, entry.en?.remindersGlobal,
        entry.zh?.reminders, entry.zh?.remindersGlobal,
      ]
      for (const list of lists) {
        if (list === undefined) continue
        if (!Array.isArray(list) || list.some((token) => typeof token !== 'string' || !token.trim())) {
          bad.push(entry.id)
        }
      }
    }
    expect([...new Set(bad)]).toEqual([])
  })
})

describe('night order', () => {
  const isMarker = (id: string) => /^[A-Z_]+$/.test(id)

  for (const [label, list] of [
    ['first_night', nightOrder.first_night],
    ['other_nights', nightOrder.other_nights],
  ] as const) {
    it(`${label} references only known characters`, () => {
      const unknown = list.filter((id) => !isMarker(id) && !byId.has(id))
      expect(unknown).toEqual([])
    })

    it(`${label} has no duplicates`, () => {
      const seen = new Set<string>()
      const duplicates = list.filter((id) => (seen.has(id) ? true : (seen.add(id), false)))
      expect(duplicates).toEqual([])
    })
  }
})

describe('jinxes', () => {
  it('reference two known characters', () => {
    const broken = Object.entries(jinxes)
      .filter(([, jinx]) => jinx.characters.some((id) => !byId.has(id)))
      .map(([id]) => id)
    expect(broken).toEqual([])
  })

  it('use "<a>::<b>" ids matching their character pair', () => {
    const mismatched = Object.entries(jinxes)
      .filter(([id, jinx]) => id !== jinx.characters.join('::'))
      .map(([id]) => id)
    expect(mismatched).toEqual([])
  })
})

describe('edition credits', () => {
  const credits = readJson<Record<string, {
    id: string; name_en?: string; name_zh?: string; source?: string; requiresAttribution?: boolean
  }>>(path.join(root, 'assets', 'editions.json'))

  it('key each entry by its own id', () => {
    const mismatched = Object.entries(credits).filter(([key, credit]) => key !== credit.id).map(([key]) => key)
    expect(mismatched).toEqual([])
  })

  it('describe an edition that characters actually use', () => {
    const used = new Set(characterFiles.map(({ entry }) => entry.edition))
    const orphaned = Object.keys(credits).filter((edition) => !used.has(edition))
    expect(orphaned).toEqual([])
  })

  it('give every attribution-required pack a name in both languages and a source', () => {
    const incomplete = Object.values(credits)
      .filter((credit) => credit.requiresAttribution)
      .filter((credit) => !credit.name_en || !credit.name_zh || !credit.source)
      .map((credit) => credit.id)
    expect(incomplete).toEqual([])
  })
})

// ── Odyssey pack ─────────────────────────────────────────────────────────────
// Chinese-only for now: names and abilities live in the `zh` block, English has
// the name only. Re-syncing from the wiki must not regress these.

const odyssey = characterFiles.map(({ entry }) => entry).filter((entry) => entry.edition === 'odyssey')

describe('odyssey pack', () => {
  it('is present', () => {
    expect(odyssey.length).toBeGreaterThan(100)
  })

  it('has a Chinese name and ability for every character', () => {
    const missing = odyssey
      .filter((entry) => !entry.zh?.name?.trim() || !entry.zh?.ability?.trim())
      .map((entry) => entry.id)
    expect(missing).toEqual([])
  })

  it('has an English name for every character', () => {
    const missing = odyssey.filter((entry) => !entry.en?.name?.trim()).map((entry) => entry.id)
    expect(missing).toEqual([])
  })

  it('keeps zh.ability in sync with the current revision text', () => {
    const drifted = odyssey
      .filter((entry) => entry.current_revision)
      .filter((entry) => entry.zh?.revisions?.[entry.current_revision!] !== entry.zh?.ability)
      .map((entry) => entry.id)
    expect(drifted).toEqual([])
  })

  it('sets `setup` exactly when the ability carries a [bracketed] setup clause', () => {
    const wrong = odyssey
      .filter((entry) => Boolean(entry.setup) !== /\[.+\]/.test(entry.zh?.ability ?? ''))
      .map((entry) => `${entry.id} (setup=${entry.setup})`)
    expect(wrong).toEqual([])
  })

  it('stores reminder tokens under the zh block, not the top level', () => {
    const misplaced = odyssey.filter((entry) => entry.reminders !== undefined).map((entry) => entry.id)
    expect(misplaced).toEqual([])
  })

  it('has no leftover prose lines among the reminder tokens', () => {
    const prose = odyssey
      .flatMap((entry) => (entry.zh?.reminders ?? []).map((token) => ({ id: entry.id, token })))
      .filter(({ token }) => /^(特殊说明|说明|注意事项|备注|提示)[：:]/.test(token) || token.length > 12)
      .map(({ id, token }) => `${id}: ${token}`)
    expect(prose).toEqual([])
  })

  it('is fully listed in the odyssey script', () => {
    const script = readJson<Array<string | { id: string }>>(
      path.join(root, 'assets', 'scripts', 'odyssey.json'),
    )
    const listed = new Set(script.filter((item): item is string => typeof item === 'string'))
    const missing = odyssey.map((entry) => entry.id).filter((id) => !listed.has(id))
    expect(missing).toEqual([])
    expect(listed.size).toBe(odyssey.length)
  })

  it('has an almanac entry for every character', () => {
    const almanac = readJson<{ characters: Record<string, unknown> }>(
      path.join(root, 'assets', 'almanac', 'odyssey.zh.json'),
    )
    const missing = odyssey.map((entry) => entry.id).filter((id) => !almanac.characters[id])
    expect(missing).toEqual([])
  })
})
