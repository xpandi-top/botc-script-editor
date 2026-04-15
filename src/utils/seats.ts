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

/**
 * Compute the (left%, top%) percentage position of a seat on the rectangular
 * perimeter layout used by the arena.  Returns values in [0, 100].
 */
export function getSeatPosition(
  index: number,
  total: number,
  isPortrait: boolean,
): { left: number; top: number } {
  const W = isPortrait ? 2 : 3
  const H = isPortrait ? 3 : 2
  const perimeter = 2 * (W + H)
  const offset = (0.5 / total) * perimeter
  const p = (offset + (index / total) * perimeter) % perimeter
  const padX = 9, padY = 9
  let left: number, top: number
  if (p < W) {
    left = padX + (p / W) * (100 - 2 * padX); top = padY
  } else if (p < W + H) {
    left = 100 - padX; top = padY + ((p - W) / H) * (100 - 2 * padY)
  } else if (p < 2 * W + H) {
    left = (100 - padX) - ((p - W - H) / W) * (100 - 2 * padX); top = 100 - padY
  } else {
    left = padX; top = (100 - padY) - ((p - 2 * W - H) / H) * (100 - 2 * padY)
  }
  return { left, top }
}

/**
 * Compute the angle (degrees) from the arena centre (50%, 50%) to a seat's
 * actual perimeter position — for the pointer-hand rotation.
 */
export function getSeatAngle(index: number, total: number, isPortrait: boolean): number {
  const { left, top } = getSeatPosition(index, total, isPortrait)
  return Math.atan2(top - 50, left - 50) * (180 / Math.PI)
}
