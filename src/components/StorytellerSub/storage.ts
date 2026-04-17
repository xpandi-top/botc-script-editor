import type { PersistedState } from './types'
import { STORAGE_KEY, DEFAULT_PLAYER_COUNT, createTimerDefaults, createDayState, createSeats, createDefaultVoteDraft, createDefaultSkillDraft, BASE_URL } from './constants'

// ── Load / Migrate ─────────────────────────────────────────────

export function loadInitialState(): PersistedState {
  const defaults = createTimerDefaults()
  const firstDay = createDayState(1, createSeats(DEFAULT_PLAYER_COUNT), defaults)
  const fallback: PersistedState = {
    selectedDayId: firstDay.id,
    timerDefaults: defaults,
    days: [firstDay],
    customTagPool: ['流放'],
    gameRecords: [],
    playerNamePool: [],
  }
  if (typeof window === 'undefined') return fallback
  const stored =
    window.localStorage.getItem(STORAGE_KEY) ??
    window.localStorage.getItem('botc-storyteller-companion-v4') ??
    window.localStorage.getItem('botc-storyteller-companion-v3')
  if (!stored) return fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = JSON.parse(stored) as any
    if (!p.days?.length) return fallback
    return {
      selectedDayId: p.selectedDayId ?? p.days[0].id ?? fallback.selectedDayId,
      timerDefaults: {
        ...defaults,
        ...p.timerDefaults,
        nominationDelayMinutes: p.timerDefaults?.nominationDelayMinutes ?? 2,
        nominationWaitSeconds: p.timerDefaults?.nominationWaitSeconds ?? 10,
        nominationVoteSeconds: p.timerDefaults?.nominationVoteSeconds ?? 5,
        alarmSound: p.timerDefaults?.alarmSound ?? `${BASE_URL}audio/alarm/Vintage Clock Sound Effect.mp3`,
      },
      customTagPool: p.customTagPool ?? [],
      playerNamePool: p.playerNamePool ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      days: p.days.map((d: any, i: number) => ({
        id: d.id ?? `day-${i + 1}`,
        day: d.day ?? i + 1,
        phase: d.phase === 'skill' ? 'public' : (d.phase ?? 'private'),
        publicMode: d.publicMode ?? 'free',
        nominationStep: d.nominationStep ?? 'waitingForNomination',
        privateSeconds: d.privateSeconds ?? defaults.privateSeconds,
        publicFreeSeconds: d.publicFreeSeconds ?? defaults.publicFreeSeconds,
        publicRoundRobinSeconds: d.publicRoundRobinSeconds ?? defaults.publicRoundRobinSeconds,
        publicElapsedSeconds: d.publicElapsedSeconds ?? 0,
        nominationWaitSeconds: d.nominationWaitSeconds ?? defaults.nominationWaitSeconds,
        nominationActorSeconds: d.nominationActorSeconds ?? defaults.nominationActorSeconds,
        nominationTargetSeconds: d.nominationTargetSeconds ?? defaults.nominationTargetSeconds,
        currentSpeakerSeat: d.currentSpeakerSeat ?? 1,
        roundRobinSpokenSeats: d.roundRobinSpokenSeats ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        seats: d.seats?.map((s: any, si: number) => ({
          seat: s.seat ?? si + 1,
          name: s.name ?? `Player ${si + 1}`,
          alive: s.alive ?? true,
          isTraveler: s.isTraveler ?? false,
          isExecuted: s.isExecuted ?? false,
          hasNoVote: s.hasNoVote ?? false,
          customTags: s.customTags ?? [],
          characterId: s.characterId ?? null,
          userCharacterId: s.userCharacterId ?? null,
          teamTag: s.teamTag ?? null,
          stTags: s.stTags ?? [],
          note: s.note ?? '',
        })) ?? createSeats(DEFAULT_PLAYER_COUNT),
        voteDraft: { ...createDefaultVoteDraft(), ...d.voteDraft },
        votingState: d.votingState ?? null,
        voteHistory: d.voteHistory ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        skillHistory: (d.skillHistory ?? []).map((s: any) => ({
          ...createDefaultSkillDraft(),
          ...s,
          targetNotes: s.targetNotes ?? {},
          activatedDuringPhase: s.activatedDuringPhase ?? '',
        })),
        eventLog: d.eventLog ?? [],
        nightVisitedSeats: d.nightVisitedSeats ?? [],
        gameEnded: d.gameEnded ?? false,
      })),
      gameRecords: p.gameRecords ?? [],
      activeScriptSlug: p.activeScriptSlug,
      activeScriptTitle: p.activeScriptTitle,
    }
  } catch {
    return fallback
  }
}

