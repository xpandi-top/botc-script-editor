// @ts-nocheck
import React, { useState, useMemo } from 'react'
import {
  Box, Button, IconButton, Typography, ToggleButton, ToggleButtonGroup,
  Select, MenuItem, TextField, Dialog, FormControlLabel, Switch,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import RefreshIcon from '@mui/icons-material/Refresh'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CloseIcon from '@mui/icons-material/Close'
import { ArenaCenterNominationSheet } from './ArenaCenterNominationSheet'
import type { Phase, PublicMode } from '../types'

const PHASES: Phase[] = ['night', 'private', 'public', 'nomination']

const PANEL_COLORS: Record<string, string> = {
  night: 'rgba(23,18,40,0.97)',
  private: 'rgba(42,36,80,0.97)',
  public: 'rgba(18,50,25,0.97)',
  nomination: 'rgba(80,10,10,0.97)',
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const TIMER_ACTIVE_SX = { bgcolor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)' }
const TIMER_IDLE_SX = { bgcolor: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }

export function PhaseControlPanel({ ctx }: { ctx: any }) {
  const {
    language, text, currentDay, updateCurrentDay, days,
    goToNextDay, goToPreviousDay, setSelectedDayId,
    hasTimer, currentTimerSeconds, isTimerRunning, setIsTimerRunning,
    setCurrentTimer, syncDayTimers, setPickerMode,
    audioPlaying, setAudioPlaying, startNight, stopNight,
    canNominate, secondsUntilNomination,
    showNominationSheet, setShowNominationSheet,
    enterNomination, moveToNextSpeaker, setPhase,
    alarmActive, setAlarmActive, nightShowCharacter, setNightShowCharacter,
    nightShowWakeOrder, setNightShowWakeOrder, setNewGamePanel, activeScriptSlug,
    openNewGamePanel, openEndGamePanel, setShowEditPlayersModal,
  } = ctx

  const [noteOpen, setNoteOpen] = useState(false)
  const [publicNote, setPublicNote] = useState('')
  const [stNote, setStNote] = useState('')
  const [showStNote, setShowStNote] = useState(false)
  const [timerEditing, setTimerEditing] = useState(false)
  const [timerInput, setTimerInput] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const phase = currentDay.phase
  const publicMode = currentDay.publicMode
  const seats = useMemo(() => currentDay.seats, [currentDay.seats])
  const bgColor = PANEL_COLORS[phase] ?? 'rgba(30,25,40,0.97)'
  const textColor = 'rgba(255,255,255,0.92)'
  const mutedColor = 'rgba(255,255,255,0.55)'

  const getPhaseLabel = (p: string) => ({ night: text.nightPhase, private: text.privateChat, public: text.publicChat, nomination: text.nomination }[p] ?? p)

  const handleTimerSave = () => {
    const [m = '0', s = '0'] = timerInput.split(':')
    setCurrentTimer((parseInt(m) || 0) * 60 + (parseInt(s) || 0))
    setTimerEditing(false)
  }

  const handleOpenCharEditor = () => {
    const regular = seats.filter((s: any) => !s.isTraveler)
    const travelers = seats.filter((s: any) => s.isTraveler)
    setNewGamePanel({
      playerCount: regular.length, travelerCount: travelers.length,
      scriptSlug: activeScriptSlug || '', allowDuplicateChars: false,
      allowEmptyChars: false, allowSameNames: false,
      assignments: Object.fromEntries(seats.map((s: any) => [s.seat, s.characterId || ''])),
      userAssignments: Object.fromEntries(seats.map((s: any) => [s.seat, s.userCharacterId || ''])),
      seatNames: Object.fromEntries(seats.map((s: any) => [s.seat, s.name])),
      seatNotes: Object.fromEntries(seats.map((s: any) => [s.seat, s.note || ''])),
      specialNote: '', demonBluffs: [], editMode: true,
    })
  }

  const btnSx = { color: textColor, borderColor: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', px: 1, py: 0.25, minWidth: 0, '&:hover': { borderColor: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.1)' } }
  const iconBtnSx = { color: textColor, p: 0.5 }

  if (collapsed) {
    return (
      <Box
        sx={{
          position: 'fixed', bottom: 'var(--safe-bottom, 0px)', left: 0, right: 0,
          zIndex: 100, bgcolor: bgColor,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75,
          cursor: 'pointer',
        }}
        onClick={() => setCollapsed(false)}
      >
        <Typography sx={{ color: textColor, fontWeight: 700, fontSize: '0.8rem', flex: 1 }}>
          Day {currentDay.day} · {getPhaseLabel(phase)}
          {hasTimer && ` · ${fmt(currentTimerSeconds)}`}
        </Typography>
        <Typography sx={{ color: mutedColor, fontSize: '0.75rem' }}>▲ {language === 'zh' ? '展开' : 'Expand'}</Typography>
      </Box>
    )
  }

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: 'var(--safe-bottom, 0px)',
          left: 0, right: 0,
          zIndex: 100,
          bgcolor: bgColor,
          borderTop: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '48vh',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle + collapse */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pt: 0.5, pb: 0.25, cursor: 'pointer', flexShrink: 0 }} onClick={() => setCollapsed(true)}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />
        </Box>

        <Box sx={{ overflowY: 'auto', flex: 1, px: 1.5, pb: 1.5 }}>
          {/* Day nav + phase selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75, flexWrap: 'wrap' }}>
            <IconButton size="small" sx={iconBtnSx} onClick={() => goToPreviousDay()}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Select
              value={currentDay.id}
              onChange={(e) => setSelectedDayId(e.target.value)}
              size="small"
              sx={{ color: textColor, fontWeight: 700, fontSize: '0.9rem', '& .MuiSelect-icon': { color: mutedColor }, '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, minWidth: 80 }}
            >
              {days.map((d: any) => <MenuItem key={d.id} value={d.id} sx={{ fontSize: '0.85rem' }}>Day {d.day}</MenuItem>)}
            </Select>
            <IconButton size="small" sx={iconBtnSx} onClick={() => goToNextDay()}>
              <ArrowForwardIcon fontSize="small" />
            </IconButton>

            <ToggleButtonGroup
              value={phase} exclusive
              onChange={(_, v) => v && setPhase(v)}
              size="small"
              sx={{ '& .MuiToggleButton-root': { color: mutedColor, borderColor: 'rgba(255,255,255,0.15)', fontSize: '0.78rem', px: 1, py: 0.375, '&.Mui-selected': { color: textColor, bgcolor: 'rgba(255,255,255,0.2)' } } }}
            >
              {PHASES.map(p => <ToggleButton key={p} value={p}>{getPhaseLabel(p)}</ToggleButton>)}
            </ToggleButtonGroup>
          </Box>

          {/* Public mode + notes row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
            {phase === 'public' && (
              <Select
                size="small"
                value={publicMode}
                onChange={(e) => updateCurrentDay((d: any) => ({ ...d, publicMode: e.target.value as PublicMode }))}
                sx={{ color: textColor, fontSize: '0.75rem', '& .MuiSelect-icon': { color: mutedColor }, '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, minWidth: 100 }}
              >
                <MenuItem value="free" sx={{ fontSize: '0.8rem' }}>{text.freeSpeech}</MenuItem>
                <MenuItem value="roundRobin" sx={{ fontSize: '0.8rem' }}>{text.roundRobinMode}</MenuItem>
              </Select>
            )}
            <Button size="small" variant="outlined" sx={btnSx} onClick={() => setNoteOpen(true)}>📝</Button>
          </Box>

          {/* Timer */}
          {hasTimer && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75, flexWrap: 'wrap' }}>
              {timerEditing ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <TextField
                    size="small" value={timerInput}
                    onChange={(e) => setTimerInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTimerSave()}
                    autoFocus placeholder="MM:SS"
                    slotProps={{ input: { style: { color: 'white', fontSize: '1rem', fontWeight: 700 } } }}
                    sx={{ width: 72, '& fieldset': { borderColor: 'rgba(255,255,255,0.4)' } }}
                  />
                  <Button size="small" variant="contained" onClick={handleTimerSave} sx={{ minWidth: 28, px: 0.5 }}>✓</Button>
                  <Button size="small" variant="outlined" onClick={() => setTimerEditing(false)} sx={{ ...btnSx, minWidth: 28, px: 0.5 }}>✕</Button>
                </Box>
              ) : (
                <Box
                  onClick={() => { setTimerInput(fmt(currentTimerSeconds)); setTimerEditing(true) }}
                  sx={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 700, color: alarmActive ? 'warning.light' : textColor, px: 1, py: 0.125, borderRadius: 1, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', letterSpacing: '0.08em', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
                >
                  {fmt(currentTimerSeconds)}
                </Box>
              )}
              {alarmActive && <IconButton size="small" sx={iconBtnSx} onClick={() => setAlarmActive(false)}>🔔</IconButton>}
              <IconButton size="small" sx={isTimerRunning ? { ...iconBtnSx, ...TIMER_ACTIVE_SX } : { ...iconBtnSx, ...TIMER_IDLE_SX }} onClick={() => { setIsTimerRunning((c: boolean) => !c); if (alarmActive) setAlarmActive(false) }}>
                {isTimerRunning ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
              </IconButton>
              <IconButton size="small" sx={iconBtnSx} onClick={() => { updateCurrentDay(syncDayTimers); setIsTimerRunning(false) }}><RefreshIcon fontSize="small" /></IconButton>
              <IconButton size="small" sx={iconBtnSx} onClick={() => { setIsTimerRunning(false); setAlarmActive(false); setCurrentTimer(0) }}><StopIcon fontSize="small" /></IconButton>
            </Box>
          )}

          {/* Night controls */}
          {phase === 'night' && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 0.5 }}>
              <Button
                size="small"
                variant={audioPlaying ? 'contained' : 'outlined'}
                sx={{ ...btnSx, ...(audioPlaying ? TIMER_ACTIVE_SX : {}) }}
                startIcon={audioPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                onClick={() => audioPlaying ? setAudioPlaying(false) : startNight()}
              >
                BGM
              </Button>
              <Button size="small" variant="outlined" sx={btnSx} startIcon={<StopIcon fontSize="small" />} onClick={stopNight}>
                {language === 'zh' ? '停止' : 'Stop'}
              </Button>
              <Button size="small" variant={nightShowCharacter ? 'contained' : 'outlined'} sx={btnSx} onClick={() => setNightShowCharacter((v: boolean) => !v)}>
                {language === 'zh' ? '显示角色' : 'Character'}
              </Button>
              <Button size="small" variant={nightShowWakeOrder ? 'contained' : 'outlined'} sx={btnSx} onClick={() => setNightShowWakeOrder((v: boolean) => !v)}>
                {language === 'zh' ? '唤醒顺序' : 'Wake Order'}
              </Button>
              <Button size="small" variant="outlined" sx={btnSx} onClick={handleOpenCharEditor}>
                {language === 'zh' ? '编辑' : 'Edit'}
              </Button>
            </Box>
          )}

          {/* Public round robin controls */}
          {phase === 'public' && publicMode === 'roundRobin' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
              <Typography sx={{ color: textColor, fontWeight: 700, fontSize: '1rem' }}>#{currentDay.currentSpeakerSeat ?? '—'}</Typography>
              <Button size="small" variant="outlined" sx={btnSx} onClick={() => setPickerMode('speaker')}>{text.chooseSpeaker}</Button>
              <Button size="small" variant="outlined" sx={btnSx} onClick={() => {
                const all = seats.map((s: any) => s.seat)
                const r = all[Math.floor(Math.random() * Math.max(all.length, 1))]
                updateCurrentDay((d: any) => ({ ...d, currentSpeakerSeat: r ?? 1, roundRobinSpokenSeats: [] }))
              }}>{text.randomSpeaker}</Button>
              <Button size="small" variant="outlined" sx={btnSx} onClick={moveToNextSpeaker}>{text.nextSpeaker}</Button>
            </Box>
          )}

          {/* Public free — nomination gate */}
          {phase === 'public' && publicMode === 'free' && (
            <Box sx={{ mb: 0.5 }}>
              {canNominate
                ? <Button variant="contained" onClick={enterNomination} sx={{ borderRadius: 999, fontSize: '0.8rem' }}>{text.startNomination}</Button>
                : <Typography sx={{ color: mutedColor, fontSize: '0.75rem' }}>{text.nominationGate}: {Math.floor(secondsUntilNomination / 60)}:{String(secondsUntilNomination % 60).padStart(2, '0')}</Typography>
              }
            </Box>
          )}

          {/* Nomination controls */}
          {phase === 'nomination' && (
            <Box sx={{ display: 'flex', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
              <Button size="small" variant="contained" sx={{ ...btnSx, bgcolor: 'rgba(255,255,255,0.2)' }} onClick={() => setShowNominationSheet(true)}>
                📋 {language === 'zh' ? '提名' : 'Nominate'}
              </Button>
              <Button size="small" variant="outlined" sx={btnSx} onClick={goToNextDay}>
                ▶ {language === 'zh' ? '下一天' : 'Next Day'}
              </Button>
            </Box>
          )}

      <ArenaCenterNominationSheet ctx={ctx} />

          {/* Game actions row */}
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', pt: 0.5, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
            <Button size="small" variant="outlined" sx={btnSx} onClick={openNewGamePanel}>{text.newGame}</Button>
            <Button size="small" variant="outlined" sx={btnSx} onClick={() => setShowEditPlayersModal(true)}>{text.editPlayers}</Button>
            <Button size="small" variant="outlined" sx={btnSx} onClick={openEndGamePanel}>{text.endGame}</Button>
          </Box>
        </Box>
      </Box>

      {/* Notes dialog */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { p: 2, borderRadius: 2 } } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>{language === 'zh' ? '全局备注' : 'Global Notes'}</Typography>
          <IconButton size="small" onClick={() => setNoteOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField multiline rows={3} fullWidth label={language === 'zh' ? '公开备注' : 'Public Note'} value={publicNote} onChange={(e) => setPublicNote(e.target.value)} />
          <FormControlLabel control={<Switch checked={showStNote} onChange={(e) => setShowStNote(e.target.checked)} />} label={language === 'zh' ? '显示ST备注' : 'Show ST Note'} />
          {showStNote && <TextField multiline rows={3} fullWidth label={language === 'zh' ? 'ST备注' : 'ST Note'} value={stNote} onChange={(e) => setStNote(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover' } }} />}
        </Box>
      </Dialog>
    </>
  )
}
