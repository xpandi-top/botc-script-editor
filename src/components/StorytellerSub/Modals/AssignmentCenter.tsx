import { useMemo, useState } from 'react'
import { Box, Button, CircularProgress, Tabs, Tab, Typography, Paper, Tooltip } from '@mui/material'
import StyleIcon from '@mui/icons-material/Style'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import GroupsIcon from '@mui/icons-material/Groups'
import ChatIcon from '@mui/icons-material/Chat'
import { getDisplayName } from '../../../catalog'
import { makeT, makeTpl } from '../../../lib/t'
import { createDealSession, shuffleDealCards, HOST_TOKEN_KEY, ACTIVE_HOST_DEAL_KEY, GAME_DEAL_KEY } from '../../../lib/DealSession'
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
      }
    }
    const assignments: Record<number, string> = {}
    for (const seat of currentDay.seats) {
      if (!seat.isTraveler && seat.characterId) assignments[seat.seat] = seat.characterId
    }
    return { gameId: liveGameId, assignments }
  }, [newGamePanel, currentDay.seats, liveGameId])
}

export function AssignmentCenter({ ctx }: { ctx: StorytellerContext }) {
  const { language, activeDealSession, setActiveDealSession, lastDealSession } = ctx
  const t = makeT(language)
  const tpl = makeTpl(language)
  const [tab, setTab] = useState<AssignmentTab>('draw')
  const [dealing, setDealing] = useState(false)

  const { gameId, assignments } = useAssignmentSource(ctx)
  const characterIds = Object.values(assignments).filter(Boolean) as string[]

  const storedGameDeal = useMemo(() => {
    try {
      const raw = localStorage.getItem(GAME_DEAL_KEY(gameId))
      if (raw) return JSON.parse(raw) as DealSession
    } catch {}
    return null
  }, [gameId])

  const existingDealSession: DealSession | null = storedGameDeal ?? activeDealSession ?? lastDealSession ?? null

  const handleDealCards = async () => {
    if (characterIds.length < 2) return
    setDealing(true)
    try {
      const shuffled = shuffleDealCards(characterIds)
      const { sessionId, hostToken } = await createDealSession(shuffled)
      try { localStorage.setItem(HOST_TOKEN_KEY(sessionId), hostToken) } catch {}
      if (gameId) {
        try { localStorage.setItem(GAME_DEAL_KEY(gameId), JSON.stringify({ sessionId, hostToken })) } catch {}
      }
      try { localStorage.setItem(ACTIVE_HOST_DEAL_KEY, JSON.stringify({ sessionId, hostToken })) } catch {}
      setActiveDealSession({ sessionId, hostToken })
    } catch (e) {
      console.error('Failed to create deal session', e)
    } finally {
      setDealing(false)
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
            {existingDealSession && (
              <Tooltip title={t('open_active_deal_dashboard')}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setActiveDealSession(existingDealSession)}
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
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2, textAlign: 'center' }}>
          {t('coming_soon')}
        </Typography>
      )}

      {tab === 'messages' && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2, textAlign: 'center' }}>
          {t('coming_soon')}
        </Typography>
      )}
    </Box>
  )
}
