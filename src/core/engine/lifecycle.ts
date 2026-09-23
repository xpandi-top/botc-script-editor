/**
 * Day/phase lifecycle as pure transitions: phase order, new days, deleting
 * days, round-robin speakers, seat add/remove, end-of-game results and
 * restoring a saved record. UI effects (timers, audio, dialogs) stay with the
 * caller (useGameLifecycle today, the API engine later).
 */
import type { DayState, EndGameResult, GameRecord, Phase, StorytellerSeat, TimerDefaults } from '../types/game'
import { createDayState, createDefaultVoteDraft, createSeats, getNextRoundRobinSeat } from './factories'

export const PHASE_ORDER: Phase[] = ['night', 'private', 'public', 'nomination']

/** Phase after `phase` within the same day, or null after the last one. */
export function nextPhase(phase: Phase): Phase | null {
  const idx = PHASE_ORDER.indexOf(phase)
  return idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null
}

/** Phase before `phase` within the same day, or null before the first one. */
export function previousPhase(phase: Phase): Phase | null {
  const idx = PHASE_ORDER.indexOf(phase)
  return idx > 0 ? PHASE_ORDER[idx - 1] : null
}

/** Enter `phase`: night clears visited seats; nomination resets the nomination state. */
export function applyPhase(day: DayState, phase: Phase, timers: Pick<TimerDefaults, 'nominationWaitSeconds'>): DayState {
  let next = { ...day, phase }
  if (phase === 'night') next = { ...next, nightVisitedSeats: [] }
  if (phase === 'nomination') next = { ...next, nominationStep: 'waitingForNomination', nominationWaitSeconds: timers.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null }
  return next
}

/** The day after `current`, numbered after the existing `dayCount` days, carrying seats and demon bluffs forward. */
export function createNextDay(dayCount: number, current: DayState, timers: TimerDefaults, id?: string): DayState {
  const next = createDayState(dayCount + 1, current.seats, timers, id)
  // Demon bluffs are set once during setup and stay valid for the whole game.
  next.demonBluffs = current.demonBluffs ?? []
  return next
}

/** Days without `dayId`, renumbered from 1; null if it is the last day or not found. */
export function removeDay(days: DayState[], dayId: string): DayState[] | null {
  if (days.length <= 1) return null
  if (!days.some((d) => d.id === dayId)) return null
  return days.filter((d) => d.id !== dayId).map((d, i) => ({ ...d, day: i + 1 }))
}

/** Round-robin speaking: mark the current speaker done and pick the next clockwise seat (null when everyone has spoken). */
export function nextSpeakerPatch(
  day: Pick<DayState, 'currentSpeakerSeat' | 'roundRobinSpokenSeats' | 'seats'>,
  timers: Pick<TimerDefaults, 'publicRoundRobinSeconds'>,
): Pick<DayState, 'roundRobinSpokenSeats' | 'currentSpeakerSeat' | 'publicRoundRobinSeconds'> {
  const cur = day.currentSpeakerSeat
  const spoken = cur ? [...new Set([...day.roundRobinSpokenSeats, cur])] : day.roundRobinSpokenSeats
  const next = getNextRoundRobinSeat(day.seats, cur, spoken)
  return { roundRobinSpokenSeats: spoken, currentSpeakerSeat: next, publicRoundRobinSeconds: next ? timers.publicRoundRobinSeconds : 0 }
}

// ── Seats ────────────────────────────────────────────────────────────────────

function blankSeat(seat: number, name: string, isTraveler: boolean): StorytellerSeat {
  return { seat, name, alive: true, isTraveler, isExecuted: false, hasNoVote: false, customTags: [], stTags: [], characterId: null, userCharacterId: null, teamTag: null, note: '' }
}

/** Add a regular seat after the last regular seat; travellers are renumbered after it. */
export function addPlayerSeat(day: DayState): DayState {
  const regular = day.seats.filter((s) => !s.isTraveler)
  const travelers = day.seats.filter((s) => s.isTraveler)
  const nextNum = regular.length + 1
  const reSeated = [...regular, blankSeat(nextNum, `Player ${nextNum}`, false)].map((s, i) => ({ ...s, seat: i + 1 }))
  return { ...day, seats: [...reSeated, ...travelers.map((s, i) => ({ ...s, seat: reSeated.length + i + 1 }))] }
}

/** Remove the last regular seat, keeping at least `minPlayers` (5, the rules minimum). */
export function removeLastPlayerSeat(day: DayState, minPlayers = 5): DayState {
  const regular = day.seats.filter((s) => !s.isTraveler)
  if (regular.length <= minPlayers) return day
  const travelers = day.seats.filter((s) => s.isTraveler)
  const trimmed = regular.slice(0, regular.length - 1)
  return { ...day, seats: [...trimmed, ...travelers.map((s, i) => ({ ...s, seat: trimmed.length + i + 1 }))] }
}

export function addTravelerSeat(day: DayState): DayState {
  const nextSeatNum = day.seats.length + 1
  return { ...day, seats: [...day.seats, blankSeat(nextSeatNum, `Traveler ${nextSeatNum}`, true)] }
}

export function removeLastTraveler(day: DayState): DayState {
  const travelers = day.seats.filter((s) => s.isTraveler)
  if (travelers.length === 0) return day
  const regular = day.seats.filter((s) => !s.isTraveler)
  const trimmed = travelers.slice(0, travelers.length - 1)
  return { ...day, seats: [...regular, ...trimmed.map((s, i) => ({ ...s, seat: regular.length + i + 1 }))] }
}

// ── End of game ──────────────────────────────────────────────────────────────

/** Empty end-of-game survey with each seat's team (untagged seats default to good). */
export function initialEndGameResult(seats: Pick<StorytellerSeat, 'seat' | 'teamTag'>[]): EndGameResult {
  const teams: Record<number, 'evil' | 'good' | null> = {}
  for (const s of seats) teams[s.seat] = s.teamTag ?? 'good'
  return { winner: null, playerTeams: teams, mvp: null, balanced: null, funEvil: null, funGood: null, replay: null, otherNote: '' }
}

/** Fill in teams for seats that have none yet (e.g. seats added since the survey was opened). */
export function fillEndGameTeams(result: EndGameResult, seats: Pick<StorytellerSeat, 'seat' | 'teamTag'>[]): EndGameResult {
  const updated = { ...result.playerTeams }
  for (const s of seats) {
    if (updated[s.seat] === undefined || updated[s.seat] === null) {
      updated[s.seat] = s.teamTag ?? 'good'
    }
  }
  return { ...result, playerTeams: updated }
}

// ── Restoring saved records ──────────────────────────────────────────────────

/**
 * Days to load for a saved record: the full saved days when present,
 * otherwise a best-effort rebuild from the setup and player summaries.
 */
export function restoreDaysFromRecord(record: GameRecord, timers: TimerDefaults): DayState[] {
  if (record.savedDays && record.savedDays.length > 0) return record.savedDays

  const setup = record.setup
  const summaries = record.playerSummaries ?? []
  const playerCount = setup?.playerCount ?? (summaries.filter((p) => p.team !== null).length || summaries.length || 5)
  const travelerCount = setup?.travelerCount ?? 0
  const totalSeats = playerCount + travelerCount

  const baseSeats: StorytellerSeat[] = createSeats(totalSeats).map((s) => {
    const seatNum = s.seat
    const summary = summaries.find((p) => p.seat === seatNum)
    const isTravel = travelerCount > 0 && seatNum > playerCount
    return {
      ...s,
      name: setup?.seatNames?.[seatNum] ?? summary?.name ?? s.name,
      characterId: setup?.assignments?.[seatNum] || null,
      userCharacterId: setup?.userAssignments?.[seatNum] ?? null,
      teamTag: summary?.team ?? null,
      note: setup?.seatNotes?.[seatNum] ?? '',
      isTraveler: isTravel,
    }
  })

  // One day per entry in record.days (or 1 if none)
  const dayCount = record.days?.length || 1
  const restoredDays = Array.from({ length: dayCount }, (_, i) => createDayState(i + 1, baseSeats, timers))
  // Mark the last day ended if the game has a winner
  if (record.winner) {
    restoredDays[restoredDays.length - 1] = { ...restoredDays[restoredDays.length - 1], gameEnded: true }
  }
  if (setup?.demonBluffs?.length) {
    restoredDays[0] = { ...restoredDays[0], demonBluffs: setup.demonBluffs }
  }
  return restoredDays
}

/** End-of-game survey restored from a record; teams come from the summaries, else the restored seats. */
export function endGameResultFromRecord(record: GameRecord, firstDay: Pick<DayState, 'seats'>): EndGameResult {
  const teams: Record<number, 'evil' | 'good' | null> = {}
  for (const s of firstDay.seats) {
    const team = record.playerSummaries?.find((p) => p.seat === s.seat)?.team
    teams[s.seat] = team ?? (s.teamTag as 'evil' | 'good' | null) ?? null
  }
  return { winner: record.winner ?? null, playerTeams: teams, mvp: record.mvp ?? null, balanced: record.balanced ?? null, funEvil: record.funEvil ?? null, funGood: record.funGood ?? null, replay: record.replay ?? null, otherNote: record.otherNote ?? '' }
}
