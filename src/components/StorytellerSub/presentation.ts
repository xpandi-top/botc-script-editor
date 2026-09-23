import type { Language } from '../../types'
import type { DayState } from './types'

export const audienceChannelName = (session: string) => `botc-audience-v1-${session}`
export const AUDIENCE_TIMEOUT_MS = 12_000

export interface PresentationSource {
  day: DayState
  language: Language
  title: string
  timerSeconds: number
  timerRunning: boolean
  requiredVotes: number
  yesCount: number
  currentVoterSeat: number | null
}

/** Explicit public allowlist. Never spread a seat/day/vote into this payload. */
export function buildAudienceSnapshot(source: PresentationSource) {
  const { day } = source
  return {
    language: source.language,
    title: source.title,
    day: day.day,
    phase: day.phase,
    publicMode: day.publicMode,
    nominationStep: day.nominationStep,
    gameEnded: day.gameEnded,
    timerSeconds: source.timerSeconds,
    timerRunning: source.timerRunning,
    currentSpeakerSeat: day.phase === 'public' && day.publicMode === 'roundRobin' ? day.currentSpeakerSeat : null,
    currentVoterSeat: day.phase === 'nomination' ? source.currentVoterSeat : null,
    seats: day.seats.map(seat => ({
      seat: seat.seat, name: seat.name, alive: seat.alive,
      isTraveler: seat.isTraveler, isExecuted: seat.isExecuted,
      hasNoVote: seat.hasNoVote, voteTokens: seat.voteTokens,
      customTags: [...seat.customTags],
      // A traveler's identity is public; their alignment is still private.
      characterId: seat.isTraveler ? seat.characterId : null,
      vote: day.phase === 'nomination' ? day.votingState?.votes[seat.seat] ?? null : null,
    })),
    nomination: day.phase === 'nomination' ? {
      actor: day.voteDraft.actor, target: day.voteDraft.target,
      isExile: day.voteDraft.isExile,
      yesCount: source.yesCount, requiredVotes: source.requiredVotes,
    } : null,
    voteHistory: day.voteHistory.map(vote => ({
      id: vote.id, actor: vote.actor, target: vote.target,
      voteCount: vote.voteCount, requiredVotes: vote.requiredVotes,
      passed: vote.passed, failed: vote.failed, isExile: vote.isExile,
    })),
  }
}

export type AudienceSnapshot = ReturnType<typeof buildAudienceSnapshot>
export type AudienceMessage =
  | { type: 'ready' }
  | { type: 'snapshot'; snapshot: AudienceSnapshot }
  | { type: 'stopped' }
