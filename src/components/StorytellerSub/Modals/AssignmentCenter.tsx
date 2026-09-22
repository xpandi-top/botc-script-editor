import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Tabs, Tab, TextField, Typography, Paper, Tooltip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CasinoIcon from '@mui/icons-material/Casino'
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
import CampaignIcon from '@mui/icons-material/Campaign'
import SendIcon from '@mui/icons-material/Send'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ClearAllIcon from '@mui/icons-material/ClearAll'
import { getDisplayName } from '../../../catalog'
import { makeT, makeTpl } from '../../../lib/t'
import { CharPoolPicker } from './CharPoolPicker'
import {
  getDealSession, closeDealSession,
  createSeatClaimSession, subscribeSeatClaims, unclaimSeatByHost, renameSeatByHost, assignCharacterToSeatByHost,
  subscribeMessages, sendMessage, markMessageRead,
  HOST_TOKEN_KEY, ACTIVE_HOST_DEAL_KEY, GAME_DEAL_KEY,
  type DealSession as DealSessionDoc, type DealSeatClaim, type DealMessage,
} from '../../../lib/DealSession'
import { buildShareUrl } from '../../../lib/shareUrl'
import type { StorytellerContext } from '../useStoryteller'
import type { NewGameConfig } from '../types'

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

const MIN_PLAYERS = 5
const MAX_PLAYERS = 15

export function AssignmentCenter({ ctx }: { ctx: StorytellerContext }) {
  const {
    language, lastDealSession,
    newGamePanel, setNewGamePanel, addPlayerSeat, removeLastPlayerSeat,
    randomAssignCharacters, updateSeatWithLog, currentDay, activeScriptSlug, scriptOptions,
  } = ctx
  const t = makeT(language)
  const tpl = makeTpl(language)
  const [tab, setTab] = useState<AssignmentTab>('draw')
  const [startingSeatClaim, setStartingSeatClaim] = useState(false)
  const [localSeatSession, setLocalSeatSession] = useState<DealSession | null>(null)
  const [poolOpen, setPoolOpen] = useState(false)
  // Character-pool restriction for random assignment when no draft is open
  // (live game) — newGamePanel.charPool is used instead when a draft exists.
  const [liveCharPool, setLiveCharPool] = useState<string[]>([])

  const { gameId, assignments, playerCount } = useAssignmentSource(ctx)
  const characterIds = Object.values(assignments).filter(Boolean) as string[]

  const storedGameDeal = useMemo(() => {
    try {
      const raw = localStorage.getItem(GAME_DEAL_KEY(gameId))
      if (raw) return JSON.parse(raw) as DealSession
    } catch {}
    return null
  }, [gameId])

  const existingDealSession: DealSession | null = localSeatSession ?? storedGameDeal ?? lastDealSession ?? null

  // Resolve the active session's full metadata.
  const [resolvedSession, setResolvedSession] = useState<DealSessionDoc | null>(null)
  useEffect(() => {
    if (!existingDealSession) { setResolvedSession(null); return }
    let cancelled = false
    getDealSession(existingDealSession.sessionId).then((s) => { if (!cancelled) setResolvedSession(s) })
    return () => { cancelled = true }
  }, [existingDealSession?.sessionId])

  const persistSession = (session: DealSession) => {
    try { localStorage.setItem(HOST_TOKEN_KEY(session.sessionId), session.hostToken) } catch {}
    if (gameId) {
      try { localStorage.setItem(GAME_DEAL_KEY(gameId), JSON.stringify(session)) } catch {}
    }
    try { localStorage.setItem(ACTIVE_HOST_DEAL_KEY, JSON.stringify(session)) } catch {}
  }

  const scriptSlug = newGamePanel?.scriptSlug ?? activeScriptSlug ?? ''
  const scriptChars = scriptOptions.find((s) => s.slug === scriptSlug)?.characters ?? []
  const charPool = newGamePanel ? (newGamePanel.charPool ?? []) : liveCharPool
  const setCharPool = (ids: string[]) => {
    if (newGamePanel) setNewGamePanel((prev) => prev ? { ...prev, charPool: ids } : prev)
    else setLiveCharPool(ids)
  }

  // Random character assignment — computed synchronously and returned so
  // callers don't have to wait a render cycle for newGamePanel/currentDay
  // to update before using the result.
  const buildRandomAssignment = (): Record<number, string> | null => {
    if (playerCount < 1) return null
    const config = newGamePanel ?? ({ playerCount, scriptSlug, charPool: liveCharPool } as unknown as NewGameConfig)
    return randomAssignCharacters(config)
  }

  const applyAssignment = (result: Record<number, string>) => {
    if (newGamePanel) {
      setNewGamePanel((prev) => prev ? { ...prev, assignments: result } : prev)
      return
    }
    for (const seat of currentDay.seats) {
      if (!seat.isTraveler && result[seat.seat]) {
        updateSeatWithLog(seat.seat, (s) => ({ ...s, characterId: result[seat.seat] }))
      }
    }
  }

  const handleRandomAssign = () => {
    const result = buildRandomAssignment()
    if (result) applyAssignment(result)
  }

  const handleStartSeatClaim = async () => {
    if (playerCount < 1) return
    setStartingSeatClaim(true)
    try {
      const session = await createSeatClaimSession(playerCount)
      persistSession(session)
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

  // Player-count edit: patches the in-progress setup draft when one is open
  // (new game / edit players), otherwise adds/removes a seat on the live game
  // directly — same primitives GameActionsBar's own +/- controls use.
  const handleIncPlayers = () => {
    if (playerCount >= MAX_PLAYERS) return
    if (newGamePanel) setNewGamePanel((prev) => prev ? { ...prev, playerCount: prev.playerCount + 1 } : prev)
    else addPlayerSeat()
  }
  const handleDecPlayers = () => {
    if (playerCount <= MIN_PLAYERS) return
    if (newGamePanel) setNewGamePanel((prev) => prev ? { ...prev, playerCount: prev.playerCount - 1 } : prev)
    else removeLastPlayerSeat()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('player_count')}</Typography>
        <IconButton size="small" onClick={handleDecPlayers} disabled={playerCount <= MIN_PLAYERS}>
          <RemoveIcon fontSize="small" />
        </IconButton>
        <Typography variant="body1" sx={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{playerCount}</Typography>
        <IconButton size="small" onClick={handleIncPlayers} disabled={playerCount >= MAX_PLAYERS}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Paper>

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

          <Paper variant="outlined" sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {t('random_pool')}
                </Typography>
                {charPool.length > 0 && (
                  <Chip size="small" label={charPool.length} color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {charPool.length > 0 && (
                  <Tooltip title={t('clear_pool')}>
                    <IconButton size="small" onClick={() => setCharPool([])}>
                      <ClearAllIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton size="small" onClick={() => setPoolOpen((v) => !v)}>
                  {poolOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </Box>
            </Box>
            {poolOpen && (
              <Box sx={{ mt: 1 }}>
                {scriptChars.length === 0 ? (
                  <Typography variant="caption" color="text.disabled">{t('select_script_first')}</Typography>
                ) : (
                  <CharPoolPicker
                    scriptChars={scriptChars}
                    selected={charPool}
                    onChange={setCharPool}
                    language={language}
                  />
                )}
              </Box>
            )}
          </Paper>

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <Tooltip title={t('random_assign_characters_hint')}>
              <span>
                <Button
                  variant="outlined"
                  onClick={handleRandomAssign}
                  disabled={playerCount < 1}
                  startIcon={<CasinoIcon fontSize="small" />}
                >
                  {t('random_assign')}
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
              <Tooltip title={t('view_roster')}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setTab('roster')}
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
          randomAssignCharacters={randomAssignCharacters}
          scriptSlug={scriptSlug}
          charPool={charPool}
        />
      )}

      {tab === 'messages' && (
        <MessagesTab language={language} session={existingDealSession} playerCount={playerCount} />
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
  randomAssignCharacters,
  scriptSlug,
  charPool,
}: {
  language: 'en' | 'zh'
  session: DealSession | null
  resolvedSession: DealSessionDoc | null
  onSessionClosed: () => void
  randomAssignCharacters: StorytellerContext['randomAssignCharacters']
  scriptSlug: string
  charPool: string[]
}) {
  const t = makeT(language)
  const [seats, setSeats] = useState<DealSeatClaim[]>([])
  const [busySeat, setBusySeat] = useState<number | null>(null)
  const [reservingSeat, setReservingSeat] = useState<number | null>(null)
  const [reserveName, setReserveName] = useState('')
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [assigningChars, setAssigningChars] = useState(false)
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

  // Randomly picks a character for every already-claimed seat and pushes it
  // directly — the guest's page reveals it live, no second "draw a card" step.
  const handleRandomAssignAndSend = async () => {
    if (!session) return
    const claimedSeatNumbers = seats.filter((s) => s.claimedByToken != null).map((s) => s.seatNumber)
    if (claimedSeatNumbers.length < 1) return
    setAssigningChars(true)
    try {
      const config = { playerCount: claimedSeatNumbers.length, scriptSlug, charPool } as unknown as NewGameConfig
      const result = randomAssignCharacters(config)
      const characterIds = Object.values(result)
      await Promise.all(
        claimedSeatNumbers.map((seatNumber, i) =>
          characterIds[i] ? assignCharacterToSeatByHost(session.sessionId, seatNumber, characterIds[i]) : Promise.resolve()
        )
      )
    } catch (e) {
      console.error('Failed to assign characters to claimed seats', e)
    } finally {
      setAssigningChars(false)
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
        <Tooltip title={t('random_assign_and_send_hint')}>
          <span>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={assigningChars ? <CircularProgress size={14} color="inherit" /> : <CasinoIcon fontSize="small" />}
              onClick={handleRandomAssignAndSend}
              disabled={assigningChars || claimedCount < 1}
            >
              {t('random_assign_and_send')}
            </Button>
          </span>
        </Tooltip>
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
                    {isClaimed && seat.characterId && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {getDisplayName(seat.characterId, language)}
                      </Typography>
                    )}
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

// ── Messages tab — ST <-> seat chat, broadcast or per-seat ──────────────────

function MessagesTab({
  language,
  session,
  playerCount,
}: {
  language: 'en' | 'zh'
  session: DealSession | null
  playerCount: number
}) {
  const t = makeT(language)
  const tpl = makeTpl(language)
  const [messages, setMessages] = useState<DealMessage[]>([])
  const [selectedSeat, setSelectedSeat] = useState<number | 'broadcast'>('broadcast')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session) { setMessages([]); return }
    return subscribeMessages(session.sessionId, setMessages)
  }, [session?.sessionId])

  const unreadBySeat = useMemo(() => {
    const map: Record<number, number> = {}
    for (const m of messages) {
      if (m.from === 'seat' && !m.read && m.seatNumber != null) {
        map[m.seatNumber] = (map[m.seatNumber] ?? 0) + 1
      }
    }
    return map
  }, [messages])

  const threadMessages = useMemo(() => {
    if (selectedSeat === 'broadcast') return messages.filter((m) => m.seatNumber === null)
    return messages.filter((m) => m.seatNumber === selectedSeat || m.seatNumber === null)
  }, [messages, selectedSeat])

  useEffect(() => {
    if (!session || selectedSeat === 'broadcast') return
    messages
      .filter((m) => m.from === 'seat' && m.seatNumber === selectedSeat && !m.read)
      .forEach((m) => { markMessageRead(session.sessionId, m.id).catch(() => {}) })
  }, [session, selectedSeat, messages])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [threadMessages.length, selectedSeat])

  const handleSend = async () => {
    if (!session || !draft.trim() || sending) return
    setSending(true)
    try {
      await sendMessage(session.sessionId, {
        seatNumber: selectedSeat === 'broadcast' ? null : selectedSeat,
        from: 'st',
        text: draft,
      })
      setDraft('')
    } catch (e) {
      console.error('Failed to send message', e)
    } finally {
      setSending(false)
    }
  }

  if (!session) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2, textAlign: 'center' }}>
        {t('no_active_session_start_one_from_draw_deal')}
      </Typography>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        <Chip
          size="small"
          icon={<CampaignIcon fontSize="small" />}
          label={t('broadcast_to_all_seats')}
          color={selectedSeat === 'broadcast' ? 'primary' : 'default'}
          variant={selectedSeat === 'broadcast' ? 'filled' : 'outlined'}
          onClick={() => setSelectedSeat('broadcast')}
        />
        {Array.from({ length: playerCount }, (_, i) => i + 1).map((seatNum) => (
          <Badge key={seatNum} badgeContent={unreadBySeat[seatNum] ?? 0} color="error">
            <Chip
              size="small"
              label={`#${seatNum}`}
              color={selectedSeat === seatNum ? 'primary' : 'default'}
              variant={selectedSeat === seatNum ? 'filled' : 'outlined'}
              onClick={() => setSelectedSeat(seatNum)}
            />
          </Badge>
        ))}
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, display: 'flex', flexDirection: 'column', height: 340 }}>
        <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {threadMessages.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2, fontStyle: 'italic' }}>
              {t('no_messages_yet')}
            </Typography>
          )}
          {threadMessages.map((m) => {
            const mine = m.from === 'st'
            const broadcast = m.seatNumber === null
            return (
              <Box key={m.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                  {broadcast && <CampaignIcon sx={{ fontSize: 12 }} />}
                  {mine ? t('storyteller_label') : tpl('seat_n', m.seatNumber ?? 0)}
                </Typography>
                <Paper
                  variant={mine ? 'elevation' : 'outlined'}
                  elevation={mine ? 2 : 0}
                  sx={{
                    px: 1.5, py: 0.75, borderRadius: 2, maxWidth: '80%',
                    bgcolor: mine ? 'primary.main' : 'background.paper',
                    color: mine ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</Typography>
                </Paper>
              </Box>
            )
          })}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('type_a_message_enter_to_send')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            disabled={sending}
          />
          <IconButton color="primary" onClick={handleSend} disabled={sending || !draft.trim()}>
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  )
}
