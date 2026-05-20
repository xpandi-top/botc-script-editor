/**
 * Header — top bar for the AI panel.
 */

import { Box, IconButton, Typography, Chip, Tooltip } from '@mui/material'
import CloseIcon         from '@mui/icons-material/Close'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import SettingsIcon      from '@mui/icons-material/Settings'
import AutoAwesomeIcon   from '@mui/icons-material/AutoAwesome'
import type { AiPanelVariant } from './types'
import type { Language } from '../../types'

type Props = {
  variant: AiPanelVariant
  showSettings: boolean
  setShowSettings: (v: boolean | ((prev: boolean) => boolean)) => void
  hasMessages: boolean
  onClear: () => void
  onClose?: () => void
  language: Language
}

export function Header({ variant, showSettings, setShowSettings, hasMessages, onClear, onClose, language }: Props) {
  const zh = language === 'zh'
  return (
    <Box sx={{
      px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5,
      borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,
      bgcolor: variant === 'embedded' ? 'action.hover' : 'background.paper',
    }}>
      <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 16, flexShrink: 0 }} />
      <Typography sx={{ flex: 1, fontSize: '0.82rem', fontWeight: 700 }}>
        {zh ? 'AI 助手' : 'AI Assistant'}
      </Typography>
      <Chip
        label={zh ? '实验性' : 'EXP'}
        size="small" color="warning" variant="outlined"
        sx={{ fontSize: '0.55rem', height: 15, '& .MuiChip-label': { px: 0.5 } }}
      />
      <Tooltip title={zh ? '设置' : 'Settings'}>
        <IconButton
          size="small"
          onClick={() => setShowSettings((v) => !v)}
          color={showSettings ? 'primary' : 'default'}
          sx={{ p: 0.3 }}
        >
          <SettingsIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={zh ? '清除对话' : 'Clear chat'}>
        <IconButton size="small" onClick={onClear} disabled={!hasMessages} sx={{ p: 0.3 }}>
          <DeleteForeverIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
      {onClose && (
        <IconButton size="small" onClick={onClose} sx={{ p: 0.3 }}>
          <CloseIcon sx={{ fontSize: 15 }} />
        </IconButton>
      )}
    </Box>
  )
}
