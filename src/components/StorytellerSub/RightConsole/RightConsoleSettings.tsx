// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React from 'react'
import { Box, Button, TextField, Typography, Paper, Grid } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { makeT } from '../../../lib/t'

export function RightConsoleSettings({ ctx, toggleConsoleSection }: { ctx: StorytellerContext, toggleConsoleSection: any }) {
  const { language, text, activeConsoleSections, timerDefaults, setTimerDefaults, stName, setStName } = ctx
  const zh = language === 'zh'
  const t = makeT(language)
  const isOpen = activeConsoleSections?.has('settings')

  const handleChange = (key: string, value: string) => {
    setTimerDefaults((c: any) => ({ ...c, [key]: Number(value) || 0 }))
  }

  const fields = [
    { key: 'privateSeconds', label: text.privateDefault },
    { key: 'publicFreeSeconds', label: text.publicFreeDefault },
    { key: 'publicRoundRobinSeconds', label: text.publicRoundRobinDefault },
    { key: 'nominationDelayMinutes', label: text.nominationDelayDefault },
    { key: 'nominationWaitSeconds', label: text.nominationWaitDefault },
    { key: 'nominationActorSeconds', label: text.actorSpeechDefault },
    { key: 'nominationTargetSeconds', label: text.targetSpeechDefault },
    { key: 'nominationVoteSeconds', label: text.voteDefault },
  ]

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Button fullWidth onClick={() => toggleConsoleSection('settings')} sx={{ justifyContent: 'space-between', textTransform: 'none' }}>
        <Typography variant="body2">{text.settings}</Typography>
        {isOpen ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      </Button>
      {isOpen && (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* ST Name */}
          <TextField
            size="small"
            fullWidth
            label={t('storyteller_name')}
            placeholder={t('enter_st_name')}
            value={stName ?? ''}
            onChange={(e) => setStName(e.target.value)}
          />

          {/* Timer defaults */}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('timer_defaults')}
          </Typography>
          <Grid container spacing={1}>
            {fields.map((f) => (
              <Grid key={f.key} size={{ xs: 6 }}>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  label={f.label}
                  value={timerDefaults?.[f.key] ?? 0}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Paper>
  )
}
