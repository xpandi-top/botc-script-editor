// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React from 'react'
import { getEffectiveNightOrderFromRegistry, getDisplayName, getIconForCharacter, getAbilityTextForScript } from '../../../catalog'
import { Box, Typography, Button, Tabs, Tab, Paper, List, ListItem, ListItemIcon, ListItemText, IconButton, Tooltip } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import { useT } from '../../../context/I18nContext'
import { MonoText } from '../../../components/ui'

type ScriptView = 'characters' | 'firstNight' | 'otherNight'

export function RightPopupScript({ ctx }: { ctx: StorytellerContext }) {
  const { t } = useT()
  const {
    language, currentScriptCharacters, activeScriptTitle, activeScriptVersion, days,
    setActiveRightPopup, text, scriptOptions, activeScriptSlug,
  } = ctx
  const pinnedRevisions = scriptOptions?.find((s) => s.slug === activeScriptSlug)?.pinnedRevisions

  const isDay1 = days.length === 0 || (days.length === 1 && days[0].day === 1)
  const [view, setView] = React.useState<ScriptView>(isDay1 ? 'firstNight' : 'otherNight')
  const [showAbilities, setShowAbilities] = React.useState(false)

  const renderAbility = (id: string) => {
    const ability = getAbilityTextForScript(id, language, pinnedRevisions) ?? getAbilityTextForScript(id, 'en', pinnedRevisions)
    if (!ability) return null
    return (
      <Box sx={{ ml: 1, mt: 0.25, pl: 1, borderLeft: '3px solid', borderLeftColor: 'primary.light', bgcolor: 'action.hover', borderRadius: '0 8px 8px 0', py: 0.5, px: 1 }}>
        <Typography variant="body2" sx={{ fontSize: '0.75rem', lineHeight: 1.5, color: 'text.secondary' }}>{ability}</Typography>
      </Box>
    )
  }

  const characterIds: string[] = currentScriptCharacters?.map((c) =>
    typeof c === 'string' ? c : c.id
  ) ?? []

  const firstNightOrder = (getEffectiveNightOrderFromRegistry().first_night ?? []).filter(
    (id) => characterIds.includes(id) || id === 'MINION_INFO' || id === 'DEMON_INFO'
  )
  const otherNightOrder = (nightOrder?.other_night ?? []).filter(
    (id) => characterIds.includes(id)
  )

  function renderNightList(ids: string[]) {
    return ids.length ? ids.map((id, i) => {
      if (id === 'MINION_INFO') return (
        <ListItem key="minion-info" sx={{ py: 0.5 }}>
          <ListItemText
            primary={t('minion_info')}
            primaryTypographyProps={{ variant: 'caption', color: 'warning.main', fontWeight: 600, textAlign: 'center' }}
          />
        </ListItem>
      )
      if (id === 'DEMON_INFO') return (
        <ListItem key="demon-info" sx={{ py: 0.5 }}>
          <ListItemText
            primary={t('demon_info')}
            primaryTypographyProps={{ variant: 'caption', color: 'error', fontWeight: 600, textAlign: 'center' }}
          />
        </ListItem>
      )
      const icon = getIconForCharacter(id)
      const name = getDisplayName(id, language)
      return (
        <React.Fragment key={`${id}-${i}`}>
          <ListItem sx={{ py: 0.25 }}>
            {icon ? (
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Box component="img" src={icon} alt="" sx={{ width: 24, height: 24, borderRadius: 1 }} />
              </ListItemIcon>
            ) : null}
            <ListItemText primary={`${i + 1}. ${name || id}`} />
          </ListItem>
          {showAbilities && <Box sx={{ px: 1, pb: 0.5 }}>{renderAbility(id)}</Box>}
        </React.Fragment>
      )
    }) : (
      <ListItem>
        <ListItemText primary="—" sx={{ textAlign: 'center' }} />
      </ListItem>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {activeScriptTitle}{activeScriptVersion && <MonoText component="span" sx={{ ml: 0.75, color: 'text.secondary' }}>v{activeScriptVersion}</MonoText>}
        </Typography>
        <IconButton size="small" onClick={() => setActiveRightPopup(null)}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={view}
          onChange={(_, v) => setView(v)}
          variant="fullWidth"
          sx={{ flex: 1, minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem' } }}
        >
          <Tab label={t('characters')} value="characters" />
          <Tab label={t('term_first_night')} value="firstNight" />
          <Tab label={t('term_other_nights')} value="otherNight" />
        </Tabs>
        <Tooltip title={showAbilities ? (t('hide_abilities')) : (t('show_abilities'))}>
          <IconButton size="small" onClick={() => setShowAbilities((v) => !v)}
            sx={{ mx: 0.5, color: showAbilities ? 'primary.main' : 'text.secondary',
              bgcolor: showAbilities ? 'action.selected' : 'transparent' }}>
            <MenuBookIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {view === 'characters' && (
          <List dense>
            {characterIds.length ? characterIds.map((id) => {
              const icon = getIconForCharacter(id)
              const name = getDisplayName(id, language)
              return (
                <React.Fragment key={id}>
                  <ListItem sx={{ py: 0.25 }}>
                    {icon ? (
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Box component="img" src={icon} alt="" sx={{ width: 24, height: 24, borderRadius: 1 }} />
                      </ListItemIcon>
                    ) : null}
                    <ListItemText primary={name || id} />
                  </ListItem>
                  {showAbilities && <Box sx={{ px: 1, pb: 0.5 }}>{renderAbility(id)}</Box>}
                </React.Fragment>
              )
            }) : (
              <ListItem>
                <ListItemText primary="—" />
              </ListItem>
            )}
          </List>
        )}

        {view === 'firstNight' && (
          <List dense>{renderNightList(firstNightOrder)}</List>
        )}

        {view === 'otherNight' && (
          <List dense>{renderNightList(otherNightOrder)}</List>
        )}
      </Box>
    </Box>
  )
}
