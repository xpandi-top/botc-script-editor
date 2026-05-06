import type { StorytellerContext } from '../useStoryteller'
import { Box } from '@mui/material'
import { MobileSeatCard } from './MobileSeatCard'

// Clearance when panel is open vs collapsed
const PANEL_OPEN_CLEARANCE = 'calc(36vh + var(--safe-bottom, 0px) + 8px)'
const PANEL_COLLAPSED_CLEARANCE = 'calc(56px + var(--safe-bottom, 0px) + 8px)'

export function PlayerSeatGrid({ ctx, panelCollapsed }: { ctx: StorytellerContext; panelCollapsed: boolean }) {
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
        pb: panelCollapsed ? PANEL_COLLAPSED_CLEARANCE : PANEL_OPEN_CLEARANCE,
        transition: 'padding-bottom 0.25s ease',
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
