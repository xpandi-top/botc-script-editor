// @ts-nocheck
import React from 'react'
import { logDetail } from '../../../utils/logI18n'
import { makeT } from '../../../lib/t'
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
  appendEvent: (d: any, kind: string, detail: string) => any
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
  appendEvent,
  language,
}: NominationVoteListProps) {
  const zh = language === 'zh'
  const t = makeT(language)

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
    updateCurrentDay((d: any) => {
      const seat = d.seats.find((s: any) => s.seat === seatNum)
      const newAlive = !seat?.alive
      const updated = { ...d, seats: d.seats.map((s: any) => s.seat === seatNum ? { ...s, alive: newAlive } : s) }
      return appendEvent(updated, 'stateChange', newAlive ? logDetail.seatAlive(language, seatNum) : logDetail.seatDead(language, seatNum))
    })
  }

  const toggleNoVote = (seatNum: number) => {
    updateCurrentDay((d: any) => {
      const seat = d.seats.find((s: any) => s.seat === seatNum)
      const newHasNoVote = !seat?.hasNoVote
      const updated = { ...d, seats: d.seats.map((s: any) => s.seat === seatNum ? { ...s, hasNoVote: newHasNoVote } : s) }
      return appendEvent(updated, 'stateChange', newHasNoVote ? logDetail.seatNoVote(language, seatNum) : logDetail.seatUnNoVote(language, seatNum))
    })
  }

  return (
    <Box>
      <Typography variant="body1" fontWeight={600} color="text.secondary">
        {t('votes')}{' '}
        <Typography component="span" variant="caption" color="text.disabled">
          {t('vote_hint')}
        </Typography>
      </Typography>

      {(() => {
        // Arch layout: right col = first half ascending (clockwise from nominee+1),
        //              left col  = second half descending (nominee at top, seat 1 near bottom).
        // Reading right-top→right-bottom→left-bottom→left-top traces full clockwise vote order.
        const half = Math.ceil(orderedSeats.length / 2)
        const rightSeats = orderedSeats.slice(0, half)
        const leftSeats  = [...orderedSeats.slice(half)].reverse()
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
              <Tooltip title={isDead ? t('restore_alive') : t('mark_dead')} placement="top" arrow>
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
              <Tooltip title={hasNoVote ? (zh ? '移除无票权' : 'Remove no-vote') : t('set_no_vote')} placement="top" arrow>
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
        {/* Vote threshold + about-to-die row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
          {/* Required votes chip */}
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.4,
            px: 0.75, py: 0.2, borderRadius: 1, fontSize: '0.75rem', fontWeight: 700,
            bgcolor: yesCount >= effectiveRequiredVotes ? 'error.light' : 'action.hover',
            color: yesCount >= effectiveRequiredVotes ? 'error.dark' : 'text.secondary',
            border: '1px solid',
            borderColor: yesCount >= effectiveRequiredVotes ? 'error.main' : 'divider',
            transition: 'all 0.15s ease',
          }}>
            {language === 'zh'
              ? `需 ${effectiveRequiredVotes} 票`
              : `Need ${effectiveRequiredVotes}`}
          </Box>

          {/* Current count */}
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            <strong style={{ color: yesCount >= effectiveRequiredVotes ? 'var(--mui-palette-error-main, #d32f2f)' : 'inherit' }}>
              {yesCount}
            </strong>
            <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.8em' }}> / {effectiveRequiredVotes}</Box>
          </Typography>

          {/* About to die indicator */}
          {yesCount >= effectiveRequiredVotes && yesCount > 0 && (
            <Box sx={{
              px: 0.75, py: 0.2, borderRadius: 1, fontSize: '0.7rem', fontWeight: 800,
              bgcolor: 'error.main', color: 'error.contrastText',
              animation: 'pulse 1.2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.65 },
              },
            }}>
              {language === 'zh' ? '⚡ 即将处决' : '⚡ About to die'}
            </Box>
          )}

          {voteDraft?.isExile && (
            <Box component="span" sx={{ px: 0.75, py: 0.2, bgcolor: 'warning.light', borderRadius: 1, fontSize: '0.75rem', color: 'warning.dark', fontWeight: 700 }}>
              {t('exile')}
            </Box>
          )}
        </Box>

        {/* Progress bar */}
        {effectiveRequiredVotes > 0 && (
          <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(0,0,0,0.08)', overflow: 'hidden', position: 'relative' }}>
            <Box sx={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: `${Math.min(100, (yesCount / effectiveRequiredVotes) * 100)}%`,
              bgcolor: yesCount >= effectiveRequiredVotes ? 'error.main' : 'success.main',
              borderRadius: 4,
              transition: 'width 0.2s ease, background-color 0.2s ease',
            }} />
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Typography variant="caption">{t('vote_count')}</Typography>
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
            {t('reset')}
          </Button>
        )}
      </Box>
    </Box>
  )
}
