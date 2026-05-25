// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React from 'react'
import { Box, Typography, Paper, Chip } from '@mui/material'
import { useT } from '../../../context/I18nContext'

export function RightConsoleCompleted({ ctx, toggleConsoleSection }: { ctx: StorytellerContext, toggleConsoleSection: any }) {
  const { t } = useT()
  const { language, gameRecords, loadGameRecord, text } = ctx

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {t('game_records_saved')}
      </Typography>
      <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
        {gameRecords.length ? gameRecords.map((r) => (
          <Paper
            key={r.id}
            onClick={() => r.savedDays ? loadGameRecord(r) : undefined}
            title={r.savedDays ? (t('click_to_load_this_game')) : ''}
            sx={{
              p: 1.5,
              mb: 1,
              cursor: r.savedDays ? 'pointer' : 'default',
              opacity: r.savedDays ? 1 : 0.7,
              '&:hover': r.savedDays ? { bgcolor: 'action.hover' } : {},
              transition: 'background-color 0.2s',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body1" fontWeight={600}>
                {r.recordName || r.scriptTitle || 'BOTC'}
              </Typography>
              <Chip
                size="small"
                label={r.winner ? (t('ended')) : (t('saved'))}
                color={r.winner ? 'error' : 'default'}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block">
              {new Date(r.endedAt).toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {r.days.map((d: any) => `D${d.day}`).join(', ')}
            </Typography>
            {r.winner && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {text.winner}: {r.winner === 'evil' ? text.evil : text.good}
              </Typography>
            )}
            <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
              {t('click_to_load')}
            </Typography>
          </Paper>
        )) : (
          <Typography variant="body2" color="text.secondary">
            {t('no_saved_games')}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
