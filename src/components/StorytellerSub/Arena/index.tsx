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

// Phase atmosphere: CSS filter + base tint color applied to a separate background layer
// so text/content is NOT affected by the filter
const PHASE_ATMOSPHERE: Record<Phase, { base: string; filter: string }> = {
  night:      {
    base:   '#0B0F1A',
    filter: 'brightness(0.6) contrast(1.2) saturate(0.7) hue-rotate(-10deg)',
  },
  private:    {
    base:   '#E8DCC8',
    filter: 'brightness(1.2) contrast(0.95) saturate(0.9) hue-rotate(10deg)',
  },
  public:     {
    base:   '#F5EFE6',
    filter: 'brightness(1.35) contrast(0.9) saturate(0.8)',
  },
  nomination: {
    base:   '#C9A27A',
    filter: 'brightness(0.9) contrast(1.15) saturate(1.15) hue-rotate(20deg)',
  },
}

/** Absolutely-positioned background layer with CSS filter applied.
 *  Content sits above it (position:relative, zIndex≥1) so filter only
 *  affects the background image, not text or UI elements.
 */
function AtmosphereBackground({
  bgSrc,
  phase,
  position = 'center',
}: {
  bgSrc: string
  phase: Phase
  position?: string
}) {
  const atm = PHASE_ATMOSPHERE[phase]
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        borderRadius: 'inherit',
        backgroundColor: atm.base,
        backgroundImage: `url('${bgSrc}')`,
        backgroundSize: 'cover',
        backgroundPosition: position,
        filter: atm.filter,
        transition: 'filter 1.2s ease, background-color 1.2s ease',
      }}
    />
  )
}

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
  const phase = currentDay.phase as Phase
  const seatCount = seats.length || 1
  const bgSrc = `/bg-${isDark ? 'dark' : 'light'}.svg`
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
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Filtered background layer — does NOT affect content */}
        <AtmosphereBackground bgSrc={bgSrc} phase={phase} position="center top" />

        {/* Content above the filtered background */}
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <PlayerSeatGrid ctx={ctx} panelCollapsed={panelCollapsed} />
          <PhaseControlPanel ctx={ctx} collapsed={panelCollapsed} setCollapsed={setPanelCollapsed} />
        </Box>
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
          // Background is handled by AtmosphereBackground child — Paper is transparent
          bgcolor: 'transparent',
          boxShadow: isDark ? '0 18px 60px rgba(0,0,0,0.40)' : '0 18px 60px rgba(57,43,24,0.08)',
          overflow: 'visible',
          position: 'relative',
          borderRadius: 2,
        }}
      >
        {/* Filtered background — clipped to Paper border-radius */}
        <AtmosphereBackground bgSrc={bgSrc} phase={phase} />

        {/* Arena content sits above filtered bg */}
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
            zIndex: 1,
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
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {text.seatHint}
        </Typography>
      </Paper>
    </Box>
  )
}
