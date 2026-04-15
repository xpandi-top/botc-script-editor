// @ts-nocheck
import React from 'react'
import { ArenaSeat } from './ArenaSeat'

export function ArenaSeats({ ctx, isPortrait }: { ctx: any; isPortrait: boolean }) {
  return (
    <>
      {ctx.currentDay.seats.map((seat: any, index: number) => (
        <ArenaSeat ctx={ctx} index={index} key={seat.seat} seat={seat} isPortrait={isPortrait} />
      ))}
    </>
  )
}
