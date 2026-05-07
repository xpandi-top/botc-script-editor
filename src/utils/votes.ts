import type { VoteDraft, VotingState } from '../components/StorytellerSub/types'

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
