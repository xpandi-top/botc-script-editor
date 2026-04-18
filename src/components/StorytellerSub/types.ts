import type { Language } from '../../types'

// ── Types ──────────────────────────────────────────────────────

export type Phase = 'night' | 'private' | 'public' | 'nomination'
export type PublicMode = 'free' | 'roundRobin'
export type NominationStep =
  | 'waitingForNomination'
  | 'nominationDecision'
  | 'actorSpeech'
  | 'readyForTargetSpeech'
  | 'targetSpeech'
  | 'readyToVote'
  | 'voting'
  | 'votingDone'

export type PickerMode =
  | 'none'
  | 'speaker'
  | 'nominator'
  | 'nominee'
  | 'skillActor'
  | 'skillTarget'

export type CharacterAssignment = { 
  seat: number; 
  characterId: string; 
  userCharacterId?: string | null; 
  team: 'evil' | 'good' | null;
  note?: string;
}

export type NewGameConfig = {
  playerCount: number
  travelerCount: number
  scriptSlug: string
  allowDuplicateChars: boolean
  allowEmptyChars: boolean
  allowSameNames: boolean
  seatNames: Record<number, string>
  assignments: Record<number, string> // seat -> characterId
  userAssignments: Record<number, string | null> // seat -> user-perceived char
  seatNotes: Record<number, string>
  specialNote: string
  demonBluffs: string[] // up to 3 character IDs shown to the Demon
  editMode?: boolean // true when editing existing game setup
}

export type EndGameResult = {
  winner: 'evil' | 'good' | 'storyteller' | null
  playerTeams: Record<number, 'evil' | 'good' | null>
  mvp: number | null
  balanced: number | null
  funEvil: number | null
  funGood: number | null
  replay: number | null
  otherNote: string
}

export type LogFilterState = {
  types: Set<string>
  dayFilter: number | 'all'
  sortAsc: boolean
  visibility: 'all' | 'public' | 'st-only'
}

export type AggregatedLogEntry = {
  id: string
  day: number
  phase: string
  timestamp: number
  type: 'vote' | 'skill' | 'event'
  visibility: 'public' | 'st-only'
  detail: string
}

export type ExportConfig = {
  includeSeats: boolean
  includeVotes: boolean
  includeSkills: boolean
  includeEvents: boolean
  includeStNotes: boolean
  dayFilter: 'all' | number[]
}

export type ConsoleSection = 'game' | 'day' | 'player' | 'settings' | 'tags' | 'records'

export type ScriptOption = { slug: string; title: string; characters: string[] }

export type StorytellerSeat = {
  seat: number
  name: string
  alive: boolean
  isTraveler: boolean
  isExecuted: boolean
  hasNoVote: boolean
  customTags: string[]
  stTags: string[]
  characterId: string | null
  userCharacterId: string | null
  teamTag: 'evil' | 'good' | null
  note: string
}

export type VoteDraft = {
  actor: number | null
  target: number | null
  voters: number[]
  noVoters: number[]
  note: string
  manualPassed: boolean | null
  nominationResult: 'succeed' | 'fail'
  /** Exile mode — threshold is ≥50% of ALL seats (incl. travelers + dead) */
  isExile: boolean
  /** Manual vote count override — null means use voters.length */
  voteCountOverride: number | null
}

export type VoteRecord = {
  id: string
  actor: number
  target: number
  voters: number[]
  voteCount: number
  requiredVotes: number
  passed: boolean
  note: string
  overridden: boolean
  failed?: boolean
}

export type SkillDraft = {
  actor: number | null
  roleId: string
  targets: number[]
  targetNotes: Record<number, string>
  statement: string
  note: string
  result: 'success' | 'failure' | null
}

export type SkillRecord = SkillDraft & { id: string; activatedDuringPhase: string }

export type VotingState = {
  votingOrder: number[]
  votingIndex: number
  perPlayerSeconds: number
  votes: Record<number, boolean>
}

export type SkillOverlayState = {
  pausedPhase: Phase
  wasTimerRunning: boolean
  draft: SkillDraft
  phaseContext: string
}

export type EventLogEntry = {
  id: string
  timestamp: number
  phase: string
  kind: 'vote' | 'skill' | 'stateChange' | 'tagChange' | 'phaseTransition'
  detail: string
}

export type AudioTrack = { name: string; src: string }

export type TimerDefaults = {
  privateSeconds: number
  publicFreeSeconds: number
  publicRoundRobinSeconds: number
  nominationDelayMinutes: number
  nominationWaitSeconds: number
  nominationActorSeconds: number
  nominationTargetSeconds: number
  nominationVoteSeconds: number
  alarmSound: string
}

export type DayState = {
  id: string
  day: number
  phase: Phase
  publicMode: PublicMode
  nominationStep: NominationStep
  privateSeconds: number
  publicFreeSeconds: number
  publicRoundRobinSeconds: number
  publicElapsedSeconds: number
  nominationWaitSeconds: number
  nominationActorSeconds: number
  nominationTargetSeconds: number
  currentSpeakerSeat: number | null
  roundRobinSpokenSeats: number[]
  seats: StorytellerSeat[]
  voteDraft: VoteDraft
  votingState: VotingState | null
  voteHistory: VoteRecord[]
  skillHistory: SkillRecord[]
  eventLog: EventLogEntry[]
  nightVisitedSeats: number[]
  gameEnded: boolean
  demonBluffs: string[]
}

export type GameRecord = {
  id: string
  endedAt: number
  recordName?: string
  scriptTitle?: string
  scriptSlug?: string
  winner?: 'evil' | 'good' | 'storyteller' | null
  playerSummaries?: Array<{ seat: number; name: string; team: 'evil' | 'good' | null }>
  mvp?: number | null
  balanced?: number | null
  funEvil?: number | null
  funGood?: number | null
  replay?: number | null
  otherNote?: string
  days: Array<{ day: number; votes: number; skills: number }>
  savedDays?: DayState[]
  timerDefaults?: TimerDefaults
  customTagPool?: string[]
  playerNamePool?: string[]
  // Game setup data
  setup?: {
    playerCount: number
    travelerCount: number
    seatNames: Record<number, string>
    assignments: Record<number, string>
    userAssignments: Record<number, string | null>
    seatNotes: Record<number, string>
    specialNote: string
    demonBluffs: string[]
  }
}

export type PersistedState = {
  selectedDayId: string
  timerDefaults: TimerDefaults
  days: DayState[]
  customTagPool: string[]
  gameRecords: GameRecord[]
  playerNamePool: string[]
  activeScriptSlug?: string
  activeScriptTitle?: string
  endGameResult?: EndGameResult | null
}

export type DialogState =
  | { kind: 'voteResult'; nextValue: boolean | null; systemValue: boolean }
  | { kind: 'restartGame' }
  | { kind: 'endGame' }
  | null

export type StorytellerHelperProps = {
  activeScriptSlug?: string
  activeScriptTitle?: string
  language: Language
  onSelectScript?: (slug: string) => void
  scriptOptions: ScriptOption[]
}

