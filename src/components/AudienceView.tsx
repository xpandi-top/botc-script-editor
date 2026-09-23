import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Paper, Typography, useMediaQuery, useTheme } from '@mui/material'
import { getDisplayName, getIconForCharacter } from '../catalog'
import { makeT, makeTpl, type UiKey } from '../lib/t'
import { AUDIENCE_TIMEOUT_MS, audienceChannelName, type AudienceMessage, type AudienceSnapshot } from './StorytellerSub/presentation'
import type { NominationStep } from './StorytellerSub/types'
import { resolveTagDisplay } from './StorytellerSub/Arena/ArenaSeatComponents'
import { getSeatPosition } from '../utils/seats'

const nominationLabels: Record<NominationStep, UiKey> = {
  waitingForNomination: 'waiting_for_nomination', nominationDecision: 'term_nomination',
  actorSpeech: 'actor_speaking', readyForTargetSpeech: 'target_speaking',
  targetSpeech: 'target_speaking', readyToVote: 'ready_to_vote',
  voting: 'voting', votingDone: 'voting_done',
}

/** Dedicated route: no App, game hook, game storage, action handlers, or audio. */
export function AudienceView() {
  const [snapshot, setSnapshot] = useState<AudienceSnapshot | null>(null)
  const [connected, setConnected] = useState(false)
  const [fullscreenError, setFullscreenError] = useState(false)
  const theme = useTheme()
  const compact = useMediaQuery('(max-width: 700px)')
  const wide = useMediaQuery('(min-width: 1200px)')
  const params = new URLSearchParams(window.location.search)
  const session = params.get('audience') ?? ''
  const language = snapshot?.language ?? (params.get('lang') === 'en' ? 'en' : 'zh')
  const t = makeT(language)
  const tpl = makeTpl(language)

  useEffect(() => {
    document.title = `BOTC · ${t('presentation_audience')}`
  }, [language])

  useEffect(() => {
    if (!session || typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(audienceChannelName(session))
    let lastReceived = 0
    channel.onmessage = (event: MessageEvent<AudienceMessage>) => {
      if (event.data?.type === 'snapshot') {
        lastReceived = Date.now()
        setSnapshot(event.data.snapshot)
        setConnected(true)
      } else if (event.data?.type === 'stopped') {
        lastReceived = 0
        setConnected(false)
        setSnapshot(null)
      }
    }
    channel.postMessage({ type: 'ready' } satisfies AudienceMessage)
    const timer = window.setInterval(() => {
      if (Date.now() - lastReceived > AUDIENCE_TIMEOUT_MS) setConnected(false)
    }, 1000)
    return () => { window.clearInterval(timer); channel.close() }
  }, [session])

  const name = (seat: number | null) => seat === null ? '—' : `#${seat} ${snapshot?.seats.find(s => s.seat === seat)?.name ?? ''}`
  const phaseLabel = snapshot ? t(({ night: 'phase_night', private: 'phase_private', public: 'phase_public', nomination: 'phase_nomination' } as const)[snapshot.phase]) : ''
  const dark = theme.palette.mode === 'dark'
  const count = snapshot?.seats.length ?? 0
  const dense = count > 15
  const seconds = Math.max(0, Math.floor(snapshot?.timerSeconds ?? 0))

  const center = snapshot && <Box sx={{ textAlign: 'center', p: 2 }}>
    <Typography variant="overline">{tpl('day_n', snapshot.day)}</Typography>
    <Typography variant="h4" sx={{ fontWeight: 700 }}>{snapshot.gameEnded ? t('ended') : phaseLabel}</Typography>
    <Typography color="text.secondary" sx={{ mt: 1 }}>{snapshot.seats.filter(s => s.alive && !s.isTraveler).length} / {snapshot.seats.filter(s => !s.isTraveler).length} · {t('term_alive')}</Typography>
    {snapshot.phase !== 'night' && !snapshot.gameEnded && <>
      <Typography data-testid="audience-timer" sx={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </Typography>
      <Typography variant="caption" color="text.secondary">{t(snapshot.timerRunning ? 'presentation_running' : 'presentation_paused')}</Typography>
    </>}
    {snapshot.phase === 'public' && <Typography sx={{ mt: 1 }}>{t(snapshot.publicMode === 'roundRobin' ? 'round_robin_mode' : 'free_speech')}</Typography>}
    {snapshot.currentSpeakerSeat !== null && <Typography sx={{ mt: 1 }}>{name(snapshot.currentSpeakerSeat)}</Typography>}
    {snapshot.nomination && <Box sx={{ mt: 1.5 }}>
      <Typography variant="subtitle2">{t(nominationLabels[snapshot.nominationStep])}</Typography>
      <Typography sx={{ overflowWrap: 'anywhere' }}>{name(snapshot.nomination.actor)} → {name(snapshot.nomination.target)}</Typography>
      <Typography variant="h6">{snapshot.nomination.yesCount} / {snapshot.nomination.requiredVotes} · {t(snapshot.nomination.isExile ? 'exile' : 'vote')}</Typography>
      {snapshot.currentVoterSeat !== null && <Typography>{t('voting')}: {name(snapshot.currentVoterSeat)}</Typography>}
    </Box>}
  </Box>

  return <Box data-testid="audience-view" sx={{ minHeight: '100dvh', p: { xs: 1, md: 2 } }}>
    <Box component="header" sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 1 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="overline" color="text.secondary">BOTC · {t('presentation_audience')}</Typography>
        <Typography variant="h6" noWrap>{snapshot?.title}</Typography>
      </Box>
      <Button size="small" onClick={async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen()
          else await document.documentElement.requestFullscreen()
          setFullscreenError(false)
        } catch { setFullscreenError(true) }
      }}>{t('presentation_fullscreen')}</Button>
    </Box>
    {fullscreenError && <Alert severity="info">{t('presentation_fullscreen_error')}</Alert>}
    {!connected ? <Alert severity="info" sx={{ mt: 3 }}>{t(snapshot ? 'presentation_disconnected' : 'presentation_waiting')}</Alert> : snapshot && <Box sx={{ display: 'grid', gridTemplateColumns: wide ? 'minmax(0, 1fr) 280px' : 'minmax(0, 1fr)', gap: 1 }}>
      <Paper elevation={0} sx={{
        position: 'relative', overflow: 'hidden', borderRadius: 4,
        minHeight: compact ? undefined : 'max(620px, calc(100dvh - 115px))',
        backgroundImage: `url('${import.meta.env.BASE_URL}bg-${dark ? 'dark' : 'light'}.svg')`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        bgcolor: snapshot.phase === 'night' ? 'background.paper' : 'background.default',
        p: compact ? 2 : 0,
      }}>
        <Box sx={compact ? {} : { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '42%', maxHeight: '65%', overflow: 'auto' }}>{center}</Box>
        <Box sx={compact ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 } : { position: 'absolute', inset: 0 }}>
          {snapshot.seats.map((seat, index) => {
            // Preserve the host's seat order and perimeter layout, with extra
            // vertical inset so cards remain inside the projection surface.
            const position = getSeatPosition(index, Math.max(count, 1), false)
            const highlighted = seat.seat === snapshot.currentSpeakerSeat || seat.seat === snapshot.currentVoterSeat
            const icon = seat.characterId ? getIconForCharacter(seat.characterId) : null
            return <Paper key={seat.seat} data-testid={`audience-seat-${seat.seat}`} elevation={highlighted ? 5 : 1} sx={{
              ...(compact ? {} : { position: 'absolute', left: `${position.left}%`, top: `${50 + (position.top - 50) * 0.83}%`, transform: 'translate(-50%, -50%)', width: dense ? '12%' : '16%', maxWidth: dense ? 126 : 164 }),
              textAlign: 'center', p: dense ? 0.75 : 1.25, borderRadius: 3,
              border: '2px solid', borderColor: highlighted ? 'primary.main' : seat.isExecuted ? 'error.main' : 'divider',
              opacity: seat.alive ? 1 : 0.7,
            }}>
              <Box sx={{ width: dense ? 32 : 42, height: dense ? 32 : 42, mx: 'auto', display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'action.selected', fontWeight: 700 }}>
                {icon ? <Box component="img" src={icon} alt={getDisplayName(seat.characterId!, language)} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : seat.seat}
              </Box>
              <Typography title={seat.name} sx={{ fontWeight: 700, fontSize: dense ? '0.8rem' : '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.5 }}>{seat.name}</Typography>
              {seat.characterId && <Typography variant="caption">{getDisplayName(seat.characterId, language)}</Typography>}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, justifyContent: 'center', mt: 0.25 }}>
                {!seat.alive && <Chip size="small" label={t('term_dead')} />}
                {seat.isExecuted && <Chip size="small" label={t('executed_tag')} />}
                {seat.hasNoVote && <Chip size="small" label={t('no_vote_tag')} />}
                {seat.isTraveler && <Chip size="small" label={t('term_traveler')} />}
                {seat.vote !== null && <Chip size="small" label={seat.vote ? '✓' : '✕'} color={seat.vote ? 'success' : 'default'} />}
                {seat.customTags.map((tag, i) => {
                  const display = resolveTagDisplay(tag, language)
                  return <Chip key={i} size="small" label={display.isCharTag && display.srcId ? getDisplayName(display.srcId, language) : display.displayLabel} sx={{ maxWidth: '100%' }} />
                })}
              </Box>
            </Paper>
          })}
        </Box>
      </Paper>
      <Paper component="section" aria-label={t('nominations')} elevation={0} sx={{ p: 2, minWidth: 0, maxHeight: wide ? 'max(620px, calc(100dvh - 115px))' : undefined, overflowY: wide ? 'auto' : undefined }}>
        <Typography variant="h6">{t('nominations')}</Typography>
        {(snapshot.nominationHistory ?? []).map(historyDay => <Box key={historyDay.id} data-testid={`audience-history-day-${historyDay.day}`} sx={{ mt: 2 }}>
          <Typography variant="subtitle2">{tpl('day_n', historyDay.day)}</Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>{t('today_nominators')}: {(historyDay.nominators ?? []).map(seat => `#${seat}`).join('、') || '—'}</Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>{t('today_nominees')}: {(historyDay.nominees ?? []).map(seat => `#${seat}`).join('、') || '—'}</Typography>
          {historyDay.votes.length === 0 ? <Typography variant="body2" color="text.secondary">{t('no_entries')}</Typography> :
            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
              {historyDay.votes.map(vote => <Box component="li" key={vote.id} sx={{ mb: 0.75 }}>
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  {`#${vote.actor} ${vote.actorName} → #${vote.target} ${vote.targetName} · ${t(vote.isExile ? 'exile' : 'term_nomination')} · ${vote.voteCount}/${vote.requiredVotes}`}
                  {vote.voters?.length > 0 && ` (${vote.voters.map(seat => `#${seat}`).join(',')})`}
                  {' · '}<Box component="span" sx={{ color: vote.passed && !vote.failed ? 'success.main' : 'text.secondary', fontWeight: 700 }}>{t(vote.passed && !vote.failed ? 'passed' : 'failed')}</Box>
                </Typography>
              </Box>)}
            </Box>}
        </Box>)}
      </Paper>
    </Box>}
  </Box>
}
