// @ts-nocheck
import React from 'react'
import { Box, Typography, IconButton, Button, Chip } from '@mui/material'

interface NominationVoteListProps {
  seats: any[]
  voteDraft: any
  votingState: any
  effectiveRequiredVotes: number
  yesCount: number
  votingYesCount: number
  handleVoteToggle: (seatNum: number) => void
  updateCurrentDay: ( updater: (d: any) => any) => void
  language: string
}

export function NominationVoteList({
  seats,
  voteDraft,
  votingState,
  effectiveRequiredVotes,
  yesCount,
  votingYesCount,
  handleVoteToggle,
  updateCurrentDay,
  language,
}: NominationVoteListProps) {
  return (
    <Box>
      <Typography variant="body1" fontWeight={600} color="text.secondary">
        {language === 'zh' ? '投票' : 'Votes'} ({language === 'zh' ? '点击切换' : 'click to toggle'})
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
        {seats.map((s: any) => {
          const voted = votingState?.votes?.[s.seat]
          const isChecked = voted === true || voteDraft?.voters?.includes(s.seat)
          return (
            <Chip
              key={s.seat}
              label={`#${s.seat}`}
              size="medium"
              variant={isChecked ? 'filled' : 'outlined'}
              color={isChecked ? 'success' : 'default'}
              onClick={() => handleVoteToggle(s.seat)}
              sx={{ fontSize: '1rem', fontWeight: 700, height: 36 }}
            />
          )
        })}
      </Box>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {language === 'zh' ? '同意' : 'Yes'}: <strong>{yesCount}</strong> / {effectiveRequiredVotes}
        {voteDraft?.isExile && <Chip size="small" label={language === 'zh' ? '放逐' : 'Exile'} sx={{ ml: 0.5 }} />}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Typography variant="caption">{language === 'zh' ? '票数' : 'Count'}</Typography>
        <IconButton size="small" onClick={() => {
          const cur = voteDraft?.voteCountOverride ?? votingYesCount
          updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, voteCountOverride: Math.max(0, cur - 1) } }))
        }}>−</IconButton>
        <Typography variant="body2">
          {votingYesCount}<small> / {effectiveRequiredVotes}</small>
        </Typography>
        <IconButton size="small" onClick={() => {
          const cur = voteDraft?.voteCountOverride ?? votingYesCount
          updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, voteCountOverride: cur + 1 } }))
        }}>+</IconButton>
        {voteDraft?.voteCountOverride !== null && (
          <Button size="small" onClick={() => updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, voteCountOverride: null } }))}>
            ↺
          </Button>
        )}
      </Box>
    </Box>
  )
}