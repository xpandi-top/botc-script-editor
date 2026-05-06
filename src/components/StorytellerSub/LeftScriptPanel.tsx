import type { StorytellerContext } from './useStoryteller'
import React from 'react'
import { Drawer, Box, Typography, Button, Tabs, Tab, List, ListItem, ListItemButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { nightOrder, getDisplayName, getIconForCharacter, getAbilityText, characterById } from '../../catalog'
import { Divider } from '@mui/material'

const TEAM_ORDER = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler'] as const
const TEAM_LABELS: Record<string, { en: string; zh: string; color: string }> = {
  townsfolk: { en: 'Townsfolk', zh: '镇民', color: '#1565c0' },
  outsider:  { en: 'Outsider',  zh: '外来者', color: '#0277bd' },
  minion:    { en: 'Minion',    zh: '爪牙', color: '#b71c1c' },
  demon:     { en: 'Demon',     zh: '恶魔', color: '#7b1fa2' },
  traveler:  { en: 'Traveler',  zh: '旅行者', color: '#2e7d32' },
}

type ScriptView = 'characters' | 'firstNight' | 'otherNight'

export function LeftScriptPanel({ ctx, inlineMode = false }: { ctx: StorytellerContext; inlineMode?: boolean }) {
  const { language, currentScriptCharacters, activeScriptTitle, setShowScriptPanel, showScriptPanel } = ctx

  const isDay1 = ctx.days.length === 0 || (ctx.days.length === 1 && ctx.days[0].day === 1)
  const [view, setView] = React.useState<ScriptView>(isDay1 ? 'firstNight' : 'otherNight')
  const [selectedCharId, setSelectedCharId] = React.useState<string | null>(null)

  const characterIds: string[] = currentScriptCharacters?.map((c: any) => typeof c === 'string' ? c : c.id) ?? []

  const firstNightOrder = (nightOrder?.first_night ?? []).filter(
    (id) => characterIds.includes(id) || id === 'MINION_INFO' || id === 'DEMON_INFO'
  )
  const otherNightOrder = (nightOrder?.other_nights ?? []).filter(
    (id) => characterIds.includes(id)
  )

  const handleCharClick = (id: string) => setSelectedCharId((prev) => prev === id ? null : id)

  const renderDescription = (id: string) => {
    const ability = getAbilityText(id, language) ?? getAbilityText(id, 'en')
    if (!ability) return null
    return (
      <Box sx={{ ml: 1, mt: 0.5, pl: 1, borderLeft: '3px solid rgba(133,63,34,0.35)', bgcolor: 'rgba(133,63,34,0.05)', borderRadius: '0 8px 8px 0', py: 0.5, px: 1 }}>
        <Typography variant="body2" sx={{ fontSize: '0.78rem', lineHeight: 1.5 }}>{ability}</Typography>
      </Box>
    )
  }

  const renderNightList = (ids: string[]) => {
    if (!ids.length) return <ListItem sx={{ justifyContent: 'center' }}><Typography variant="body2">—</Typography></ListItem>
    return ids.map((id, i) => {
      if (id === 'MINION_INFO') return <ListItem key="minion-info" sx={{ justifyContent: 'center' }}><Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>{language === 'zh' ? '—爪牙信息—' : '— Minion Info —'}</Typography></ListItem>
      if (id === 'DEMON_INFO') return <ListItem key="demon-info" sx={{ justifyContent: 'center' }}><Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>{language === 'zh' ? '—恶魔信息—' : '— Demon Info —'}</Typography></ListItem>
      const icon = getIconForCharacter(id)
      const name = getDisplayName(id, language)
      const isSelected = selectedCharId === id
      return (
        <ListItem key={`${id}-${i}`} disablePadding>
          <ListItemButton
            onClick={() => handleCharClick(id)}
            selected={isSelected}
            sx={{ borderRadius: 1, '&.Mui-selected': { bgcolor: 'rgba(133,63,34,0.1)' } }}
          >
            {icon && <Box component="img" src={icon} alt="" sx={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 0.5, mr: 1 }} />}
            <Typography variant="body2">{name || id}</Typography>
          </ListItemButton>
          {isSelected && <Box sx={{ px: 1, pb: 1 }}>{renderDescription(id)}</Box>}
        </ListItem>
      )
    })
  }

  const panelWidth = { xs: 280, sm: 340 }

  const panelContent = (
    <>
      <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(23,32,42,0.08)', flexShrink: 0 }}>
        <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeScriptTitle || (language === 'zh' ? '剧本' : 'Script')}
        </Typography>
        {!inlineMode && (
          <Button size="small" variant="outlined" onClick={() => setShowScriptPanel(false)} startIcon={<CloseIcon fontSize="small" />}>
            {language === 'zh' ? '关闭' : 'Close'}
          </Button>
        )}
      </Box>

      <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ px: 1, borderBottom: '1px solid rgba(23,32,42,0.06)', flexShrink: 0 }} variant="fullWidth">
        <Tab label={language === 'zh' ? '角色' : 'Chars'} value="characters" sx={{ fontSize: '0.78rem', minWidth: 0, px: 0.5 }} />
        <Tab label={language === 'zh' ? '第一夜' : 'First'} value="firstNight" sx={{ fontSize: '0.78rem', minWidth: 0, px: 0.5 }} />
        <Tab label={language === 'zh' ? '其他夜' : 'Other'} value="otherNight" sx={{ fontSize: '0.78rem', minWidth: 0, px: 0.5 }} />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {view === 'characters' && (() => {
            const byTeam: Record<string, string[]> = { townsfolk: [], outsider: [], minion: [], demon: [], traveler: [] }
            for (const id of characterIds) {
              const team = characterById[id]?.team ?? 'townsfolk'
              if (byTeam[team]) byTeam[team].push(id)
              else byTeam['townsfolk'].push(id)
            }
            const sections = TEAM_ORDER.filter((t) => byTeam[t].length > 0)
            if (!sections.length) return <List dense><ListItem><Typography variant="body2">—</Typography></ListItem></List>
            return (
              <Box>
                {sections.map((team, si) => {
                  const info = TEAM_LABELS[team]
                  return (
                    <Box key={team}>
                      {si > 0 && <Divider sx={{ my: 0.75 }} />}
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, px: 1, py: 0.5, color: info.color, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        {language === 'zh' ? info.zh : info.en} ({byTeam[team].length})
                      </Typography>
                      <List dense sx={{ py: 0 }}>
                        {byTeam[team].map((id) => {
                          const icon = getIconForCharacter(id)
                          const name = getDisplayName(id, language)
                          const isSelected = selectedCharId === id
                          return (
                            <React.Fragment key={id}>
                              <ListItem disablePadding>
                                <ListItemButton
                                  onClick={() => handleCharClick(id)}
                                  selected={isSelected}
                                  sx={{ borderRadius: 1, '&.Mui-selected': { bgcolor: 'rgba(133,63,34,0.1)' } }}
                                >
                                  {icon && <Box component="img" src={icon} alt="" sx={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 0.5, mr: 1 }} />}
                                  <Typography variant="body2">{name || id}</Typography>
                                </ListItemButton>
                              </ListItem>
                              {isSelected && <Box sx={{ px: 1, pb: 1 }}>{renderDescription(id)}</Box>}
                            </React.Fragment>
                          )
                        })}
                      </List>
                    </Box>
                  )
                })}
              </Box>
            )
          })()}
          {view === 'firstNight' && <List dense>{renderNightList(firstNightOrder)}</List>}
          {view === 'otherNight' && <List dense>{renderNightList(otherNightOrder)}</List>}
        </Box>
      </>
  )

  // Inline mode: render directly in parent grid column (desktop sidebar)
  if (inlineMode) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'rgba(255,251,245,0.96)',
        borderRight: '1px solid rgba(23,32,42,0.10)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        {panelContent}
      </Box>
    )
  }

  // Drawer mode: mobile / tablet overlay
  return (
    <>
      {showScriptPanel && (
        <Box
          onClick={() => setShowScriptPanel(false)}
          sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.28)', zIndex: 490 }}
        />
      )}
      <Drawer
        anchor="left"
        open={showScriptPanel}
        onClose={() => setShowScriptPanel(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: panelWidth,
            borderRadius: '0 22px 22px 0',
            bgcolor: 'rgba(255,251,245,0.96)',
            borderRight: '1px solid rgba(23,32,42,0.12)',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {panelContent}
      </Drawer>
    </>
  )
}