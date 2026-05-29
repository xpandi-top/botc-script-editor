import type { DayState, EventLogEntry, NominationStep, PersistedState, Phase, SkillRecord, VoteRecord, VotingState } from './types'
import { STORAGE_KEY, DEFAULT_PLAYER_COUNT, createTimerDefaults, createDayState, createSeats, createDefaultVoteDraft, createDefaultSkillDraft, BASE_URL } from './constants'
import { storageSync } from '../../lib/storage'

// ── Load / Migrate ─────────────────────────────────────────────

const LEGACY_STORAGE_KEYS = ['botc-storyteller-companion-v4', 'botc-storyteller-companion-v3'] as const

function debugStorage(message: string, ...args: unknown[]) {
  if (import.meta.env.DEV) console.debug(message, ...args)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : []
}

function normalizePhase(value: unknown): Phase {
  if (value === 'skill') return 'public'
  if (value === 'night' || value === 'private' || value === 'public' || value === 'nomination') return value
  return 'private'
}

function normalizeNominationStep(value: unknown): NominationStep {
  if (
    value === 'waitingForNomination' ||
    value === 'nominationDecision' ||
    value === 'actorSpeech' ||
    value === 'readyForTargetSpeech' ||
    value === 'targetSpeech' ||
    value === 'readyToVote' ||
    value === 'voting' ||
    value === 'votingDone'
  ) return value
  return 'waitingForNomination'
}

function normalizeVotingState(value: unknown): VotingState | null {
  if (!isRecord(value)) return null
  return {
    votingOrder: asNumberArray(value.votingOrder),
    votingIndex: typeof value.votingIndex === 'number' ? value.votingIndex : 0,
    perPlayerSeconds: typeof value.perPlayerSeconds === 'number' ? value.perPlayerSeconds : 0,
    votes: isRecord(value.votes)
      ? Object.fromEntries(Object.entries(value.votes).filter(([, vote]) => typeof vote === 'boolean')) as Record<number, boolean>
      : {},
  }
}

function normalizeTargetNotes(value: unknown): Record<number, string> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(([, note]) => typeof note === 'string'),
  ) as Record<number, string>
}

function createFallbackState(): PersistedState {
  const defaults = createTimerDefaults()
  const firstDay = createDayState(1, createSeats(DEFAULT_PLAYER_COUNT), defaults)
  return {
    selectedDayId: firstDay.id,
    timerDefaults: defaults,
    days: [firstDay],
    customTagPool: ['流放'],
    gameRecords: [],
    playerNamePool: [],
  }
}

function normalizePersistedState(value: unknown, fallback: PersistedState): PersistedState | null {
  if (!isRecord(value) || !Array.isArray(value.days) || value.days.length === 0) return null

  const defaults = createTimerDefaults()
  const timerDefaults = isRecord(value.timerDefaults) ? value.timerDefaults : {}
  const days: DayState[] = value.days.map((dayValue, i) => {
    const d = isRecord(dayValue) ? dayValue : {}
    const rawSeats = Array.isArray(d.seats) ? d.seats : createSeats(DEFAULT_PLAYER_COUNT)
    return {
      id: typeof d.id === 'string' ? d.id : `day-${i + 1}`,
      day: typeof d.day === 'number' ? d.day : i + 1,
      phase: normalizePhase(d.phase),
      publicMode: d.publicMode === 'roundRobin' ? 'roundRobin' : 'free',
      nominationStep: normalizeNominationStep(d.nominationStep),
      privateSeconds: typeof d.privateSeconds === 'number' ? d.privateSeconds : defaults.privateSeconds,
      publicFreeSeconds: typeof d.publicFreeSeconds === 'number' ? d.publicFreeSeconds : defaults.publicFreeSeconds,
      publicRoundRobinSeconds: typeof d.publicRoundRobinSeconds === 'number' ? d.publicRoundRobinSeconds : defaults.publicRoundRobinSeconds,
      publicElapsedSeconds: typeof d.publicElapsedSeconds === 'number' ? d.publicElapsedSeconds : 0,
      nominationWaitSeconds: typeof d.nominationWaitSeconds === 'number' ? d.nominationWaitSeconds : defaults.nominationWaitSeconds,
      nominationActorSeconds: typeof d.nominationActorSeconds === 'number' ? d.nominationActorSeconds : defaults.nominationActorSeconds,
      nominationTargetSeconds: typeof d.nominationTargetSeconds === 'number' ? d.nominationTargetSeconds : defaults.nominationTargetSeconds,
      currentSpeakerSeat: typeof d.currentSpeakerSeat === 'number' ? d.currentSpeakerSeat : 1,
      roundRobinSpokenSeats: asNumberArray(d.roundRobinSpokenSeats),
      seats: rawSeats.map((seatValue, si) => {
        const s = isRecord(seatValue) ? seatValue : {}
        return {
          seat: typeof s.seat === 'number' ? s.seat : si + 1,
          name: typeof s.name === 'string' ? s.name : `Player ${si + 1}`,
          alive: typeof s.alive === 'boolean' ? s.alive : true,
          isTraveler: typeof s.isTraveler === 'boolean' ? s.isTraveler : false,
          isExecuted: typeof s.isExecuted === 'boolean' ? s.isExecuted : false,
          hasNoVote: typeof s.hasNoVote === 'boolean' ? s.hasNoVote : false,
          customTags: asStringArray(s.customTags),
          characterId: typeof s.characterId === 'string' ? s.characterId : null,
          userCharacterId: typeof s.userCharacterId === 'string' ? s.userCharacterId : null,
          teamTag: s.teamTag === 'evil' || s.teamTag === 'good' ? s.teamTag : null,
          stTags: asStringArray(s.stTags),
          note: typeof s.note === 'string' ? s.note : '',
        }
      }),
      voteDraft: { ...createDefaultVoteDraft(), ...(isRecord(d.voteDraft) ? d.voteDraft : {}) },
      votingState: normalizeVotingState(d.votingState),
      voteHistory: (Array.isArray(d.voteHistory) ? d.voteHistory : []) as VoteRecord[],
      skillHistory: (Array.isArray(d.skillHistory) ? d.skillHistory : []).map((skillValue) => {
        const s = isRecord(skillValue) ? skillValue : {}
        return {
          ...createDefaultSkillDraft(),
          ...s,
          targetNotes: normalizeTargetNotes(s.targetNotes),
          activatedDuringPhase: typeof s.activatedDuringPhase === 'string' ? s.activatedDuringPhase : '',
        }
      }) as SkillRecord[],
      eventLog: (Array.isArray(d.eventLog) ? d.eventLog : []) as EventLogEntry[],
      nightVisitedSeats: asNumberArray(d.nightVisitedSeats),
      gameEnded: typeof d.gameEnded === 'boolean' ? d.gameEnded : false,
      demonBluffs: asStringArray(d.demonBluffs),
    }
  })

  return {
    selectedDayId: typeof value.selectedDayId === 'string' ? value.selectedDayId : days[0]?.id ?? fallback.selectedDayId,
    timerDefaults: {
      ...defaults,
      ...timerDefaults,
      nominationDelayMinutes: typeof timerDefaults.nominationDelayMinutes === 'number' ? timerDefaults.nominationDelayMinutes : 2,
      nominationWaitSeconds: typeof timerDefaults.nominationWaitSeconds === 'number' ? timerDefaults.nominationWaitSeconds : 10,
      nominationVoteSeconds: typeof timerDefaults.nominationVoteSeconds === 'number' ? timerDefaults.nominationVoteSeconds : 5,
      alarmSound: typeof timerDefaults.alarmSound === 'string' ? timerDefaults.alarmSound : `${BASE_URL}audio/alarm/Vintage Clock Sound Effect.mp3`,
    },
    customTagPool: asStringArray(value.customTagPool),
    playerNamePool: asStringArray(value.playerNamePool),
    days,
    gameRecords: Array.isArray(value.gameRecords) ? value.gameRecords as PersistedState['gameRecords'] : [],
    activeScriptSlug: typeof value.activeScriptSlug === 'string' ? value.activeScriptSlug : undefined,
    activeScriptTitle: typeof value.activeScriptTitle === 'string' ? value.activeScriptTitle : undefined,
    endGameResult: isRecord(value.endGameResult) ? value.endGameResult as PersistedState['endGameResult'] : null,
    gameStartedAt: typeof value.gameStartedAt === 'number' ? value.gameStartedAt : undefined,
    gameId: typeof value.gameId === 'string' ? value.gameId : undefined,
    stFabledIds: asStringArray(value.stFabledIds),
    stCustomRules: typeof value.stCustomRules === 'string' ? value.stCustomRules : '',
    stName: typeof value.stName === 'string' ? value.stName : '',
  } satisfies PersistedState
}

function readStoredState(key: string, fallback: PersistedState): PersistedState | null {
  const stored = storageSync.getItem(key)
  if (!stored) return null
  try {
    return normalizePersistedState(JSON.parse(stored), fallback)
  } catch (error) {
    debugStorage('[StorytellerStorage] Could not parse persisted state', key, error)
    return null
  }
}

export function loadInitialState(): PersistedState {
  const fallback = createFallbackState()
  if (typeof window === 'undefined') return fallback

  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    const state = readStoredState(key, fallback)
    if (!state) continue
    if (key !== STORAGE_KEY) {
      try { storageSync.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
    }
    return state
  }

  return fallback
}
