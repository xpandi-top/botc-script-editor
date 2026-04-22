import { Box } from '@mui/material'
import { MobileSeatCard } from './MobileSeatCard'
import { useBreakpoint } from '../../../hooks/useBreakpoint'

// Bottom padding accounts for fixed PhaseControlPanel height (~42vh) + any system bars
const PANEL_CLEARANCE = 'calc(44vh + var(--safe-bottom, 0px))'

export function PlayerSeatGrid({ ctx }: { ctx: any }) {
  const { currentDay, setSelectedSeatNumber, setTagPopoutSeat } = ctx
  const { isMobile } = useBreakpoint()

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
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: 1,
        p: 1,
        pb: PANEL_CLEARANCE,
        overflowY: 'auto',
        flex: 1,
      }}
    >
      {currentDay.seats.map((seat: any) => (
        <MobileSeatCard key={seat.seat} ctx={ctx} seat={seat} />
      ))}
    </Box>
  )
}
