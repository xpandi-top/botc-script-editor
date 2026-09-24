import { describe, it, expect } from 'vitest'
import { createDayState, createSeats, shuffleArray } from '../core/engine/factories'
import {
  PHASE_ORDER,
  addPlayerSeat,
  addTravelerSeat,
  applyPhase,
  createNextDay,
  endGameResultFromRecord,
  endGameResultWithTeams,
  endGameTeams,
  latestDay,
  nextPhase,
  nextSpeakerPatch,
  previousPhase,
  removeDay,
  removeLastPlayerSeat,
  removeLastTraveler,
  restoreDaysFromRecord,
} from '../core/engine/lifecycle'
import {
  CHARACTER_DISTRIBUTION,
  applySetupToSeats,
  buildSeatsFromConfig,
  drawRandomAssignments,
  newGameConfigFromDay,
} from '../core/engine/setup'
import { alignmentForTeam, dealtTeamTag, seatAlignmentWith, type TeamLookup } from '../core/engine/alignment'
import type { Team } from '../core/types/catalog'
import type { DayState, GameRecord, NewGameConfig, TimerDefaults } from '../core/types/game'

const timers: TimerDefaults = {
  privateSeconds: 180, publicFreeSeconds: 300, publicRoundRobinSeconds: 30, nominationDelayMinutes: 2,
  nominationWaitSeconds: 10, nominationActorSeconds: 30, nominationTargetSeconds: 30, nominationVoteSeconds: 5, alarmSound: '',
}

const TEAMS: Record<string, Team> = {
  washerwoman: 'townsfolk', librarian: 'townsfolk', investigator: 'townsfolk', chef: 'townsfolk', empath: 'townsfolk',
  fortuneteller: 'townsfolk', undertaker: 'townsfolk', monk: 'townsfolk',
  butler: 'outsider', drunk: 'outsider', recluse: 'outsider',
  poisoner: 'minion', spy: 'minion', baron: 'minion',
  imp: 'demon', thief: 'traveler',
}
const getTeam: TeamLookup = (id) => TEAMS[id]

/** Deterministic PRNG (mulberry32) so random draws are reproducible. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function day(n = 7): DayState {
  return createDayState(1, createSeats(n), timers)
}

function config(overrides: Partial<NewGameConfig> = {}): NewGameConfig {
  return {
    playerCount: 5, travelerCount: 1, scriptSlug: 'tb', seatNames: { 1: 'Ann' }, assignments: { 1: 'imp', 2: 'chef', 3: 'thief' },
    userAssignments: { 2: 'empath' }, travelerAssignments: { 6: 'thief' }, seatNotes: { 2: 'drunk?' }, specialNote: '',
    demonBluffs: [], charPool: [], ...overrides,
  }
}

describe('core/engine/lifecycle — phases and days', () => {
  it('walks the phase order', () => {
    expect(PHASE_ORDER).toEqual(['night', 'private', 'public', 'nomination'])
    expect(nextPhase('night')).toBe('private')
    expect(nextPhase('nomination')).toBeNull()
    expect(previousPhase('private')).toBe('night')
    expect(previousPhase('night')).toBeNull()
  })

  it('applies phase entry rules', () => {
    const d = { ...day(), nightVisitedSeats: [2, 3], nominationStep: 'voting' as const, voteDraft: { ...day().voteDraft, actor: 1 } }
    expect(applyPhase(d, 'night', timers).nightVisitedSeats).toEqual([])
    const nom = applyPhase(d, 'nomination', timers)
    expect(nom).toMatchObject({ phase: 'nomination', nominationStep: 'waitingForNomination', nominationWaitSeconds: 10, votingState: null })
    expect(nom.voteDraft.actor).toBeNull()
    const pub = applyPhase(d, 'public', timers)
    expect(pub.nightVisitedSeats).toEqual([2, 3])
    expect(pub.nominationStep).toBe('voting')
  })

  it('creates the next day with seats and demon bluffs carried over', () => {
    const d1 = { ...day(), demonBluffs: ['chef', 'monk'] }
    d1.seats[0] = { ...d1.seats[0], alive: false }
    const d2 = createNextDay(1, d1, timers)
    expect(d2.day).toBe(2)
    expect(d2.phase).toBe('night')
    expect(d2.demonBluffs).toEqual(['chef', 'monk'])
    expect(d2.seats[0].alive).toBe(false)
    expect(d2.seats).not.toBe(d1.seats)
  })

  it('removes and renumbers days, but never the last one', () => {
    const days = [1, 2, 3].map((n) => createDayState(n, createSeats(5), timers))
    expect(removeDay(days, days[1].id)?.map((d) => [d.id, d.day])).toEqual([[days[0].id, 1], [days[2].id, 2]])
    expect(removeDay(days, 'missing')).toBeNull()
    expect(removeDay([days[0]], days[0].id)).toBeNull()
  })

  it('advances round-robin speakers clockwise and stops after everyone spoke', () => {
    const d = { ...day(3), currentSpeakerSeat: 2, roundRobinSpokenSeats: [1] }
    expect(nextSpeakerPatch(d, timers)).toEqual({ roundRobinSpokenSeats: [1, 2], currentSpeakerSeat: 3, publicRoundRobinSeconds: 30 })
    const last = { ...d, currentSpeakerSeat: 3, roundRobinSpokenSeats: [1, 2] }
    expect(nextSpeakerPatch(last, timers)).toEqual({ roundRobinSpokenSeats: [1, 2, 3], currentSpeakerSeat: null, publicRoundRobinSeconds: 0 })
  })
})

describe('core/engine/lifecycle — seats', () => {
  it('adds and removes regular seats, renumbering travellers after them', () => {
    let d = addTravelerSeat(day(5))
    expect(d.seats.map((s) => [s.seat, s.isTraveler, s.name])).toContainEqual([6, true, 'Traveler 6'])
    d = addPlayerSeat(d)
    expect(d.seats.map((s) => [s.seat, s.isTraveler])).toEqual([[1, false], [2, false], [3, false], [4, false], [5, false], [6, false], [7, true]])
    expect(d.seats[5].name).toBe('Player 6')
    d = removeLastPlayerSeat(d)
    expect(d.seats.map((s) => [s.seat, s.isTraveler])).toEqual([[1, false], [2, false], [3, false], [4, false], [5, false], [6, true]])
    expect(removeLastPlayerSeat(d)).toBe(d) // 5 players is the minimum
    d = removeLastTraveler(d)
    expect(d.seats).toHaveLength(5)
    expect(removeLastTraveler(d)).toBe(d)
  })
})

describe('core/engine/lifecycle — end of game and records', () => {
  it('takes end-of-game teams from the latest day and refreshes an open survey', () => {
    const d1 = { ...day(3), day: 1 }
    const d2 = { ...createNextDay(1, d1, timers), seats: d1.seats.map((s) => ({ ...s, characterId: s.seat === 1 ? 'imp' : s.seat === 2 ? 'chef' : null, teamTag: s.seat === 2 ? 'evil' as const : null })) }
    expect(latestDay([d2, d1], d1)).toBe(d2)
    expect(latestDay([], d1)).toBe(d1)
    // alignment: explicit tag, else the character's team, else unknown
    const teams = endGameTeams([d1, d2], d1, getTeam)
    expect(teams).toEqual({ 1: 'evil', 2: 'evil', 3: null })
    expect(endGameResultWithTeams(null, teams)).toMatchObject({ winner: null, playerTeams: teams, otherNote: '' })
    const open = { ...endGameResultWithTeams(null, {}), winner: 'good' as const, otherNote: 'close game' }
    expect(endGameResultWithTeams(open, teams)).toMatchObject({ winner: 'good', otherNote: 'close game', playerTeams: teams })
  })

  it('restores full saved days as-is', () => {
    const saved = [day(), createNextDay(1, day(), timers)]
    const record: GameRecord = { id: 'r', endedAt: 1, days: [], savedDays: saved }
    expect(restoreDaysFromRecord(record, timers)).toBe(saved)
  })

  it('rebuilds days from setup and summaries when no days were saved', () => {
    const record: GameRecord = {
      id: 'r', endedAt: 1, winner: 'evil',
      days: [{ day: 1, votes: 0, votePassed: 0, skills: 0, nominations: 0 }, { day: 2, votes: 0, votePassed: 0, skills: 0, nominations: 0 }],
      playerSummaries: [{ seat: 1, name: 'Ann', team: 'evil' }],
      setup: {
        playerCount: 5, travelerCount: 1, seatNames: { 2: 'Bo' }, assignments: { 1: 'imp' }, userAssignments: {},
        seatNotes: {}, specialNote: '', demonBluffs: ['chef'],
      },
    }
    const days = restoreDaysFromRecord(record, timers)
    expect(days).toHaveLength(2)
    expect(days[0].demonBluffs).toEqual(['chef'])
    expect(days[1].gameEnded).toBe(true)
    expect(days[0].seats[0]).toMatchObject({ name: 'Ann', characterId: 'imp', teamTag: 'evil' })
    expect(days[0].seats[1].name).toBe('Bo')
    expect(days[0].seats[5].isTraveler).toBe(true)
    expect(endGameResultFromRecord(record, days[0])).toMatchObject({ winner: 'evil', playerTeams: { 1: 'evil', 2: null } })
  })
})

describe('core/engine/alignment', () => {
  it('maps teams to alignments', () => {
    expect(alignmentForTeam('demon')).toBe('evil')
    expect(alignmentForTeam('outsider')).toBe('good')
    expect(alignmentForTeam('traveler')).toBeNull()
    expect(seatAlignmentWith(getTeam, { characterId: 'imp', teamTag: 'good' })).toBe('good')
    expect(seatAlignmentWith(getTeam, { characterId: 'imp', teamTag: null })).toBe('evil')
    // dealing at setup tags every known non-evil character good, travellers included
    expect(dealtTeamTag(getTeam, 'thief')).toBe('good')
    expect(dealtTeamTag(getTeam, 'nobody')).toBeNull()
  })
})

describe('core/engine/setup', () => {
  it('draws the official distribution without repeats, with the Baron\'s Outsiders', () => {
    const script = Object.keys(TEAMS)
    for (let seed = 1; seed <= 40; seed++) {
      const playerCount = [5, 7, 9][seed % 3]
      const a = drawRandomAssignments({ playerCount, scriptCharacters: script, getTeam, rng: seeded(seed) })
      const ids = Object.values(a)
      expect(Object.keys(a)).toHaveLength(playerCount)
      expect(new Set(ids).size).toBe(ids.length)
      const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 } as Record<string, number>
      for (const id of ids) counts[TEAMS[id]]++
      const base = CHARACTER_DISTRIBUTION[playerCount]
      // [+2 Outsiders], as far as the script's three Outsiders go.
      const shift = ids.includes('baron') ? Math.min(2, 3 - base.outsider) : 0
      expect(counts).toEqual({ ...base, outsider: base.outsider + shift, townsfolk: base.townsfolk - shift })
    }
  })

  it('seats the Marionette next to the Demon', () => {
    const teams: Record<string, Team> = { ...TEAMS, marionette: 'minion' }
    for (let seed = 1; seed <= 30; seed++) {
      const a = drawRandomAssignments({ playerCount: 9, scriptCharacters: ['chef', 'empath', 'monk', 'washerwoman', 'librarian', 'investigator', 'butler', 'recluse', 'marionette', 'imp'], getTeam: (id) => teams[id], rng: seeded(seed) })
      const seat = (id: string) => Number(Object.entries(a).find(([, c]) => c === id)![0])
      const gap = Math.abs(seat('marionette') - seat('imp'))
      expect([1, 8]).toContain(gap)
    }
  })

  it('is reproducible with a seeded rng and honours the character pool', () => {
    const script = Object.keys(TEAMS)
    const a = drawRandomAssignments({ playerCount: 7, scriptCharacters: script, getTeam, rng: seeded(42) })
    expect(drawRandomAssignments({ playerCount: 7, scriptCharacters: script, getTeam, rng: seeded(42) })).toEqual(a)
    const pooled = drawRandomAssignments({ playerCount: 5, scriptCharacters: script, charPool: ['chef', 'monk', 'empath', 'spy', 'imp'], getTeam, rng: seeded(1) })
    expect(Object.values(pooled).sort()).toEqual(['chef', 'empath', 'imp', 'monk', 'spy'])
    expect(drawRandomAssignments({ playerCount: 4, scriptCharacters: script, getTeam })).toEqual({})
  })

  it('shuffles with an injected rng without mutating the input', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffleArray(input, seeded(3))
    expect(out.sort()).toEqual([1, 2, 3, 4, 5])
    expect(input).toEqual([1, 2, 3, 4, 5])
  })

  it('builds seats for a new game', () => {
    const seats = buildSeatsFromConfig(config(), getTeam)
    expect(seats).toHaveLength(6)
    expect(seats[0]).toMatchObject({ name: 'Ann', characterId: 'imp', teamTag: 'evil' })
    expect(seats[1]).toMatchObject({ name: 'Player 2', characterId: 'chef', userCharacterId: 'empath', teamTag: 'good', note: 'drunk?' })
    expect(seats[2]).toMatchObject({ characterId: 'thief', teamTag: 'good' })
    expect(seats[3]).toMatchObject({ characterId: null, teamTag: null })
    expect(seats[5]).toMatchObject({ isTraveler: true, name: 'Traveler 6', characterId: 'thief', teamTag: null })
  })

  it('applies setup edits and reports character swaps in seat order', () => {
    const current = buildSeatsFromConfig(config(), getTeam)
    const { seats, characterChanges } = applySetupToSeats(current, config({
      playerCount: 6, travelerCount: 1,
      assignments: { 1: 'baron', 3: 'monk', 6: 'imp' }, seatNames: { 1: 'Ann', 7: 'Tess' },
    }), getTeam)
    expect(characterChanges).toEqual([
      { seat: 1, from: 'imp', to: 'baron' },
      { seat: 2, from: 'chef', to: null },
      { seat: 3, from: 'thief', to: 'monk' },
    ])
    // alignment is kept from the old seat
    expect(seats[0].teamTag).toBe('evil')
    expect(seats[5]).toMatchObject({ isTraveler: true, characterId: 'thief' }) // old traveller seat keeps its character
    expect(seats[6]).toMatchObject({ seat: 7, isTraveler: true, name: 'Tess', characterId: null })
  })

  it('drafts the next game from the current table', () => {
    const d = day(6)
    d.seats[0] = { ...d.seats[0], name: 'Ann' }
    d.seats[5] = { ...d.seats[5], isTraveler: true }
    const c = newGameConfigFromDay({ currentDay: d, scriptSlug: 'tb', fabledIds: ['djinn'], gameId: 'g1' })
    expect(c).toMatchObject({ playerCount: 5, travelerCount: 1, seatNames: { 1: 'Ann' }, scriptSlug: 'tb', fabledIds: ['djinn'], gameId: 'g1' })
    expect(newGameConfigFromDay({ currentDay: undefined, scriptSlug: '', fabledIds: [], gameId: 'g2' }).playerCount).toBe(9)
  })
})
