// @ts-nocheck
import React, { useState } from 'react'
import { Box, Button, TextField, IconButton, Chip, Typography, Grid } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { shuffleArray, uniqueStrings } from '../constants'

type Props = {
  newGamePanel: any
  playerNamePool: string[]
  language: string
  seats: number[]
  updateConfig: (patch: any) => void
  setPlayerNamePool: (fn: any) => void
}

export function PlayersTab({ newGamePanel, playerNamePool, language, seats, updateConfig, setPlayerNamePool }: Props) {
  const [showNamePool, setShowNamePool] = useState(false)
  const [quickFill, setQuickFill] = useState('')

  const handleRandomPlayers = () => {
    const shuffled = shuffleArray([...playerNamePool])
    const newNames = { ...newGamePanel.seatNames }
    seats.forEach((sNum, i) => { if (shuffled[i]) newNames[sNum] = shuffled[i] })
    updateConfig({ seatNames: newNames })
  }

  const handleResetNames = () => {
    const names: Record<number, string> = {}
    seats.forEach((sNum) => { names[sNum] = sNum > newGamePanel.playerCount ? `Traveler ${sNum}` : `Player ${sNum}` })
    updateConfig({ seatNames: names })
  }

  const handleQuickFill = () => {
    const names = quickFill.split(/[,，\n]/).map((n) => n.trim()).filter(Boolean)
    if (!names.length) return
    const newNames = { ...newGamePanel.seatNames }
    seats.forEach((sNum, i) => { if (names[i]) newNames[sNum] = names[i] })
    updateConfig({ seatNames: newNames })
    setQuickFill('')
    const fresh = names.filter((n) => !playerNamePool.includes(n) && !/^Player \d+$|^Traveler \d+$/.test(n))
    if (fresh.length) setPlayerNamePool((p: string[]) => uniqueStrings([...p, ...fresh]))
  }

  const handlePoolNameClick = (name: string) => {
    const next = seats.find((n) => {
      const cur = newGamePanel.seatNames[n] ?? ''
      return !cur || /^Player \d+$|^Traveler \d+$/.test(cur)
    })
    if (next) updateConfig({ seatNames: { ...newGamePanel.seatNames, [next]: name } })
  }

  const handleNameBlur = (sNum: number, val: string) => {
    const trimmed = val.trim()
    if (trimmed && !/^Player \d+$|^Traveler \d+$/.test(trimmed) && !playerNamePool.includes(trimmed))
      setPlayerNamePool((p: string[]) => uniqueStrings([...p, trimmed]))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <TextField
        size="small"
        fullWidth
        placeholder={language === 'zh' ? '用逗号分隔快速填入名字，如：Alice, Bob, Carol' : 'Paste names separated by commas'}
        value={quickFill}
        onChange={(e) => setQuickFill(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleQuickFill() }}
      />

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" onClick={handleRandomPlayers}>
          🎲 {language === 'zh' ? '随机' : 'Random'}
        </Button>
        <Button size="small" variant="outlined" onClick={handleResetNames}>
          ↺ {language === 'zh' ? '重置' : 'Reset'}
        </Button>
        <Button size="small" variant={showNamePool ? 'contained' : 'outlined'} onClick={() => setShowNamePool((v) => !v)}>
          {language === 'zh' ? '名字池' : 'Name Pool'} {showNamePool ? '▲' : '▼'}
        </Button>
      </Box>

      {showNamePool && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {playerNamePool.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              {language === 'zh' ? '（空）' : '(empty)'}
            </Typography>
          ) : playerNamePool.map((name: string) => (
            <Chip key={name} label={name} size="small" clickable onClick={() => handlePoolNameClick(name)} />
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2">{language === 'zh' ? '玩家' : 'Players'}: {newGamePanel.playerCount}</Typography>
        <IconButton size="small" onClick={() => updateConfig({ playerCount: Math.max(5, newGamePanel.playerCount - 1) })}>
          <RemoveIcon />
        </IconButton>
        <IconButton size="small" onClick={() => updateConfig({ playerCount: Math.min(15, newGamePanel.playerCount + 1) })}>
          <AddIcon />
        </IconButton>
        <Typography variant="body2" sx={{ ml: 1 }}>{language === 'zh' ? '旅人' : 'Travelers'}: {newGamePanel.travelerCount}</Typography>
        <IconButton size="small" onClick={() => updateConfig({ travelerCount: Math.max(0, newGamePanel.travelerCount - 1) })}>
          <RemoveIcon />
        </IconButton>
        <IconButton size="small" onClick={() => updateConfig({ travelerCount: Math.min(5, newGamePanel.travelerCount + 1) })}>
          <AddIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1 }}>
        {seats.map((sNum) => {
          const isTraveler = sNum > newGamePanel.playerCount
          return (
            <Box key={sNum} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip label={isTraveler ? `✈${sNum}` : `#${sNum}`} size="small" sx={{ minWidth: 32 }} />
              <TextField
                size="small"
                fullWidth
                list="ng-name-pool-list"
                placeholder={isTraveler ? `Traveler ${sNum}` : `Player ${sNum}`}
                value={newGamePanel.seatNames[sNum] ?? ''}
                onChange={(e) => updateConfig({ seatNames: { ...newGamePanel.seatNames, [sNum]: e.target.value } })}
                onBlur={(e) => handleNameBlur(sNum, e.target.value)}
              />
            </Box>
          )
        })}
      </Box>
      <datalist id="ng-name-pool-list">
        {playerNamePool.map((n: string) => <option key={n} value={n} />)}
      </datalist>
    </Box>
  )
}