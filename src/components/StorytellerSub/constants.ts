import type { AudioTrack, StorytellerSeat, VoteDraft, SkillDraft, TimerDefaults, DayState } from './types'

// ── Constants & Factories ──────────────────────────────────────

export const STORAGE_KEY = 'botc-storyteller-companion-v5'
export const DEFAULT_PLAYER_COUNT = 10
export const BASE_URL = import.meta.env.BASE_URL ?? '/'

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

export const INITIAL_AUDIO_TRACKS: AudioTrack[] = [
  { name: 'Blood on the Clocktower', src: `${BASE_URL}audio/botc.mp3` },
  { name: 'Below the Granite Arch', src: `${BASE_URL}audio/below_the_granite_arch.mp3` },
  { name: 'Measured Pulse of the Tower', src: `${BASE_URL}audio/measured_pulse_of_the_tower.mp3` },
  { name: 'Second Hand Stutter', src: `${BASE_URL}audio/second_hand_stutter.mp3` },
  { name: 'The Unwound Spring', src: `${BASE_URL}audio/the_unwound_spring.mp3` },
]

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

export function createTimerDefaults(): TimerDefaults {
  return {
    privateSeconds: 180,
    publicFreeSeconds: 300,
    publicRoundRobinSeconds: 30,
    nominationDelayMinutes: 2,
    nominationWaitSeconds: 10,
    nominationActorSeconds: 30,
    nominationTargetSeconds: 30,
    nominationVoteSeconds: 5,
  }
}

export function cloneSeats(seats: StorytellerSeat[]) {
  return seats.map((s) => ({ ...s, customTags: [...s.customTags] }))
}

export function createDayState(day: number, seats: StorytellerSeat[], defaults: TimerDefaults): DayState {
  return {
    id: `day-${day}-${Math.random().toString(36).slice(2, 8)}`,
    day,
    phase: 'private',
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

export function makeEventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

