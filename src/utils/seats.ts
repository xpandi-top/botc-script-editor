// Seat rules live in src/core/engine/seats.ts; re-exported for existing imports.
// Only arena layout helpers are defined here.
export {
  eligibleVoters,
  exileThreshold,
  findSeat,
  livingNonTravelers,
  nominationThreshold,
  regularSeats,
  travelerSeats,
} from '../core/engine/seats'

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
  const padBase = 8
  const padExtra = total > 10 ? Math.min(6, (total - 10) * 0.5) : 0
  const padX = padBase + padExtra
  const padY = padBase + padExtra
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
