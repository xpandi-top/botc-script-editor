import type { VoteDraft, VotingState } from '../components/StorytellerSub/types'
import type { DealVoteResponse, DealVoteResponseRecord, DealVoteSession } from '../lib/firebaseDeal'

/**
 * Compute the effective yes-vote count for the current draft.
 *
 * Priority:
 *  1. voteCountOverride (manual override by ST)
 *  2. live per-player voting state (votingState.votes)
 *  3. bulk voters array (pre-voting mode)
 */
export function computeYesCount(
  draft: Pick<VoteDraft, 'voters' | 'voteCountOverride'>,
  votingState: VotingState | null,
): number {
  if (draft.voteCountOverride !== null) return draft.voteCountOverride
  if (votingState) return Object.values(votingState.votes).filter(Boolean).length
  return draft.voters.length
}

/**
 * Determine whether the current vote draft passes.
 *
 * - System pass: yesCount >= threshold
 * - manualPassed overrides system result if set
 */
export function computeVotePassed(
  yesCount: number,
  threshold: number,
  manualPassed: boolean | null,
): boolean {
  const passedBySystem = yesCount >= threshold
  return manualPassed ?? passedBySystem
}

export function remoteResponsesToVoteMap(
  responses: Pick<DealVoteResponseRecord, 'seat' | 'response'>[],
): Record<number, boolean> {
  return Object.fromEntries(responses.map((r) => [r.seat, r.response === 'agree']))
}

export function filterNoVoteSeats(votingOrder: number[], noVoteSeats: number[]): number[] {
  const blocked = new Set(noVoteSeats)
  return votingOrder.filter((seat) => !blocked.has(seat))
}

export function timeoutDealVoteResponse(): DealVoteResponse {
  return 'disagree'
}

export function getCurrentDealVoter(
  vote: Pick<DealVoteSession, 'votingOrder' | 'currentIndex'>,
): number | null {
  return vote.votingOrder[vote.currentIndex] ?? null
}

export function formatSeatLabel(
  seat: number,
  seatLabels?: Record<string, string> | null,
): string {
  const label = seatLabels?.[String(seat)]
  return label?.trim() || `#${seat}`
}

export function summarizeDealVote(
  vote: Pick<DealVoteSession, 'votingOrder'> & { seatLabels?: DealVoteSession['seatLabels'] },
  responses: Pick<DealVoteResponseRecord, 'seat' | 'response'>[],
) {
  const responseMap = new Map(responses.map((r) => [r.seat, r.response]))
  const agreeSeats = vote.votingOrder.filter((seat) => responseMap.get(seat) === 'agree')
  const disagreeSeats = vote.votingOrder.filter((seat) => responseMap.get(seat) === 'disagree')
  const pendingSeats = vote.votingOrder.filter((seat) => !responseMap.has(seat))
  return {
    agreeSeats,
    disagreeSeats,
    pendingSeats,
    agreeCount: agreeSeats.length,
    disagreeCount: disagreeSeats.length,
    pendingCount: pendingSeats.length,
    totalCount: vote.votingOrder.length,
    agreeLabels: agreeSeats.map((seat) => formatSeatLabel(seat, vote.seatLabels)),
    disagreeLabels: disagreeSeats.map((seat) => formatSeatLabel(seat, vote.seatLabels)),
    pendingLabels: pendingSeats.map((seat) => formatSeatLabel(seat, vote.seatLabels)),
  }
}
