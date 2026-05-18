/**
 * DealGuestPage — player-facing card-deal UI.
 *
 * Flow:
 *  1. Load session metadata + all card positions (NOT characterIds for other cards)
 *  2. Player enters optional display name
 *  3. Player taps one face-down card → claim → flip → show character
 *  4. All other cards lock immediately
 *  5. Re-open link → restored from claimedByToken in sessionStorage
 */
import { useEffect, useState, useCallback, type ReactNode } from 'react'
import {
  Box, Button, CircularProgress, TextField, Typography, Paper,
} from '@mui/material'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import LockIcon from '@mui/icons-material/Lock'
import {
  getDealSession,
  getDealCards,
  findClaimedCard,
  claimCard,
  getGuestToken,
  type DealSession,
  type DealCard,
} from '../lib/firebaseDeal'
import { getDisplayName, getAbilityText, getIconForCharacter } from '../catalog'

interface Props {
  sessionId: string
  language: 'en' | 'zh'
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'expired' }
  | { kind: 'closed' }
  | { kind: 'name'; session: DealSession; cards: DealCard[]; alreadyClaimed: DealCard | null }
  | { kind: 'grid'; session: DealSession; cards: DealCard[]; claiming: number | null; message?: string }
  | { kind: 'claimed'; card: DealCard }

export function DealGuestPage({ sessionId, language }: Props) {
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [displayName, setDisplayName] = useState('')
  const [claimedSeat, setClaimedSeat] = useState('')
  const zh = language === 'zh'

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const session = await getDealSession(sessionId)
      if (!session) { setState({ kind: 'expired' }); return }
      if (session.status === 'closed') { setState({ kind: 'closed' }); return }

      const cards = await getDealCards(sessionId)
      const guestToken = getGuestToken()
      const alreadyClaimed = await findClaimedCard(sessionId, guestToken)

      if (alreadyClaimed) {
        setState({ kind: 'claimed', card: alreadyClaimed })
        return
      }

      setState({ kind: 'name', session, cards, alreadyClaimed: null })
    } catch (e: unknown) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }, [sessionId])

  useEffect(() => { load() }, [load])

  const handleStartPicking = () => {
    if (state.kind !== 'name') return
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
      setState({ kind: 'claimed', card: claimed })
    } catch {
      try {
        const cards = await getDealCards(sessionId)
        const alreadyClaimed = await findClaimedCard(sessionId, getGuestToken())
        if (alreadyClaimed) {
          setState({ kind: 'claimed', card: alreadyClaimed })
          return
        }
        setState({
          kind: 'grid',
          session: currentGrid.session,
          cards,
          claiming: null,
          message: zh ? '这张牌已被认领，请选择另一张。' : 'That card was already claimed. Pick another card.',
        })
      } catch {
        setState({
          kind: 'grid',
          session: currentGrid.session,
          cards: currentGrid.cards,
          claiming: null,
          message: zh ? '认领失败，请再试一次。' : 'Could not claim that card. Please try again.',
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
          {zh ? '加载中…' : 'Loading…'}
        </Typography>
      </CenteredBox>
    )
  }

  if (state.kind === 'error') {
    return (
      <CenteredBox>
        <Typography color="error">{zh ? '出错了' : 'Error'}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{state.message}</Typography>
        <Button sx={{ mt: 2 }} onClick={load}>{zh ? '重试' : 'Retry'}</Button>
      </CenteredBox>
    )
  }

  if (state.kind === 'expired') {
    return (
      <CenteredBox>
        <AutoStoriesIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6">{zh ? '链接已过期' : 'Link Expired'}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {zh ? '请联系说书人获取新链接' : 'Ask the Storyteller for a new link'}
        </Typography>
      </CenteredBox>
    )
  }

  if (state.kind === 'closed') {
    return (
      <CenteredBox>
        <LockIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6">{zh ? '发牌已结束' : 'Dealing Closed'}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {zh ? '说书人已关闭此发牌环节' : 'The Storyteller has closed this deal session'}
        </Typography>
      </CenteredBox>
    )
  }

  if (state.kind === 'claimed') {
    const { card } = state
    const icon = getIconForCharacter(card.characterId)
    return (
      <CenteredBox>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
          {zh ? '你的角色' : 'Your Character'}
        </Typography>
        <Paper elevation={4} sx={{ p: 3, borderRadius: 3, maxWidth: 300, width: '100%', textAlign: 'center' }}>
          {icon && (
            <Box component="img" src={icon}
              sx={{ width: 96, height: 96, objectFit: 'contain', mb: 2, mx: 'auto', display: 'block' }}
            />
          )}
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {getDisplayName(card.characterId, language)}
          </Typography>
          {card.claimedBySeat != null && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {zh ? `座位 #${card.claimedBySeat}` : `Seat #${card.claimedBySeat}`}
            </Typography>
          )}
          {language !== 'en' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {getDisplayName(card.characterId, 'en')}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.5 }}>
            {getAbilityText(card.characterId, language)}
          </Typography>
        </Paper>
        <Typography variant="caption" color="success.main" sx={{ mt: 2 }}>
          {zh ? '✓ 已保存，请勿告诉其他玩家' : '✓ Saved — keep your character secret!'}
        </Typography>
      </CenteredBox>
    )
  }

  if (state.kind === 'name') {
    return (
      <CenteredBox>
        <AutoStoriesIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
          {zh ? '血染钟楼 — 发牌' : 'Blood on the Clocktower — Deal'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {zh
            ? `共 ${state.session.cardCount} 张牌。点击一张翻开，只能翻一张！`
            : `${state.session.cardCount} cards. Tap one to flip — you only get one!`}
        </Typography>
        <TextField
          size="small"
          fullWidth
          label={zh ? '你的名字（可选）' : 'Your name (optional)'}
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleStartPicking() }}
          sx={{ maxWidth: 300, mb: 1.5 }}
        />
        <TextField
          size="small"
          fullWidth
          label={zh ? '座位号（可选）' : 'Seat # (optional)'}
          value={claimedSeat}
          onChange={e => setClaimedSeat(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') handleStartPicking() }}
          sx={{ maxWidth: 300, mb: 2 }}
          slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
        />
        <Button variant="contained" size="large" onClick={handleStartPicking}>
          {zh ? '查看牌面' : 'View Cards'}
        </Button>
      </CenteredBox>
    )
  }

  // state.kind === 'grid'
  const { cards, claiming, message } = state
  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5, textAlign: 'center', fontWeight: 700 }}>
        {zh ? '选择你的角色牌' : 'Pick Your Character Card'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
        {zh ? '点击一张翻开，其余将被锁定' : 'Tap one card to flip it — others will lock'}
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
          const isClaimed = card.claimedByToken !== null
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
                    {zh ? '点击翻牌' : 'Tap to flip'}
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

function CenteredBox({ children }: { children: ReactNode }) {
  return (
    <Box sx={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 3,
      textAlign: 'center',
    }}>
      {children}
    </Box>
  )
}
