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
 * Deal the official distribution for `playerCount` at random from the
 * script's characters (restricted to `charPool` when it is non-empty).
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
  const teamPool: Team[] = []
  for (const { team, count } of [{ team: 'townsfolk' as Team, count: dist.townsfolk }, { team: 'outsider' as Team, count: dist.outsider }, { team: 'minion' as Team, count: dist.minion }, { team: 'demon' as Team, count: dist.demon }]) { for (let i = 0; i < count; i++) teamPool.push(team) }
  const shuffledTeams = shuffleArray(teamPool, rng)
  const usedChars = new Set<string>()
  const assignments: Record<number, string> = {}
  for (let i = 0; i < opts.playerCount; i++) {
    const teamChars = byTeam[shuffledTeams[i]] || []
    const eligible = teamChars.filter((c) => !usedChars.has(c))
    const picked = (eligible.length > 0 ? eligible : teamChars)[Math.floor(rng() * (eligible.length > 0 ? eligible : teamChars).length)]
    if (picked) { assignments[i + 1] = picked; usedChars.add(picked) }
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
