// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Box, Select, MenuItem, TextField, IconButton } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import RefreshIcon from '@mui/icons-material/Refresh'

interface NominationTimerProps {
  selectedTimer: 'nominator' | 'nominee'
  setSelectedTimer: (v: 'nominator' | 'nominee') => void
  currentSeconds: number
  updateTimer: (v: number) => void
  isTimerRunning: boolean
  setIsTimerRunning: (v: boolean) => void
  timerDefaults?: { nominationActorSeconds?: number; nominationTargetSeconds?: number }
  language: string
}

export function NominationTimer({
  selectedTimer,
  setSelectedTimer,
  currentSeconds,
  updateTimer,
  isTimerRunning,
  setIsTimerRunning,
  timerDefaults,
  language,
}: NominationTimerProps) {
  const [timerEditing, setTimerEditing] = useState(false)
  const [timerInput, setTimerInput] = useState('')

  useEffect(() => {
    if (!isTimerRunning || currentSeconds <= 0) return
    const interval = setInterval(() => {
      updateTimer(Math.max(0, currentSeconds - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [isTimerRunning, currentSeconds, updateTimer])

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleTimerEdit = () => {
    const m = Math.floor(currentSeconds / 60)
    const s = currentSeconds % 60
    setTimerInput(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    setTimerEditing(true)
  }

  const handleTimerSave = () => {
    const m = parseInt(timerInput.split(':')[0], 10) || 0
    const s = parseInt(timerInput.split(':')[1], 10) || 0
    updateTimer(m * 60 + s)
    setTimerEditing(false)
  }

  const handleReset = () => {
    const defaultSecs = selectedTimer === 'nominator'
      ? timerDefaults?.nominationActorSeconds ?? 60
      : timerDefaults?.nominationTargetSeconds ?? 60
    updateTimer(defaultSecs)
    setIsTimerRunning(false)
  }

  const handleStop = () => {
    updateTimer(0)
    setIsTimerRunning(false)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
      <Select
        size="small"
        value={selectedTimer}
        onChange={(e) => setSelectedTimer(e.target.value as 'nominator' | 'nominee')}
        sx={{ minWidth: 100, fontSize: '0.85rem' }}
      >
        <MenuItem value="nominator">{language === 'zh' ? '提名者' : 'Nominator'}</MenuItem>
        <MenuItem value="nominee">{language === 'zh' ? '被提名者' : 'Nominee'}</MenuItem>
      </Select>
      {timerEditing ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <TextField
            size="small"
            value={timerInput}
            onChange={(e) => setTimerInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTimerSave() }}
            autoFocus
            placeholder="MM:SS"
            slotProps={{ input: { style: { fontSize: '1rem', fontWeight: 700, textAlign: 'center' } } }}
            sx={{ width: 75 }}
          />
          <IconButton size="small" onClick={handleTimerSave}>✓</IconButton>
          <IconButton size="small" onClick={() => setTimerEditing(false)}>✕</IconButton>
        </Box>
      ) : (
        <Box
          onClick={handleTimerEdit}
          sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.5rem', px: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
        >
          {formatTimer(currentSeconds)}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 0.25 }}>
        <IconButton size="small" onClick={() => setIsTimerRunning(!isTimerRunning)} sx={{ bgcolor: isTimerRunning ? 'primary.main' : 'transparent', color: isTimerRunning ? 'white' : 'inherit' }}>
          {isTimerRunning ? <PauseIcon sx={{ fontSize: '1rem' }} /> : <PlayArrowIcon sx={{ fontSize: '1rem' }} />}
        </IconButton>
        <IconButton size="small" onClick={handleReset}>
          <RefreshIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
        <IconButton size="small" onClick={handleStop}>
          <StopIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Box>
    </Box>
  )
}