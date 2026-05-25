/**
 * DealHostPage — Storyteller live dashboard for an active deal session.
 *
 * Features:
 * - Real-time card status via Firestore onSnapshot
 * - Peek at all characters (toggle face-up/down)
 * - Click claimed card → assign seat number + player name
 * - "Apply to Game" → patches NewGameConfig with seatNames + assignments
 * - Copy share link + close session
 */
import { useEffect, useState, useCallback } from 'react'
import {
  Box, Button, Chip, CircularProgress, Divider, IconButton,
  Paper, TextField, Tooltip, Typography,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import PersonIcon from '@mui/icons-material/Person'
import LockIcon from '@mui/icons-material/Lock'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import {
  getDealSession,
  subscribeCards,
  updateCardAssignment,
  markCardClaimedByHost,
  markCardUnclaimedByHost,
  closeDealSession,
  type DealSession,
  type DealCard,
} from '../lib/firebaseDeal'
import { getDisplayName, getIconForCharacter } from '../catalog'
import type { NewGameConfig } from './StorytellerSub/types'
import { useT } from '../context/I18nContext'
import { makeTpl } from '../lib/t'

interface Props {
  sessionId: string
  hostToken: string
  language: 'en' | 'zh'
  /** Called when ST clicks "Apply to Game" */
  onApplyToGame?: (patch: Partial<NewGameConfig>) => void
  /** Called to close this page */
  onClose?: () => void
}

export function DealHostPage({ sessionId, hostToken, language, onApplyToGame, onClose }: Props) {
  const [session, setSession] = useState<DealSession | null>(null)
  const [cards, setCards] = useState<DealCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFaceUp, setShowFaceUp] = useState(false)
  const [selectedPos, setSelectedPos] = useState<number | null>(null)
  const [editSeat, setEditSeat] = useState('')
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [closing, setClosing] = useState(false)

  const { t } = useT()
  const tpl = makeTpl(language)

  // Load session metadata once
  useEffect(() => {
    getDealSession(sessionId)
      .then(s => { setSession(s); setLoading(false) })
      .catch(e => { setError(e instanceof Error ? e.message : String(e)); setLoading(false) })
  }, [sessionId])

  // Real-time subscription to cards
  useEffect(() => {
    const unsub = subscribeCards(sessionId, (updated) => {
      setCards(updated)
    })
    return unsub
  }, [sessionId])

  // Sync edit fields when selection changes
  useEffect(() => {
    if (selectedPos === null) return
    const card = cards.find(c => c.position === selectedPos)
    if (!card) return
    const seat = card.assignedSeat ?? card.claimedBySeat
    setEditSeat(seat != null ? String(seat) : '')
    setEditName(card.assignedName ?? card.claimedByName ?? '')
  }, [selectedPos, cards])

  const claimedCount = cards.filter(c => c.claimedByToken !== null).length
  const totalCount   = session?.cardCount ?? cards.length

  const shareUrl = `${window.location.origin}${window.location.pathname}?deal=${sessionId}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback — select text from a temp input
    }
  }

  const handleSaveAssignment = useCallback(async () => {
    if (selectedPos === null) return
    setSaving(true)
    const seat = parseInt(editSeat, 10)
    try {
      await updateCardAssignment(sessionId, selectedPos, Number.isNaN(seat) ? null : seat, editName)
    } finally {
      setSaving(false)
    }
  }, [sessionId, selectedPos, editSeat, editName])

  const handleMarkClaimed = useCallback(async () => {
    if (selectedPos === null) return
    setSaving(true)
    const seat = parseInt(editSeat, 10)
    try {
      await markCardClaimedByHost(sessionId, selectedPos, editName, Number.isNaN(seat) ? null : seat)
    } finally {
      setSaving(false)
    }
  }, [sessionId, selectedPos, editSeat, editName])

  const handleMarkUnclaimed = useCallback(async () => {
    if (selectedPos === null) return
    setSaving(true)
    try {
      await markCardUnclaimedByHost(sessionId, selectedPos)
    } finally {
      setSaving(false)
    }
  }, [sessionId, selectedPos])

  const handleApplyToGame = () => {
    if (!onApplyToGame) return
    const assigned = cards
      .map(c => ({ ...c, effectiveSeat: c.assignedSeat ?? c.claimedBySeat }))
      .filter((c): c is DealCard & { effectiveSeat: number } => c.effectiveSeat != null)
    const patch: Partial<NewGameConfig> = {
      playerCount: Math.max(totalCount, ...assigned.map(c => c.effectiveSeat)),
      seatNames: Object.fromEntries(
        assigned.map(c => [c.effectiveSeat, c.assignedName ?? c.claimedByName ?? `Player ${c.effectiveSeat}`])
      ),
      assignments: Object.fromEntries(
        assigned.map(c => [c.effectiveSeat, c.characterId])
      ),
    }
    onApplyToGame(patch)
  }

  const handleClose = async () => {
    setClosing(true)
    try {
      await closeDealSession(sessionId, hostToken)
      setSession(prev => prev ? { ...prev, status: 'closed' } : prev)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setClosing(false)
    }
  }

  const selectedCard = selectedPos !== null ? cards.find(c => c.position === selectedPos) : null

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, maxWidth: 680, mx: 'auto' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <AutoStoriesIcon color="primary" />
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
          {t('deal_dashboard')}
        </Typography>
        {onClose && (
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        )}
      </Box>

      {/* Session info bar */}
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Chip
          size="small"
          label={`${claimedCount}/${totalCount} ${t('claimed')}`}
          color={claimedCount === totalCount ? 'success' : 'default'}
        />
        {session?.status === 'closed' && (
          <Chip size="small" label={t('closed')} color="warning" />
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={copied ? (t('share_log_copied')) : (t('copy_player_link'))}>
          <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleCopyLink} variant="outlined">
            {copied ? (t('copied')) : (t('copy_link'))}
          </Button>
        </Tooltip>
        <Tooltip title={showFaceUp ? (t('hide_characters')) : (t('show_characters'))}>
          <IconButton size="small" onClick={() => setShowFaceUp(v => !v)}>
            {showFaceUp ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
        </Tooltip>
        {session?.status === 'open' && (
          <Tooltip title={t('close_deal_no_more_claims')}>
            <Button size="small" color="warning" startIcon={<LockIcon />} onClick={handleClose} disabled={closing}>
              {t('close')}
            </Button>
          </Tooltip>
        )}
      </Paper>

      {/* Card grid */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: 1,
      }}>
        {cards.map((card) => {
          const claimed = card.claimedByToken !== null
          const icon = getIconForCharacter(card.characterId)
          const isSelected = selectedPos === card.position
          return (
            <Paper
              key={card.position}
              onClick={() => setSelectedPos(isSelected ? null : card.position)}
              elevation={isSelected ? 6 : 1}
              sx={{
                height: 110,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                cursor: 'pointer',
                borderRadius: 2,
                border: '2px solid',
                borderColor: isSelected ? 'primary.main' : claimed ? 'success.light' : 'divider',
                transition: 'all 0.15s',
                p: 0.5,
                userSelect: 'none',
                '&:hover': { borderColor: 'primary.light' },
              }}
            >
              {(showFaceUp || claimed) && icon ? (
                <Box component="img" src={icon}
                  sx={{ width: 36, height: 36, objectFit: 'contain', opacity: claimed ? 1 : 0.5 }}
                />
              ) : (
                <AutoStoriesIcon sx={{ fontSize: 28, color: claimed ? 'success.main' : 'text.disabled' }} />
              )}
              {claimed && (
                <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1.2, textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {card.assignedName ?? card.claimedByName ?? (t('anon'))}
                </Typography>
              )}
              {card.assignedSeat != null && (
                <Chip label={`#${card.assignedSeat}`} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
              )}
              {card.assignedSeat == null && card.claimedBySeat != null && (
                <Chip label={`#${card.claimedBySeat}?`} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
              )}
              {showFaceUp && !claimed && (
                <Typography variant="caption" sx={{ fontSize: '0.58rem', textAlign: 'center', lineHeight: 1.2, maxWidth: 80 }}>
                  {getDisplayName(card.characterId, language)}
                </Typography>
              )}
            </Paper>
          )
        })}
      </Box>

      {/* Selected card detail */}
      {selectedCard && (
        <>
          <Divider />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getIconForCharacter(selectedCard.characterId) && (
                <Box component="img" src={getIconForCharacter(selectedCard.characterId)!}
                  sx={{ width: 40, height: 40, objectFit: 'contain' }}
                />
              )}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {getDisplayName(selectedCard.characterId, language)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedCard.claimedByToken
                    ? `${t('player_section')}: ${selectedCard.claimedByName ?? (t('anonymous'))}`
                    : (t('unclaimed'))}
                </Typography>
                {selectedCard.claimedBySeat != null && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {tpl('player_entered_seat', selectedCard.claimedBySeat)}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label={t('seat')}
                value={editSeat}
                onChange={e => setEditSeat(e.target.value.replace(/\D/g, ''))}
                sx={{ width: 90 }}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
              />
              <TextField
                size="small"
                label={t('player_name')}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                sx={{ flex: 1, minWidth: 120 }}
                slotProps={{ input: { startAdornment: <PersonIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} /> } }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveAssignment}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={14} /> : <CheckIcon />}
              >
                {t('save')}
              </Button>
              {selectedCard.claimedByToken ? (
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  onClick={handleMarkUnclaimed}
                  disabled={saving}
                  startIcon={<PersonOffIcon fontSize="small" />}
                >
                  {t('set_unclaimed')}
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  onClick={handleMarkClaimed}
                  disabled={saving}
                  startIcon={<PersonAddIcon fontSize="small" />}
                >
                  {t('set_claimed')}
                </Button>
              )}
            </Box>
          </Box>
        </>
      )}

      {/* Apply to Game */}
      {onApplyToGame && (
        <>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {tpl('seats_ready_n_of_m', cards.filter(c => (c.assignedSeat ?? c.claimedBySeat) != null).length, totalCount)}
            </Typography>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleApplyToGame}
              disabled={cards.filter(c => (c.assignedSeat ?? c.claimedBySeat) != null).length === 0}
            >
              {t('apply_start_game')}
            </Button>
          </Box>
        </>
      )}
    </Box>
  )
}
