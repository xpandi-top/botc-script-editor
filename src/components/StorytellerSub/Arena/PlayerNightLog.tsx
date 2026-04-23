// @ts-nocheck
import React from 'react'
import { createPortal } from 'react-dom'
import { Box, Dialog, DialogTitle, DialogContent, IconButton, Typography, Divider, Chip } from '@mui/material'
import type { DayState } from '../types'

interface PlayerNightLogProps {
  open: boolean
  onClose: () => void
  seat: any
  days: DayState[]
  language: string
}

function eventMentionsSeat(detail: string, seatNum: number): boolean {
  // Matches #N at word boundary, handles both actor and target positions
  const pattern = new RegExp(`#${seatNum}(?:\\D|$)`)
  return pattern.test(detail)
}

function formatEventLine(detail: string, language: string): string {
  return detail
}

export function PlayerNightLog({ open, onClose, seat, days, language }: PlayerNightLogProps) {
  if (!seat) return null

  const seatNum = seat.seat
  const seatLabel = seat.name ? `${seatNum}. ${seat.name}` : `#${seatNum}`

  // Build per-day entries, current day first
  const sortedDays = [...days].sort((a, b) => b.day - a.day)

  const dayEntries = sortedDays.map((day) => {
    const events: Array<{ timestamp: number; text: string; kind: string }> = []

    // eventLog entries referencing this seat
    for (const e of day.eventLog) {
      if (eventMentionsSeat(e.detail, seatNum)) {
        events.push({ timestamp: e.timestamp, text: e.detail, kind: e.kind })
      }
    }

    // voteHistory records where seat is actor or target
    for (const v of day.voteHistory) {
      if (v.actor === seatNum || v.target === seatNum) {
        const actorLabel = `#${v.actor}`
        const targetLabel = `#${v.target}`
        const result = v.passed ? (language === 'zh' ? '通过' : 'PASS') : (language === 'zh' ? '失败' : 'FAIL')
        const isExileNote = v.isExile ? (language === 'zh' ? ' [放逐]' : ' [exile]') : ''
        const line = `${actorLabel} → ${targetLabel}: ${result} (${v.voteCount}/${v.requiredVotes})${isExileNote}`
        events.push({ timestamp: v.id ? parseInt(v.id, 10) : 0, text: line, kind: 'vote' })
      }
    }

    // skillHistory records where seat is actor or target
    for (const s of day.skillHistory) {
      if (s.actor === seatNum || (s.targets || []).includes(seatNum)) {
        const targetStr = (s.targets || []).map((t: number) => `#${t}`).join(', ')
        const line = `#${s.actor} → [${targetStr}] ${s.roleId || '?'} (${s.activatedDuringPhase})`
        events.push({ timestamp: parseInt(s.id, 10) || 0, text: line, kind: 'skill' })
      }
    }

    // sort descending by timestamp
    events.sort((a, b) => b.timestamp - a.timestamp)

    return { day: day.day, events }
  }).filter((d) => d.events.length > 0)

  const kindColor = (kind: string) => {
    if (kind === 'vote') return 'primary'
    if (kind === 'skill') return 'secondary'
    if (kind === 'tagChange') return 'warning'
    if (kind === 'stateChange') return 'error'
    return 'default'
  }

  const kindLabel = (kind: string) => {
    if (kind === 'vote') return language === 'zh' ? '投票' : 'vote'
    if (kind === 'skill') return language === 'zh' ? '技能' : 'skill'
    if (kind === 'tagChange') return language === 'zh' ? '标签' : 'tag'
    if (kind === 'stateChange') return language === 'zh' ? '状态' : 'state'
    if (kind === 'phaseTransition') return language === 'zh' ? '阶段' : 'phase'
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
          {language === 'zh' ? `${seatLabel} 事件记录` : `${seatLabel} — Event Log`}
        </Typography>
        <IconButton size="small" onClick={onClose}>✕</IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {dayEntries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            {language === 'zh' ? '暂无记录' : 'No events found for this player.'}
          </Typography>
        ) : (
          dayEntries.map(({ day, events }) => (
            <Box key={day} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, color: 'primary.main' }}>
                {language === 'zh' ? `第 ${day} 天` : `Day ${day}`}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {events.map((e, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                    <Chip
                      label={kindLabel(e.kind)}
                      size="small"
                      color={kindColor(e.kind) as any}
                      sx={{ fontSize: '0.65rem', height: 18, flexShrink: 0, mt: 0.1, '& .MuiChip-label': { px: 0.5 } }}
                    />
                    <Typography variant="body2" sx={{ fontSize: '0.82rem', wordBreak: 'break-word' }}>
                      {e.text}
                    </Typography>
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
