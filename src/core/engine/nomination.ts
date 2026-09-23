/**
 * Nomination and voting state machine for one day, as pure transitions.
 *
 * Guards (`can*`) say whether a step is allowed from the current state;
 * transitions return the next DayState. Event-log entries, timers and other UI
 * effects stay with the caller (useGameActions today, the API engine later).
 * `now` is passed in so ids are deterministic in tests and replays.
 */
import type { DayState, NominationStep, TimerDefaults, VoteDraft, VoteRecord } from '../types/game'
import { createDefaultVoteDraft } from './factories'
import { spendVoteTokens, voteWeightFor } from './votes'

export type NominationTimers = Pick<
  TimerDefaults,
  'nominationWaitSeconds' | 'nominationActorSeconds' | 'nominationTargetSeconds' | 'nominationVoteSeconds'
>

const ACTOR_SPEECH_FROM: readonly NominationStep[] = ['nominationDecision', 'actorSpeech', 'readyForTargetSpeech', 'targetSpeech', 'readyToVote', 'voting', 'votingDone']
const TARGET_SPEECH_FROM: readonly NominationStep[] = ['actorSpeech', 'readyForTargetSpeech', 'targetSpeech', 'readyToVote', 'voting', 'votingDone']
const VOTING_FROM: readonly NominationStep[] = ['nominationDecision', 'targetSpeech', 'readyToVote', 'voting', 'votingDone']

/** Back to "waiting for a nomination" with a fresh draft and wait timer. */
function resetNomination(d: DayState, timers: NominationTimers): DayState {
  return { ...d, nominationStep: 'waitingForNomination', nominationWaitSeconds: timers.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null }
}

/** Enter the nomination phase. */
export function openNominations(d: DayState, timers: NominationTimers): DayState {
  return { ...resetNomination(d, timers), phase: 'nomination' }
}

export function canStartActorSpeech(d: Pick<DayState, 'nominationStep'>): boolean {
  return ACTOR_SPEECH_FROM.includes(d.nominationStep)
}

/** Nomination accepted: the nominator speaks. */
export function startActorSpeech(d: DayState, timers: NominationTimers): DayState {
  return { ...d, nominationStep: 'actorSpeech', nominationActorSeconds: timers.nominationActorSeconds }
}

/**
 * Nomination rejected. Records a failed nomination when both nominator and
 * nominee were chosen, then resets for the next nomination.
 */
export function rejectNomination(d: DayState, opts: { requiredVotes: number; now: number; timers: NominationTimers }): DayState {
  const failRecord: VoteRecord | null = (d.voteDraft.actor && d.voteDraft.target)
    ? { id: `${opts.now}`, actor: d.voteDraft.actor, target: d.voteDraft.target, voters: [], voteCount: 0, requiredVotes: opts.requiredVotes, passed: false, note: d.voteDraft.note.trim(), overridden: false, failed: true }
    : null
  return { ...resetNomination(d, opts.timers), voteHistory: failRecord ? [failRecord, ...d.voteHistory] : d.voteHistory }
}

export function canStartTargetSpeech(d: Pick<DayState, 'nominationStep'>): boolean {
  return TARGET_SPEECH_FROM.includes(d.nominationStep)
}

/** The nominee speaks. */
export function startTargetSpeech(d: DayState, timers: NominationTimers): DayState {
  return { ...d, nominationStep: 'targetSpeech', nominationTargetSeconds: timers.nominationTargetSeconds }
}

export function canStartVoting(d: Pick<DayState, 'nominationStep' | 'voteDraft'>): boolean {
  if (d.voteDraft.target === null || d.voteDraft.target === undefined) return false
  return VOTING_FROM.includes(d.nominationStep)
}

/** Open the clockwise vote, starting after the nominee, in the given order. */
export function startVoting(d: DayState, votingOrder: number[], timers: NominationTimers): DayState {
  return { ...d, nominationStep: 'voting', votingState: { votingOrder, votingIndex: 0, perPlayerSeconds: timers.nominationVoteSeconds, votes: {} } }
}

/**
 * Record `seat`'s vote if it is that seat's turn. When the last seat votes,
 * voting finishes and the yes-voters are copied into the draft.
 */
export function castVote(d: DayState, seat: number, yes: boolean, timers: NominationTimers): { day: DayState; completed: boolean } {
  if (!d.votingState || d.nominationStep !== 'voting') return { day: d, completed: false }
  const vs = d.votingState
  if (seat !== vs.votingOrder[vs.votingIndex]) return { day: d, completed: false }
  const newVotes = { ...vs.votes, [seat]: yes }
  const nextIdx = vs.votingIndex + 1
  if (nextIdx >= vs.votingOrder.length) {
    const yesVoters = Object.entries(newVotes).filter(([, v]) => v).map(([k]) => Number(k))
    return {
      day: { ...d, nominationStep: 'votingDone', voteDraft: { ...d.voteDraft, voters: yesVoters }, votingState: { ...vs, votes: newVotes, votingIndex: nextIdx, perPlayerSeconds: 0 } },
      completed: true,
    }
  }
  return {
    day: { ...d, votingState: { ...vs, votes: newVotes, votingIndex: nextIdx, perPlayerSeconds: timers.nominationVoteSeconds } },
    completed: false,
  }
}

/**
 * The vote record for the current draft, or null if nominator or nominee is
 * missing. `passed` comes from the caller, which may apply manual overrides.
 */
export function buildVoteRecord(draft: VoteDraft, opts: { requiredVotes: number; passed: boolean; now: number }): VoteRecord | null {
  if (!draft.actor || draft.target === null || draft.target === undefined) return null
  const yesSeats = [...new Set(draft.voters)]
  const weightedCount = yesSeats.reduce((total, seat) => total + voteWeightFor(draft, seat), 0)
  const finalCount = draft.voteCountOverride !== null ? draft.voteCountOverride : weightedCount
  const spentWeights = Object.fromEntries(
    yesSeats.map((seat) => [seat, voteWeightFor(draft, seat)]).filter(([, weight]) => weight !== 1),
  )
  return { id: `${opts.now}`, actor: draft.actor, target: draft.target, voters: yesSeats, voteCount: finalCount, requiredVotes: opts.requiredVotes, passed: opts.passed, note: draft.note.trim(), overridden: draft.manualPassed !== null || draft.voteCountOverride !== null, isExile: draft.isExile, ...(Object.keys(spentWeights).length > 0 && { voteWeights: spentWeights }) }
}

/**
 * Commit a vote record: dead yes-voters spend their vote tokens (weights from
 * `draft`), the record is prepended to the history and nominations reopen.
 */
export function applyVoteRecord(d: DayState, record: VoteRecord, draft: Pick<VoteDraft, 'voteWeights'>, timers: NominationTimers): DayState {
  return { ...resetNomination(d, timers), seats: spendVoteTokens(d.seats, record.voters, draft), voteHistory: [record, ...d.voteHistory] }
}
