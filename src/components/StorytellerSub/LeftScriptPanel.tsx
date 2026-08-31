import type { StorytellerContext } from './useStoryteller'
import React from 'react'
import { Drawer, Box, Typography, Button, Tabs, Tab, List, ListItem, ListItemButton, Tooltip, IconButton, useTheme } from '@mui/material'
import { useT } from '../../context/I18nContext'
import type { UiKey } from '../../lib/t'
import CloseIcon from '@mui/icons-material/Close'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import { getEffectiveNightOrderFromRegistry, getDisplayName, getIconForCharacter, getAbilityTextForScript, getEditionsWithGlossary, characterById } from '../../catalog'
import { Divider } from '@mui/material'
import { MonoText } from '../../components/ui'
import { EditionGlossary } from '../EditionGlossary'

const TEAM_ORDER = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler'] as const
const TEAM_LABELS: Record<string, { light: string; dark: string }> = {
  townsfolk: { light: '#1565c0', dark: '#90caf9' },
  outsider:  { light: '#0277bd', dark: '#80deea' },
  minion:    { light: '#b71c1c', dark: '#ef9a9a' },
  demon:     { light: '#7b1fa2', dark: '#ce93d8' },
  traveler:  { light: '#2e7d32', dark: '#a5d6a7' },
}

type ScriptView = 'characters' | 'firstNight' | 'otherNight' | 'glossary'

export function LeftScriptPanel({ ctx, inlineMode = false }: { ctx: StorytellerContext; inlineMode?: boolean }) {
  const { language, currentScriptCharacters, activeScriptTitle, activeScriptVersion, setShowScriptPanel, showScriptPanel, scriptOptions, activeScriptSlug } = ctx
  const { t } = useT()
  const muiTheme = useTheme()
  const isDark = muiTheme.palette.mode === 'dark'
  const pinnedRevisions = scriptOptions?.find((s) => s.slug === activeScriptSlug)?.pinnedRevisions

  const isDay1 = ctx.days.length === 0 || (ctx.days.length === 1 && ctx.days[0].day === 1)
  const [view, setView] = React.useState<ScriptView>(isDay1 ? 'firstNight' : 'otherNight')
  const [selectedCharId, setSelectedCharId] = React.useState<string | null>(null)
  const [showAbilities, setShowAbilities] = React.useState(false)

  const characterIds: string[] = currentScriptCharacters?.map((c: any) => typeof c === 'string' ? c : c.id) ?? []

  // Packs on this roster that publish their own rules vocabulary. Sync check, so
  // the tab only appears for scripts that actually have terms to look up.
  const glossaryEditions = getEditionsWithGlossary(characterIds)

  const firstNightOrder = (getEffectiveNightOrderFromRegistry().first_night ?? []).filter(
    (id) => characterIds.includes(id) || id === 'MINION_INFO' || id === 'DEMON_INFO'
  )
  const otherNightOrder = (getEffectiveNightOrderFromRegistry().other_nights ?? []).filter(
    (id) => characterIds.includes(id)
  )

  const handleCharClick = (id: string) => setSelectedCharId((prev) => prev === id ? null : id)

  const renderDescription = (id: string) => {
    const ability = getAbilityTextForScript(id, language, pinnedRevisions) ?? getAbilityTextForScript(id, 'en', pinnedRevisions)
    if (!ability) return null
    return (
      <Box sx={{ ml: 1, mt: 0.5, pl: 1, borderLeft: '3px solid', borderLeftColor: 'primary.light', bgcolor: 'action.hover', borderRadius: '0 8px 8px 0', py: 0.5, px: 1 }}>
        <Typography variant="body2" sx={{ fontSize: '0.78rem', lineHeight: 1.5 }}>{ability}</Typography>
      </Box>
    )
  }

  const renderNightList = (ids: string[]) => {
    if (!ids.length) return <ListItem sx={{ justifyContent: 'center' }}><Typography variant="body2">—</Typography></ListItem>
    return ids.map((id, i) => {
      if (id === 'MINION_INFO') return <ListItem key="minion-info" sx={{ justifyContent: 'center' }}><Typography variant="caption" sx={{ fontWeight: 700, color: isDark ? TEAM_LABELS.minion.dark : TEAM_LABELS.minion.light }}>{t('minion_info')}</Typography></ListItem>
      if (id === 'DEMON_INFO') return <ListItem key="demon-info" sx={{ justifyContent: 'center' }}><Typography variant="caption" sx={{ fontWeight: 700, color: isDark ? TEAM_LABELS.demon.dark : TEAM_LABELS.demon.light }}>{t('demon_info')}</Typography></ListItem>
      const icon = getIconForCharacter(id)
      const name = getDisplayName(id, language)
      const isSelected = selectedCharId === id
      return (
        <React.Fragment key={`${id}-${i}`}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleCharClick(id)}
              selected={isSelected && !showAbilities}
              sx={{ borderRadius: 1, '&.Mui-selected': { bgcolor: 'action.selected' } }}
            >
              {icon && <Box component="img" src={icon} alt="" sx={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 0.5, mr: 1 }} />}
              <Typography variant="body2">{`${i + 1}. ${name || id}`}</Typography>
            </ListItemButton>
          </ListItem>
          {(showAbilities || isSelected) && (
            <Box sx={{ px: 1, pb: 1 }}>{renderDescription(id)}</Box>
          )}
        </React.Fragment>
      )
    })
  }

  const panelWidth = { xs: 280, sm: 340 }

  const panelContent = (
    <>
      <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderBottomColor: 'divider', flexShrink: 0 }}>
        <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeScriptTitle || (t('script'))}{activeScriptVersion && <MonoText component="span" sx={{ ml: 0.75, color: 'text.secondary' }}>v{activeScriptVersion}</MonoText>}
        </Typography>
        {!inlineMode && (
          <Button size="small" variant="outlined" onClick={() => setShowScriptPanel(false)} startIcon={<CloseIcon fontSize="small" />}>
            {t('close')}
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', px: 1, borderBottom: '1px solid', borderBottomColor: 'divider', flexShrink: 0 }}>
        <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ flex: 1 }} variant="fullWidth">

          <Tab label={t('chars')} value="characters" sx={{ fontSize: '0.78rem', minWidth: 0, px: 0.5 }} />
          <Tab label={t('first')} value="firstNight" sx={{ fontSize: '0.78rem', minWidth: 0, px: 0.5 }} />
          <Tab label={t('other')} value="otherNight" sx={{ fontSize: '0.78rem', minWidth: 0, px: 0.5 }} />
          {glossaryEditions.length > 0 && (
            <Tab label={t('glossary')} value="glossary" sx={{ fontSize: '0.78rem', minWidth: 0, px: 0.5 }} />
          )}
        </Tabs>
        <Tooltip title={showAbilities ? (t('hide_abilities')) : (t('show_abilities'))}>
          <IconButton size="small" onClick={() => setShowAbilities((v) => !v)}
            sx={{ ml: 0.5, color: showAbilities ? 'primary.main' : 'text.secondary',
              bgcolor: showAbilities ? 'action.selected' : 'transparent' }}>
            <MenuBookIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Tooltip>
      </Box>

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
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, px: 1, py: 0.5, color: isDark ? info.dark : info.light, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        {t(team as UiKey)} ({byTeam[team].length})
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
                                  selected={isSelected && !showAbilities}
                                  sx={{ borderRadius: 1, '&.Mui-selected': { bgcolor: 'action.selected' } }}
                                >
                                  {icon && <Box component="img" src={icon} alt="" sx={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 0.5, mr: 1 }} />}
                                  <Typography variant="body2">{name || id}</Typography>
                                </ListItemButton>
                              </ListItem>
                              {(showAbilities || isSelected) && <Box sx={{ px: 1, pb: 1 }}>{renderDescription(id)}</Box>}
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
          {view === 'glossary' && <EditionGlossary editions={glossaryEditions} language={language} />}
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
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderRightColor: 'divider',
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
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderRightColor: 'divider',
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