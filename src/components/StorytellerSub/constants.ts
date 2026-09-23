import type { AudioTrack, TimerDefaults } from './types'

// Seat/draft/day constructors live in src/core/engine/factories.ts;
// re-exported for existing imports.
export {
  buildVotingOrder,
  cloneSeats,
  createDayState,
  createDefaultSkillDraft,
  createDefaultVoteDraft,
  createSeats,
  getNextRoundRobinSeat,
  shuffleArray,
  unique,
  uniqueStrings,
} from '../../core/engine/factories'
export { CHARACTER_DISTRIBUTION } from '../../core/engine/setup'

// ── Constants & Factories ──────────────────────────────────────

export const STORAGE_KEY = 'botc-storyteller-companion-v5'
export const USER_SCRIPTS_KEY = 'BOTC_USER_SCRIPTS'
export const SCRIPT_META_KEY = 'BOTC_SCRIPT_META'
export const DEFAULT_ST_NAME_KEY = 'botc-default-st-name'
/** Dispatched on window when analytics tab mutates gameRecords in localStorage */
export const RECORDS_CHANGED_EVENT = 'botc-records-changed'
export const DEFAULT_PLAYER_COUNT = 10
export const BASE_URL = import.meta.env.BASE_URL ?? '/'

export const FAKE_NAMES = [
  'Alice',
  'Bob',
  'Charlie',
  'Diana',
  'Eve',
  'Frank',
  'Grace',
  'Heidi',
  'Ivan',
  'Judy',
]

export const FAKE_NAMES_ZH = [
  '张三',
  '李四',
  '王五',
  '赵六',
  '钱七',
  '孙八',
  '周九',
  '吴十',
  '郑十一',
  '冯十二',
]

export const INITIAL_AUDIO_TRACKS: AudioTrack[] = [
  { name: 'Below the Granite Arch', src: `${BASE_URL}audio/below_the_granite_arch.mp3` },
  { name: 'Measured Pulse of the Tower', src: `${BASE_URL}audio/measured_pulse_of_the_tower.mp3` },
  { name: 'Second Hand Stutter', src: `${BASE_URL}audio/second_hand_stutter.mp3` },
  { name: 'The Unwound Spring', src: `${BASE_URL}audio/the_unwound_spring.mp3` },
]

export const DEFAULT_ALARM_SOUNDS: AudioTrack[] = [
  { name: 'Alarm Clock', src: `${BASE_URL}audio/alarm/Alarm Clock Sound 6402.mp3` },
  { name: 'Clock Tower', src: `${BASE_URL}audio/alarm/Clock Tower Alarm Sound.mp3` },
  { name: 'Vintage Clock', src: `${BASE_URL}audio/alarm/Vintage Clock Sound Effect.mp3` },
  { name: 'Old Spring', src: `${BASE_URL}audio/alarm/Old Spring Alarm Clock Sound Effect.mp3` },
]

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
    alarmSound: `${BASE_URL}audio/alarm/Vintage Clock Sound Effect.mp3`,
    defaultBgmSrc: `${BASE_URL}audio/below_the_granite_arch.mp3`,
    phaseSwitchSoundEnabled: false,
  }
}

export function makeEventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}
