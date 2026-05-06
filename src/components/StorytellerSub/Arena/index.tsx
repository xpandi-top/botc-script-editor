import type { StorytellerContext } from '../useStoryteller'
import React from 'react'
import { Box, Typography, Paper, useTheme } from '@mui/material'
import { ArenaCenter } from './ArenaCenter'
import { ArenaSeats } from './ArenaSeats'
import { PlayerSeatGrid } from './PlayerSeatGrid'
import { PhaseControlPanel } from './PhaseControlPanel'
import { getSeatAngle as _getSeatAngle } from '../../../utils/seats'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import type { Phase } from '../types'

// Phase-based atmosphere overlay gradients
// Each phase has a distinct time-of-day feel layered over the background image
const PHASE_OVERLAY_DARK: Record<Phase, string> = {
  night:       'linear-gradient(160deg, rgba(5,8,28,0.78) 0%, rgba(12,18,50,0.72) 100%)',
  private:     'linear-gradient(160deg, rgba(255,140,60,0.28) 0%, rgba(255,190,120,0.20) 100%)',
  public:      'linear-gradient(160deg, rgba(255,220,140,0.18) 0%, rgba(240,200,120,0.12) 100%)',
  nomination:  'linear-gradient(160deg, rgba(180,80,10,0.50) 0%, rgba(140,55,5,0.60) 100%)',
}
const PHASE_OVERLAY_LIGHT: Record<Phase, string> = {
  night:       'linear-gradient(160deg, rgba(8,12,40,0.60) 0%, rgba(15,22,60,0.55) 100%)',
  private:     'linear-gradient(160deg, rgba(255,160,80,0.20) 0%, rgba(255,200,140,0.14) 100%)',
  public:      'linear-gradient(160deg, rgba(255,235,170,0.10) 0%, rgba(240,215,140,0.06) 100%)',
  nomination:  'linear-gradient(160deg, rgba(200,95,15,0.38) 0%, rgba(160,70,8,0.45) 100%)',
}

// Transition duration for smooth atmosphere changes
const ATMOSPHERE_TRANSITION = 'background-image 1.2s ease, background 1.2s ease'

export function Arena({ ctx }: { ctx: StorytellerContext }) {
  const muiTheme = useTheme()
  const isDark = muiTheme.palette.mode === 'dark'

  const [windowPortrait, setWindowPortrait] = React.useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  )
  React.useEffect(() => {
    const handler = () => setWindowPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Lifted state: both PlayerSeatGrid and PhaseControlPanel need this to sync clearance
  const [panelCollapsed, setPanelCollapsed] = React.useState(false)

  const { currentDay, setSelectedSeatNumber, setTagPopoutSeat, text, portraitOverride } = ctx
  const isPortrait = portraitOverride !== null ? portraitOverride : windowPortrait
  const seats = currentDay.seats
  const phase = currentDay.phase
  const phaseOverlay = isDark ? PHASE_OVERLAY_DARK[phase] : PHASE_OVERLAY_LIGHT[phase]
  const seatCount = seats.length || 1
  const { isMobile, isTablet } = useBreakpoint()

  // Tablet portrait: use list layout (circular arena too cramped)
  const useListLayout = isMobile || (isTablet && isPortrait)

  React.useEffect(() => {
    const minSize = 75
    const maxSize = 150
    const baseSize = isPortrait ? 100 : 130
    const scaleFactor = Math.max(1, (seatCount - 4) / 3)
    const seatSize = Math.min(maxSize, Math.max(minSize, baseSize / scaleFactor))
    document.documentElement.style.setProperty('--seat-size', `${seatSize}px`)

    const padBase = 8
    const padExtra = seatCount > 10 ? Math.min(6, (seatCount - 10) * 0.5) : 0
    const seatPadding = padBase + padExtra
    const centerZone = Math.max(25, Math.min(38, seatPadding + 18))
    document.documentElement.style.setProperty('--center-zone', `${centerZone}%`)
  }, [seatCount, isPortrait])

  // Mobile / tablet-portrait: scrollable seat grid + fixed phase panel at bottom
  if (useListLayout) {
    return (
      <Box sx={{
        flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
        backgroundImage: `${phaseOverlay}, url('/bg-${isDark ? 'dark' : 'light'}.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'local',
        transition: ATMOSPHERE_TRANSITION,
      }}>
        <PlayerSeatGrid ctx={ctx} panelCollapsed={panelCollapsed} />
        <PhaseControlPanel ctx={ctx} collapsed={panelCollapsed} setCollapsed={setPanelCollapsed} />
      </Box>
    )
  }

  // Desktop / tablet-landscape: circular arena layout
  return (
    <Box sx={{ display: 'grid', gap: 1, flex: 1, minHeight: 400, overflow: 'visible', width: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          minHeight: 380,
          backgroundImage: `${phaseOverlay}, url('/bg-${isDark ? 'dark' : 'light'}.svg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: ATMOSPHERE_TRANSITION,
          boxShadow: isDark ? '0 18px 60px rgba(0,0,0,0.40)' : '0 18px 60px rgba(57,43,24,0.08)',
          overflow: 'visible',
          position: 'relative',
        }}
      >
        <Box
          onClick={(e) => {
            const target = e.target as Element
            if (
              !target.closest('[data-seat]') &&
              !target.closest('[data-tag-popup]') &&
              !target.closest('[data-skill-popup]') &&
              !target.closest('[data-character-popup]') &&
              !target.closest('[data-nomination-popup]')
            ) {
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
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
          {text.seatHint}
        </Typography>
      </Paper>
    </Box>
  )
}
