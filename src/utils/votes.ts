import type { StorytellerSeat, VoteDraft, VotingState } from '../components/StorytellerSub/types'
import type { DealVoteResponse, DealVoteResponseRecord, DealVoteSession } from '../lib/firebaseDeal'

// ── Vote tokens (Odyssey multi-vote rules) ───────────────────────────────────
//
// Official rules: a dead player has one ghost vote, so a yes-vote is a boolean.
// Odyssey: a player gains a vote token when they die, may hold several, and may
// spend any number on one nomination to cast that many votes. So a yes-vote
// carries a weight, and the tokens spent are deducted afterwards.

/** Vote tokens a seat currently holds. */
export function voteTokensOf(seat: Pick<StorytellerSeat, 'voteTokens'>): number {
  return Math.max(0, seat.voteTokens ?? 0)
}

/**
 * Votes a seat casts when it votes yes. One unless the draft records a heavier
 * spend. Never negative, and always a whole number.
 */
export function voteWeightFor(
  draft: Pick<VoteDraft, 'voteWeights'>,
  seat: number,
): number {
  const weight = draft.voteWeights?.[seat]
  if (typeof weight !== 'number' || !Number.isFinite(weight)) return 1
  return Math.max(0, Math.floor(weight))
}

/**
 * Compute the effective yes-vote count for the current draft.
 *
 * Priority:
 *  1. voteCountOverride (manual override by ST)
 *  2. live per-player voting state (votingState.votes)
 *  3. bulk voters array (pre-voting mode)
 *
 * In cases 2 and 3 each yes-voter contributes its vote weight, which is 1
 * unless the storyteller recorded a multi-token spend.
 */
export function computeYesCount(
  draft: Pick<VoteDraft, 'voters' | 'voteCountOverride' | 'voteWeights'>,
  votingState: VotingState | null,
): number {
  if (draft.voteCountOverride !== null) return draft.voteCountOverride
  const yesSeats = votingState
    ? Object.entries(votingState.votes).filter(([, yes]) => yes).map(([seat]) => Number(seat))
    : [...new Set(draft.voters)]
  return yesSeats.reduce((total, seat) => total + voteWeightFor(draft, seat), 0)
}

/**
 * Seats updated for a completed vote: every yes-voter spends the tokens it
 * used. Alive voters vote for free and are left alone.
 */
export function spendVoteTokens<T extends StorytellerSeat>(
  seats: T[],
  yesSeats: number[],
  draft: Pick<VoteDraft, 'voteWeights'>,
): T[] {
  const spending = new Set(yesSeats)
  return seats.map((seat) => {
    if (!spending.has(seat.seat) || seat.alive) return seat
    const held = voteTokensOf(seat)
    if (held === 0) return seat
    const spent = Math.min(held, voteWeightFor(draft, seat.seat))
    return spent === 0 ? seat : { ...seat, voteTokens: held - spent }
  })
}

/**
 * Vote tokens after a life-state change: dying grants one token. Coming back to
 * life does not take tokens away — a resurrected player keeps what they held,
 * and the storyteller can still adjust it by hand.
 */
export function voteTokensAfterLifeChange(
  seat: Pick<StorytellerSeat, 'alive' | 'voteTokens'>,
  wasAlive: boolean,
): number | undefined {
  if (wasAlive && !seat.alive) return voteTokensOf(seat) + 1
  return seat.voteTokens
}

/** Largest number of votes a seat can cast right now. */
export function maxVoteWeightFor(seat: Pick<StorytellerSeat, 'alive' | 'voteTokens'>): number {
  return seat.alive ? 1 : voteTokensOf(seat)
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
