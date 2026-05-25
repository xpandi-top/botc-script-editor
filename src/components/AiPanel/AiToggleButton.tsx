/**
 * AiToggleButton — standalone toggle with EXP badge.
 */

import { Box, IconButton, Tooltip } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import type { Language } from '../../types'
import { useT } from '../../context/I18nContext'

type Props = {
  open: boolean
  onToggle: () => void
  language?: Language
}

export function AiToggleButton({ open, onToggle, language = 'en' }: Props) {
  const zh = language === 'zh'
  const { t } = useT()
  return (
    <Tooltip
      title={zh
        ? (open ? '关闭 AI 助手' : 'AI 助手（实验）')
        : (open ? 'Close AI Assistant' : 'AI Assistant (Experimental)')}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
        <IconButton
          size="small"
          onClick={onToggle}
          color={open ? 'primary' : 'default'}
          sx={{
            p: 0.5,
            border: open ? '1px solid' : '1px solid transparent',
            borderColor: open ? 'primary.main' : 'transparent',
            borderRadius: 1,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 17 }} />
        </IconButton>
        {!open && (
          <Box sx={{
            position: 'absolute', top: -3, right: -3,
            bgcolor: 'warning.main', color: 'warning.contrastText',
            fontSize: '0.48rem', fontWeight: 700, px: 0.35, py: 0.05,
            borderRadius: 0.5, lineHeight: 1.5, pointerEvents: 'none',
          }}>
            {t('exp')}
          </Box>
        )}
      </Box>
    </Tooltip>
  )
}
