import { describe, it, expect } from 'vitest'
import { buildScriptPool, planSetup, seededRandom } from '../core/engine/planning'
import { gameStateFacts } from '../core/engine/winConditions'
import { CHARACTER_DISTRIBUTION } from '../core/engine/setup'
import { allCharacterFiles, initialScripts } from '../catalog'
import { catalogTeamOf } from '../utils/seatAlignment'
import type { Team } from '../types'

const tb = initialScripts.find((s) => s.slug === 'tb')!.characters
const teams = (ids: string[]) => ids.reduce<Record<string, number>>((n, id) => ({ ...n, [catalogTeamOf(id)!]: (n[catalogTeamOf(id)!] ?? 0) + 1 }), {})

describe('planSetup', () => {
  it('deals the official counts for every player count from the script', () => {
    for (const players of [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
      for (const seed of [1, 2, 3]) {
        const plan = planSetup({ scriptCharacters: tb, players, getTeam: catalogTeamOf, seed })!
        const base = CHARACTER_DISTRIBUTION[players]
        const shift = plan.modifiers.reduce((n, m) => n + m.shift, 0)
        expect(plan.inPlay).toHaveLength(players)
        expect(new Set(plan.inPlay).size).toBe(players)
        expect(plan.inPlay.every((id) => tb.includes(id))).toBe(true)
        expect(plan.counts).toEqual({ townsfolk: base.townsfolk - shift, outsider: base.outsider + shift, minion: base.minion, demon: base.demon })
        expect(plan.bluffs).toHaveLength(players >= 7 ? 3 : 0)
        expect(plan.bluffs.every((id) => !plan.inPlay.includes(id) && ['townsfolk', 'outsider'].includes(catalogTeamOf(id)!))).toBe(true)
      }
    }
  })

  it('keeps requested characters in play and applies the Baron', () => {
    const plan = planSetup({ scriptCharacters: tb, players: 8, getTeam: catalogTeamOf, include: ['baron', 'washerwoman', 'clockmaker'] })!
    expect(plan.inPlay).toEqual(expect.arrayContaining(['baron', 'washerwoman']))
    expect(plan.counts).toEqual({ townsfolk: 3, outsider: 3, minion: 1, demon: 1 })
    expect(plan.modifiers).toEqual([{ id: 'baron', shift: 2 }])
    expect(plan.missing).toEqual(['clockmaker'])
  })

  it('is deterministic for a seed', () => {
    expect(planSetup({ scriptCharacters: tb, players: 9, getTeam: catalogTeamOf, seed: 7 })).toEqual(planSetup({ scriptCharacters: tb, players: 9, getTeam: catalogTeamOf, seed: 7 }))
    expect(seededRandom(1)()).toBe(seededRandom(1)())
    expect(planSetup({ scriptCharacters: tb, players: 4, getTeam: catalogTeamOf })).toBeNull()
  })
})

describe('buildScriptPool', () => {
  const candidates = allCharacterFiles.filter((c) => c.id && c.team).map((c) => ({ id: c.id, team: c.team as Team, edition: c.edition }))

  it('builds a full script around requested and preferred characters, without Travellers', () => {
    const pool = buildScriptPool({ candidates, shape: 'full', include: ['washerwoman', 'imp'], prefer: tb })
    expect(pool.counts).toEqual({ townsfolk: 13, outsider: 4, minion: 4, demon: 4 })
    expect(pool.characters).toEqual(expect.arrayContaining(['washerwoman', 'imp']))
    expect(pool.characters.filter((id) => tb.includes(id)).length).toBeGreaterThanOrEqual(22)
    expect(teams(pool.characters).traveler).toBeUndefined()
    expect(new Set(pool.characters).size).toBe(25)
    expect(pool.short).toEqual([])
  })

  it('builds a Teensyville pool from one edition', () => {
    const pool = buildScriptPool({ candidates, shape: 'teensy', editions: ['odyssey'], seed: 3 })
    expect(pool.counts).toEqual({ townsfolk: 6, outsider: 2, minion: 2, demon: 2 })
    expect(pool.characters.every((id) => allCharacterFiles.find((c) => c.id === id)?.edition === 'odyssey')).toBe(true)
  })
})

describe('gameStateFacts', () => {
  const seats = (layout: Array<[string, boolean, string[]?]>) => layout.map(([characterId, alive, stTags], i) => ({ seat: i + 1, characterId, alive, isTraveler: false, stTags: stTags ?? [] }))

  it('Scarlet Woman takes over with 5+ alive, otherwise good wins', () => {
    const six = gameStateFacts(seats([['imp', true], ['scarletwoman', true], ['washerwoman', true], ['empath', true], ['chef', true], ['butler', true], ['monk', false]]), catalogTeamOf)
    expect(six).toContainEqual({ code: 'execute_demon_scarlet_woman', demonSeat: 1, scarletWomanSeat: 2, alive: 6 })
    expect(six).toContainEqual({ code: 'alive', alive: 6, votesNeeded: 3 })
    const four = gameStateFacts(seats([['imp', true], ['scarletwoman', true], ['chef', true], ['butler', true], ['monk', false]]), catalogTeamOf)
    expect(four).toContainEqual({ code: 'execute_demon_good_wins', demonSeat: 1 })
    expect(four).toContainEqual({ code: 'evil_wins_after_deaths', deaths: 2 })
    // A poisoned Scarlet Woman does not take over.
    const poisoned = gameStateFacts(seats([['imp', true], ['scarletwoman', true, ['中毒']], ['washerwoman', true], ['empath', true], ['chef', true]]), catalogTeamOf)
    expect(poisoned).toContainEqual({ code: 'execute_demon_good_wins', demonSeat: 1 })
  })

  it('Mayor at 3 alive, Saint while alive', () => {
    const facts = gameStateFacts(seats([['imp', true], ['mayor', true], ['saint', true], ['chef', false]]), catalogTeamOf)
    expect(facts).toContainEqual({ code: 'mayor_no_execution', mayorSeat: 2 })
    expect(facts).toContainEqual({ code: 'saint_executed', saintSeat: 3 })
    expect(facts).toContainEqual({ code: 'evil_wins_after_deaths', deaths: 1 })
  })
})
