import React, { useEffect } from 'react'
import { Box, Paper } from '@mui/material'
import { LeftScriptPanel } from './StorytellerSub/LeftScriptPanel'
import { CompactToolbar } from './StorytellerSub/CompactToolbar'
import { MobileTopBar } from './StorytellerSub/MobileTopBar'
import { Arena } from './StorytellerSub/Arena'
import { RightConsole } from './StorytellerSub/RightConsole'
import { Modals } from './StorytellerSub/Modals'
import { useStoryteller } from './StorytellerSub/useStoryteller'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { isIOSSafari } from '../hooks/useAudioState'
import { buildStorytellerContext } from '../lib/ai'
import type { StorytellerHelperProps } from './StorytellerSub/types'

export function StorytellerHelper(props: StorytellerHelperProps) {
  const ctx = useStoryteller(props)
  const { isMobile } = useBreakpoint()
  const { showScriptPanel } = ctx

  // Emit storyteller AI context whenever game state changes
  useEffect(() => {
    if (!props.onAiContextChange) return
    props.onAiContextChange(buildStorytellerContext({
      scriptName: ctx.activeScriptTitle || 'Game',
      stName: ctx.stName || undefined,
      currentDay: ctx.currentDay,
      days: ctx.days,
      language: ctx.language,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.currentDay, ctx.days, ctx.activeScriptTitle, ctx.stName, ctx.language])

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

  // ── Mobile layout ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <audio ref={ctx.audioRef} />
        {ytIframe}
        {iosYtMiniPlayer}
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', mx: { xs: 0, sm: -3 }, mt: { xs: 0, sm: -3 } }}>
          <MobileTopBar ctx={ctx} />
          <LeftScriptPanel ctx={ctx} />
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Arena ctx={ctx} />
          </Box>
          <RightConsole ctx={ctx} />
          <Modals ctx={ctx} />
        </Box>
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
    </>
  )
}
