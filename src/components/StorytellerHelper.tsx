import { Box, Paper } from '@mui/material'
import { LeftScriptPanel } from './StorytellerSub/LeftScriptPanel'
import { CompactToolbar } from './StorytellerSub/CompactToolbar'
import { MobileTopBar } from './StorytellerSub/MobileTopBar'
import { Arena } from './StorytellerSub/Arena'
import { RightConsole } from './StorytellerSub/RightConsole'
import { Modals } from './StorytellerSub/Modals'
import { useStoryteller } from './StorytellerSub/useStoryteller'
import { useBreakpoint } from '../hooks/useBreakpoint'
import type { StorytellerHelperProps } from './StorytellerSub/types'

export function StorytellerHelper(props: StorytellerHelperProps) {
  const ctx = useStoryteller(props)
  const { isMobile } = useBreakpoint()
  const { showScriptPanel } = ctx

  // Body overflow is managed by App.tsx (which knows the active tab).
  // Do NOT set document.body.style.overflow here — StorytellerHelper is now
  // kept mounted in the background when other tabs are active.

  const ytIframe = ctx.youtubeEmbedSrc && ctx.audioPlaying
    ? <iframe src={ctx.youtubeEmbedSrc} style={{ position: 'absolute', width: 0, height: 0, border: 0, overflow: 'hidden' }} allow="autoplay; encrypted-media" sandbox="allow-scripts allow-same-origin allow-presentation" title="BGM" />
    : null

  // ── Mobile layout ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <audio ref={ctx.audioRef} />
        {ytIframe}
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
