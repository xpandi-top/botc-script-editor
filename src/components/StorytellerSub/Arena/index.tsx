import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { ArenaCenter } from './ArenaCenter'
import { ArenaSeats } from './ArenaSeats'
import { getSeatAngle as _getSeatAngle } from '../../../utils/seats'
import { useBreakpoint } from '../../../hooks/useBreakpoint'

export function Arena({ ctx }: { ctx: any }) {
  const [windowPortrait, setWindowPortrait] = React.useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  )
  React.useEffect(() => {
    const handler = () => setWindowPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const { pointerSeat: _pointerSeat, currentDay, setSelectedSeatNumber, setTagPopoutSeat, text, portraitOverride } = ctx
  const isPortrait = portraitOverride !== null ? portraitOverride : windowPortrait
  const seats = currentDay.seats
  const seatCount = seats.length || 1
  const { isMobile } = useBreakpoint()

  React.useEffect(() => {
    const minSize = 60
    const maxSize = 130
    const baseSize = isPortrait ? 85 : 110
    const scaleFactor = Math.max(1, (seatCount - 4) / 3)
    const seatSize = Math.min(maxSize, Math.max(minSize, baseSize / scaleFactor))
    document.documentElement.style.setProperty('--seat-size', `${seatSize}px`)

    const padBase = 8
    const padExtra = seatCount > 10 ? Math.min(6, (seatCount - 10) * 0.5) : 0
    const seatPadding = padBase + padExtra

    const centerZone = Math.max(25, Math.min(38, seatPadding + 18))
    document.documentElement.style.setProperty('--center-zone', `${centerZone}%`)
  }, [seatCount, isPortrait])

  // Mobile: show phase controls only — full seat grid comes in Phase 1
  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 280, overflow: 'visible' }}>
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 2,
            background: 'radial-gradient(circle at top, rgba(255,241,214,0.9), rgba(255,251,245,0.92) 50%), linear-gradient(180deg, rgba(255,251,245,0.96), rgba(248,240,226,0.92))',
            boxShadow: '0 18px 60px rgba(57,43,24,0.08)',
            overflow: 'visible',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArenaCenter ctx={ctx} />
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'grid', gap: 1, flex: 1, minHeight: 400, overflow: 'visible', width: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          minHeight: 380,
          background: 'radial-gradient(circle at top, rgba(255,241,214,0.9), rgba(255,251,245,0.92) 50%), linear-gradient(180deg, rgba(255,251,245,0.96), rgba(248,240,226,0.92))',
          boxShadow: '0 18px 60px rgba(57,43,24,0.08)',
          overflow: 'visible',
          position: 'relative',
        }}
      >
        <Box
          onClick={(e) => {
            const target = e.target as Element
            if (!target.closest('[data-seat]') && !target.closest('[data-tag-popup]') && !target.closest('[data-skill-popup]') && !target.closest('[data-character-popup]') && !target.closest('[data-nomination-popup]')) {
              setSelectedSeatNumber(null)
              setTagPopoutSeat(null)
            }
          }}
          sx={{
            position: 'relative',
            width: '100%',
            minHeight: 350,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArenaCenter ctx={ctx} />
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
            <ArenaSeats ctx={ctx} isPortrait={isPortrait} />
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center'}}>
          {text.seatHint}
        </Typography>
      </Paper>
    </Box>
  )
}
