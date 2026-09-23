// Player identity history lives in src/core/engine/identity.ts (shared with
// the API worker); these wrappers bind it to the app catalog and clock.
import type { DayState, GameRecord, IdentityHistory, PlayerSummary, StorytellerSeat } from '../components/StorytellerSub/types'
import * as core from '../core/engine/identity'
import { catalogTeamOf } from './seatAlignment'

export type { IdentityBasis } from '../core/engine/identity'
export { identityForBasis, normalizeIdentityHistory } from '../core/engine/identity'

export function createIdentityHistory(seats: StorytellerSeat[], complete = true): IdentityHistory {
  return core.createIdentityHistory(seats, catalogTeamOf, complete)
}

/** Called inside the state updater; undo restores history together with the seats. */
export function trackIdentityUpdates(previous: DayState[], next: DayState[]): DayState[] {
  return core.trackIdentityUpdates(previous, next, catalogTeamOf, Date.now())
}

/** Missing legacy history is unknown, never zero. Initial assignment is not a role change. */
export function summarizeIdentities(days: DayState[]): PlayerSummary[] {
  return core.summarizeIdentities(days, catalogTeamOf)
}

export function recordPlayers(record: GameRecord): PlayerSummary[] {
  return core.recordPlayers(record, catalogTeamOf)
}
