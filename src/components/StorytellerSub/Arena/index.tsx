import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
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
  const isPortrait = portraitOverride !== null ? portraitOverride : windowPortrait
  const seats = currentDay.seats
  const pointerAngle = React.useMemo(() => {
    if (!pointerSeat) return 0
    const idx = seats.findIndex((s: any) => s.seat === pointerSeat)
    if (idx === -1) return 0
    return getSeatAngle(idx, seats.length, isPortrait)
  }, [pointerSeat, seats, isPortrait])

  return (
    <Box sx={{ display: 'grid', gap: 1, flex: 1, minHeight: 0, overflow: 'visible' }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          background: 'radial-gradient(circle at top, rgba(255,241,214,0.9), rgba(255,251,245,0.92) 50%), linear-gradient(180deg, rgba(255,251,245,0.96), rgba(248,240,226,0.92))',
          boxShadow: '0 18px 60px rgba(57,43,24,0.08)',
          overflow: 'visible',
          position: 'relative',
        }}
      >
        <Box
          onClick={(e) => {
            if (!(e.target as Element).closest('.storyteller-seat')) {
              setSelectedSeatNumber(null)
              setTagPopoutSeat(null)
            }
          }}
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            minHeight: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, transparent 35%, rgba(133,63,34,0.08) 36%, rgba(133,63,34,0.08) 45%, transparent 46%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {pointerSeat && (
            <Box
              sx={{
                position: 'absolute',
                width: 4,
                height: '35%',
                bgcolor: 'primary.main',
                transformOrigin: 'bottom center',
                transform: `rotate(${pointerAngle}deg)`,
                bottom: '50%',
                left: 'calc(50% - 2px)',
                borderRadius: 1,
                opacity: 0.6,
              }}
            />
          )}
          <ArenaCenter ctx={ctx} />
          <ArenaSeats ctx={ctx} isPortrait={isPortrait} />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          {text.seatHint}
        </Typography>
      </Paper>
    </Box>
  )
}