// @ts-nocheck
import React from 'react'
import { Box, Typography, Paper, Chip } from '@mui/material'

export function RightConsoleCompleted({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { language, gameRecords, loadGameRecord, text } = ctx

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {language === 'zh' ? '已保存的游戏' : 'Saved Games'}
      </Typography>
      <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
        {gameRecords.length ? gameRecords.map((r) => (
          <Paper
            key={r.id}
            onClick={() => r.savedDays ? loadGameRecord(r) : undefined}
            title={r.savedDays ? (language === 'zh' ? '点击加载此游戏' : 'Click to load this game') : ''}
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
                label={r.winner ? (language === 'zh' ? '已结束' : 'Ended') : (language === 'zh' ? '已保存' : 'Saved')}
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
              {language === 'zh' ? '↻ 点击加载' : '↻ Click to load'}
            </Typography>
          </Paper>
        )) : (
          <Typography variant="body2" color="text.secondary">
            {language === 'zh' ? '暂无保存的游戏' : 'No saved games'}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
