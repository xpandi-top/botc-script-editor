/**
 * The portable catalog snapshot (scripts/catalog-data.mjs) must match what the
 * app shows for a user with no local overrides, so the API and the app agree.
 */
import { describe, it, expect } from 'vitest'
import {
  allCharacters,
  getAbilityText,
  getCharacterReminders,
  getCharacterRemindersGlobal,
  getDisplayName,
  getFlavorText,
  getJinxReason,
  getJinxStatus,
  getNightReminder,
  initialScripts,
  jinxes,
} from '../catalog'
// @ts-expect-error — plain ESM build script without type declarations
import { buildCatalogData } from '../../scripts/catalog-data.mjs'
import { createCatalogIndex, type CatalogData } from '../core/catalog'
import { analyzeScript } from '../core/script/analyze'
import { validateScript } from '../core/script/validate'

const data = buildCatalogData(process.cwd()) as CatalogData
const index = createCatalogIndex(data)
const LANGS = ['en', 'zh'] as const

describe('catalog snapshot ≡ src/catalog.ts', () => {
  it('lists the same characters in the same order', () => {
    expect(data.characters.map((c) => c.id)).toEqual(allCharacters.map((c) => c.id))
  })

  it('matches team, edition, setup flag and localized text for every character', () => {
    const mismatches: string[] = []
    for (const app of allCharacters) {
      const c = index.getCharacter(app.id)!
      const check = (what: string, got: unknown, want: unknown) => {
        if (JSON.stringify(got) !== JSON.stringify(want)) mismatches.push(`${app.id} ${what}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`)
      }
      check('team', c.team, app.team)
      check('edition', c.edition, app.edition)
      check('setup', c.setup, app.setup)
      for (const lang of LANGS) {
        check(`name.${lang}`, c.name[lang], getDisplayName(app.id, lang))
        check(`ability.${lang}`, c.ability[lang], getAbilityText(app.id, lang))
        check(`reminders.${lang}`, c.reminders[lang], getCharacterReminders(app.id, lang))
        check(`remindersGlobal.${lang}`, c.remindersGlobal[lang], getCharacterRemindersGlobal(app.id, lang))
        check(`firstNightReminder.${lang}`, c.firstNightReminder?.[lang], getNightReminder(app.id, lang, 'first'))
        check(`otherNightReminder.${lang}`, c.otherNightReminder?.[lang], getNightReminder(app.id, lang, 'other'))
      }
      check('flavor.en', c.flavor?.en, getFlavorText(app.id, 'en'))
      check('flavor.zh', c.flavor?.zh ?? c.flavor?.en, getFlavorText(app.id, 'zh'))
    }
    expect(mismatches).toEqual([])
  })

  it('matches jinx status and reasons', () => {
    const pairs = Object.values(jinxes).filter((j) => j.characters.length === 2)
    expect(data.jinxes.map((j) => j.id)).toEqual(pairs.map((j) => j.id))
    for (const j of data.jinxes) {
      expect(j.status).toBe(getJinxStatus(j.id))
      expect(j.reason.en).toBe(getJinxReason(j.id, 'en'))
      expect(j.reason.zh).toBe(getJinxReason(j.id, 'zh'))
    }
  })

  it('carries every bundled script with the same slug and characters', () => {
    const appScripts = new Map(initialScripts.map((s) => [s.slug, s]))
    expect(new Set(data.scripts.map((s) => s.slug))).toEqual(new Set(appScripts.keys()))
    for (const summary of index.listScripts()) {
      const app = appScripts.get(summary.slug)!
      expect(index.getScript(summary.slug)!.characters).toEqual(app.characters)
      expect(summary.title).toBe(app.title)
    }
  })
})

describe('core/catalog index', () => {
  it('looks up and searches characters', () => {
    expect(index.getCharacter('imp')?.team).toBe('demon')
    expect(index.teamOf('washerwoman')).toBe('townsfolk')
    expect(index.searchCharacters({ q: 'Imp' })[0].id).toBe('imp')
    expect(index.searchCharacters({ q: '洗衣妇' })[0].id).toBe('washerwoman')
    expect(index.searchCharacters({ team: 'demon', edition: 'tb' }).map((c) => c.id)).toEqual(['imp'])
    expect(index.searchCharacters({ team: 'townsfolk', limit: 3 })).toHaveLength(3)
  })

  it('orders night wakers and finds jinxes among a character set', () => {
    const tb = index.getScript('tb')!
    const first = index.nightOrderFor(tb.characters, 'first')
    expect(first.indexOf('poisoner')).toBeLessThan(first.indexOf('washerwoman'))
    expect(first).not.toContain('imp')
    expect(index.jinxesAmong(['spy', 'magician', 'imp']).map((j) => j.id)).toContain(
      data.jinxes.find((j) => j.characters.includes('spy') && j.characters.includes('magician'))?.id,
    )
  })

  it('validates every bundled script cleanly through the index adapter', () => {
    for (const s of data.scripts) {
      const errors = validateScript(s.data, index.validationCatalog).issues.filter((i) => i.severity === 'error')
      expect(errors, s.slug).toEqual([])
    }
  })
})

describe('core/script/analyze', () => {
  it('summarizes Trouble Brewing', () => {
    const tb = index.getScript('tb')!
    const a = analyzeScript(tb.characters, index)
    expect(a.teamCounts).toMatchObject({ townsfolk: 13, outsider: 4, minion: 4, demon: 1 })
    expect(a.vsStandard).toEqual({ townsfolk: 0, outsider: 0, minion: 0, demon: -3 })
    expect(a.editions).toEqual({ tb: 22 })
    expect(a.setupModifiers).toEqual(expect.arrayContaining(['baron', 'drunk']))
    expect(a.firstNightWakers[0]).toBe('poisoner')
    expect(a.playerCounts.every((p) => p.dealable)).toBe(true)
    expect(a.unknownCharacters).toEqual([])
  })

  it('reports player counts a thin script cannot deal', () => {
    const a = analyzeScript(['washerwoman', 'chef', 'empath', 'poisoner', 'imp', 'nobody'], index)
    expect(a.unknownCharacters).toEqual(['nobody'])
    expect(a.playerCounts.find((p) => p.players === 5)).toEqual({ players: 5, dealable: true, short: {} })
    expect(a.playerCounts.find((p) => p.players === 10)).toEqual({ players: 10, dealable: false, short: { townsfolk: 4, minion: 1 } })
  })
})
