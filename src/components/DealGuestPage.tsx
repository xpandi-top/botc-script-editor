/**
 * DealGuestPage — player-facing seat self-claim UI.
 *
 * Flow:
 *  1. Load session metadata + seat grid
 *  2. Player taps an open seat → enters name → claims it
 *  3. ST pushes a character onto the claimed seat later (random or manual);
 *     this page updates live; the character stays hidden until explicitly opened
 *  4. Re-open link → restored as player control page; character stays hidden
 */
import { lazy, Suspense, useEffect, useState, useCallback, type ReactNode } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, LinearProgress, Paper, TextField, Typography,
} from '@mui/material'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import LockIcon from '@mui/icons-material/Lock'
import PersonIcon from '@mui/icons-material/Person'
import EventSeatIcon from '@mui/icons-material/EventSeat'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import {
  getDealSession,
  getGuestToken,
  markDealCharacterSeen,
  subscribeActiveDealVote,
  subscribeDealVoteResponses,
  submitDealVoteResponse,
  getSeatClaims,
  subscribeSeatClaims,
  findClaimedSeat,
  claimSeat,
  type DealSession,
  type DealSeatClaim,
  type DealVoteSession,
  type DealVoteResponseRecord
} from '../lib/DealSession'
import { useT } from '../context/I18nContext'
import { makeTpl } from '../lib/t'
import { formatSeatLabel, getCurrentDealVoter, summarizeDealVote } from '../utils/votes'

const DealCharacterReveal = lazy(() => import('./DealCharacterReveal').then(m => ({ default: m.DealCharacterReveal })))
const DealMessagePanel = lazy(() => import('./DealMessagePanel').then(m => ({ default: m.DealMessagePanel })))

interface Props {
  sessionId: string
  language: 'en' | 'zh'
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'expired' }
  | { kind: 'closed' }
  | { kind: 'seatGrid'; session: DealSession; seats: DealSeatClaim[]; claiming: number | null; message?: string }
  | { kind: 'seatClaimed'; seat: DealSeatClaim; revealCharacter: boolean }

export function DealGuestPage({ sessionId, language }: Props) {
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [activeVote, setActiveVote] = useState<DealVoteSession | null>(null)
  const [voteResponses, setVoteResponses] = useState<DealVoteResponseRecord[]>([])
  const [voteNow, setVoteNow] = useState(() => Date.now())
  const [voteSubmitting, setVoteSubmitting] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [namingSeat, setNamingSeat] = useState<number | null>(null)
  const [seatNameDraft, setSeatNameDraft] = useState('')
  const [seatNameSubmitted, setSeatNameSubmitted] = useState(false)
  const { t } = useT()
  const tpl = makeTpl(language)

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const session = await getDealSession(sessionId)
      if (!session) { setState({ kind: 'expired' }); return }
      if (session.status === 'closed') { setState({ kind: 'closed' }); return }
      if (session.totalSeats == null) { setState({ kind: 'expired' }); return }

      const guestToken = getGuestToken()
      const alreadyClaimedSeat = await findClaimedSeat(sessionId, guestToken)
      if (alreadyClaimedSeat) {
        setState({ kind: 'seatClaimed', seat: alreadyClaimedSeat, revealCharacter: false })
        return
      }
      const seats = await getSeatClaims(sessionId)
      setState({ kind: 'seatGrid', session, seats, claiming: null })
    } catch (e: unknown) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }, [sessionId])

  useEffect(() => { load() }, [load])

  // Keep the seat grid live so guests see seats fill in as others claim them.
  useEffect(() => {
    if (state.kind !== 'seatGrid') return
    return subscribeSeatClaims(sessionId, (seats) => {
      setState((cur) => (cur.kind === 'seatGrid' ? { ...cur, seats } : cur))
    })
  }, [sessionId, state.kind])

  // Live assignments stay hidden until the player explicitly opens the card.
  useEffect(() => {
    if (state.kind !== 'seatClaimed') return
    const mySeatNumber = state.seat.seatNumber
    return subscribeSeatClaims(sessionId, (seats) => {
      const mine = seats.find((s) => s.seatNumber === mySeatNumber)
      if (!mine) return
      setState((cur) => {
        if (cur.kind !== 'seatClaimed') return cur
        const changedCharacter = cur.seat.characterId !== mine.characterId || cur.seat.secondCharacterId !== mine.secondCharacterId
        return { kind: 'seatClaimed', seat: mine, revealCharacter: changedCharacter ? false : cur.revealCharacter }
      })
    })
  }, [sessionId, state.kind === 'seatClaimed' ? state.seat.seatNumber : null])

  useEffect(() => {
    if (state.kind !== 'seatClaimed') {
      setActiveVote(null)
      setVoteResponses([])
      return
    }
    let lastActiveVoteId: string | null = null
    return subscribeActiveDealVote(sessionId, vote => {
      // Batch the vote and visibility updates so the card is already hidden
      // in the first frame showing a new nomination.
      if (vote?.status === 'active' && vote.voteId !== lastActiveVoteId) {
        setState(cur => cur.kind === 'seatClaimed' ? { ...cur, revealCharacter: false } : cur)
        lastActiveVoteId = vote.voteId
      }
      setActiveVote(vote)
    })
  }, [sessionId, state.kind])

  useEffect(() => {
    if (!activeVote) {
      setVoteResponses([])
      return
    }
    return subscribeDealVoteResponses(sessionId, activeVote.voteId, setVoteResponses)
  }, [sessionId, activeVote?.voteId])

  useEffect(() => {
    if (!activeVote) return
    const timer = window.setInterval(() => setVoteNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [activeVote])

  const handleOpenSeatNaming = (seatNumber: number) => {
    if (state.kind !== 'seatGrid' || state.claiming !== null) return
    setNamingSeat(seatNumber)
    setSeatNameDraft('')
    setSeatNameSubmitted(false)
  }

  const handleConfirmSeatClaim = async () => {
    if (state.kind !== 'seatGrid' || namingSeat == null) return
    setSeatNameSubmitted(true)
    if (!seatNameDraft.trim()) return
    const currentGrid = state
    setState({ ...state, claiming: namingSeat, message: undefined })
    try {
      const guestToken = getGuestToken()
      const claimed = await claimSeat(sessionId, namingSeat, guestToken, seatNameDraft)
      setNamingSeat(null)
      setState({ kind: 'seatClaimed', seat: claimed, revealCharacter: false })
    } catch {
      try {
        const [seats, alreadyClaimed] = await Promise.all([
          getSeatClaims(sessionId),
          findClaimedSeat(sessionId, getGuestToken()),
        ])
        if (alreadyClaimed) {
          setNamingSeat(null)
          setState({ kind: 'seatClaimed', seat: alreadyClaimed, revealCharacter: false })
          return
        }
        setNamingSeat(null)
        setState({
          kind: 'seatGrid',
          session: currentGrid.session,
          seats,
          claiming: null,
          message: t('that_seat_was_already_claimed_pick_another'),
        })
      } catch {
        setState({
          kind: 'seatGrid',
          session: currentGrid.session,
          seats: currentGrid.seats,
          claiming: null,
          message: t('could_not_claim_that_seat_please_try_again'),
        })
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (state.kind === 'loading') {
    return (
      <CenteredBox>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('loading')}
        </Typography>
      </CenteredBox>
    )
  }

  if (state.kind === 'error') {
    return (
      <CenteredBox>
        <Typography color="error">{t('error')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{state.message}</Typography>
        <Button sx={{ mt: 2 }} onClick={load}>{t('retry')}</Button>
      </CenteredBox>
    )
  }

  if (state.kind === 'expired') {
    return (
      <CenteredBox>
        <AutoStoriesIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6">{t('link_expired')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('ask_the_storyteller_for_a_new_link')}
        </Typography>
      </CenteredBox>
    )
  }

  if (state.kind === 'closed') {
    return (
      <CenteredBox>
        <LockIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6">{t('dealing_closed')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('the_storyteller_has_closed_this_deal_session')}
        </Typography>
      </CenteredBox>
    )
  }

  if (state.kind === 'seatClaimed') {
    const { seat, revealCharacter } = state
    const votePanel = activeVote ? (
      <GuestVotePanel
        vote={activeVote}
        responses={voteResponses}
        seat={seat.seatNumber}
        now={voteNow}
        language={language}
        submitting={voteSubmitting}
        error={voteError}
        onVote={async (response) => {
          setVoteSubmitting(true)
          setVoteError(null)
          try {
            await submitDealVoteResponse(sessionId, activeVote.voteId, seat.seatNumber, getGuestToken(), response)
          } catch (e: unknown) {
            setVoteError(e instanceof Error ? e.message : String(e))
          } finally {
            setVoteSubmitting(false)
          }
        }}
      />
    ) : null

    // Persistent identity header + a scrollable content column below it —
    // keeps the seat/player identity visible no matter which of the three
    // concerns (character, vote, chat) is currently showing, instead of the
    // old single centered column that only labeled the seat in some states.
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25,
          borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
        }}>
          <EventSeatIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>
              {tpl('seat_n', seat.seatNumber)}
            </Typography>
            {seat.playerName && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {seat.playerName}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 2, p: 2, overflowY: 'auto',
        }}>
          {votePanel}

          {!seat.characterId ? (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, maxWidth: 360, width: '100%', textAlign: 'center' }}>
              <EventSeatIcon sx={{ fontSize: 40, color: 'success.main', mb: 1.5 }} />
              <Typography variant="body2" color="text.secondary">
                {t('wait_for_storyteller_to_deal_characters')}
              </Typography>
            </Paper>
          ) : revealCharacter ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, width: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'center' }}>
                {seat.secondCharacterId ? t('one_of_these_is_your_character') : t('remember_your_character')}
              </Typography>
              <Suspense fallback={<CircularProgress size={28} />}>
                {seat.secondCharacterId ? (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <DealCharacterReveal card={{ characterId: seat.characterId as string }} language={language} effectiveSeat={seat.seatNumber} />
                    <DealCharacterReveal card={{ characterId: seat.secondCharacterId }} language={language} effectiveSeat={seat.seatNumber} />
                  </Box>
                ) : (
                  <DealCharacterReveal card={{ characterId: seat.characterId as string }} language={language} effectiveSeat={seat.seatNumber} />
                )}
              </Suspense>
              <Typography variant="caption" color="success.main" sx={{ maxWidth: 340, textAlign: 'center' }}>
                {t('saved_keep_your_character_secret')}
              </Typography>
              <Button
                size="small"
                variant="text"
                startIcon={<VisibilityOffIcon fontSize="small" />}
                onClick={() => setState((cur) => cur.kind === 'seatClaimed' ? { ...cur, revealCharacter: false } : cur)}
              >
                {t('hide_my_character')}
              </Button>
            </Box>
          ) : (
            <Paper variant="outlined" sx={{
              p: 2, borderRadius: 3, maxWidth: 360, width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
            }}>
              <Typography variant="body2" color="text.secondary">
                {t('character_hidden_compact')}
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<VisibilityIcon fontSize="small" />}
                onClick={() => { markDealCharacterSeen(sessionId); setState((cur) => cur.kind === 'seatClaimed' ? { ...cur, revealCharacter: true } : cur) }}
                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {t('show_my_character')}
              </Button>
            </Paper>
          )}
        </Box>

        {/* Hidden while a vote is active — the chat FAB's fixed position can
            sit over the vote panel's sticky Agree/Disagree buttons (zIndex 1),
            which would block a time-critical tap. */}
        {!activeVote && (
          <Suspense fallback={null}>
            <DealMessagePanel sessionId={sessionId} seatNumber={seat.seatNumber} />
          </Suspense>
        )}
      </Box>
    )
  }

  // state.kind === 'seatGrid'
  const { seats, claiming, message } = state

  if (namingSeat != null) {
    return (
      <CenteredBox>
        <EventSeatIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
          {tpl('seat_n', namingSeat)}
        </Typography>
        <Paper
          variant="outlined"
          sx={{ p: 2.5, borderRadius: 3, width: '100%', maxWidth: 340, textAlign: 'left', bgcolor: 'background.paper', mt: 2 }}
        >
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: 'block', fontWeight: 700, letterSpacing: '0.06em', mb: 1.5 }}
          >
            {t('confirm_your_seat')}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            required
            label={t('player_name')}
            value={seatNameDraft}
            onChange={e => { setSeatNameDraft(e.target.value); setSeatNameSubmitted(false) }}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirmSeatClaim() }}
            error={seatNameSubmitted && !seatNameDraft.trim()}
            helperText={seatNameSubmitted && !seatNameDraft.trim() ? t('field_required') : ' '}
            slotProps={{ input: { startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.disabled' }} /> } }}
            sx={{ mb: 1 }}
            disabled={claiming != null}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button fullWidth variant="outlined" onClick={() => setNamingSeat(null)} disabled={claiming != null}>
              {t('cancel')}
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={handleConfirmSeatClaim}
              disabled={claiming != null}
              startIcon={claiming != null ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {t('claim_this_seat')}
            </Button>
          </Box>
        </Paper>
      </CenteredBox>
    )
  }

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5, textAlign: 'center', fontWeight: 700 }}>
        {t('pick_your_seat')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
        {t('tap_an_open_seat_to_claim_it')}
      </Typography>
      {message && (
        <Typography variant="body2" color="warning.main" sx={{ mb: 2, textAlign: 'center' }}>
          {message}
        </Typography>
      )}

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: 1.5,
      }}>
        {seats.map((seat) => {
          const isTaken = seat.claimedByToken != null
          const isClaiming = claiming === seat.seatNumber

          return (
            <Paper
              key={seat.seatNumber}
              elevation={isClaiming ? 6 : 2}
              onClick={() => !isTaken && claiming == null && handleOpenSeatNaming(seat.seatNumber)}
              sx={{
                height: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                cursor: isTaken || claiming != null ? 'default' : 'pointer',
                opacity: isTaken ? 0.4 : claiming != null ? 0.7 : 1,
                borderRadius: 2,
                border: '2px solid',
                borderColor: isClaiming ? 'primary.main' : 'divider',
                transition: 'all 0.15s ease',
                userSelect: 'none',
                bgcolor: 'background.paper',
                '&:hover': (!isTaken && claiming == null)
                  ? { borderColor: 'primary.light', transform: 'translateY(-2px)', boxShadow: 4 }
                  : {},
              }}
            >
              {isClaiming ? (
                <CircularProgress size={24} />
              ) : (
                <>
                  <EventSeatIcon sx={{ fontSize: 28, color: isTaken ? 'text.disabled' : 'primary.light' }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>#{seat.seatNumber}</Typography>
                  {isTaken && (
                    <Typography variant="caption" color="text.disabled" noWrap sx={{ maxWidth: 84 }}>
                      {seat.playerName || t('claimed')}
                    </Typography>
                  )}
                </>
              )}
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}

function GuestVotePanel({
  vote,
  responses,
  seat,
  now,
  language,
  submitting,
  error,
  onVote,
}: {
  vote: DealVoteSession
  responses: DealVoteResponseRecord[]
  seat: number
  now: number
  language: 'en' | 'zh'
  submitting: boolean
  error: string | null
  onVote: (response: 'agree' | 'disagree') => Promise<void>
}) {
  const currentSeat = vote.votingOrder[vote.currentIndex] ?? null
  const existing = responses.find((r) => r.seat === seat)
  const isNoVote = vote.noVoteSeats.includes(seat)
  const isCurrent = currentSeat === seat && !existing && !isNoVote
  const summary = summarizeDealVote(vote, responses)
  const currentVoter = getCurrentDealVoter(vote)
  const remainingMs = Math.max(0, vote.deadlineAt.toMillis() - now)
  const remainingSeconds = Math.ceil(remainingMs / 1000)
  const progress = Math.max(0, Math.min(100, (remainingMs / (vote.perPlayerSeconds * 1000)) * 100))
  const updatedAgeMs = responses.reduce((latest, r) => Math.max(latest, r.submittedAt?.toMillis?.() ?? 0), vote.startedAt.toMillis())
  const isStale = activeVoteIsStale(vote, now)
  const labels = language === 'zh'
    ? { title: '当前提名投票', agree: '赞同', disagree: '反对', waiting: '等待当前玩家投票', turn: '轮到你投票', noVote: '你当前没有投票权', voted: '你已投票', yes: '赞同', no: '反对', need: '需要', pending: '待投', current: '当前', connected: '已同步', stale: '同步可能延迟' }
    : { title: 'Current nomination vote', agree: 'Agree', disagree: 'Disagree', waiting: 'Waiting for the current voter', turn: 'Your turn to vote', noVote: 'You do not currently have a vote', voted: 'You voted', yes: 'Agree', no: 'Disagree', need: 'Need', pending: 'Pending', current: 'Current', connected: 'Synced', stale: 'Sync may be delayed' }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, width: '100%', maxWidth: 520, textAlign: 'left' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
            {labels.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatSeatLabel(vote.actorSeat, vote.seatLabels)} → {formatSeatLabel(vote.targetSeat, vote.seatLabels)}
          </Typography>
        </Box>
        <Chip
          size="small"
          color={isStale ? 'warning' : 'success'}
          label={isStale ? labels.stale : labels.connected}
          sx={{ height: 22, fontSize: '0.68rem' }}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 0.75, mb: 1 }}>
        <VoteStat label={labels.yes} value={summary.agreeCount} color="success.main" />
        <VoteStat label={labels.no} value={summary.disagreeCount} color="error.main" />
        <VoteStat label={labels.pending} value={summary.pendingCount} color="text.secondary" />
        <VoteStat label={labels.need} value={vote.requiredVotes} color="warning.dark" />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {labels.current}: {currentVoter != null ? formatSeatLabel(currentVoter, vote.seatLabels) : '-'}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {new Date(updatedAgeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {existing ? (
        <Alert severity={existing.response === 'agree' ? 'success' : 'info'} sx={{ py: 0.5, mb: 1 }}>
          {labels.voted}: {existing.response === 'agree' ? labels.yes : labels.no}
        </Alert>
      ) : isNoVote ? (
        <Alert severity="warning" sx={{ py: 0.5, mb: 1 }}>{labels.noVote}</Alert>
      ) : isCurrent ? (
        <Box sx={{ position: 'sticky', bottom: 8, zIndex: 1, bgcolor: 'background.paper', py: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{labels.turn}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>{remainingSeconds}s</Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ mb: 1.5, height: 8, borderRadius: 4 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button fullWidth variant="contained" color="success" disabled={submitting || remainingMs <= 0} onClick={() => onVote('agree')}>
              {labels.agree}
            </Button>
            <Button fullWidth variant="outlined" color="error" disabled={submitting || remainingMs <= 0} onClick={() => onVote('disagree')}>
              {labels.disagree}
            </Button>
          </Box>
        </Box>
      ) : (
        <Alert severity="info" sx={{ py: 0.5, mb: 1 }}>
          {labels.waiting}{currentSeat != null ? ` (${formatSeatLabel(currentSeat, vote.seatLabels)})` : ''}
        </Alert>
      )}

      <VoteChipGroup label={labels.yes} labels={summary.agreeLabels} color="success" />
      <VoteChipGroup label={labels.no} labels={summary.disagreeLabels} color="error" />
      <VoteChipGroup label={labels.pending} labels={summary.pendingLabels} />
    </Paper>
  )
}

function VoteStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: 'action.hover', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color, lineHeight: 1.2 }}>{value}</Typography>
    </Box>
  )
}

function VoteChipGroup({ label, labels, color }: { label: string; labels: string[]; color?: 'success' | 'error' }) {
  if (!labels.length) return null
  return (
    <Box sx={{ mt: 0.75 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35 }}>{label}</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {labels.map((item) => (
          <Chip key={item} size="small" color={color} variant={color ? 'filled' : 'outlined'} label={item} sx={{ height: 22, fontSize: '0.68rem' }} />
        ))}
      </Box>
    </Box>
  )
}

function activeVoteIsStale(vote: DealVoteSession, now: number): boolean {
  return vote.status === 'active' && now - vote.deadlineAt.toMillis() > 2500
}

function CenteredBox({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <Box sx={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: compact ? 'flex-start' : 'center',
      gap: compact ? 1 : 0,
      p: compact ? 1.25 : 3,
      textAlign: 'center',
    }}>
      {children}
    </Box>
  )
}
