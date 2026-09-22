import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Tabs, Tab, TextField, Typography, Paper, Tooltip } from '@mui/material'
import StyleIcon from '@mui/icons-material/Style'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import GroupsIcon from '@mui/icons-material/Groups'
import ChatIcon from '@mui/icons-material/Chat'
import EventSeatIcon from '@mui/icons-material/EventSeat'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import DownloadIcon from '@mui/icons-material/Download'
import LockIcon from '@mui/icons-material/Lock'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import { getDisplayName } from '../../../catalog'
import { makeT, makeTpl } from '../../../lib/t'
import {
  createDealSession, shuffleDealCards, getDealSession, closeDealSession,
  createSeatClaimSession, subscribeSeatClaims, unclaimSeatByHost, renameSeatByHost,
  HOST_TOKEN_KEY, ACTIVE_HOST_DEAL_KEY, GAME_DEAL_KEY,
  type DealSession as DealSessionDoc, type DealSeatClaim,
} from '../../../lib/DealSession'
import { buildShareUrl } from '../../../lib/shareUrl'
import type { StorytellerContext } from '../useStoryteller'

type DealSession = { sessionId: string; hostToken: string }
type AssignmentTab = 'draw' | 'roster' | 'messages'

/**
 * Resolve the character assignments to deal, and the gameId to key the deal
 * session under. Sources from the in-progress setup draft (newGamePanel) when
 * one is open — new game or edit-players both funnel through it — otherwise
 * from the live running game's seats, so the feature works mid-game too.
 */
function useAssignmentSource(ctx: StorytellerContext) {
  const { newGamePanel, currentDay, gameId: liveGameId } = ctx
  return useMemo(() => {
    if (newGamePanel) {
      return {
        gameId: newGamePanel.gameId ?? liveGameId,
        assignments: newGamePanel.assignments ?? {},
        playerCount: newGamePanel.playerCount ?? 0,
      }
    }
    const assignments: Record<number, string> = {}
    let playerCount = 0
    for (const seat of currentDay.seats) {
      if (!seat.isTraveler) {
        playerCount++
        if (seat.characterId) assignments[seat.seat] = seat.characterId
      }
    }
    return { gameId: liveGameId, assignments, playerCount }
  }, [newGamePanel, currentDay.seats, liveGameId])
}

export function AssignmentCenter({ ctx }: { ctx: StorytellerContext }) {
  const { language, activeDealSession, setActiveDealSession, lastDealSession } = ctx
  const t = makeT(language)
  const tpl = makeTpl(language)
  const [tab, setTab] = useState<AssignmentTab>('draw')
  const [dealing, setDealing] = useState(false)
  const [startingSeatClaim, setStartingSeatClaim] = useState(false)
  // Seat-claim sessions are intentionally NOT pushed through ctx.activeDealSession —
  // that state also drives the full-screen DealHostPage overlay, which is card-only.
  const [localSeatSession, setLocalSeatSession] = useState<DealSession | null>(null)

  const { gameId, assignments, playerCount } = useAssignmentSource(ctx)
  const characterIds = Object.values(assignments).filter(Boolean) as string[]

  const storedGameDeal = useMemo(() => {
    try {
      const raw = localStorage.getItem(GAME_DEAL_KEY(gameId))
      if (raw) return JSON.parse(raw) as DealSession
    } catch {}
    return null
  }, [gameId])

  const existingDealSession: DealSession | null = localSeatSession ?? activeDealSession ?? storedGameDeal ?? lastDealSession ?? null

  // Resolve the active session's full metadata (needed to tell a card-deal
  // session apart from a seat self-claim session — same GAME_DEAL_KEY slot).
  const [resolvedSession, setResolvedSession] = useState<DealSessionDoc | null>(null)
  useEffect(() => {
    if (!existingDealSession) { setResolvedSession(null); return }
    let cancelled = false
    getDealSession(existingDealSession.sessionId).then((s) => { if (!cancelled) setResolvedSession(s) })
    return () => { cancelled = true }
  }, [existingDealSession?.sessionId])

  const isSeatClaimSession = resolvedSession?.totalSeats != null

  const persistSession = (session: DealSession) => {
    try { localStorage.setItem(HOST_TOKEN_KEY(session.sessionId), session.hostToken) } catch {}
    if (gameId) {
      try { localStorage.setItem(GAME_DEAL_KEY(gameId), JSON.stringify(session)) } catch {}
    }
    try { localStorage.setItem(ACTIVE_HOST_DEAL_KEY, JSON.stringify(session)) } catch {}
  }

  const handleDealCards = async () => {
    if (characterIds.length < 2) return
    setDealing(true)
    try {
      const shuffled = shuffleDealCards(characterIds)
      const session = await createDealSession(shuffled)
      persistSession(session)
      setLocalSeatSession(null)
      setActiveDealSession(session)
    } catch (e) {
      console.error('Failed to create deal session', e)
    } finally {
      setDealing(false)
    }
  }

  const handleStartSeatClaim = async () => {
    if (playerCount < 1) return
    setStartingSeatClaim(true)
    try {
      const session = await createSeatClaimSession(playerCount)
      persistSession(session)
      setActiveDealSession(null)
      setLocalSeatSession(session)
      const full = await getDealSession(session.sessionId)
      setResolvedSession(full)
      setTab('roster')
    } catch (e) {
      console.error('Failed to create seat claim session', e)
    } finally {
      setStartingSeatClaim(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
        <Tab value="draw" icon={<StyleIcon fontSize="small" />} iconPosition="start" label={t('draw_deal_tab')} />
        <Tab value="roster" icon={<GroupsIcon fontSize="small" />} iconPosition="start" label={t('roster_tab')} />
        <Tab value="messages" icon={<ChatIcon fontSize="small" />} iconPosition="start" label={t('messages_tab')} />
      </Tabs>

      {tab === 'draw' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {t('deal_assigned_characters_to_players_new_tab')}
          </Typography>

          <Paper variant="outlined" sx={{ p: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              {tpl('seats_assigned_count', characterIds.length)}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {Object.entries(assignments).filter(([, cid]) => cid).map(([sNum, cid]) => (
                <Typography key={sNum} variant="caption" sx={{ px: 0.75, py: 0.25, borderRadius: 1, bgcolor: 'action.hover' }}>
                  #{sNum} {getDisplayName(cid, language)}
                </Typography>
              ))}
            </Box>
          </Paper>

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <Tooltip title={t('deal_assigned_characters_to_players_new_tab')}>
              <span>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleDealCards}
                  disabled={dealing || characterIds.length < 2}
                  startIcon={dealing ? <CircularProgress size={14} color="inherit" /> : <StyleIcon fontSize="small" />}
                >
                  {t('deal_cards')}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={t('let_players_claim_their_own_seat')}>
              <span>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleStartSeatClaim}
                  disabled={startingSeatClaim || playerCount < 1}
                  startIcon={startingSeatClaim ? <CircularProgress size={14} color="inherit" /> : <EventSeatIcon fontSize="small" />}
                >
                  {t('claim_seats_button')}
                </Button>
              </span>
            </Tooltip>
            {existingDealSession && (
              <Tooltip title={isSeatClaimSession ? t('view_roster') : t('open_active_deal_dashboard')}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => isSeatClaimSession ? setTab('roster') : setActiveDealSession(existingDealSession)}
                  startIcon={<OpenInNewIcon fontSize="small" />}
                  sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                >
                  {tpl('open_session', existingDealSession.sessionId)}
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}

      {tab === 'roster' && (
        <RosterTab
          language={language}
          session={existingDealSession}
          resolvedSession={resolvedSession}
          onSessionClosed={() => setResolvedSession((s) => s ? { ...s, status: 'closed' } : s)}
        />
      )}

      {tab === 'messages' && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2, textAlign: 'center' }}>
          {t('coming_soon')}
        </Typography>
      )}
    </Box>
  )
}

// ── Roster tab — live seat self-claim view ──────────────────────────────────

function RosterTab({
  language,
  session,
  resolvedSession,
  onSessionClosed,
}: {
  language: 'en' | 'zh'
  session: DealSession | null
  resolvedSession: DealSessionDoc | null
  onSessionClosed: () => void
}) {
  const t = makeT(language)
  const [seats, setSeats] = useState<DealSeatClaim[]>([])
  const [busySeat, setBusySeat] = useState<number | null>(null)
  const [reservingSeat, setReservingSeat] = useState<number | null>(null)
  const [reserveName, setReserveName] = useState('')
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const isSeatClaimSession = resolvedSession?.totalSeats != null

  useEffect(() => {
    if (!session || !isSeatClaimSession) { setSeats([]); return }
    return subscribeSeatClaims(session.sessionId, setSeats)
  }, [session?.sessionId, isSeatClaimSession])

  const shareUrl = session ? buildShareUrl('deal', session.sessionId) : ''

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  useEffect(() => {
    if (!qrOpen || !shareUrl) return
    let cancelled = false
    import('qrcode').then(({ default: QRCode }) => {
      if (cancelled || !qrCanvasRef.current) return
      QRCode.toCanvas(qrCanvasRef.current, shareUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#1a1008', light: '#f6f1e7' },
      })
    })
    return () => { cancelled = true }
  }, [qrOpen, shareUrl])

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `deal-${session?.sessionId}.png`
    a.click()
  }

  const handleFreeSeat = async (seatNumber: number) => {
    if (!session) return
    setBusySeat(seatNumber)
    try {
      await unclaimSeatByHost(session.sessionId, seatNumber)
    } finally {
      setBusySeat(null)
    }
  }

  const handleReserveSeat = async (seatNumber: number) => {
    if (!session || !reserveName.trim()) return
    setBusySeat(seatNumber)
    try {
      await renameSeatByHost(session.sessionId, seatNumber, reserveName)
      setReservingSeat(null)
      setReserveName('')
    } finally {
      setBusySeat(null)
    }
  }

  const handleCloseSession = async () => {
    if (!session) return
    setClosing(true)
    try {
      await closeDealSession(session.sessionId, session.hostToken)
      onSessionClosed()
    } finally {
      setClosing(false)
    }
  }

  if (!session) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2, textAlign: 'center' }}>
        {t('no_active_session_start_one_from_draw_deal')}
      </Typography>
    )
  }

  if (!isSeatClaimSession) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2, textAlign: 'center' }}>
        {t('active_session_is_a_card_deal')}
      </Typography>
    )
  }

  const claimedCount = seats.filter((s) => s.claimedByToken != null).length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Chip
          size="small"
          label={`${claimedCount}/${seats.length} ${t('claimed')}`}
          color={seats.length > 0 && claimedCount === seats.length ? 'success' : 'default'}
        />
        {resolvedSession?.status === 'closed' && (
          <Chip size="small" label={t('closed')} color="warning" />
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={copied ? t('share_log_copied') : t('copy_player_link')}>
          <Button size="small" startIcon={<ContentCopyIcon fontSize="small" />} onClick={handleCopyLink} variant="outlined">
            {copied ? t('copied') : t('copy_link')}
          </Button>
        </Tooltip>
        <Tooltip title="QR Code">
          <IconButton size="small" onClick={() => setQrOpen(true)}>
            <QrCode2Icon />
          </IconButton>
        </Tooltip>
        {resolvedSession?.status === 'open' && (
          <Tooltip title={t('close_deal_no_more_claims')}>
            <span>
              <Button size="small" color="warning" startIcon={<LockIcon fontSize="small" />} onClick={handleCloseSession} disabled={closing}>
                {t('close')}
              </Button>
            </span>
          </Tooltip>
        )}
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {seats.map((seat) => {
          const isClaimed = seat.claimedByToken != null
          const isBusy = busySeat === seat.seatNumber
          const isReserving = reservingSeat === seat.seatNumber
          return (
            <Paper key={seat.seatNumber} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label={`#${seat.seatNumber}`} sx={{ fontWeight: 700, minWidth: 40 }} />
              {isReserving ? (
                <>
                  <TextField
                    size="small"
                    autoFocus
                    placeholder={t('player_name')}
                    value={reserveName}
                    onChange={(e) => setReserveName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleReserveSeat(seat.seatNumber) }}
                    sx={{ flex: 1, minWidth: 120 }}
                  />
                  <Button size="small" variant="contained" disabled={isBusy || !reserveName.trim()} onClick={() => handleReserveSeat(seat.seatNumber)}>
                    {t('save')}
                  </Button>
                  <Button size="small" variant="text" onClick={() => { setReservingSeat(null); setReserveName('') }}>
                    {t('cancel')}
                  </Button>
                </>
              ) : (
                <>
                  <Typography variant="body2" sx={{ flex: 1, color: isClaimed ? 'text.primary' : 'text.disabled', fontStyle: isClaimed ? 'normal' : 'italic' }}>
                    {isClaimed ? (seat.playerName || t('anonymous')) : t('unclaimed')}
                  </Typography>
                  {isClaimed ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      disabled={isBusy}
                      startIcon={isBusy ? <CircularProgress size={12} /> : <PersonOffIcon fontSize="small" />}
                      onClick={() => handleFreeSeat(seat.seatNumber)}
                    >
                      {t('set_unclaimed')}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      disabled={isBusy}
                      startIcon={<PersonAddIcon fontSize="small" />}
                      onClick={() => { setReservingSeat(seat.seatNumber); setReserveName('') }}
                    >
                      {t('set_claimed')}
                    </Button>
                  )}
                </>
              )}
            </Paper>
          )
        })}
      </Box>

      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 700 }}>QR Code</Typography>
            <IconButton size="small" onClick={() => setQrOpen(false)}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pb: 3 }}>
          <canvas ref={qrCanvasRef} style={{ borderRadius: 8, maxWidth: '100%' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all', textAlign: 'center' }}>
            {shareUrl}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyLink}>
              {copied ? t('copied') : t('copy_link')}
            </Button>
            <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={handleDownloadQr}>
              Download
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
