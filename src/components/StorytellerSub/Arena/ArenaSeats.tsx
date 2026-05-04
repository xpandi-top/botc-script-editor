// @ts-nocheck
import type { StorytellerSeat } from '../types'
import type { StorytellerContext } from '../useStoryteller'
import React from 'react'
import { ArenaSeat } from './ArenaSeat'

export function ArenaSeats({ ctx, isPortrait }: { ctx: StorytellerContext; isPortrait: boolean }) {
  return (
    <>
      {ctx.currentDay.seats.map((seat: any, index: number) => (
        <ArenaSeat ctx={ctx} index={index} key={seat.seat} seat={seat} isPortrait={isPortrait} />
      ))}
    </>
  )
}
