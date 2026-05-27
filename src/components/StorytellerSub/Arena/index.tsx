import type { StorytellerContext } from '../useStoryteller'
import React from 'react'
import { Box, Typography, Paper, useTheme } from '@mui/material'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline'
import HowToVoteIcon from '@mui/icons-material/HowToVote'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import TouchAppIcon from '@mui/icons-material/TouchApp'
import { ArenaCenter } from './ArenaCenter'
import { ArenaSeats } from './ArenaSeats'
import { PlayerSeatGrid } from './PlayerSeatGrid'
import { PhaseControlPanel } from './PhaseControlPanel'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import { BASE_URL } from '../constants'
import type { Phase } from '../types'
import { makeT } from '../../../lib/t'

// Phase atmosphere: CSS filter + base tint color applied to a separate background layer
// so text/content is NOT affected by the filter
const PHASE_ATMOSPHERE_DARK: Record<Phase, { base: string; filter: string }> = {
  night:      { base: '#0B0F1A', filter: 'brightness(0.6) contrast(1.2) saturate(0.7) hue-rotate(-10deg)' },
  private:    { base: '#E8DCC8', filter: 'brightness(1.2) contrast(0.95) saturate(0.9) hue-rotate(10deg)' },
  public:     { base: '#F5EFE6', filter: 'brightness(1.35) contrast(0.9) saturate(0.8)' },
  nomination: { base: '#C9A27A', filter: 'brightness(0.9) contrast(1.15) saturate(1.15) hue-rotate(20deg)' },
}
const PHASE_ATMOSPHERE_LIGHT: Record<Phase, { base: string; filter: string }> = {
  night:      { base: '#0B0F1A', filter: 'brightness(0.72) contrast(1.08) saturate(0.78) hue-rotate(-8deg)' },
  private:    { base: '#E8DCC8', filter: 'brightness(1.05) contrast(0.98) saturate(0.92) hue-rotate(6deg)' },
  public:     { base: '#F5EFE6', filter: 'brightness(1.12) contrast(0.94) saturate(0.88)' },
  nomination: { base: '#C9A27A', filter: 'brightness(0.96) contrast(1.08) saturate(1.08) hue-rotate(12deg)' },
}

/** Absolutely-positioned background layer with CSS filter applied.
 *  Content sits above it (position:relative, zIndex≥1) so filter only
 *  affects the background image, not text or UI elements.
 */
function AtmosphereBackground({
  bgSrc,
  phase,
  isDark,
  position = 'center',
}: {
  bgSrc: string
  phase: Phase
  isDark: boolean
  position?: string
}) {
  const atm = isDark ? PHASE_ATMOSPHERE_DARK[phase] : PHASE_ATMOSPHERE_LIGHT[phase]
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
  const t = makeT(ctx.language)

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

  const { currentDay, setSelectedSeatNumber, setTagPopoutSeat, portraitOverride } = ctx
  const isPortrait = portraitOverride !== null ? portraitOverride : windowPortrait
  const seats = currentDay.seats
  const phase = currentDay.phase as Phase
  const seatCount = seats.length || 1
  const bgSrc = `${BASE_URL}bg-${isDark ? 'dark' : 'light'}.svg`
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
    const hasSeats = seats.length > 0
    return (
      <Box sx={{
        flex: 1, minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Filtered background layer — does NOT affect content */}
        <AtmosphereBackground bgSrc={bgSrc} phase={phase} isDark={isDark} position="center top" />

        {/* Scroll container — explicit top/left/right/bottom (inset shorthand unsupported on older Android WebView) */}
        <Box sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 1,
          overflowY: 'scroll',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}>
          {hasSeats ? (
            <PlayerSeatGrid ctx={ctx} panelCollapsed={panelCollapsed} />
          ) : (
            // Empty state — no game started yet
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
              p: 3,
              textAlign: 'center',
            }}>
              <Typography variant="h6" sx={{ color: 'text.secondary', opacity: 0.8 }}>
                {t('no_game_active')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', opacity: 0.6 }}>
                {t('tap_menu_to_start')}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Phase panel floats above the scroll area */}
        <PhaseControlPanel ctx={ctx} collapsed={panelCollapsed} setCollapsed={setPanelCollapsed} />
      </Box>
    )
  }

  // Desktop / tablet-landscape: circular arena layout
  return (
    <Box sx={{ display: 'grid', gap: 1, flex: 1, minHeight: 400, overflow: 'visible', width: '100%' }}>
      <Paper
        data-tutorial="st-arena"
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
        <AtmosphereBackground bgSrc={bgSrc} phase={phase} isDark={isDark} />

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
            height: '70dvh',
            minHeight: 600,
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
        {/* ── UI Legend ── */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', position: 'relative', zIndex: 1, mt: 0.5, px: 1 }}>
          {([
            { icon: <AutoStoriesIcon sx={{ fontSize: '0.85rem' }} />, key: 'arena_st_setup' },
            { icon: <ViewTimelineIcon sx={{ fontSize: '0.85rem' }} />, key: 'game_log_title' },
            { icon: <HowToVoteIcon sx={{ fontSize: '0.85rem' }} />, key: 'arena_nominations' },
            { icon: <ManageAccountsIcon sx={{ fontSize: '0.85rem' }} />, key: 'arena_edit_roles' },
            { icon: <TouchAppIcon sx={{ fontSize: '0.85rem' }} />, key: 'arena_tap_seat' },
          ] as { icon: React.ReactNode; key: string }[]).map(({ icon, key }) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <Box sx={{ color: 'text.disabled', display: 'flex', alignItems: 'center' }}>{icon}</Box>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.66rem', lineHeight: 1.2 }}>
                {t(key as Parameters<typeof t>[0])}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  )
}
