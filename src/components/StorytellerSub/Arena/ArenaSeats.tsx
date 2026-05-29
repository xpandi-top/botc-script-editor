import type { StorytellerContext } from '../useStoryteller'
import { ArenaSeat } from './ArenaSeat'

export function ArenaSeats({ ctx, isPortrait }: { ctx: StorytellerContext; isPortrait: boolean }) {
  return (
    <>
      {ctx.currentDay.seats.map((seat, index) => (
        <ArenaSeat ctx={ctx} index={index} key={seat.seat} seat={seat} isPortrait={isPortrait} />
      ))}
    </>
  )
}
