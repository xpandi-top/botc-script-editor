// @ts-nocheck
import React from 'react'
import { ArenaSeat } from './ArenaSeat'

export function ArenaSeats({ ctx }: { ctx: any }) {
  const [isPortrait, setIsPortrait] = React.useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  )

  React.useEffect(() => {
    const handler = () => setIsPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <>
      {ctx.currentDay.seats.map((seat: any, index: number) => (
        <ArenaSeat ctx={ctx} index={index} key={seat.seat} seat={seat} isPortrait={isPortrait} />
      ))}
    </>
  )
}
