import { describe, it, expect } from 'vitest'
import { createSeats } from '../core/engine/factories'
import { suggestNightInfo } from '../core/engine/nightInfo'
import type { TeamLookup } from '../core/engine/alignment'
import type { Team } from '../core/types/catalog'
import type { StorytellerSeat } from '../core/types/game'

const TEAMS: Record<string, Team> = {
  washerwoman: 'townsfolk', librarian: 'townsfolk', investigator: 'townsfolk', chef: 'townsfolk', empath: 'townsfolk',
  fortuneteller: 'townsfolk', undertaker: 'townsfolk', monk: 'townsfolk', ravenkeeper: 'townsfolk',
  drunk: 'outsider', recluse: 'outsider', butler: 'outsider', poisoner: 'minion', spy: 'minion', imp: 'demon',
}
const getTeam: TeamLookup = (id) => TEAMS[id]

function table(roles: string[], edits: Record<number, Partial<StorytellerSeat>> = {}) {
  const seats = createSeats(roles.length).map((s, i) => ({ ...s, characterId: roles[i], ...edits[s.seat] }))
  return { seats }
}

// 1 WW · 2 Empath · 3 FT · 4 Recluse · 5 Poisoner · 6 Imp · 7 Drunk (thinks Chef) · 8 Investigator
const ROLES = ['washerwoman', 'empath', 'fortuneteller', 'recluse', 'poisoner', 'imp', 'drunk', 'investigator']
const game = table(ROLES, { 7: { userCharacterId: 'chef' } })

describe('core/engine/nightInfo', () => {
  it('lists Washerwoman pairs with every possible decoy', () => {
    const s = suggestNightInfo(game, 1, getTeam)!
    expect(s).toMatchObject({ role: 'washerwoman', truthful: true, impaired: [] })
    expect(s.info).toMatchObject({ kind: 'pair', team: 'townsfolk', noneInPlay: false })
    if (s.info.kind !== 'pair') throw new Error()
    expect(s.info.options.map((o) => [o.character, o.seat])).toEqual([['empath', 2], ['fortuneteller', 3], ['investigator', 8]])
    expect(s.info.options[0].otherSeats).toEqual([3, 4, 5, 6, 7, 8])
  })

  it('lets the Investigator see the Recluse as a Minion', () => {
    const s = suggestNightInfo(game, 8, getTeam)!
    if (s.info.kind !== 'pair') throw new Error()
    expect(s.info.options.map((o) => [o.character, o.seat])).toEqual([['any-minion', 4], ['poisoner', 5]])
    expect(s.notes.join(' ')).toContain('#4 (recluse)')
  })

  it('treats the Drunk-as-Chef as untruthful and counts evil pairs with the Recluse range', () => {
    const s = suggestNightInfo(game, 7, getTeam)!
    expect(s).toMatchObject({ role: 'chef', truthful: false, impaired: ['drunk'] })
    expect(s.info).toEqual({ kind: 'number', values: [1, 2], truth: 1 })
    expect(s.notes[0]).toContain('any information may be given')
  })

  it('counts the Empath\'s living neighbours, skipping the dead', () => {
    expect(suggestNightInfo(game, 2, getTeam)!.info).toEqual({ kind: 'number', values: [0], truth: 0 })
    const dead3 = table(ROLES, { 3: { alive: false } })
    const s = suggestNightInfo(dead3, 2, getTeam)!
    expect(s.info).toEqual({ kind: 'number', values: [0, 1], truth: 0 })
    expect(s.notes).toContain('Living neighbours: #1 and #4.')
  })

  it('answers the Fortune Teller for the chosen players', () => {
    expect(suggestNightInfo(game, 3, getTeam)!.info).toEqual({ kind: 'needs_targets', count: 2 })
    expect(suggestNightInfo(game, 3, getTeam, { targets: [6, 1] })!.info).toEqual({ kind: 'yesno', values: [true], truth: true })
    expect(suggestNightInfo(game, 3, getTeam, { targets: [1, 4] })!.info).toEqual({ kind: 'yesno', values: [false, true], truth: false })
    expect(suggestNightInfo(game, 3, getTeam, { targets: [1, 2] })!.info).toEqual({ kind: 'yesno', values: [false], truth: false })
    const herring = table(ROLES, { 2: { stTags: ['📝Red herring::fortuneteller'] } })
    expect(suggestNightInfo(herring, 3, getTeam, { targets: [1, 2] })!.info).toMatchObject({ values: [true], truth: true })
  })

  it('shows the Undertaker and Ravenkeeper a character', () => {
    const t = table(['undertaker', 'ravenkeeper', 'recluse', 'poisoner', 'imp', 'chef', 'empath'], { 4: { isExecuted: true, alive: false } })
    expect(suggestNightInfo(t, 1, getTeam)!.info).toEqual({ kind: 'character', seat: 4, values: ['poisoner'], truth: 'poisoner' })
    const recluse = suggestNightInfo(t, 1, getTeam, { executedSeat: 3 })!
    expect(recluse.info).toMatchObject({ seat: 3, truth: 'recluse' })
    expect(recluse.notes.join(' ')).toContain('any Minion or Demon')
    expect(suggestNightInfo(t, 2, getTeam)!.info).toEqual({ kind: 'needs_targets', count: 1 })
    expect(suggestNightInfo(t, 2, getTeam, { targets: [5] })!.info).toMatchObject({ truth: 'imp' })
    expect(suggestNightInfo(t, 1, getTeam, { executedSeat: null })!.info).toMatchObject({ values: [], truth: null })
    const nobody = table(['undertaker', 'imp', 'chef', 'empath', 'poisoner'])
    expect(suggestNightInfo(nobody, 1, getTeam)!.notes).toContain('Nobody was executed today: the Undertaker does not wake.')
  })

  it('flags poisoning, empty Outsider slots and unsupported roles', () => {
    const poisoned = table(ROLES, { 1: { stTags: ['📝Poisoned::poisoner'] } })
    expect(suggestNightInfo(poisoned, 1, getTeam)).toMatchObject({ truthful: false, impaired: ['poisoned'] })
    const noOutsiders = table(['librarian', 'chef', 'empath', 'poisoner', 'imp'])
    const lib = suggestNightInfo(noOutsiders, 1, getTeam)!
    expect(lib.info).toMatchObject({ kind: 'pair', options: [], noneInPlay: true })
    expect(lib.notes.join(' ')).toContain('0 Outsiders')
    expect(suggestNightInfo(table(['monk', 'imp', 'chef', 'empath', 'poisoner']), 1, getTeam)!.info).toEqual({ kind: 'unsupported' })
    expect(suggestNightInfo(game, 42, getTeam)).toBeNull()
  })
})
