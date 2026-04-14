import type { StorytellerSeat } from '../components/StorytellerSub/types'

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

/** Find a seat by number. */
export function findSeat(seats: StorytellerSeat[], seatNumber: number): StorytellerSeat | null {
  return seats.find((s) => s.seat === seatNumber) ?? null
}
