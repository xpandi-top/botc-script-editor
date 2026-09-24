/**
 * Game setup: player-count distribution, random character draws, building
 * seats from a NewGameConfig and applying setup edits to a running game.
 * Pure given the injected TeamLookup and random source.
 */
import type { Team } from '../types/catalog'
import type { DayState, NewGameConfig, StorytellerSeat } from '../types/game'
import { dealtTeamTag, defaultAlignmentWith, seatAlignmentWith, type TeamLookup } from './alignment'
import { createSeats, shuffleArray } from './factories'

export type RandomSource = () => number

/** Official bag composition by player count (travellers excluded). */
export const CHARACTER_DISTRIBUTION: Record<number, { townsfolk: number; outsider: number; minion: number; demon: number }> = {
  5: { townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
  6: { townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
  7: { townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
  8: { townsfolk: 5, outsider: 1, minion: 1, demon: 1 },
  9: { townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
  10: { townsfolk: 7, outsider: 0, minion: 2, demon: 1 },
  11: { townsfolk: 7, outsider: 1, minion: 2, demon: 1 },
  12: { townsfolk: 7, outsider: 2, minion: 2, demon: 1 },
  13: { townsfolk: 9, outsider: 0, minion: 3, demon: 1 },
  14: { townsfolk: 9, outsider: 1, minion: 3, demon: 1 },
  15: { townsfolk: 9, outsider: 2, minion: 3, demon: 1 },
}

/**
 * How setup abilities in [brackets] change the Outsider count (Townsfolk
 * change the other way). Several values = the Storyteller chooses.
 */
export const SETUP_OUTSIDER_SHIFTS: Record<string, number[]> = {
  baron: [2],
  godfather: [-1, 1],
  fanggu: [1],
  vigormortis: [-1],
  balloonist: [0, 1],
  hermit: [0, -1],
  // Odyssey
  chimera: [-1],
  constable: [1],
  cyclops: [1],
  dark_knight: [1],
  herald: [1],
  kitsune: [-1, 1],
  skeleton_king: [1],
  // 华灯初上
  ganshiren: [-1],
  qiongqi: [1],
  taotie: [1],
}

/** Characters that sit next to the Demon ([You neighbor the Demon]). */
export const NEIGHBORS_DEMON = ['marionette', 'doll']

/**
 * Deal the official distribution for `playerCount` at random from the
 * script's characters (restricted to `charPool` when it is non-empty).
 * The Demon and Minions are drawn first, so their setup abilities
 * ([+2 Outsiders] …, SETUP_OUTSIDER_SHIFTS) set how many Outsiders are
 * dealt; a Marionette is then seated next to the Demon.
 * Returns seat → character id; seats are left out when a team has no
 * candidates. Characters repeat only once a team's pool is exhausted.
 */
export function drawRandomAssignments(opts: {
  playerCount: number
  scriptCharacters: string[]
  charPool?: string[]
  getTeam: TeamLookup
  rng?: RandomSource
}): Record<number, string> {
  const rng = opts.rng ?? Math.random
  const dist = CHARACTER_DISTRIBUTION[opts.playerCount]
  if (!dist) return {}
  const byTeam: Record<string, string[]> = { townsfolk: [], outsider: [], minion: [], demon: [] }
  const pool: string[] = opts.charPool ?? []
  for (const cid of opts.scriptCharacters) { const team = opts.getTeam(cid); if (team && byTeam[team]) { if (pool.length === 0 || pool.includes(cid)) byTeam[team].push(cid) } }
  const usedChars = new Set<string>()
  const draw = (team: Team, count: number): Array<string | undefined> => Array.from({ length: count }, () => {
    const teamChars = byTeam[team] || []
    const eligible = teamChars.filter((c) => !usedChars.has(c))
    const from = eligible.length > 0 ? eligible : teamChars
    const picked = from[Math.floor(rng() * from.length)]
    if (picked) usedChars.add(picked)
    return picked
  })
  const demons = draw('demon', dist.demon)
  const minions = draw('minion', dist.minion)
  let outsiders = dist.outsider
  for (const id of [...demons, ...minions]) {
    const options = (id ? SETUP_OUTSIDER_SHIFTS[id] ?? [] : []).filter((shift) => outsiders + shift >= 0 && outsiders + shift <= dist.outsider + dist.townsfolk)
    if (options.length) outsiders += options[Math.floor(rng() * options.length)]
  }
  // Never deal the same Outsider twice to make up a shift the script cannot supply.
  if (byTeam.outsider.length) outsiders = Math.min(outsiders, Math.max(dist.outsider, byTeam.outsider.length))
  const townsfolk = opts.playerCount - dist.demon - dist.minion - outsiders
  const dealt = shuffleArray([...draw('townsfolk', townsfolk), ...draw('outsider', outsiders), ...minions, ...demons], rng)
  const assignments: Record<number, string> = {}
  dealt.forEach((cid, i) => { if (cid) assignments[i + 1] = cid })

  const seats = Object.keys(assignments).map(Number)
  const demonSeat = seats.find((seat) => opts.getTeam(assignments[seat]) === 'demon')
  if (demonSeat !== undefined) {
    const next = (seat: number, step: number) => ((seat - 1 + step + opts.playerCount) % opts.playerCount) + 1
    for (const seat of seats.filter((s) => NEIGHBORS_DEMON.includes(assignments[s]))) {
      const beside = [next(demonSeat, -1), next(demonSeat, 1)]
      if (beside.includes(seat)) continue
      const target = beside.find((s) => !NEIGHBORS_DEMON.includes(assignments[s])) ?? beside[0]
      const moved = assignments[target]
      assignments[target] = assignments[seat]
      if (moved) assignments[seat] = moved
      else delete assignments[seat]
    }
  }
  return assignments
}

/** Seats for a brand-new game: names, dealt characters, perceived characters, team tags and notes. */
export function buildSeatsFromConfig(config: NewGameConfig, getTeam: TeamLookup): StorytellerSeat[] {
  const totalCount = config.playerCount + config.travelerCount
  const seats = createSeats(totalCount)
  for (let i = config.playerCount; i < totalCount; i++) seats[i].isTraveler = true
  for (const seat of seats) {
    const sNum = seat.seat
    seat.name = config.seatNames[sNum] || (seat.isTraveler ? `Traveler ${sNum}` : `Player ${sNum}`)
    if (!seat.isTraveler) {
      const cid = config.assignments[sNum]
      seat.characterId = cid || null
      seat.userCharacterId = config.userAssignments[sNum] || null
      const tag = dealtTeamTag(getTeam, cid || null)
      if (tag) seat.teamTag = tag
    } else {
      const tcid = config.travelerAssignments?.[sNum]
      if (tcid) seat.characterId = tcid
    }
    seat.note = config.seatNotes[sNum] || ''
  }
  return seats
}

export type SetupCharacterChange = { seat: number; from: string | null; to: string | null }

/**
 * Apply an edited setup to the current day's seats: seats beyond the new
 * count are dropped, kept seats get the new names/characters/notes (keeping
 * their alignment), and new seats are appended. Returns the character swaps
 * on regular seats, in seat order, so the caller can log them.
 */
export function applySetupToSeats(
  seats: StorytellerSeat[],
  config: NewGameConfig,
  getTeam: TeamLookup,
): { seats: StorytellerSeat[]; characterChanges: SetupCharacterChange[] } {
  const totalCount = config.playerCount + config.travelerCount
  const characterChanges: SetupCharacterChange[] = []
  const updatedExisting = seats
    .filter((seat) => seat.seat <= totalCount)
    .map((seat) => {
      const sNum = seat.seat
      const newSeat = { ...seat }
      const oldCharId = seat.characterId
      newSeat.name = config.seatNames[sNum] || seat.name
      if (!seat.isTraveler) {
        const cid = config.assignments[sNum]
        newSeat.characterId = cid || null
        newSeat.userCharacterId = config.userAssignments[sNum] || null
        newSeat.teamTag = seatAlignmentWith(getTeam, seat) ?? defaultAlignmentWith(getTeam, cid || null)
        if (cid !== oldCharId && (cid || oldCharId)) characterChanges.push({ seat: sNum, from: oldCharId, to: cid || null })
      }
      newSeat.note = config.seatNotes[sNum] || ''
      return newSeat
    })
  const newSeats: StorytellerSeat[] = []
  for (let sNum = seats.length + 1; sNum <= totalCount; sNum++) {
    const isTraveler = sNum > config.playerCount
    const defaultName = config.seatNames[sNum] || (isTraveler ? `Traveler ${sNum}` : `Player ${sNum}`)
    const cid = isTraveler ? null : (config.assignments[sNum] || null)
    const teamTag = dealtTeamTag(getTeam, cid)
    newSeats.push({ seat: sNum, name: defaultName, alive: true, isTraveler, isExecuted: false, hasNoVote: false, customTags: [], stTags: [], characterId: cid, userCharacterId: config.userAssignments[sNum] || null, teamTag, note: config.seatNotes[sNum] || '' })
  }
  return { seats: [...updatedExisting, ...newSeats], characterChanges }
}

/** A fresh setup draft for the next game, carrying over player/traveller counts and custom seat names. */
export function newGameConfigFromDay(opts: {
  currentDay: Pick<DayState, 'seats'> | undefined
  scriptSlug: string
  fabledIds: string[]
  gameId: string
}): NewGameConfig {
  const inheritedNames: Record<number, string> = {}
  if (opts.currentDay?.seats) {
    for (const s of opts.currentDay.seats) {
      if (s.name && !/^Player \d+$/.test(s.name) && !/^Traveler \d+$/.test(s.name)) {
        inheritedNames[s.seat] = s.name
      }
    }
  }
  const currentPlayerCount = opts.currentDay?.seats ? opts.currentDay.seats.filter((s) => !s.isTraveler).length : 9
  const currentTravelerCount = opts.currentDay?.seats ? opts.currentDay.seats.filter((s) => s.isTraveler).length : 0
  return { playerCount: currentPlayerCount || 9, travelerCount: currentTravelerCount, scriptSlug: opts.scriptSlug, seatNames: inheritedNames, assignments: {}, userAssignments: {}, travelerAssignments: {}, seatNotes: {}, specialNote: '', demonBluffs: [], charPool: [], fabledIds: [...opts.fabledIds], gameId: opts.gameId }
}
