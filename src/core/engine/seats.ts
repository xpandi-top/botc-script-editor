/**
 * Seat queries and vote thresholds (official rules). Pure; shared by the web
 * UI and the planned game engine / API.
 */
import type { StorytellerSeat } from '../types/game'

/** Seats that are alive and not travelers (used for required-vote calculation). */
export function livingNonTravelers(seats: StorytellerSeat[]): StorytellerSeat[] {
  return seats.filter((s) => s.alive && !s.isTraveler)
}

/** Seats eligible to vote (no hasNoVote flag). */
export function eligibleVoters(seats: StorytellerSeat[]): number[] {
  return seats.filter((s) => !s.hasNoVote).map((s) => s.seat)
}

/** Non-traveler seats for player-count logic. */
export function regularSeats(seats: StorytellerSeat[]): StorytellerSeat[] {
  return seats.filter((s) => !s.isTraveler)
}

/** Traveler seats only. */
export function travelerSeats(seats: StorytellerSeat[]): StorytellerSeat[] {
  return seats.filter((s) => s.isTraveler)
}

/**
 * Required votes for a regular nomination.
 * = ceil(living non-traveler count / 2), minimum 1.
 * Dead and exiled players do NOT count toward this pool.
 */
export function nominationThreshold(seats: StorytellerSeat[]): number {
  return Math.max(1, Math.ceil(livingNonTravelers(seats).length / 2))
}

/**
 * Required votes for an exile nomination.
 * = ceil(total seat count / 2), minimum 1.
 * All seats (including travelers, dead) count.
 */
export function exileThreshold(seats: StorytellerSeat[]): number {
  return Math.max(1, Math.ceil(seats.length / 2))
}

/** Find a seat by number. */
export function findSeat(seats: StorytellerSeat[], seatNumber: number): StorytellerSeat | null {
  return seats.find((s) => s.seat === seatNumber) ?? null
}
