import type { DealVoteResponse, DealVoteResponseRecord, DealVoteSession } from '../lib/DealSession'

// Vote counting and Odyssey vote-token rules live in src/core/engine/votes.ts;
// re-exported for existing imports. Remote (deal session) vote helpers stay here.
export {
  computeVotePassed,
  computeYesCount,
  maxVoteWeightFor,
  spendVoteTokens,
  voteTokensAfterLifeChange,
  voteTokensOf,
  voteWeightFor,
} from '../core/engine/votes'

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

/**
 * Whether the storyteller may cast a vote on `seat`'s behalf right now —
 * lets a click in the ST's own vote list stand in for that player tapping
 * "Agree" on their phone. Only the seat currently up may be cast this way,
 * and only before it already has a response (a race with the player's own
 * tap is resolved by whichever write reaches Firestore first).
 */
export function canCastRemoteDealVote(
  vote: Pick<DealVoteSession, 'status' | 'votingOrder' | 'currentIndex'>,
  responses: Pick<DealVoteResponseRecord, 'seat'>[],
  seat: number,
): boolean {
  if (vote.status !== 'active') return false
  if (getCurrentDealVoter(vote) !== seat) return false
  return !responses.some((r) => r.seat === seat)
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
