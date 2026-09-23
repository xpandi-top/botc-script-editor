/**
 * Constructors and small helpers for game state (seats, drafts, days).
 * Pure apart from the random day id; shared by the web UI and the planned
 * game engine / API.
 */
import type { DayState, SkillDraft, StorytellerSeat, TimerDefaults, VoteDraft } from '../types/game'

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

export function createDayState(day: number, seats: StorytellerSeat[], defaults: TimerDefaults): DayState {
  return {
    id: `day-${day}-${Math.random().toString(36).slice(2, 8)}`,
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
