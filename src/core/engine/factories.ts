/**
 * Constructors and small helpers for game state (seats, drafts, days).
 * Pure apart from the random day id; shared by the web UI and the planned
 * game engine / API.
 */
import type { DayState, SkillDraft, StorytellerSeat, TimerDefaults, VoteDraft } from '../types/game'
import type { TeamLookup } from './alignment'
import { createIdentityHistory } from './identity'

export function createSeats(count: number): StorytellerSeat[] {
  return Array.from({ length: count }, (_, i) => ({
    seat: i + 1,
    name: `Player ${i + 1}`,
    alive: true,
    isTraveler: false,
    isExecuted: false,
    hasNoVote: false,
    customTags: [],
    stTags: [],
    characterId: null,
    userCharacterId: null,
    teamTag: null,
    note: '',
  }))
}

export function createDefaultVoteDraft(): VoteDraft {
  return { actor: null, target: null, voters: [], noVoters: [], note: '', manualPassed: null, nominationResult: 'succeed', isExile: false, voteCountOverride: null }
}

export function createDefaultSkillDraft(): SkillDraft {
  return { actor: null, roleId: '', targets: [], targetNotes: {}, statement: '', note: '', result: null }
}

export function cloneSeats(seats: StorytellerSeat[]) {
  return seats.map((s) => ({ ...s, customTags: [...s.customTags] }))
}

/** A fresh day. With `getTeam`, the day also starts an identity history (who each seat is right now). */
export function createDayState(day: number, seats: StorytellerSeat[], defaults: TimerDefaults, id = `day-${day}-${Math.random().toString(36).slice(2, 8)}`, getTeam?: TeamLookup): DayState {
  return {
    id,
    day,
    phase: 'night',
    publicMode: 'free',
    nominationStep: 'waitingForNomination',
    privateSeconds: defaults.privateSeconds,
    publicFreeSeconds: defaults.publicFreeSeconds,
    publicRoundRobinSeconds: defaults.publicRoundRobinSeconds,
    publicElapsedSeconds: 0,
    nominationWaitSeconds: defaults.nominationWaitSeconds,
    nominationActorSeconds: defaults.nominationActorSeconds,
    nominationTargetSeconds: defaults.nominationTargetSeconds,
    currentSpeakerSeat: 1,
    roundRobinSpokenSeats: [],
    seats: cloneSeats(seats),
    voteDraft: createDefaultVoteDraft(),
    votingState: null,
    voteHistory: [],
    skillHistory: [],
    eventLog: [],
    nightVisitedSeats: [],
    ...(getTeam ? { identityHistory: createIdentityHistory(seats, getTeam) } : {}),
    gameEnded: false,
    demonBluffs: [],
  }
}

export function unique(values: number[]) {
  return Array.from(new Set(values)).sort((a, b) => a - b)
}

export function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export function getNextRoundRobinSeat(seats: StorytellerSeat[], fromSeat: number | null, spokenSeats: number[]) {
  const remaining = seats.filter((s) => !spokenSeats.includes(s.seat)).map((s) => s.seat)
  if (!remaining.length) return null
  if (fromSeat === null) return remaining[0] ?? null
  const clockwise = [...remaining.filter((s) => s > fromSeat), ...remaining.filter((s) => s < fromSeat)]
  return clockwise[0] ?? null
}

export function buildVotingOrder(seats: StorytellerSeat[], targetSeat: number): number[] {
  const eligible = seats.filter((s) => !s.hasNoVote).map((s) => s.seat)
  const idx = eligible.indexOf(targetSeat)
  if (idx === -1) return eligible
  return [...eligible.slice(idx + 1), ...eligible.slice(0, idx + 1)]
}

/** Fisher–Yates shuffle into a new array. `rng` defaults to Math.random; pass a seeded source for replays. */
export function shuffleArray<T>(arr: T[], rng: () => number = Math.random): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
