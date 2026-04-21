// @ts-nocheck
import React, { useState } from 'react'
import { Box, Button, Tabs, Tab, TextField, FormControlLabel, Checkbox, Typography, Paper } from '@mui/material'
import { PlayersTab } from './ModalsNewGamePlayersTab'
import { CharactersTab } from './ModalsNewGameCharactersTab'

export function ModalsNewGame({ ctx }: { ctx: any }) {
  const {
    scriptOptions, playerNamePool, setPlayerNamePool, text, language,
    newGamePanel, setNewGamePanel, startNewGame, applyGameChanges, randomAssignCharacters,
  } = ctx

  const [activeTab, setActiveTab] = useState<'players' | 'characters' | 'config'>('players')

  if (!newGamePanel) return null

  const editMode = newGamePanel?.editMode ?? false
  const totalSeats = newGamePanel.playerCount + newGamePanel.travelerCount
  const seats = Array.from({ length: totalSeats }, (_, i) => i + 1)
  const updateConfig = (patch: any) => setNewGamePanel((prev: any) => prev ? { ...prev, ...patch } : prev)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth">
        <Tab label={language === 'zh' ? '玩家' : 'Players'} value="players" />
        <Tab label={language === 'zh' ? '角色' : 'Characters'} value="characters" />
        <Tab label={language === 'zh' ? '配置' : 'Config'} value="config" />
      </Tabs>

      <Box sx={{ minHeight: 300 }}>
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

        {activeTab === 'characters' && (
          <CharactersTab
            newGamePanel={newGamePanel}
            scriptOptions={scriptOptions}
            language={language}
            updateConfig={updateConfig}
            randomAssignCharacters={randomAssignCharacters}
          />
        )}

        {activeTab === 'config' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={newGamePanel.allowDuplicateChars}
                  onChange={(e) => updateConfig({ allowDuplicateChars: e.target.checked })}
                />
              }
              label={language === 'zh' ? '允许重复角色' : 'Allow duplicate characters'}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={newGamePanel.allowEmptyChars}
                  onChange={(e) => updateConfig({ allowEmptyChars: e.target.checked })}
                />
              }
              label={language === 'zh' ? '允许空角色' : 'Allow empty characters'}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={newGamePanel.allowSameNames}
                  onChange={(e) => updateConfig({ allowSameNames: e.target.checked })}
                />
              }
              label={language === 'zh' ? '允许重复名字' : 'Allow same player names'}
            />
            <TextField
              size="small"
              multiline
              rows={3}
              fullWidth
              label={language === 'zh' ? '特殊备注' : 'Special Note'}
              value={newGamePanel.specialNote || ''}
              onChange={(e) => updateConfig({ specialNote: e.target.value })}
            />
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Button variant="outlined" onClick={() => setNewGamePanel(null)}>
          {editMode ? (language === 'zh' ? '关闭' : 'Close') : text.cancelNewGame}
        </Button>
        {!editMode && (
          <Button variant="contained" onClick={() => startNewGame(newGamePanel)}>
            ▶ {text.startNewGame}
          </Button>
        )}
        {editMode && (
          <Button variant="contained" onClick={() => applyGameChanges(newGamePanel)}>
            ▶ {language === 'zh' ? '应用更改' : 'Apply Changes'}
          </Button>
        )}
      </Box>
    </Box>
  )
}