import type { StorytellerContext } from '../useStoryteller'
import { Box } from '@mui/material'
import { MobileSeatCard } from './MobileSeatCard'

// Clearance when panel is open vs collapsed.
// Use dvh so it matches the panel's height unit.
// Use 46dvh (nomination is tallest phase) so all phases have enough clearance.
const PANEL_OPEN_CLEARANCE = 'calc(56px + max(46dvh, 160px) + var(--safe-bottom, 0px) + 8px)'
const PANEL_COLLAPSED_CLEARANCE = 'calc(56px + 64px + var(--safe-bottom, 0px) + 8px)'

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
        maxWidth: 600,
        mx: 'auto',
        width: '100%',
        pb: panelCollapsed ? PANEL_COLLAPSED_CLEARANCE : PANEL_OPEN_CLEARANCE,
        transition: 'padding-bottom 0.25s ease',
      }}
    >
      {(() => {
        const seats: any[] = currentDay.seats
        const half = Math.ceil(seats.length / 2)
        // Clockwise layout: right col = seats 1..half (going down = clockwise right side),
        // left col = seats half+1..n reversed (going down = clockwise left side going up).
        // Trace for n=5: 1(top-R)→2(mid-R)→3(bot-R)→4(mid-L)→5(top-L)→1 ✓
        const rightCol = seats.slice(0, half)
        const leftCol  = seats.slice(half).reverse()
        return rightCol.map((s: any, i: number) => {
          const l = leftCol[i]
          return [
            l ? <MobileSeatCard key={l.seat} ctx={ctx} seat={l} side="left" /> : <Box key={`empty-${i}`} />,
            <MobileSeatCard key={s.seat} ctx={ctx} seat={s} side="right" />,
          ]
        }).flat()
      })()}
    </Box>
  )
}
