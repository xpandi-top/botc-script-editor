// @ts-nocheck
import React from 'react'
import { Box, Typography, IconButton, Button, Tooltip } from '@mui/material'
import ReplayIcon from '@mui/icons-material/Replay'
import HeartBrokenIcon from '@mui/icons-material/HeartBroken'
import FavoriteIcon from '@mui/icons-material/Favorite'
import DoNotDisturbOnIcon from '@mui/icons-material/DoNotDisturbOn'
import DoNotDisturbOffIcon from '@mui/icons-material/DoNotDisturbOff'

interface NominationVoteListProps {
  seats: any[]
  voteDraft: any
  votingState: any
  effectiveRequiredVotes: number
  yesCount: number
  votingYesCount: number
  handleVoteToggle: (seatNum: number) => void
  updateCurrentDay: (updater: (d: any) => any) => void
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
  const zh = language === 'zh'

  // ── Reorder: start from seat after nominee, wrap, nominee last ──
  const targetSeat = voteDraft?.target ?? null
  const orderedSeats: any[] = (() => {
    if (targetSeat === null) return seats
    const idx = seats.findIndex((s: any) => s.seat === targetSeat)
    if (idx === -1) return seats
    const after  = seats.slice(idx + 1)
    const before = seats.slice(0, idx)
    const target = seats[idx]
    return [...after, ...before, target]
  })()

  // ── Quick seat-property toggles ─────────────────────────────────
  const toggleAlive = (seatNum: number) => {
    updateCurrentDay((d: any) => ({
      ...d,
      seats: d.seats.map((s: any) =>
        s.seat === seatNum ? { ...s, alive: !s.alive } : s
      ),
    }))
  }

  const toggleNoVote = (seatNum: number) => {
    updateCurrentDay((d: any) => ({
      ...d,
      seats: d.seats.map((s: any) =>
        s.seat === seatNum ? { ...s, hasNoVote: !s.hasNoVote } : s
      ),
    }))
  }

  return (
    <Box>
      <Typography variant="body1" fontWeight={600} color="text.secondary">
        {zh ? '投票' : 'Votes'}{' '}
        <Typography component="span" variant="caption" color="text.disabled">
          {zh ? '（点击名字切换票，†=死亡，⊘=无票权）' : '(name=toggle vote  †=dead  ⊘=no-vote)'}
        </Typography>
      </Typography>

      {(() => {
        const half = Math.ceil(orderedSeats.length / 2)
        const leftSeats = orderedSeats.slice(0, half)
        const rightSeats = [...orderedSeats.slice(half)].reverse()
        const renderPill = (s: any) => {
          const voted    = votingState?.votes?.[s.seat]
          const isVoted  = voted === true || voteDraft?.voters?.includes(s.seat)
          const isDead   = !s.alive
          const hasNoVote = !!s.hasNoVote
          const isNominee = s.seat === targetSeat

          const nameLabel = s.name ? `${s.seat}. ${s.name}` : `#${s.seat}`

          return (
            <Box
              key={s.seat}
              sx={{
                display: 'inline-flex',
                alignItems: 'stretch',
                border: '1.5px solid',
                borderColor: isNominee
                  ? 'warning.main'
                  : isVoted
                    ? 'success.main'
                    : 'divider',
                borderRadius: '20px',
                overflow: 'hidden',
                bgcolor: isVoted ? 'success.light' : 'background.paper',
                transition: 'all 0.12s ease',
              }}
            >
              {/* ── Vote toggle (click name) ── */}
              <Box
                onClick={() => handleVoteToggle(s.seat)}
                sx={{
                  px: 1.75,
                  py: 0.75,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  userSelect: 'none',
                  '&:hover': { bgcolor: isVoted ? 'success.main' : 'action.hover' },
                }}
              >
                <Typography sx={{
                  fontSize: '0.95rem',
                  fontWeight: isNominee ? 800 : 700,
                  lineHeight: 1,
                  textDecoration: isDead ? 'line-through' : 'none',
                  opacity: isDead ? 0.6 : 1,
                  color: isVoted ? 'success.contrastText' : isNominee ? 'warning.dark' : 'text.primary',
                }}>
                  {nameLabel}
                  {isDead && <Box component="span" sx={{ ml: 0.3, fontSize: '0.78rem' }}>†</Box>}
                  {hasNoVote && <Box component="span" sx={{ ml: 0.3, fontSize: '0.72rem', color: isVoted ? 'inherit' : 'warning.dark' }}>∅</Box>}
                </Typography>
              </Box>

              {/* ── Divider ── */}
              <Box sx={{ width: '1px', bgcolor: isVoted ? 'success.main' : 'divider', opacity: 0.5 }} />

              {/* ── Dead toggle ── */}
              <Tooltip title={isDead ? (zh ? '恢复存活' : 'Restore alive') : (zh ? '标记死亡' : 'Mark dead')} placement="top" arrow>
                <IconButton
                  size="small"
                  onClick={() => toggleAlive(s.seat)}
                  sx={{
                    borderRadius: 0,
                    px: 0.75,
                    py: 0,
                    minWidth: 30,
                    color: isDead ? 'text.disabled' : 'error.main',
                    '&:hover': { bgcolor: 'error.light', color: 'error.dark' },
                  }}
                >
                  {isDead
                    ? <HeartBrokenIcon sx={{ fontSize: '1rem' }} />
                    : <FavoriteIcon sx={{ fontSize: '1rem' }} />
                  }
                </IconButton>
              </Tooltip>

              {/* ── NoVote toggle ── */}
              <Tooltip title={hasNoVote ? (zh ? '移除无票权' : 'Remove no-vote') : (zh ? '标记无票权' : 'Set no-vote')} placement="top" arrow>
                <IconButton
                  size="small"
                  onClick={() => toggleNoVote(s.seat)}
                  sx={{
                    borderRadius: 0,
                    px: 0.75,
                    py: 0,
                    minWidth: 30,
                    color: hasNoVote ? 'warning.main' : 'text.disabled',
                    '&:hover': { bgcolor: 'warning.light', color: 'warning.dark' },
                  }}
                >
                  {hasNoVote
                    ? <DoNotDisturbOnIcon sx={{ fontSize: '1rem' }} />
                    : <DoNotDisturbOffIcon sx={{ fontSize: '1rem' }} />
                  }
                </IconButton>
              </Tooltip>
            </Box>
          )
        }
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mt: 0.75 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {leftSeats.map(renderPill)}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {rightSeats.map(renderPill)}
            </Box>
          </Box>
        )
      })()}

      <Box sx={{ mt: 0.75 }}>
        {/* Yes count + label row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="body2">
            {zh ? '同意' : 'Yes'}: <strong>{yesCount}</strong> / {effectiveRequiredVotes}
          </Typography>
          {voteDraft?.isExile && (
            <Box component="span" sx={{ px: 0.75, py: 0.2, bgcolor: 'warning.light', borderRadius: 1, fontSize: '0.75rem', color: 'warning.dark', fontWeight: 700 }}>
              {zh ? '放逐' : 'Exile'}
            </Box>
          )}
        </Box>
        {/* Progress bar */}
        {effectiveRequiredVotes > 0 && (
          <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.08)', overflow: 'hidden', position: 'relative' }}>
            <Box sx={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: `${Math.min(100, (yesCount / effectiveRequiredVotes) * 100)}%`,
              bgcolor: yesCount >= effectiveRequiredVotes ? 'error.main' : 'success.main',
              borderRadius: 3,
              transition: 'width 0.2s ease, background-color 0.2s ease',
            }} />
            {/* Required threshold marker */}
            <Box sx={{
              position: 'absolute', top: 0, bottom: 0,
              left: '100%',
              width: 2, bgcolor: 'error.dark',
              transform: 'translateX(-2px)',
            }} />
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Typography variant="caption">{zh ? '票数' : 'Count'}</Typography>
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
          <Button size="small"
            onClick={() => updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, voteCountOverride: null } }))}
            startIcon={<ReplayIcon fontSize="small" />}
          >
            {zh ? '重置' : 'Reset'}
          </Button>
        )}
      </Box>
    </Box>
  )
}
