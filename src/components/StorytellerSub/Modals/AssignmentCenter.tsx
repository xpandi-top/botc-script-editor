import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Tabs, Tab, TextField, Typography, Paper, Tooltip, Select, MenuItem, FormControl, InputLabel } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CasinoIcon from '@mui/icons-material/Casino'
import StyleIcon from '@mui/icons-material/Style'
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
import ShuffleIcon from '@mui/icons-material/Shuffle'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { allCharacters, getCharacterById } from '../../../catalog'
import { makeT, makeTpl } from '../../../lib/t'
import { CHARACTER_DISTRIBUTION } from '../constants'
import { CharPoolPicker } from './CharPoolPicker'
import { CharSelect, DistRow, TeamDot } from './ModalsNewGameHelpers'
import { MonoText } from '../../../components/ui'
import {
  getDealSession, closeDealSession,
  createSeatClaimSession, subscribeSeatClaims, unclaimSeatByHost, renameSeatByHost, assignCharacterToSeatByHost, addSeatToSession,
  subscribeMessages, sendMessage, markMessageRead,
  HOST_TOKEN_KEY, ACTIVE_HOST_DEAL_KEY, GAME_DEAL_KEY,
  type DealSession as DealSessionDoc, type DealSeatClaim, type DealMessage,
} from '../../../lib/DealSession'
import { buildShareUrl } from '../../../lib/shareUrl'
import type { StorytellerContext } from '../useStoryteller'
import type { NewGameConfig } from '../types'

type DealSession = { sessionId: string; hostToken: string }
type AssignmentTab = 'deal' | 'messages'

// ── All traveler characters ────────────────────────────────────────────────
const TRAVELER_CHARS = allCharacters.filter((c) => c.team === 'traveler').map((c) => c.id)

/**
 * Resolve the character assignments to deal, and the gameId to key the deal
 * session under. Sources from the in-progress setup draft (newGamePanel) when
 * one is open — new game or edit-players both funnel through it — otherwise
 * from the live running game's seats, so the feature works mid-game too.
 * Traveler seats are tracked separately (own pool, no seat-claim session).
 */
function useAssignmentSource(ctx: StorytellerContext) {
  const { newGamePanel, currentDay, gameId: liveGameId } = ctx
  return useMemo(() => {
    if (newGamePanel) {
      const playerCount = newGamePanel.playerCount ?? 0
      const travelerCount = newGamePanel.travelerCount ?? 0
      return {
        gameId: newGamePanel.gameId ?? liveGameId,
        assignments: newGamePanel.assignments ?? {},
        userAssignments: newGamePanel.userAssignments ?? {},
        playerCount,
        travelerSeats: Array.from({ length: travelerCount }, (_, i) => playerCount + i + 1),
        travelerAssignments: newGamePanel.travelerAssignments ?? {},
      }
    }
    const assignments: Record<number, string> = {}
    const userAssignments: Record<number, string> = {}
    const travelerSeats: number[] = []
    const travelerAssignments: Record<number, string> = {}
    let playerCount = 0
    for (const seat of currentDay.seats) {
      if (seat.isTraveler) {
        travelerSeats.push(seat.seat)
        if (seat.characterId) travelerAssignments[seat.seat] = seat.characterId
      } else {
        playerCount++
        if (seat.characterId) assignments[seat.seat] = seat.characterId
        if (seat.userCharacterId) userAssignments[seat.seat] = seat.userCharacterId
      }
    }
    return { gameId: liveGameId, assignments, userAssignments, playerCount, travelerSeats, travelerAssignments }
  }, [newGamePanel, currentDay.seats, liveGameId])
}

const MIN_PLAYERS = 5
const MAX_PLAYERS = 15

export function AssignmentCenter({ ctx }: { ctx: StorytellerContext }) {
  const {
    language,
    newGamePanel, setNewGamePanel, addPlayerSeat, removeLastPlayerSeat, setShowAssignmentCenter,
    randomAssignCharacters, updateSeatWithLog, updateCurrentDay, currentDay, activeScriptSlug, scriptOptions,
    startNewGame, applyGameChanges,
  } = ctx
  const t = makeT(language)
  const tpl = makeTpl(language)
  const [tab, setTab] = useState<AssignmentTab>('deal')
  const [startingSeatClaim, setStartingSeatClaim] = useState(false)
  const [localSeatSession, setLocalSeatSession] = useState<DealSession | null>(null)
  const [poolOpen, setPoolOpen] = useState(false)
  // Character-pool restriction for random assignment when no draft is open
  // (live game) — newGamePanel.charPool is used instead when a draft exists.
  const [liveCharPool, setLiveCharPool] = useState<string[]>([])

  const { gameId, assignments, userAssignments, playerCount, travelerSeats, travelerAssignments } = useAssignmentSource(ctx)

  const storedGameDeal = useMemo(() => {
    try {
      const raw = localStorage.getItem(GAME_DEAL_KEY(gameId))
      if (raw) return JSON.parse(raw) as DealSession
    } catch {}
    return null
  }, [gameId])

  // Deliberately NOT falling back to a device-wide "last used session" here —
  // that used to leak a stale session from a previous, unrelated game into a
  // freshly started one (same browser, different gameId). storedGameDeal is
  // properly scoped per game via GAME_DEAL_KEY; that's the only valid source
  // besides the in-memory session just created this render.
  const existingDealSession: DealSession | null = localSeatSession ?? storedGameDeal ?? null

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
  // Script is only changeable while a draft is open — a live game's script
  // was fixed at start, so it's shown read-only for the live-game path.
  const handleScriptChange = (slug: string) => {
    setNewGamePanel((prev) => prev ? { ...prev, scriptSlug: slug } : prev)
  }

  const calcDist = CHARACTER_DISTRIBUTION[playerCount] ?? { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
  const actCounts = useMemo(() => {
    const c = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
    Object.values(assignments).forEach((cid) => {
      const ch = cid ? getCharacterById(cid) : null
      if (ch && c[ch.team as keyof typeof c] !== undefined) c[ch.team as keyof typeof c]++
    })
    return c
  }, [assignments])

  const demonBluffs = newGamePanel ? (newGamePanel.demonBluffs ?? []) : (currentDay.demonBluffs ?? [])
  const setDemonBluffs = (bluffs: string[]) => {
    if (newGamePanel) setNewGamePanel((prev) => prev ? { ...prev, demonBluffs: bluffs } : prev)
    else updateCurrentDay((d) => ({ ...d, demonBluffs: bluffs }))
  }
  // Characters eligible as demon bluffs: not currently assigned to any seat.
  // Prefer script characters; fall back to ALL townsfolk/outsider from catalog
  // so tight custom scripts never show an empty bluff picker.
  const availableBluffs = useMemo(() => {
    const assigned = new Set<string>(Object.values(assignments).filter(Boolean) as string[])
    const scriptAvail = scriptChars.filter((id: string) => !assigned.has(id))
    if (scriptAvail.length >= 3) return scriptAvail
    const catalogFallback = allCharacters
      .filter((c) => (c.team === 'townsfolk' || c.team === 'outsider') && !assigned.has(c.id))
      .map((c) => c.id)
    return [...new Set([...scriptAvail, ...catalogFallback])]
  }, [scriptChars, assignments])
  // Per-slot options: exclude characters already picked in the other two slots.
  // Always include the slot's own current value so it stays visible after close/reopen.
  const bluffSlotOptions = useMemo(() => {
    return [0, 1, 2].map((idx) => {
      const others = new Set(demonBluffs.filter((id, i) => i !== idx && !!id))
      const filtered = availableBluffs.filter((id) => !others.has(id))
      const currentVal = demonBluffs[idx]
      if (currentVal && !filtered.includes(currentVal)) return [currentVal, ...filtered]
      return filtered
    })
  }, [availableBluffs, demonBluffs])
  const setBluff = (idx: number, cid: string) => {
    const bluffs = [...demonBluffs, '', '', ''].slice(0, 3)
    bluffs[idx] = cid
    setDemonBluffs(bluffs)
  }
  const quickFillBluffs = () => {
    const pool = availableBluffs.filter((id) => {
      const ch = getCharacterById(id)
      return ch && (ch.team === 'townsfolk' || ch.team === 'outsider')
    })
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, 3)
    while (picked.length < 3) picked.push('')
    setDemonBluffs(picked)
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

  // Manual single-seat override from the roster row picker.
  const updateAssignment = (seatNumber: number, characterId: string) => {
    if (newGamePanel) {
      setNewGamePanel((prev) => prev ? { ...prev, assignments: { ...prev.assignments, [seatNumber]: characterId } } : prev)
      return
    }
    updateSeatWithLog(seatNumber, (s) => ({ ...s, characterId }))
  }

  const setTravelerAssignment = (seatNumber: number, characterId: string) => {
    if (newGamePanel) {
      setNewGamePanel((prev) => prev ? { ...prev, travelerAssignments: { ...prev.travelerAssignments, [seatNumber]: characterId } } : prev)
      return
    }
    updateSeatWithLog(seatNumber, (s) => ({ ...s, characterId }))
  }

  // Shared by traveler and regular seat rows alike — same underlying field.
  const setSeatNote = (seatNumber: number, note: string) => {
    if (newGamePanel) {
      setNewGamePanel((prev) => prev ? { ...prev, seatNotes: { ...prev.seatNotes, [seatNumber]: note } } : prev)
      return
    }
    updateSeatWithLog(seatNumber, (s) => ({ ...s, note }))
  }

  const setUserPerceived = (seatNumber: number, characterId: string | null) => {
    if (newGamePanel) {
      setNewGamePanel((prev) => prev ? { ...prev, userAssignments: { ...prev.userAssignments, [seatNumber]: characterId } } : prev)
      return
    }
    updateSeatWithLog(seatNumber, (s) => ({ ...s, userCharacterId: characterId }))
  }

  const handleRandomAssign = () => {
    const result = buildRandomAssignment()
    if (result) applyAssignment(result)
  }

  const canStartNewSession = !existingDealSession || resolvedSession?.status === 'closed'

  const handleStartSeatClaim = async () => {
    if (playerCount < 1) return
    setStartingSeatClaim(true)
    try {
      const session = await createSeatClaimSession(playerCount)
      persistSession(session)
      setLocalSeatSession(session)
      const full = await getDealSession(session.sessionId)
      setResolvedSession(full)
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
    const newSeatNumber = playerCount + 1
    if (newGamePanel) setNewGamePanel((prev) => prev ? { ...prev, playerCount: prev.playerCount + 1 } : prev)
    else addPlayerSeat()
    // A seat-claim session may already be running (created for the old,
    // smaller player count) — give the new seat a Firestore doc right away
    // so claiming/assigning it doesn't fail against a doc that never existed.
    if (existingDealSession && newSeatNumber > seats.length) {
      addSeatToSession(existingDealSession.sessionId, newSeatNumber).catch((e) => {
        console.error('Failed to add seat to active session', e)
      })
    }
  }
  const handleDecPlayers = () => {
    if (playerCount <= MIN_PLAYERS) return
    if (newGamePanel) setNewGamePanel((prev) => prev ? { ...prev, playerCount: prev.playerCount - 1 } : prev)
    else removeLastPlayerSeat()
  }

  // Lets a brand-new-game or edit-players draft finish here — no need to
  // reopen the New Game modal just to hit start/apply.
  const handleFinishDraft = () => {
    if (!newGamePanel) return
    if (newGamePanel.editMode) applyGameChanges(newGamePanel)
    else startNewGame(newGamePanel)
    setShowAssignmentCenter(false)
  }

  // ── Live seat-claim roster (was a separate Roster tab — now inline) ────────
  const [seats, setSeats] = useState<DealSeatClaim[]>([])
  const [busySeat, setBusySeat] = useState<number | null>(null)
  const [reservingSeat, setReservingSeat] = useState<number | null>(null)
  const [reserveName, setReserveName] = useState('')
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [sendingAssigned, setSendingAssigned] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!existingDealSession) { setSeats([]); return }
    return subscribeSeatClaims(existingDealSession.sessionId, setSeats)
  }, [existingDealSession?.sessionId])

  const shareUrl = existingDealSession ? buildShareUrl('deal', existingDealSession.sessionId) : ''

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
    a.download = `deal-${existingDealSession?.sessionId}.png`
    a.click()
  }

  const handleFreeSeat = async (seatNumber: number) => {
    if (!existingDealSession) return
    setBusySeat(seatNumber)
    try {
      await unclaimSeatByHost(existingDealSession.sessionId, seatNumber)
    } finally {
      setBusySeat(null)
    }
  }

  const handleReserveSeat = async (seatNumber: number) => {
    if (!existingDealSession || !reserveName.trim()) return
    setBusySeat(seatNumber)
    try {
      await renameSeatByHost(existingDealSession.sessionId, seatNumber, reserveName)
      setReservingSeat(null)
      setReserveName('')
    } finally {
      setBusySeat(null)
    }
  }

  const handleCloseSession = async () => {
    if (!existingDealSession) return
    setClosing(true)
    try {
      await closeDealSession(existingDealSession.sessionId, existingDealSession.hostToken)
      setResolvedSession((s) => s ? { ...s, status: 'closed' } : s)
    } finally {
      setClosing(false)
    }
  }

  const claimedSeatNumbers = seats.filter((s) => s.claimedByToken != null).map((s) => s.seatNumber)
  const claimedCount = claimedSeatNumbers.length
  // A claimed seat is "pending" once it has an assigned character (a) that
  // doesn't yet match what's been pushed to its Firestore doc (b) — covers
  // both never-sent and changed-after-send.
  const pendingSendCount = claimedSeatNumbers.filter((n) => assignments[n] && seats.find((s) => s.seatNumber === n)?.characterId !== assignments[n]).length

  // Pushes the CURRENT assignments to every claimed seat — never re-randomizes,
  // so what the ST sees in the roster is always exactly what gets delivered.
  const handleSendAssigned = async () => {
    if (!existingDealSession) return
    const toSend = claimedSeatNumbers.filter((n) => assignments[n])
    if (toSend.length < 1) return
    setSendingAssigned(true)
    try {
      await Promise.all(toSend.map((n) => assignCharacterToSeatByHost(existingDealSession.sessionId, n, assignments[n])))
    } catch (e) {
      console.error('Failed to send assigned characters', e)
    } finally {
      setSendingAssigned(false)
    }
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

      {newGamePanel && (
        <Button
          variant="contained"
          fullWidth
          onClick={handleFinishDraft}
          startIcon={<PlayArrowIcon fontSize="small" />}
        >
          {newGamePanel.editMode ? t('apply_changes') : t('start_new_game')}
        </Button>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
        <Tab value="deal" icon={<StyleIcon fontSize="small" />} iconPosition="start" label={t('draw_deal_tab')} />
        <Tab value="messages" icon={<ChatIcon fontSize="small" />} iconPosition="start" label={t('messages_tab')} />
      </Tabs>

      {tab === 'deal' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {t('deal_assigned_characters_to_players_new_tab')}
          </Typography>

          {newGamePanel ? (
            <FormControl size="small" fullWidth>
              <InputLabel>{t('script')}</InputLabel>
              <Select value={scriptSlug} onChange={(e) => handleScriptChange(e.target.value)} label={t('script')}>
                {scriptOptions.map((s) => (
                  <MenuItem key={s.slug} value={s.slug}>
                    {language === 'zh' ? (s.titleZh || s.title) : s.title}
                    {s.version && (
                      <MonoText component="span" sx={{ ml: 0.75, color: 'text.secondary' }}>
                        v{s.version}
                      </MonoText>
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Typography variant="caption" color="text.secondary">
              {t('script')}: {(() => {
                const opt = scriptOptions.find((s) => s.slug === scriptSlug)
                if (!opt) return scriptSlug
                return language === 'zh' ? (opt.titleZh || opt.title) : opt.title
              })()}
            </Typography>
          )}

          <Paper variant="outlined" sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ width: 40 }}></Typography>
              <Chip size="small" label="T" color="primary" sx={{ width: 28, height: 22 }} />
              <Chip size="small" label="O" color="info" sx={{ width: 28, height: 22 }} />
              <Chip size="small" label="M" color="error" sx={{ width: 28, height: 22 }} />
              <Chip size="small" label="D" color="error" sx={{ width: 28, height: 22 }} />
            </Box>
            <DistRow label={t('calculated')} counts={calcDist} />
            <DistRow label={t('actual_short')} counts={actCounts} calc={calcDist} />
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
                  {charPool.length > 0 ? tpl('random_pool_n', charPool.length) : t('random_assign')}
                </Button>
              </span>
            </Tooltip>
            {canStartNewSession && (
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
            )}
          </Box>

          <Paper variant="outlined" sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">{t('demon_bluffs')}</Typography>
              <Tooltip title={t('random_fill_hint')}>
                <IconButton size="small" onClick={quickFillBluffs}>
                  <ShuffleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
              {[0, 1, 2].map((idx) => (
                <CharSelect
                  key={idx}
                  value={demonBluffs[idx] ?? ''}
                  options={bluffSlotOptions[idx]}
                  language={language}
                  placeholder={t('select_pick')}
                  onChange={(id) => setBluff(idx, id)}
                />
              ))}
            </Box>
          </Paper>

          {travelerSeats.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('traveler_assignments')}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {travelerSeats.map((sNum) => {
                  const tcid = travelerAssignments[sNum] ?? ''
                  const tch = tcid ? getCharacterById(tcid) : null
                  const note = newGamePanel ? (newGamePanel.seatNotes?.[sNum] ?? '') : (currentDay.seats.find((s) => s.seat === sNum)?.note ?? '')
                  return (
                    <Box key={sNum} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                      <Typography variant="body2" sx={{ width: 40, flexShrink: 0, fontWeight: 700, color: 'text.secondary' }}>
                        ✈#{sNum}
                      </Typography>
                      <CharSelect
                        value={tcid}
                        options={TRAVELER_CHARS}
                        language={language}
                        placeholder={t('select_traveler')}
                        onChange={(id) => setTravelerAssignment(sNum, id)}
                      />
                      <TeamDot team={tch?.team} />
                      <TextField
                        size="small"
                        fullWidth
                        placeholder={t('traveler_note')}
                        value={note}
                        onChange={(e) => setSeatNote(sNum, e.target.value)}
                        sx={{ flex: { xs: '1 1 100%', sm: 1 } }}
                      />
                    </Box>
                  )
                })}
              </Box>
            </Paper>
          )}

          {existingDealSession && (
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
              <Tooltip title={t('send_assigned_characters_hint')}>
                <span>
                  <Button
                    size="small"
                    variant="contained"
                    color="secondary"
                    startIcon={sendingAssigned ? <CircularProgress size={14} color="inherit" /> : <SendIcon fontSize="small" />}
                    onClick={handleSendAssigned}
                    disabled={sendingAssigned || pendingSendCount < 1}
                  >
                    {pendingSendCount > 0 ? tpl('send_assigned_characters_n', pendingSendCount) : t('send_assigned_characters')}
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
          )}

          {/* Regular-seat roster — always visible so a specific character can be
              assigned per seat whether or not a seat-claim session exists yet;
              claim status/actions only render once a session is active. */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Array.from({ length: playerCount }, (_, i) => i + 1).map((sNum) => {
              const claim = seats.find((s) => s.seatNumber === sNum)
              const isClaimed = claim?.claimedByToken != null
              const isBusy = busySeat === sNum
              const isReserving = reservingSeat === sNum
              const assignedCid = assignments[sNum] ?? ''
              const ch = assignedCid ? getCharacterById(assignedCid) : null
              const delivered = !!assignedCid && claim?.characterId === assignedCid
              const pending = !!assignedCid && !!existingDealSession && claim?.characterId !== assignedCid
              const userCid = userAssignments[sNum]
              const hasUserOverride = userCid !== undefined && userCid !== null && userCid !== ''
              const note = newGamePanel ? (newGamePanel.seatNotes?.[sNum] ?? '') : (currentDay.seats.find((s) => s.seat === sNum)?.note ?? '')
              return (
                <Paper key={sNum} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" label={`#${sNum}`} sx={{ fontWeight: 700, minWidth: 40 }} />
                  {existingDealSession && isReserving ? (
                    <>
                      <TextField
                        size="small"
                        autoFocus
                        placeholder={t('player_name')}
                        value={reserveName}
                        onChange={(e) => setReserveName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleReserveSeat(sNum) }}
                        sx={{ flex: 1, minWidth: 120 }}
                      />
                      <Button size="small" variant="contained" disabled={isBusy || !reserveName.trim()} onClick={() => handleReserveSeat(sNum)}>
                        {t('save')}
                      </Button>
                      <Button size="small" variant="text" onClick={() => { setReservingSeat(null); setReserveName('') }}>
                        {t('cancel')}
                      </Button>
                    </>
                  ) : (
                    <>
                      {existingDealSession && (
                        <Typography variant="body2" sx={{ minWidth: 90, color: isClaimed ? 'text.primary' : 'text.disabled', fontStyle: isClaimed ? 'normal' : 'italic' }}>
                          {isClaimed ? (claim?.playerName || t('anonymous')) : t('unclaimed')}
                        </Typography>
                      )}
                      <Box sx={{ minWidth: 140 }}>
                        <CharSelect
                          value={assignedCid}
                          options={scriptChars}
                          language={language}
                          placeholder={t('select_pick')}
                          onChange={(id) => updateAssignment(sNum, id)}
                        />
                      </Box>
                      <TeamDot team={ch?.team} />
                      <Button
                        size="small"
                        variant={hasUserOverride ? 'contained' : 'text'}
                        onClick={() => hasUserOverride ? setUserPerceived(sNum, null) : setUserPerceived(sNum, assignedCid || null)}
                        sx={{ minWidth: 28, p: 0.5 }}
                      >
                        {hasUserOverride ? '👁' : '='}
                      </Button>
                      {hasUserOverride && (
                        <>
                          <CharSelect value={userCid ?? ''} options={scriptChars} language={language} placeholder={t('perceived_character')} onChange={(id) => setUserPerceived(sNum, id || null)} />
                          <TeamDot team={getCharacterById(userCid ?? '')?.team} />
                        </>
                      )}
                      <TextField
                        size="small"
                        placeholder={t('note_placeholder')}
                        value={note}
                        onChange={(e) => setSeatNote(sNum, e.target.value)}
                        sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: 100 }}
                      />
                      {assignedCid && existingDealSession && (
                        <Chip
                          size="small"
                          label={delivered ? t('delivered') : t('pending_delivery')}
                          color={delivered ? 'success' : pending ? 'warning' : 'default'}
                          variant={delivered ? 'filled' : 'outlined'}
                        />
                      )}
                      {existingDealSession && (
                        isClaimed ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            disabled={isBusy}
                            startIcon={isBusy ? <CircularProgress size={12} /> : <PersonOffIcon fontSize="small" />}
                            onClick={() => handleFreeSeat(sNum)}
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
                            onClick={() => { setReservingSeat(sNum); setReserveName('') }}
                          >
                            {t('set_claimed')}
                          </Button>
                        )
                      )}
                    </>
                  )}
                </Paper>
              )
            })}
          </Box>

          {existingDealSession && (
            <>
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
            </>
          )}
        </Box>
      )}

      {tab === 'messages' && (
        <MessagesTab language={language} session={existingDealSession} playerCount={playerCount} />
      )}
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
