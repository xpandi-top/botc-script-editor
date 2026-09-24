/**
 * What would end the game from the current state, computed by program for
 * the storyteller's AI (and the no-model answer): the core win conditions
 * plus the common characters that change them. Drunk or poisoned seats (ST
 * tags) do not trigger their abilities. Travellers never count.
 *
 * Covered: evil wins at 2 alive; good wins when the only Demon dies, unless
 * the Scarlet Woman takes over (5+ alive); Mayor (3 alive, no execution);
 * Saint (executed → good loses).
 */
import type { StorytellerSeat } from '../types/game'
import type { TeamLookup } from './alignment'
import { impairmentsOf } from './nightScript'

export type GameFact =
  | { code: 'alive'; alive: number; votesNeeded: number }
  | { code: 'evil_wins_after_deaths'; deaths: number }
  | { code: 'execute_demon_scarlet_woman'; demonSeat: number; scarletWomanSeat: number; alive: number }
  | { code: 'execute_demon_good_wins'; demonSeat: number }
  | { code: 'several_demons'; demonSeats: number[] }
  | { code: 'mayor_no_execution'; mayorSeat: number }
  | { code: 'saint_executed'; saintSeat: number }

type Seat = Pick<StorytellerSeat, 'seat' | 'characterId' | 'alive' | 'isTraveler' | 'stTags'>

const working = (seat: Seat) => impairmentsOf(seat).length === 0

export function gameStateFacts(seats: Seat[], getTeam: TeamLookup): GameFact[] {
  const alive = seats.filter((s) => s.alive && !s.isTraveler)
  const facts: GameFact[] = [{ code: 'alive', alive: alive.length, votesNeeded: Math.ceil(alive.length / 2) }]
  if (alive.length > 2) facts.push({ code: 'evil_wins_after_deaths', deaths: alive.length - 2 })

  const demons = alive.filter((s) => s.characterId && getTeam(s.characterId) === 'demon')
  if (demons.length > 1) facts.push({ code: 'several_demons', demonSeats: demons.map((s) => s.seat) })
  if (demons.length === 1) {
    const scarletWoman = alive.find((s) => s.characterId === 'scarletwoman' && working(s))
    // She becomes the Demon if 5+ players are alive when the Demon dies.
    if (scarletWoman && alive.length >= 5) facts.push({ code: 'execute_demon_scarlet_woman', demonSeat: demons[0].seat, scarletWomanSeat: scarletWoman.seat, alive: alive.length })
    else facts.push({ code: 'execute_demon_good_wins', demonSeat: demons[0].seat })
  }

  const mayor = alive.find((s) => s.characterId === 'mayor' && working(s))
  if (mayor && alive.length === 3) facts.push({ code: 'mayor_no_execution', mayorSeat: mayor.seat })
  const saint = alive.find((s) => s.characterId === 'saint' && working(s))
  if (saint) facts.push({ code: 'saint_executed', saintSeat: saint.seat })
  return facts
}
