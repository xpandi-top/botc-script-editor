// @ts-nocheck
import React from 'react'
import { Box, Button, Typography, Paper, TextField, Chip, Grid } from '@mui/material'
import { createDefaultVoteDraft } from '../constants'

export function RightConsoleDay({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { 
    language, text, activeConsoleSections, 
    currentDay, updateCurrentDay, timerDefaults,
    pickerMode, setPickerMode,
    addTravelerSeat, votingYesCount, requiredVotes,
    isVotingComplete, setDialogState, draftPassedBySystem,
  } = ctx
  const isOpen = activeConsoleSections?.has('day')

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Button fullWidth onClick={() => toggleConsoleSection('day')} sx={{ justifyContent: 'space-between', textTransform: 'none' }}>
        <Typography variant="body2">{text.daySection}</Typography>
        <span>{isOpen ? '▼' : '▶'}</span>
      </Button>
      {isOpen && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
          <Box>
            <Button size="small" variant="outlined" onClick={addTravelerSeat}>
              {text.addTraveler}
            </Button>
          </Box>

          {currentDay?.phase === 'nomination' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">{text.nomination}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button size="small" variant="outlined" onClick={() => setPickerMode('nominator')}>
                  {text.pickNominator}
                </Button>
                <Button size="small" variant="outlined" onClick={() => setPickerMode('nominee')}>
                  {text.pickNominee}
                </Button>
              </Box>
              
              <Grid container spacing={1}>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">{text.actor}</Typography>
                  <Typography variant="body2">#{currentDay?.voteDraft?.actor ?? '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">{text.target}</Typography>
                  <Typography variant="body2">#{currentDay?.voteDraft?.target ?? '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">{text.requiredVotes}</Typography>
                  <Typography variant="body2">{requiredVotes ?? 0}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">{text.voters}</Typography>
                  <Chip size="small" label={votingYesCount ?? 0} color="success" />
                </Grid>
              </Grid>

              <TextField
                size="small"
                fullWidth
                label={text.note}
                value={currentDay?.voteDraft?.note ?? ''}
                onChange={(e) => updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, note: e.target.value } }))}
              />

              {isVotingComplete && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Button size="small" onClick={() => setDialogState({ kind: 'voteResult', nextValue: true, systemValue: draftPassedBySystem })}>
                    {text.systemOverridePass}
                  </Button>
                  <Button size="small" onClick={() => setDialogState({ kind: 'voteResult', nextValue: false, systemValue: draftPassedBySystem })}>
                    {text.systemOverrideFail}
                  </Button>
                  <Button size="small" onClick={() => updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, manualPassed: null } }))}>
                    {text.clearOverride}
                  </Button>
                </Box>
              )}

              <Button size="small" onClick={() => {
                updateCurrentDay((d: any) => ({ ...d, nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults?.nominationWaitSeconds ?? 0, voteDraft: createDefaultVoteDraft(), votingState: null }))
                setPickerMode('nominator')
              }}>
                {text.clear}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  )
}