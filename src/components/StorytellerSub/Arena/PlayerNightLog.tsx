// @ts-nocheck
import type { StorytellerSeat } from '../types'
import React from 'react'
import { createPortal } from 'react-dom'
import {
  Box, Dialog, DialogTitle, DialogContent, IconButton,
  Typography, Divider, Chip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { DayState } from '../types'
import { buildPlayerLogEntries, filterPlayerLogByCurrentPhase } from '../../../utils/playerLog'
import { LogDetailText } from '../LogDetailText'
import { makeT, makeTpl } from '../../../lib/t'

interface PlayerNightLogProps {
  open: boolean
  onClose: () => void
  seat: any
  days: DayState[]
  language: string
  isNight: boolean
}

export function PlayerNightLog({ open, onClose, seat, days, language, isNight }: PlayerNightLogProps) {
  if (!seat) return null

  const t = makeT(language as any)
  const tpl = makeTpl(language as any)
  const seatNum = seat.seat
  const seatLabel = seat.name ? `${seatNum}. ${seat.name}` : `#${seatNum}`

  // Night phase → show all (public + st-only); day phase → public only
  const dayEntries = filterPlayerLogByCurrentPhase(buildPlayerLogEntries(days, seatNum, language as any), isNight)

  const kindColor = (kind: string) => {
    if (kind === 'vote') return 'primary'
    if (kind === 'skill') return 'secondary'
    if (kind === 'tagChange') return 'warning'
    if (kind === 'stateChange') return 'error'
    return 'default'
  }

  const kindLabel = (kind: string) => {
    if (kind === 'vote') return t('vote_label')
    if (kind === 'skill') return t('skill')
    if (kind === 'tagChange') return t('tag')
    if (kind === 'stateChange') return t('state')
    if (kind === 'phaseTransition') return t('phase')
    return kind
  }

  const content = (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2, maxHeight: '80vh' } } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          {tpl('seat_event_log', seatLabel)}
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {dayEntries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            {t('no_events_found_for_this_player')}
          </Typography>
        ) : (
          dayEntries.map(({ day, entries }) => (
            <Box key={day} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, color: 'primary.main' }}>
                {tpl('day_n', day)}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {entries.map((e) => (
                  <Box key={e.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                    <Chip
                      label={kindLabel(e.kind)}
                      size="small"
                      color={kindColor(e.kind) as any}
                      sx={{ fontSize: '0.65rem', height: 18, flexShrink: 0, mt: 0.1, '& .MuiChip-label': { px: 0.5 } }}
                    />
                    {e.visibility === 'st-only' && (
                      <Chip
                        label={t('st')}
                        size="small"
                        color="warning"
                        sx={{ fontSize: '0.65rem', height: 18, flexShrink: 0, mt: 0.1, '& .MuiChip-label': { px: 0.5 } }}
                      />
                    )}
                    <LogDetailText detail={e.text} variant="body2" sx={{ fontSize: '0.82rem' }} />
                  </Box>
                ))}
              </Box>
            </Box>
          ))
        )}
      </DialogContent>
    </Dialog>
  )

  return createPortal(content, document.body)
}
