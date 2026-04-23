import { useEffect } from 'react'
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

  useEffect(() => {
    document.body.style.overflow = isMobile ? 'hidden' : 'auto'
    return () => { document.body.style.overflow = '' }
  }, [isMobile])

  if (isMobile) {
    return (
      <>
        {/* audio at Fragment position 0 — React preserves the DOM node across mobile/desktop switches */}
        <audio ref={ctx.audioRef} />
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

  return (
    <>
      <audio ref={ctx.audioRef} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 1,
          flex: 1,
          minHeight: 480,
          minWidth: 0,
          alignItems: 'stretch',
          overflow: 'auto',
        }}
      >
        <LeftScriptPanel ctx={ctx} />
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            borderRadius: 3,
            background: 'rgba(255,251,245,0.92)',
            border: '1px solid',
            borderColor: 'rgba(23,32,42,0.12)',
            overflow: 'visible',
          }}
        >
          <CompactToolbar ctx={ctx} />
          <Arena ctx={ctx} />
        </Paper>
        <RightConsole ctx={ctx} />
        <Modals ctx={ctx} />
      </Box>
    </>
  )
}
