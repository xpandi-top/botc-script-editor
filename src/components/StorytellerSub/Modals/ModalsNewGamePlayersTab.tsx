// @ts-nocheck
import React, { useState, useRef } from 'react'
import { Box, Button, TextField, IconButton, Chip, Typography, Grid } from '@mui/material'
import { makeT } from '../../../lib/t'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import ReplayIcon from '@mui/icons-material/Replay'
import CasinoIcon from '@mui/icons-material/Casino'
import DownloadDoneIcon from '@mui/icons-material/DownloadDone'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
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
  const t = makeT(language as any)
  const [showNamePool, setShowNamePool] = useState(false)
  const [quickFill, setQuickFill] = useState('')
  // useRef (not useState) — read synchronously in handlePoolNameClick before blur clears it
  const focusedSeatRef = useRef<number | null>(null)

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
    // focusedSeatRef is read synchronously here — reliable even if blur fired first
    // (pool container uses onMouseDown preventDefault to keep TextField focused anyway)
    const target = focusedSeatRef.current ?? seats.find((n) => {
      const cur = newGamePanel.seatNames[n] ?? ''
      return !cur || /^Player \d+$|^Traveler \d+$/.test(cur)
    })
    if (target != null) updateConfig({ seatNames: { ...newGamePanel.seatNames, [target]: name } })
  }

  const handleNameBlur = (sNum: number, val: string) => {
    const trimmed = val.trim()
    if (trimmed && !/^Player \d+$|^Traveler \d+$/.test(trimmed) && !playerNamePool.includes(trimmed))
      setPlayerNamePool((p: string[]) => uniqueStrings([...p, trimmed]))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' } }}>
        <TextField
          size="small"
          fullWidth
          placeholder={t('paste_names_separated_by_commas')}
          value={quickFill}
          onChange={(e) => setQuickFill(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleQuickFill() }}
        />
        <Button
          size="small"
          variant="contained"
          onClick={handleQuickFill}
          disabled={!quickFill.trim()}
          startIcon={<DownloadDoneIcon fontSize="small" />}
          sx={{ flexShrink: 0, height: 40, width: { xs: '100%', sm: 'auto' } }}
        >
          {t('fill')}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" onClick={handleRandomPlayers} startIcon={<CasinoIcon fontSize="small" />}>
          {t('random')}
        </Button>
        <Button size="small" variant="outlined" onClick={handleResetNames} startIcon={<ReplayIcon fontSize="small" />}>
          {t('reset')}
        </Button>
        <Button size="small" variant={showNamePool ? 'contained' : 'outlined'} onClick={() => setShowNamePool((v) => !v)} endIcon={showNamePool ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}>
          {t('player_pool')}
        </Button>
      </Box>

      {showNamePool && (
        <Box
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
          onMouseDown={(e) => e.preventDefault()}  // keep TextField focus during chip click
        >
          {playerNamePool.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              {t('empty')}
            </Typography>
          ) : playerNamePool.map((name: string) => (
            <Chip
              key={name}
              label={name}
              size="small"
              clickable
              onClick={() => handlePoolNameClick(name)}
              onDelete={() => setPlayerNamePool((p: string[]) => p.filter((n) => n !== name))}
            />
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2">{t('edit_players')}: {newGamePanel.playerCount}</Typography>
        <IconButton size="small" onClick={() => updateConfig({ playerCount: Math.max(5, newGamePanel.playerCount - 1) })}>
          <RemoveIcon />
        </IconButton>
        <IconButton size="small" onClick={() => updateConfig({ playerCount: Math.min(15, newGamePanel.playerCount + 1) })}>
          <AddIcon />
        </IconButton>
        <Typography variant="body2" sx={{ ml: 1 }}>{t('traveler')}: {newGamePanel.travelerCount}</Typography>
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
              <Chip label={isTraveler ? `✈${sNum}` : `#${sNum}`} size="small" sx={{ minWidth: 52, flexShrink: 0 }} />
              <TextField
                size="small"
                fullWidth
                list="ng-name-pool-list"
                placeholder={isTraveler ? `Traveler ${sNum}` : `Player ${sNum}`}
                value={newGamePanel.seatNames[sNum] ?? ''}
                onFocus={() => { focusedSeatRef.current = sNum }}
                onBlur={(e) => { focusedSeatRef.current = null; handleNameBlur(sNum, e.target.value) }}
                onChange={(e) => updateConfig({ seatNames: { ...newGamePanel.seatNames, [sNum]: e.target.value } })}
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
