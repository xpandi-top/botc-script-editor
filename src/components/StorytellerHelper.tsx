import React, { useEffect } from 'react'
import { Box, Paper } from '@mui/material'
import { LeftScriptPanel } from './StorytellerSub/LeftScriptPanel'
import { CompactToolbar } from './StorytellerSub/CompactToolbar'
import { MobileTopBar } from './StorytellerSub/MobileTopBar'
import { Arena } from './StorytellerSub/Arena'
import { RightConsole } from './StorytellerSub/RightConsole'
import { Modals } from './StorytellerSub/Modals'
import { CommunicationBoardFab } from './StorytellerSub/CommunicationBoard'
import { useStoryteller } from './StorytellerSub/useStoryteller'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { isIOSSafari } from '../hooks/useAudioState'
import { buildStorytellerContext } from '../lib/ai'
import type { StorytellerHelperProps } from './StorytellerSub/types'

export function StorytellerHelper(props: StorytellerHelperProps) {
  const ctx = useStoryteller(props)
  const { isMobile, isTablet } = useBreakpoint()
  const { showScriptPanel } = ctx

  // Mirror Arena's portrait detection so StorytellerHelper uses the same
  // layout breakpoint: mobile OR (tablet + portrait) → full-screen mobile layout
  const [isPortrait, setIsPortrait] = React.useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true
  )
  React.useEffect(() => {
    const handler = () => setIsPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const useMobileLayout = isMobile || (isTablet && isPortrait)

  // Emit storyteller AI context whenever game state changes
  useEffect(() => {
    if (!props.onAiContextChange) return
    const activeScript = props.scriptOptions?.find((s) => s.slug === ctx.activeScriptSlug)
    props.onAiContextChange(buildStorytellerContext({
      scriptName: ctx.activeScriptTitle || 'Game',
      stName: ctx.stName || undefined,
      currentDay: ctx.currentDay,
      days: ctx.days,
      language: ctx.language,
      scriptCharacters: ctx.currentScriptCharacters,
      pinnedRevisions: activeScript?.pinnedRevisions,
      stFabledIds: ctx.stFabledIds,
      stCustomRules: ctx.stCustomRules || undefined,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.currentDay, ctx.days, ctx.activeScriptTitle, ctx.stName, ctx.language,
      ctx.currentScriptCharacters, ctx.stFabledIds, ctx.stCustomRules, ctx.activeScriptSlug])

  // Body overflow is managed by App.tsx (which knows the active tab).
  // Do NOT set document.body.style.overflow here — StorytellerHelper is now
  // kept mounted in the background when other tabs are active.

  // ── YouTube BGM iframe ────────────────────────────────────────────────────────
  //
  // Desktop: mount/unmount hidden iframe with autoplay=1.
  //
  // iOS Safari: cross-origin iframe autoplay is blocked even within user gestures.
  //   Strategy A — off-screen real-size iframe created synchronously in gesture
  //                (sendYTCommand in useAudioState). This MAY work on some iOS versions.
  //   Strategy B — visible mini-player (160×90 corner overlay) that the user can
  //                tap once if Strategy A failed. Shown whenever audioPlaying + YouTube.
  //
  let ytIframe: React.ReactNode = null
  if (ctx.youtubeEmbedSrc && !isIOSSafari && ctx.audioPlaying) {
    ytIframe = (
      <iframe
        src={ctx.youtubeEmbedSrc + '&autoplay=1'}
        style={{ position: 'absolute', width: 0, height: 0, border: 0, overflow: 'hidden' }}
        allow="autoplay; encrypted-media"
        title="BGM"
      />
    )
  }

  // iOS persistent mini-player — stays mounted so postMessage (pause/resume) works
  // after the user has tapped ▶ once inside the player.
  //
  // - visibility:hidden (NOT display:none) when paused keeps the iframe alive.
  // - sandbox without allow-top-navigation prevents tap → YouTube app redirect.
  // - key remounts (reloads YouTube) when the track changes.
  // - ref=ctx.ytIframeRef connects sendYTCommand postMessage to this element.
  const iosYtMiniPlayer = isIOSSafari && ctx.youtubeEmbedSrc ? (
    <Box sx={{
      position: 'fixed', bottom: 'calc(56px + var(--safe-bottom, 0px))', right: 8,
      // z-index 1250: above app bar (1100) but BELOW MUI Dialog (1300) so modals stay on top
      zIndex: 1250, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25,
      visibility: ctx.audioPlaying ? 'visible' : 'hidden',
      pointerEvents: ctx.audioPlaying ? 'auto' : 'none',
    }}>
      <Box sx={{ width: 112, height: 63, borderRadius: 1, overflow: 'hidden', boxShadow: 3, opacity: 0.85 }}>
        <iframe
          ref={ctx.ytIframeRef}
          key={ctx.youtubeEmbedSrc}
          src={ctx.youtubeEmbedSrc + '&playsinline=1&enablejsapi=1'}
          width="112"
          height="63"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          // sandbox blocks allow-top-navigation → prevents tap opening YouTube app
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups-to-escape-sandbox"
          allowFullScreen
          style={{ border: 'none', display: 'block' }}
          title="YouTube BGM"
        />
      </Box>
    </Box>
  ) : null

  // ── Mobile / tablet-portrait layout ──────────────────────────
  // On phone (isMobile): Tabs bar hidden in App.tsx → full screen available.
  //   Use position:fixed so dimensions come from viewport, not from the parent
  //   Container (which can have gutters/margins that inflate width on some devices).
  // On tablet portrait: Tabs bar (~48px) is visible → subtract it via 100vh calc.
  if (useMobileLayout) {
    // Phone: fixed overlay that exactly matches viewport — immune to parent Container width bugs.
    // Tablet portrait: regular flow with explicit height (tabs bar still visible).
    const outerSx = isMobile ? {
      position: 'fixed' as const,
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'grid',
      // '100%' column: forces single column = exact container width (= viewport width).
      // Without this, auto column can grow wider than the container if any child overflows.
      gridTemplateColumns: '100%',
      gridTemplateRows: 'auto 1fr',
      // zIndex 10: above normal page content, below MUI Dialogs (1300) and bottom nav (1100)
      // RightConsole/Modals render as portals at body level so they're unaffected.
      zIndex: 10,
      overflow: 'hidden',
    } : {
      display: 'grid',
      gridTemplateColumns: '100%',
      gridTemplateRows: 'auto 1fr',
      // dvh unsupported on older Android WebViews; vh === dvh in Capacitor (no URL bar)
      height: 'calc(100vh - 48px)',
      overflow: 'hidden',
      maxWidth: '100vw',
      mx: { sm: -3 },
      mt: { sm: -3 },
    }
    return (
      <>
        <audio ref={ctx.audioRef} />
        {ytIframe}
        {iosYtMiniPlayer}
        {/* CSS grid with explicit rows: topbar auto-sizes, Arena gets all remaining space.
            grid 1fr row is more reliable than flex:1 on older Android WebViews. */}
        <Box
          data-mobile-outer
          sx={outerSx}
        >
          {/* Row 1: topbar (auto height). minWidth:0 prevents grid blowout. */}
          <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
            <MobileTopBar ctx={ctx} />
            <LeftScriptPanel ctx={ctx} />
          </Box>
          {/* Row 2: Arena fills remaining 1fr.
              overflow:visible so circle overlaps (negative margins) aren't clipped;
              Arena itself has overflow:hidden internally.
              minWidth:0 prevents grid blowout. */}
          <Box sx={{ position: 'relative', overflow: 'visible', minHeight: 0, minWidth: 0 }}>
            <Arena ctx={ctx} />
          </Box>
        </Box>
        <RightConsole ctx={ctx} />
        <Modals ctx={ctx} />
        <CommunicationBoardFab scriptCharacters={ctx.currentScriptCharacters} language={ctx.language} />
      </>
    )
  }

  // ── Desktop / tablet layout — 2 or 3 column grid ─────────────
  // Left panel: inline sidebar when showScriptPanel; else hidden (toggled by toolbar)
  // Middle: Arena in Paper
  // Right: RightConsole (drawer-based for now, Task 6 will make it inline)
  return (
    <>
      <audio ref={ctx.audioRef} />
      {ytIframe}
      {iosYtMiniPlayer}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: showScriptPanel
            ? { xs: '1fr', md: '240px 1fr auto', lg: '260px 1fr auto' }
            : { xs: '1fr', md: '1fr auto' },
          gap: 1,
          flex: 1,
          minHeight: 480,
          minWidth: 0,
          alignItems: 'stretch',
          overflow: 'auto',
          transition: 'grid-template-columns 0.2s ease',
          maxHeight: '90dvh',
        }}
      >
        {/* Left script panel — inline sidebar on desktop */}
        {showScriptPanel && (
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', minHeight: 480, maxHeight: '80vh', position: 'sticky', top: 0 }}>
            <LeftScriptPanel ctx={ctx} inlineMode />
          </Box>
        )}
        {/* Drawer fallback on sm (below md) */}
        <LeftScriptPanel ctx={ctx} />

        {/* Center: Arena */}
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'visible',
            position: 'relative',
            minWidth: 0,
          }}
        >
          {/* Watermark */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 280,
              height: 280,
              opacity: 0.06,
              pointerEvents: 'none',
              zIndex: 0,
              backgroundImage: 'url(/icons/icon-256.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          />
          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
            <CompactToolbar ctx={ctx} />
            <Arena ctx={ctx} />
          </Box>
        </Paper>

        <RightConsole ctx={ctx} />
        <Modals ctx={ctx} />
      </Box>
      <CommunicationBoardFab scriptCharacters={ctx.currentScriptCharacters} language={ctx.language} />
    </>
  )
}
