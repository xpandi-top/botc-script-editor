/**
 * DealGuestPage — player-facing card-deal UI.
 *
 * Flow:
 *  1. Load session metadata + all card positions (NOT characterIds for other cards)
 *  2. Player enters optional display name
 *  3. Player taps one face-down card → claim → one-time character reveal
 *  4. All other cards lock immediately
 *  5. Re-open link → restored as player control page; character stays hidden
 */
import { lazy, Suspense, useEffect, useState, useCallback, type ReactNode } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, LinearProgress, Paper, TextField, Typography,
} from '@mui/material'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import LockIcon from '@mui/icons-material/Lock'
import {
  getDealSession,
  getGuestCards,
  findClaimedCard,
  claimCard,
  getGuestToken,
  hasSeenDealCharacter,
  markDealCharacterSeen,
  subscribeActiveDealVote,
  subscribeDealVoteResponses,
  submitDealVoteResponse,
  type DealSession,
  type DealCard,
  type DealVoteSession,
  type DealVoteResponseRecord,
} from '../lib/firebaseDeal'
import { useT } from '../context/I18nContext'
import { makeTpl } from '../lib/t'
import { formatSeatLabel, getCurrentDealVoter, summarizeDealVote } from '../utils/votes'

const DealCharacterReveal = lazy(() => import('./DealCharacterReveal').then(m => ({ default: m.DealCharacterReveal })))

interface Props {
  sessionId: string
  language: 'en' | 'zh'
}

type GuestCard = Omit<DealCard, 'characterId'>

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'expired' }
  | { kind: 'closed' }
  | { kind: 'name'; session: DealSession; cards: GuestCard[] }
  | { kind: 'grid'; session: DealSession; cards: GuestCard[]; claiming: number | null; message?: string }
  | { kind: 'claimed'; card: DealCard; revealCharacter: boolean }

export function DealGuestPage({ sessionId, language }: Props) {
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [activeVote, setActiveVote] = useState<DealVoteSession | null>(null)
  const [voteResponses, setVoteResponses] = useState<DealVoteResponseRecord[]>([])
  const [voteNow, setVoteNow] = useState(() => Date.now())
  const [voteSubmitting, setVoteSubmitting] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [claimedSeat, setClaimedSeat] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { t } = useT()
  const tpl = makeTpl(language)

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const session = await getDealSession(sessionId)
      if (!session) { setState({ kind: 'expired' }); return }
      if (session.status === 'closed') { setState({ kind: 'closed' }); return }

      const cards = await getGuestCards(sessionId)
      const guestToken = getGuestToken()
      const alreadyClaimed = await findClaimedCard(sessionId, guestToken)

      if (alreadyClaimed) {
        setState({ kind: 'claimed', card: alreadyClaimed, revealCharacter: false })
        return
      }

      setState({ kind: 'name', session, cards })
    } catch (e: unknown) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }, [sessionId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (state.kind !== 'claimed') {
      setActiveVote(null)
      setVoteResponses([])
      return
    }
    return subscribeActiveDealVote(sessionId, setActiveVote)
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

  const handleStartPicking = () => {
    if (state.kind !== 'name') return
    setSubmitted(true)
    if (!displayName.trim() || !claimedSeat.trim()) return
    setState({ kind: 'grid', session: state.session, cards: state.cards, claiming: null })
  }

  const handleClaimCard = async (position: number) => {
    if (state.kind !== 'grid' || state.claiming !== null) return
    const currentGrid = state
    setState({ ...state, claiming: position, message: undefined })
    try {
      const guestToken = getGuestToken()
      const seat = parseInt(claimedSeat, 10)
      const claimed = await claimCard(sessionId, position, guestToken, displayName, Number.isNaN(seat) ? null : seat)
      const revealCharacter = !hasSeenDealCharacter(sessionId)
      if (revealCharacter) markDealCharacterSeen(sessionId)
      setState({ kind: 'claimed', card: claimed, revealCharacter })
    } catch {
      try {
        // Re-fetch stripped cards (no characterId) for the grid view,
        // then check if this guest somehow claimed a card despite the error
        // (e.g. network flake where write succeeded but we lost the response).
        const [cards, alreadyClaimed] = await Promise.all([
          getGuestCards(sessionId),
          findClaimedCard(sessionId, getGuestToken()),
        ])
        if (alreadyClaimed) {
          setState({ kind: 'claimed', card: alreadyClaimed, revealCharacter: false })
          return
        }
        setState({
          kind: 'grid',
          session: currentGrid.session,
          cards,
          claiming: null,
          message: t('that_card_was_already_claimed_pick_another_card'),
        })
      } catch {
        setState({
          kind: 'grid',
          session: currentGrid.session,
          cards: currentGrid.cards,
          claiming: null,
          message: t('could_not_claim_that_card_please_try_again'),
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

  if (state.kind === 'claimed') {
    const { card, revealCharacter } = state
    const effectiveSeat = card.assignedSeat ?? card.claimedBySeat ?? null
    const displayName = card.assignedName ?? card.claimedByName ?? ''
    const votePanel = activeVote ? (
      <GuestVotePanel
        vote={activeVote}
        responses={voteResponses}
        card={card}
        now={voteNow}
        language={language}
        submitting={voteSubmitting}
        error={voteError}
        onVote={async (response) => {
          const seat = card.assignedSeat ?? card.claimedBySeat
          if (seat == null) return
          setVoteSubmitting(true)
          setVoteError(null)
          try {
            await submitDealVoteResponse(sessionId, activeVote.voteId, seat, getGuestToken(), response)
          } catch (e: unknown) {
            setVoteError(e instanceof Error ? e.message : String(e))
          } finally {
            setVoteSubmitting(false)
          }
        }}
      />
    ) : null
    const hiddenStrip = !revealCharacter ? (
      <Box sx={{
        width: '100%',
        maxWidth: 520,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        px: 1.25,
        py: 0.75,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        bgcolor: 'background.paper',
      }}>
        <Typography variant="caption" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
          {effectiveSeat != null ? tpl('seat_n', effectiveSeat) : t('seat')}
          {displayName ? ` · ${displayName}` : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', lineHeight: 1.2 }}>
          {t('character_hidden_compact')}
        </Typography>
      </Box>
    ) : null

    return (
      <CenteredBox compact={!!activeVote && !revealCharacter}>
        {votePanel}
        {revealCharacter ? (
          <>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
              {t('remember_your_character')}
            </Typography>
            <Suspense fallback={<CircularProgress size={28} />}>
              <DealCharacterReveal card={card} language={language} effectiveSeat={effectiveSeat} />
            </Suspense>
            <Typography variant="caption" color="success.main" sx={{ mt: 2, maxWidth: 340 }}>
              {t('saved_keep_your_character_secret')}
            </Typography>
          </>
        ) : hiddenStrip}
      </CenteredBox>
    )
  }

  if (state.kind === 'name') {
    return (
      <CenteredBox>
        <AutoStoriesIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
          {t('blood_on_the_clocktower_deal')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {tpl('n_cards_tap_one', state.session.cardCount)}
        </Typography>
        <TextField
          size="small"
          fullWidth
          required
          label={t('player_name')}
          value={displayName}
          onChange={e => { setDisplayName(e.target.value); setSubmitted(false) }}
          onKeyDown={e => { if (e.key === 'Enter') handleStartPicking() }}
          error={submitted && !displayName.trim()}
          helperText={submitted && !displayName.trim() ? t('field_required') : undefined}
          sx={{ maxWidth: 300, mb: 1.5 }}
        />
        <TextField
          size="small"
          fullWidth
          required
          label={t('seat')}
          value={claimedSeat}
          onChange={e => { setClaimedSeat(e.target.value.replace(/\D/g, '')); setSubmitted(false) }}
          onKeyDown={e => { if (e.key === 'Enter') handleStartPicking() }}
          error={submitted && !claimedSeat.trim()}
          helperText={submitted && !claimedSeat.trim() ? t('field_required') : undefined}
          sx={{ maxWidth: 300, mb: 2 }}
          slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
        />
        <Button variant="contained" size="large" onClick={handleStartPicking}>
          {t('view_cards')}
        </Button>
      </CenteredBox>
    )
  }

  // state.kind === 'grid'
  const { cards, claiming, message } = state
  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5, textAlign: 'center', fontWeight: 700 }}>
        {t('pick_your_character_card')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
        {t('tap_one_card_to_flip_it_others_will_lock')}
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
        {cards.map((card) => {
          const isClaiming = claiming === card.position
          const isClaimed = card.claimedByToken != null
          const isLocked = claiming !== null && !isClaiming  // another card is being claimed

          return (
            <Paper
              key={card.position}
              elevation={isClaiming ? 6 : 2}
              onClick={() => !isClaimed && !isLocked && !isClaiming && handleClaimCard(card.position)}
              sx={{
                height: 130,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                cursor: isClaimed || isLocked ? 'default' : 'pointer',
                opacity: isClaimed || isLocked ? 0.35 : 1,
                borderRadius: 2,
                border: '2px solid',
                borderColor: isClaiming ? 'primary.main' : 'divider',
                transition: 'all 0.15s ease',
                userSelect: 'none',
                bgcolor: 'background.paper',
                '&:hover': (!isClaimed && !isLocked && !isClaiming)
                  ? { borderColor: 'primary.light', transform: 'translateY(-2px)', boxShadow: 4 }
                  : {},
              }}
            >
              {isClaiming ? (
                <CircularProgress size={28} />
              ) : isClaimed ? (
                <LockIcon sx={{ color: 'text.disabled', fontSize: 32 }} />
              ) : (
                <>
                  <AutoStoriesIcon sx={{ fontSize: 36, color: 'primary.light' }} />
                  <Typography variant="caption" color="text.secondary">
                    {t('tap_to_flip')}
                  </Typography>
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
  card,
  now,
  language,
  submitting,
  error,
  onVote,
}: {
  vote: DealVoteSession
  responses: DealVoteResponseRecord[]
  card: DealCard
  now: number
  language: 'en' | 'zh'
  submitting: boolean
  error: string | null
  onVote: (response: 'agree' | 'disagree') => Promise<void>
}) {
  const seat = card.assignedSeat ?? card.claimedBySeat ?? null
  if (seat == null) return null

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
