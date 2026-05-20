/**
 * AiChatDialog — app-level floating side panel.
 *
 * Thin Dialog wrapper around AiPanelContent.
 * Positioned right edge, non-blocking (hideBackdrop + disableEnforceFocus).
 * For embedded-in-modal usage use AiPanelContent + AiToggleButton directly.
 */

import { Dialog } from '@mui/material'
import { AiPanelContent, type AiChatCallbacks, type AiPanelContentProps } from './AiPanelContent'
import type { AgentContext } from '../lib/agentContext'

export type { AiChatCallbacks }

type Props = {
  open: boolean
  onClose: () => void
  context?: AgentContext
  callbacks?: AiChatCallbacks
  language?: 'en' | 'zh'
}

export function AiChatDialog({ open, onClose, context, callbacks, language = 'en' }: Props) {
  const panelProps: AiPanelContentProps = { open, onClose, context, callbacks, language, variant: 'side' }

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => { if (reason !== 'backdropClick') onClose() }}
      hideBackdrop
      disableEnforceFocus
      disableScrollLock
      sx={{
        pointerEvents: 'none',
        '& .MuiDialog-container': { justifyContent: 'flex-end', alignItems: 'stretch', p: 0 },
      }}
      slotProps={{
        backdrop: { sx: { pointerEvents: 'none' } },
        paper: {
          elevation: 8,
          sx: {
            pointerEvents: 'auto',
            m: 0,
            width: { xs: '100vw', sm: 380 },
            height: '100dvh',
            maxHeight: '100dvh',
            borderRadius: 0,
            borderLeft: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      <AiPanelContent {...panelProps} />
    </Dialog>
  )
}
