// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React, { useState, useMemo } from 'react'
import {
  Box, Button, Collapse, IconButton, InputAdornment, List,
  ListItem, ListItemAvatar, ListItemButton, ListItemText,
  Tabs, Tab, TextField, FormControlLabel, Checkbox, Typography,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { PlayersTab } from './ModalsNewGamePlayersTab'
import { CharactersTab } from './ModalsNewGameCharactersTab'
import { DEFAULT_ST_NAME_KEY } from '../constants'
import { allCharacters, getDisplayName, getAbilityText, getIconForCharacter } from '../../../catalog'

const FABLED_AND_LORIC = allCharacters.filter((c) => c.team === 'fabled' || c.edition === 'loric')

export function ModalsNewGame({ ctx }: { ctx: StorytellerContext }) {
  const {
    scriptOptions, playerNamePool, setPlayerNamePool, text, language,
    newGamePanel, setNewGamePanel, setShowNewGamePanel, startNewGame, applyGameChanges, randomAssignCharacters,
    days, stName, setStName,
  } = ctx

  // All hooks MUST be declared before any early return
  const [activeTab, setActiveTab] = useState<'settings' | 'players' | 'characters'>('settings')
  const [showFabledPicker, setShowFabledPicker] = useState(false)
  const [fabledSearch, setFabledSearch] = useState('')

  const fabledIds: string[] = newGamePanel?.fabledIds ?? []

  const filteredFabled = useMemo(() => {
    const q = fabledSearch.toLowerCase()
    return q
      ? FABLED_AND_LORIC.filter((c) =>
          getDisplayName(c.id, language).toLowerCase().includes(q) || c.id.includes(q))
      : FABLED_AND_LORIC
  }, [fabledSearch, language])

  if (!newGamePanel) return null

  const editMode = newGamePanel.editMode ?? false
  const totalSeats = newGamePanel.playerCount + newGamePanel.travelerCount
  const seats = Array.from({ length: totalSeats }, (_, i) => i + 1)
  const updateConfig = (patch: any) => setNewGamePanel((prev: any) => prev ? { ...prev, ...patch } : prev)

  const toggleFabled = (id: string) =>
    updateConfig({ fabledIds: fabledIds.includes(id) ? fabledIds.filter((x) => x !== id) : [...fabledIds, id] })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth">
        <Tab label={language === 'zh' ? '设置' : 'Settings'} value="settings" />
        <Tab label={language === 'zh' ? '玩家' : 'Players'} value="players" />
        <Tab label={language === 'zh' ? '角色' : 'Characters'} value="characters" />
      </Tabs>

      <Box sx={{ minHeight: 300 }}>

        {/* ── Settings tab ── */}
        {activeTab === 'settings' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* ST Name */}
            <TextField
              size="small"
              fullWidth
              label={language === 'zh' ? '说书人名称' : 'Storyteller Name'}
              value={stName ?? ''}
              onChange={(e) => {
                setStName(e.target.value)
                try { localStorage.setItem(DEFAULT_ST_NAME_KEY, e.target.value) } catch {}
              }}
              placeholder={language === 'zh' ? '例如：小明' : 'e.g. Dimo'}
            />

            {/* Fabled / Loric */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {language === 'zh' ? '传说 / 奇遇角色' : 'Fabled / Loric'}
                  {fabledIds.length > 0 && (
                    <Typography component="span" variant="caption" sx={{ ml: 0.75, color: 'warning.main', fontWeight: 700 }}>
                      ({fabledIds.length})
                    </Typography>
                  )}
                </Typography>
                <Button size="small" startIcon={<AddIcon />}
                  endIcon={showFabledPicker ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={() => setShowFabledPicker((v) => !v)}
                >
                  {language === 'zh' ? '添加' : 'Add'}
                </Button>
              </Box>

              {/* Active chips */}
              {fabledIds.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1 }}>
                  {fabledIds.map((id) => {
                    const icon = getIconForCharacter(id)
                    return (
                      <Box key={id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 0.75, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                        {icon && <Box component="img" src={icon} sx={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0, mt: 0.25 }} />}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, flexWrap: 'wrap' }}>
                            <Typography variant="body2" fontWeight={700}>{getDisplayName(id, language)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {language !== 'en' ? getDisplayName(id, 'en') : getDisplayName(id, 'zh')}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                            {getAbilityText(id, language)}
                          </Typography>
                        </Box>
                        <IconButton size="small" sx={{ p: 0.25, flexShrink: 0 }} onClick={() => toggleFabled(id)}>
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    )
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic' }}>
                  {language === 'zh' ? '未选择' : 'None selected'}
                </Typography>
              )}

              {/* Collapsible picker */}
              <Collapse in={showFabledPicker}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                  <Box sx={{ p: 1 }}>
                    <TextField size="small" fullWidth
                      placeholder={language === 'zh' ? '搜索…' : 'Search…'}
                      value={fabledSearch}
                      onChange={(e) => setFabledSearch(e.target.value)}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start">🔍</InputAdornment> } }}
                    />
                  </Box>
                  <List dense disablePadding sx={{ maxHeight: 240, overflow: 'auto' }}>
                    {filteredFabled.length === 0 && (
                      <ListItem><ListItemText primary="—" /></ListItem>
                    )}
                    {filteredFabled.map((c) => {
                      const icon = getIconForCharacter(c.id)
                      const active = fabledIds.includes(c.id)
                      return (
                        <ListItemButton key={c.id} selected={active} onClick={() => toggleFabled(c.id)}
                          sx={{ py: 0.5, bgcolor: active ? 'action.selected' : undefined }}>
                          {icon && (
                            <ListItemAvatar sx={{ minWidth: 40 }}>
                              <Box component="img" src={icon} sx={{ width: 32, height: 32, objectFit: 'contain' }} />
                            </ListItemAvatar>
                          )}
                          <ListItemText
                            disableTypography
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
                                <Typography variant="body2" fontWeight={active ? 700 : 600}>
                                  {getDisplayName(c.id, language)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {language !== 'en' ? getDisplayName(c.id, 'en') : getDisplayName(c.id, 'zh')}
                                </Typography>
                                <Typography variant="caption" sx={{ color: c.edition === 'loric' ? 'info.main' : 'warning.main', fontWeight: 600 }}>
                                  {c.edition === 'loric' ? 'Loric' : 'Fabled'}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, mt: 0.25 }}>
                                {getAbilityText(c.id, language)}
                              </Typography>
                            }
                          />
                          {active && <CheckIcon fontSize="small" color="primary" />}
                        </ListItemButton>
                      )
                    })}
                  </List>
                </Box>
              </Collapse>
            </Box>

            {/* Special Note */}
            <TextField
              size="small"
              multiline
              rows={2}
              fullWidth
              label={language === 'zh' ? '特殊备注' : 'Special Note'}
              value={newGamePanel.specialNote || ''}
              onChange={(e) => updateConfig({ specialNote: e.target.value })}
            />
          </Box>
        )}

        {/* ── Players tab ── */}
        {activeTab === 'players' && (
          <PlayersTab
            newGamePanel={newGamePanel}
            playerNamePool={playerNamePool}
            language={language}
            seats={seats}
            updateConfig={updateConfig}
            setPlayerNamePool={setPlayerNamePool}
          />
        )}

        {/* ── Characters tab ── */}
        {activeTab === 'characters' && (
          <CharactersTab
            newGamePanel={newGamePanel}
            scriptOptions={scriptOptions}
            language={language}
            updateConfig={updateConfig}
            randomAssignCharacters={randomAssignCharacters}
          />
        )}
      </Box>

      {/* Apply to all days — edit mode only, multiple days */}
      {editMode && days.length > 1 && (
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={!!newGamePanel.applyNamesToAllDays}
              onChange={(e) => updateConfig({ applyNamesToAllDays: e.target.checked })}
            />
          }
          label={
            <Typography variant="caption">
              {language === 'zh'
                ? `将玩家姓名同步到全部 ${days.length} 天`
                : `Apply player names to all ${days.length} days`}
            </Typography>
          }
        />
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Button variant="outlined" onClick={() => setShowNewGamePanel(false)}>
          {editMode ? (language === 'zh' ? '关闭' : 'Close') : text.cancelNewGame}
        </Button>
        {!editMode && (
          <Button variant="contained" onClick={() => startNewGame(newGamePanel)} startIcon={<PlayArrowIcon fontSize="small" />}>
            {text.startNewGame}
          </Button>
        )}
        {editMode && (
          <Button variant="contained" onClick={() => applyGameChanges(newGamePanel)} startIcon={<PlayArrowIcon fontSize="small" />}>
            {language === 'zh' ? '应用更改' : 'Apply Changes'}
          </Button>
        )}
      </Box>
    </Box>
  )
}
