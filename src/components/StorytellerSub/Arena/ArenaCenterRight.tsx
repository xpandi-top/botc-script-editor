// @ts-nocheck
import React from 'react'
import { Box, Typography, Chip, Paper, Grid } from '@mui/material'

export function ArenaCenterRight({ ctx }: { ctx: any }) {
  const {
    language, text, currentDay,
    aliveCount, totalCount, requiredVotes, effectiveRequiredVotes,
    leadingCandidates, nominatorsThisDay, nomineesThisDay,
    draftPassed, isVotingComplete, votingYesCount,
  } = ctx

  const voteDraft = currentDay?.voteDraft ?? {}

  return (
    <Paper sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.9)' }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Typography variant="body2">
          {text.aliveCount}: <strong>{aliveCount ?? 0}/{totalCount ?? 0}</strong>
        </Typography>
        <Typography variant="body2">
          {text.requiredVotes}: <strong>{requiredVotes ?? 0}</strong>
        </Typography>
      </Box>

      {(leadingCandidates ?? []).length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">{text.leadingCandidate}</Typography>
          {(leadingCandidates ?? []).map((c: any) => (
            <Box key={c.seat} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">#{c.seat} {c.name}</Typography>
              <Typography variant="body2">
                {c.votes}<small>/{effectiveRequiredVotes}</small>
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {currentDay?.phase === 'nomination' && currentDay?.nominationStep === 'waitingForNomination' && (
        <Typography variant="body2" color="text.secondary">
          {voteDraft?.actor
            ? `${text.actor}: #${voteDraft.actor} → ${text.pickNominee}`
            : text.waitingForNomination}
        </Typography>
      )}

      {currentDay?.phase === 'nomination' && currentDay?.nominationStep !== 'waitingForNomination' && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2">
            #{voteDraft?.actor ?? '?'} → #{voteDraft?.target ?? '?'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="h6">
              {votingYesCount ?? 0}<small>/{effectiveRequiredVotes}</small>
            </Typography>
            {voteDraft?.isExile && <Chip label="⚑" size="small" />}
            {isVotingComplete && (
              <Chip 
                label={draftPassed ? text.pass : text.fail} 
                size="small" 
                color={draftPassed ? 'success' : 'error'} 
              />
            )}
          </Box>
        </Box>
      )}

      {(nominatorsThisDay ?? []).length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {text.todayNominators}: {(nominatorsThisDay ?? []).map((s: number) => `#${s}`).join(', ')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {text.todayNominees}: {(nomineesThisDay ?? []).map((s: number) => `#${s}`).join(', ')}
          </Typography>
        </Box>
      )}
    </Paper>
  )
}