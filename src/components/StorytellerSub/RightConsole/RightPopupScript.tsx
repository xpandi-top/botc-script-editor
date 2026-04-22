// @ts-nocheck
import React from 'react'
import { nightOrder, getDisplayName, getIconForCharacter } from '../../../catalog'
import { Box, Typography, Button, Tabs, Tab, Paper, List, ListItem, ListItemIcon, ListItemText, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

type ScriptView = 'characters' | 'firstNight' | 'otherNight'

export function RightPopupScript({ ctx }: { ctx: any }) {
  const {
    language, currentScriptCharacters, activeScriptTitle, days,
    setActiveRightPopup, text,
  } = ctx

  const isDay1 = days.length === 0 || (days.length === 1 && days[0].day === 1)
  const [view, setView] = React.useState<ScriptView>(isDay1 ? 'firstNight' : 'otherNight')

  const characterIds: string[] = currentScriptCharacters?.map((c) =>
    typeof c === 'string' ? c : c.id
  ) ?? []

  const firstNightOrder = (nightOrder?.first_night ?? []).filter(
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
            primary={language === 'zh' ? '——爪牙信息——' : '— Minion Info —'}
            primaryTypographyProps={{ variant: 'caption', color: 'primary', fontWeight: 600, textAlign: 'center' }}
          />
        </ListItem>
      )
      if (id === 'DEMON_INFO') return (
        <ListItem key="demon-info" sx={{ py: 0.5 }}>
          <ListItemText
            primary={language === 'zh' ? '——恶魔信息——' : '— Demon Info —'}
            primaryTypographyProps={{ variant: 'caption', color: 'error', fontWeight: 600, textAlign: 'center' }}
          />
        </ListItem>
      )
      const icon = getIconForCharacter(id)
      const name = getDisplayName(id, language)
      return (
        <ListItem key={`${id}-${i}`} sx={{ py: 0.5 }}>
          {icon ? (
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Box component="img" src={icon} alt="" sx={{ width: 24, height: 24, borderRadius: 1 }} />
            </ListItemIcon>
          ) : null}
          <ListItemText primary={name || id} />
        </ListItem>
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
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{activeScriptTitle}</Typography>
        <IconButton size="small" onClick={() => setActiveRightPopup(null)}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Tabs
        value={view}
        onChange={(_, v) => setView(v)}
        variant="fullWidth"
        sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem' } }}
      >
        <Tab label={language === 'zh' ? '角色列表' : 'Characters'} value="characters" />
        <Tab label={language === 'zh' ? '第一夜顺序' : 'First Night'} value="firstNight" />
        <Tab label={language === 'zh' ? '其他夜晚顺序' : 'Other Nights'} value="otherNight" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {view === 'characters' && (
          <List dense>
            {characterIds.length ? characterIds.map((id) => {
              const icon = getIconForCharacter(id)
              const name = getDisplayName(id, language)
              return (
                <ListItem key={id} sx={{ py: 0.5 }}>
                  {icon ? (
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Box component="img" src={icon} alt="" sx={{ width: 24, height: 24, borderRadius: 1 }} />
                    </ListItemIcon>
                  ) : null}
                  <ListItemText primary={name || id} />
                </ListItem>
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
