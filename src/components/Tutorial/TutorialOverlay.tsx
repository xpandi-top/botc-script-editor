import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Button, Fade, Paper, Typography } from '@mui/material'
import { DESKTOP_STEPS, MOBILE_STEPS, TUTORIAL_KEY, type TutorialStep } from './tutorialSteps'
import type { Language } from '../../types'
import { useT } from '../../context/I18nContext'

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

interface TooltipPos {
  top?: number | string
  bottom?: number | string
  left?: number | string
  right?: number | string
  transform?: string
}

interface Props {
  language: Language
  onClose: () => void
  onTabChange: (tab: string) => void
}

const TOOLTIP_W = 320
const TOOLTIP_H_APPROX = 180
const PAD = 12

function getTooltipPos(
  spot: SpotlightRect | null,
  placement: TutorialStep['tooltipPlacement'],
  vw: number,
  vh: number,
): TooltipPos {
  if (!spot || placement === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  const centerX = spot.left + spot.width / 2
  const centerY = spot.top + spot.height / 2

  // Auto-flip if near edge
  let resolved = placement
  if (resolved === 'bottom' && spot.top + spot.height + PAD + TOOLTIP_H_APPROX > vh) resolved = 'top'
  if (resolved === 'top' && spot.top - PAD - TOOLTIP_H_APPROX < 0) resolved = 'bottom'
  if (resolved === 'right' && spot.left + spot.width + PAD + TOOLTIP_W > vw) resolved = 'left'
  if (resolved === 'left' && spot.left - PAD - TOOLTIP_W < 0) resolved = 'right'

  let top: number | string | undefined
  let left: number | string | undefined
  let transform: string | undefined

  if (resolved === 'bottom') {
    top = spot.top + spot.height + PAD
    left = Math.min(Math.max(centerX - TOOLTIP_W / 2, PAD), vw - TOOLTIP_W - PAD)
  } else if (resolved === 'top') {
    top = spot.top - PAD - TOOLTIP_H_APPROX
    left = Math.min(Math.max(centerX - TOOLTIP_W / 2, PAD), vw - TOOLTIP_W - PAD)
  } else if (resolved === 'right') {
    top = Math.min(Math.max(centerY - TOOLTIP_H_APPROX / 2, PAD), vh - TOOLTIP_H_APPROX - PAD)
    left = spot.left + spot.width + PAD
  } else {
    // left
    top = Math.min(Math.max(centerY - TOOLTIP_H_APPROX / 2, PAD), vh - TOOLTIP_H_APPROX - PAD)
    left = spot.left - PAD - TOOLTIP_W
  }

  // Clamp left to avoid overflow
  if (typeof left === 'number') {
    left = Math.max(PAD, Math.min(left, vw - TOOLTIP_W - PAD))
  }
  if (typeof top === 'number') {
    top = Math.max(PAD, top)
  }

  return { top, left, transform }
}

export function TutorialOverlay({ language, onClose, onTabChange }: Props) {
  const isMobile = window.innerWidth < 600
  const steps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS

  const [stepIndex, setStepIndex] = useState(0)
  const [spotRect, setSpotRect] = useState<SpotlightRect | null>(null)
  const [visible, setVisible] = useState(true)
  const [vw, setVw] = useState(window.innerWidth)
  const [vh, setVh] = useState(window.innerHeight)
  const tabChangedRef = useRef(false)

  const currentStep = steps[stepIndex]

  const resolveSpot = useCallback(() => {
    const step = steps[stepIndex]
    if (!step.targetSelector) {
      setSpotRect(null)
      return
    }
    const el = document.querySelector(step.targetSelector)
    if (!el) {
      setSpotRect(null)
      return
    }
    if (step.scrollToTarget) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
    const r = el.getBoundingClientRect()
    setSpotRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [stepIndex, steps])

  // Re-resolve after tab switch gives DOM time to update
  useEffect(() => {
    let raf: number
    let timeout: ReturnType<typeof setTimeout>

    const step = steps[stepIndex]

    // If we need to switch tabs, do it first, then wait for DOM
    if (step.tabToActivate && tabChangedRef.current === false) {
      tabChangedRef.current = true
      onTabChange(step.tabToActivate)
      // Wait for React to re-render the new tab content
      timeout = setTimeout(() => {
        resolveSpot()
      }, 150)
    } else {
      raf = requestAnimationFrame(() => {
        resolveSpot()
      })
    }

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, resolveSpot])

  // Reset tab-changed guard on step change
  useEffect(() => {
    tabChangedRef.current = false
  }, [stepIndex])

  // Handle window resize
  useEffect(() => {
    function onResize() {
      setVw(window.innerWidth)
      setVh(window.innerHeight)
      resolveSpot()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [resolveSpot])

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSkip() {
    localStorage.setItem(TUTORIAL_KEY, '1')
    onClose()
  }

  function handleComplete() {
    localStorage.setItem(TUTORIAL_KEY, '1')
    onClose()
  }

  function handleNext() {
    if (stepIndex >= steps.length - 1) {
      handleComplete()
      return
    }
    setVisible(false)
    setTimeout(() => {
      setStepIndex((i) => i + 1)
      setVisible(true)
    }, 120)
  }

  function handleBack() {
    if (stepIndex === 0) return
    setVisible(false)
    setTimeout(() => {
      setStepIndex((i) => i - 1)
      setVisible(true)
    }, 120)
  }

  const tooltipPos = getTooltipPos(spotRect, currentStep.tooltipPlacement, vw, vh)
  const isLast = stepIndex === steps.length - 1
  const { t } = useT()

  const SPOT_PAD = 6

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        pointerEvents: 'none',
      }}
      aria-label={t('tutorial')}
    >
      {/* Backdrop — blocks clicks on the page but does NOT close on click */}
      <Box
        sx={{ position: 'absolute', inset: 0, pointerEvents: 'all' }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight */}
      {spotRect ? (
        <Box
          sx={{
            position: 'absolute',
            top: spotRect.top - SPOT_PAD,
            left: spotRect.left - SPOT_PAD,
            width: spotRect.width + SPOT_PAD * 2,
            height: spotRect.height + SPOT_PAD * 2,
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
            pointerEvents: 'none',
            transition: 'top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease',
          }}
        />
      ) : (
        // Full-screen dim when no spotlight
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.65)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip card */}
      <Fade in={visible} timeout={200}>
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            width: TOOLTIP_W,
            ...tooltipPos,
            p: 2.5,
            borderRadius: 2,
            zIndex: 1501,
            pointerEvents: 'all',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* Step counter */}
          <Typography variant="caption" sx={{ color: 'text.disabled', alignSelf: 'flex-end' }}>
            {stepIndex + 1} / {steps.length}
          </Typography>

          {/* Title (with optional icon) */}
          {(() => {
            const Icon = currentStep.icon
            return Icon ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Icon sx={{ fontSize: '1.5rem', color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                  {currentStep.title[language]}
                </Typography>
              </Box>
            ) : (
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {currentStep.title[language]}
              </Typography>
            )
          })()}

          {/* Body */}
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
            {currentStep.body[language]}
          </Typography>

          {/* Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Button
              size="small"
              variant="text"
              color="inherit"
              onClick={handleSkip}
              sx={{ color: 'text.disabled', fontSize: '0.75rem', minWidth: 0, px: 1 }}
            >
              {t('skip')}
            </Button>
            <Box sx={{ flex: 1 }} />
            {stepIndex > 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={handleBack}
                sx={{ fontSize: '0.8rem', minWidth: 60 }}
              >
                {t('back')}
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              onClick={handleNext}
              sx={{ fontSize: '0.8rem', minWidth: 70 }}
            >
              {isLast ? (t('done')) : (t('next'))}
            </Button>
          </Box>
        </Paper>
      </Fade>
    </Box>
  )
}
