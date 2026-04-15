// @ts-nocheck
import React from 'react'
import { ArenaCenter } from './ArenaCenter'
import { ArenaSeats } from './ArenaSeats'
import { getSeatAngle } from '../../../utils/seats'

export function Arena({ ctx }: { ctx: any }) {
  const [windowPortrait, setWindowPortrait] = React.useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  )
  React.useEffect(() => {
    const handler = () => setWindowPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const { pointerSeat, currentDay, setSelectedSeatNumber, setTagPopoutSeat, text, portraitOverride } = ctx
  // Manual override takes priority over window detection
  const isPortrait = portraitOverride !== null ? portraitOverride : windowPortrait
  const seats = currentDay.seats
  const pointerAngle = React.useMemo(() => {
    if (!pointerSeat) return 0
    const idx = seats.findIndex((s: any) => s.seat === pointerSeat)
    if (idx === -1) return 0
    return getSeatAngle(idx, seats.length, isPortrait)
  }, [pointerSeat, seats, isPortrait])

  return (
    <div className="storyteller-arena">
      <div className="storyteller-table-card">
        <div
          className="storyteller-table"
          onClick={(e) => {
            // Only clear selection when clicking the table background itself,
            // not when a click bubbles up from a seat card or its children.
            if (!(e.target as Element).closest('.storyteller-seat')) {
              setSelectedSeatNumber(null)
              setTagPopoutSeat(null)
            }
          }}
        >
          <div className="storyteller-table__ring" />
          {pointerSeat ? (
            <div
              className="storyteller-table__hand"
              style={{ '--pointer-angle': `${pointerAngle}deg` } as React.CSSProperties}
            />
          ) : null}
          <ArenaCenter ctx={ctx} />
          <ArenaSeats ctx={ctx} isPortrait={isPortrait} />
        </div>
        <p className="storyteller-panel__hint">{text.seatHint}</p>
      </div>
    </div>
  )
}
