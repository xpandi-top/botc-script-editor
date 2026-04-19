import { useEffect } from 'react'
import { Box, Paper } from '@mui/material'
import { LeftScriptPanel } from './StorytellerSub/LeftScriptPanel'
import { CompactToolbar } from './StorytellerSub/CompactToolbar'
import { Arena } from './StorytellerSub/Arena'
import { RightConsole } from './StorytellerSub/RightConsole'
import { Modals } from './StorytellerSub/Modals'
import { useStoryteller } from './StorytellerSub/useStoryteller'
import type { StorytellerHelperProps } from './StorytellerSub/types'

export function StorytellerHelper(props: StorytellerHelperProps) {
  const ctx = useStoryteller(props)

  useEffect(() => {
    document.body.style.overflow = 'visible'
    document.body.style.height = '100vh'
    return () => {
      document.body.style.overflow = ''
      document.body.style.height = ''
    }
  }, [])

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 1,
        flex: 1,
        minHeight: 480,
        minWidth: 520,
        alignItems: 'stretch',
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
  )
}