/**
 * LogTab — fill log entries with undo support and download button.
 */

import { Box, Chip, IconButton, Paper, Tooltip, Typography } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import UndoIcon     from '@mui/icons-material/Undo'
import type { FillLogEntry } from '../../lib/fillLog'
import type { Language } from '../../types'
import { useT } from '../../context/I18nContext'

type Props = {
  fillLog: FillLogEntry[]
  undoFill: (entry: FillLogEntry) => void
  downloadLog: () => void
  language: Language
}

export function LogTab({ fillLog, undoFill, downloadLog }: Props) {
  const { t, tpl } = useT()

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, fontWeight: 600 }}>
          {tpl('fill_log_n', fillLog.length)}
        </Typography>
        {fillLog.length > 0 && (
          <Tooltip title={t('export_markdown')}>
            <IconButton size="small" onClick={downloadLog} sx={{ p: 0.3 }}>
              <DownloadIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {fillLog.length === 0 && (
        <Typography variant="caption" color="text.disabled">
          {t('ai_no_fills')}
        </Typography>
      )}

      {fillLog.map((entry) => (
        <Paper
          key={entry.id}
          variant="outlined"
          sx={{ p: 0.625, borderRadius: 1, opacity: entry.undone ? 0.4 : 1 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              size="small" label={entry.fieldLabel}
              sx={{ fontSize: '0.58rem', height: 15, flexShrink: 0 }}
            />
            <Typography variant="caption" sx={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: 'text.secondary',
              textDecoration: entry.undone ? 'line-through' : 'none',
            }}>
              {String(entry.newValue)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0, fontSize: '0.58rem' }}>
              {new Date(entry.timestamp).toLocaleTimeString()}
            </Typography>
            {!entry.undone && (
              <Tooltip title={t('undo')}>
                <IconButton size="small" onClick={() => undoFill(entry)} sx={{ p: 0.1 }}>
                  <UndoIcon sx={{ fontSize: 11 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Paper>
      ))}
    </Box>
  )
}
