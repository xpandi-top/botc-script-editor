// @ts-nocheck
import React from 'react'
import { ArenaCenter } from './ArenaCenter'
import { ArenaSeats } from './ArenaSeats'

export function Arena({ ctx }: { ctx: any }) {
  return (
    <>
      <div className="storyteller-arena">
        <div className="storyteller-table-card">
          <div className="storyteller-table" onClick={() => { ctx.setSelectedSeatNumber(null); if (ctx.pickerMode === 'none') ctx.setPickerMode('none'); ctx.setTagPopoutSeat(null) }} >
            <div className="storyteller-table__ring" />
            {ctx.pointerSeat ? (
              <div className="storyteller-table__hand" style={{ '--pointer-angle': `${((ctx.pointerSeat - 1) / ctx.currentDay.seats.length) * 360 - 90}deg` }} />
            ) : null}
            <ArenaCenter ctx={ctx} />
            <ArenaSeats ctx={ctx} />
          </div>
          <p className="storyteller-panel__hint">{ctx.text.seatHint}</p>
        </div>
      </div>
    </>
  )
}
