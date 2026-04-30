import { Box } from '@mui/material'
import { MobileSeatCard } from './MobileSeatCard'

// Bottom padding accounts for fixed PhaseControlPanel height (~42vh) + any system bars
const PANEL_CLEARANCE = 'calc(44vh + var(--safe-bottom, 0px))'

export function PlayerSeatGrid({ ctx }: { ctx: any }) {
  const { currentDay, setSelectedSeatNumber, setTagPopoutSeat } = ctx

  return (
    <Box
      onClick={(e) => {
        const target = e.target as Element
        if (
          !target.closest('[data-seat]') &&
          !target.closest('[data-tag-popup]') &&
          !target.closest('[data-skill-popup]') &&
          !target.closest('[data-character-popup]')
        ) {
          setSelectedSeatNumber(null)
          setTagPopoutSeat(null)
        }
      }}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 1,
        p: 1,
        pb: PANEL_CLEARANCE,
        overflowY: 'auto',
        flex: 1,
      }}
    >
      {(() => {
        const seats: any[] = currentDay.seats
        const half = Math.ceil(seats.length / 2)
        const leftCol = seats.slice(0, half)
        const rightCol = seats.slice(half).reverse()
        return leftCol.map((s: any, i: number) => {
          const r = rightCol[i]
          return [
            <MobileSeatCard key={s.seat} ctx={ctx} seat={s} />,
            r ? <MobileSeatCard key={r.seat} ctx={ctx} seat={r} /> : <Box key={`empty-${i}`} />,
          ]
        }).flat()
      })()}
    </Box>
  )
}
