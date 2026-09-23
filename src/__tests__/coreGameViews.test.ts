import { describe, it, expect } from 'vitest'
// @ts-expect-error — plain ESM build script without type declarations
import { buildCatalogData } from '../../scripts/catalog-data.mjs'
import { createCatalogIndex, type CatalogData } from '../core/catalog'
import { applyCommands, currentDayOf, type EngineGame } from '../core/engine/commands'
import { createDayState } from '../core/engine/factories'
import { buildNightScript, impairmentsOf, type NightScriptLookup } from '../core/engine/nightScript'
import { buildSeatsFromConfig } from '../core/engine/setup'
import { publicView, seatView } from '../core/engine/views'
import type { TimerDefaults } from '../core/types/game'

const index = createCatalogIndex(buildCatalogData(process.cwd()) as CatalogData)
const timers: TimerDefaults = { privateSeconds: 180, publicFreeSeconds: 300, publicRoundRobinSeconds: 30, nominationDelayMinutes: 2, nominationWaitSeconds: 10, nominationActorSeconds: 30, nominationTargetSeconds: 30, nominationVoteSeconds: 5, alarmSound: '' }
const ctx = (i: number) => ({ now: 1_700_000_000_000 + i, getTeam: index.teamOf })

function game(playerCount = 7): EngineGame {
  const seats = buildSeatsFromConfig({
    playerCount, travelerCount: 0, scriptSlug: 'tb', seatNames: {},
    assignments: { 1: 'washerwoman', 2: 'empath', 3: 'fortuneteller', 4: 'monk', 5: 'poisoner', 6: 'imp', 7: 'drunk' },
    userAssignments: { 7: 'chef' }, travelerAssignments: {}, seatNotes: {}, specialNote: '', demonBluffs: ['slayer'], charPool: [],
  }, index.teamOf)
  const day = createDayState(1, seats, timers, 'day-1')
  return { days: [day], currentDayId: day.id, timers, version: 0 }
}

const lookup = (night: 'first' | 'other'): NightScriptLookup => ({
  order: night === 'first' ? index.data.nightOrder.first : index.data.nightOrder.other,
  name: (id) => index.getCharacter(id)?.name.en,
  reminder: (id) => (night === 'first' ? index.getCharacter(id)?.firstNightReminder?.en : index.getCharacter(id)?.otherNightReminder?.en),
})

describe('core/engine/views', () => {
  const played = applyCommands(game(), [
    { type: 'seat.tag.add', seat: 2, tag: '📝Poisoned::poisoner', scope: 'st' },
    { type: 'seat.tag.add', seat: 3, tag: '📝Red herring::fortuneteller', scope: 'public' },
    { type: 'skill.record', actor: 5, roleId: 'poisoner', targets: [2] },
    { type: 'note.log', text: 'Drunk thinks they are the Chef' },
    { type: 'phase.set', phase: 'nomination' },
    { type: 'nomination.set', actor: 1, target: 6 },
    { type: 'vote.cast', seat: 2, yes: true },
    { type: 'vote.record' },
    { type: 'seat.update', seat: 6, changes: { alive: false, characterId: 'imp' } },
  ], ctx).game

  it('shows the public nothing the storyteller keeps private', () => {
    const view = publicView(played)
    const json = JSON.stringify(view)
    for (const secret of ['imp', 'poisoner', 'drunk', 'chef', 'fortuneteller', 'Red herring::', 'Drunk thinks', 'slayer', 'evil']) {
      expect(json, secret).not.toContain(secret)
    }
    expect(view.day.seats[5]).toEqual({ seat: 6, name: 'Player 6', alive: false, isTraveler: false, isExecuted: false, hasNoVote: false, voteTokens: 1, tags: [] })
    expect(view.day.seats[2].tags).toEqual(['Red herring'])
    expect(view.events.map((e) => e.code)).toEqual(['seat.publicTag.added', 'vote.recorded', 'seat.died'])
    expect(view.events[0]).toMatchObject({ params: { seat: 3, label: 'Red herring' }, detail: '#3 tagged: Red herring' })
    expect(view.day.votes).toEqual([{ actor: 1, target: 6, voters: [2], voteCount: 1, requiredVotes: 4, passed: false }])
  })

  it('tells a seat what they believe they are', () => {
    expect(seatView(played, 7)).toMatchObject({ seat: 7, character: 'chef' })
    expect(seatView(played, 1)?.character).toBe('washerwoman')
    expect(seatView(played, 99)).toBeNull()
  })
})

describe('core/engine/nightScript', () => {
  it('builds the first night with evil info, the drunk as the Chef and poison marks', () => {
    const g = applyCommands(game(), [{ type: 'seat.tag.add', seat: 1, tag: '📝Poisoned::poisoner', scope: 'st' }], ctx).game
    const steps = buildNightScript(currentDayOf(g), lookup('first'))
    const ids = steps.map((s) => s.id)
    expect(ids[0]).toBe('DUSK')
    expect(ids).toContain('MINION_INFO')
    expect(ids).toContain('DEMON_INFO')
    expect(ids.indexOf('poisoner')).toBeLessThan(ids.indexOf('washerwoman'))
    expect(ids).not.toContain('monk') // the Monk does not wake on the first night
    expect(ids).not.toContain('drunk')
    const chef = steps.find((s) => s.id === 'chef')
    expect(chef).toMatchObject({ kind: 'character', name: 'Chef', seats: [{ seat: 7, perceived: true, actualCharacter: 'drunk', impaired: ['drunk'] }] })
    const washer = steps.find((s) => s.id === 'washerwoman')
    expect(washer).toMatchObject({ seats: [{ seat: 1, perceived: false, impaired: ['poisoned'] }] })
    expect(washer && washer.kind === 'character' && washer.reminder).toContain('Townsfolk')
  })

  it('skips evil info in small games and dead characters unless asked', () => {
    const small = buildNightScript({ seats: currentDayOf(game(6)).seats }, lookup('first')).map((s) => s.id)
    expect(small).not.toContain('MINION_INFO')
    const g = applyCommands(game(), [{ type: 'seat.update', seat: 4, changes: { alive: false } }], ctx).game
    expect(buildNightScript(currentDayOf(g), lookup('other')).map((s) => s.id)).not.toContain('monk')
    expect(buildNightScript(currentDayOf(g), lookup('other'), { includeDead: true }).find((s) => s.id === 'monk')).toMatchObject({ seats: [{ seat: 4, alive: false }] })
  })

  it('reads impairments from ST tags', () => {
    expect(impairmentsOf({ characterId: 'chef', stTags: ['中毒'] })).toEqual(['poisoned'])
    expect(impairmentsOf({ characterId: 'drunk', stTags: [] })).toEqual(['drunk'])
    expect(impairmentsOf({ characterId: 'chef', stTags: ['Red herring'] })).toEqual([])
  })
})
