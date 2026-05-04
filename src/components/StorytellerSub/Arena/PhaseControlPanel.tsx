// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
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
import CheckIcon from '@mui/icons-material/Check'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import ListIcon from '@mui/icons-material/List'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import EditNoteIcon from '@mui/icons-material/EditNote'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import { ArenaCenterNominationSheet } from './ArenaCenterNominationSheet'
import { AggregatedLogModal } from './AggregatedLogModal'
import { StorytellerSetupModal } from './StorytellerSetupModal'
import type { Phase, PublicMode } from '../types'

const PHASES: Phase[] = ['night', 'private', 'public', 'nomination']

const PANEL_COLORS: Record<string, string> = {
  night: 'rgba(25,20,45,0.98)',
  private: 'rgba(45,38,82,0.98)',
  public: 'rgba(22,52,28,0.98)',
  nomination: 'rgba(82,12,12,0.98)',
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const TIMER_ACTIVE_SX = { bgcolor: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.5)' }
const TIMER_IDLE_SX = { bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.25)' }

export function PhaseControlPanel({ ctx }: { ctx: StorytellerContext }) {
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
    showAggLogModal, setShowAggLogModal, setShowStSetupModal, stFabledIds,
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

  const btnSx = { color: textColor, borderColor: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', px: 1.5, py: 0.75, minHeight: 40, minWidth: 0, fontWeight: 500, bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { borderColor: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(255,255,255,0.15)' } }
  const iconBtnSx = { color: textColor, p: 0.75 }

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
        <Typography sx={{ color: mutedColor, fontSize: '0.75rem' }}><UnfoldMoreIcon sx={{ fontSize: '0.9rem', verticalAlign: 'middle' }} /> {language === 'zh' ? '展开' : 'Expand'}</Typography>
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
          borderTop: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          height: '33dvh',
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
            <IconButton sx={iconBtnSx} onClick={() => goToPreviousDay()}>
              <ArrowBackIcon />
            </IconButton>
            <Select
              value={currentDay.id}
              onChange={(e) => setSelectedDayId(e.target.value)}
              sx={{ color: textColor, fontWeight: 700, fontSize: '1rem', '& .MuiSelect-icon': { color: mutedColor }, '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }, minWidth: 90 }}
            >
              {days.map((d: any) => <MenuItem key={d.id} value={d.id} sx={{ fontSize: '0.95rem' }}>Day {d.day}</MenuItem>)}
            </Select>
            <IconButton sx={iconBtnSx} onClick={() => goToNextDay()}>
              <ArrowForwardIcon />
            </IconButton>

            <ToggleButtonGroup
              value={phase} exclusive
              onChange={(_, v) => v && setPhase(v)}
              sx={{
                '& .MuiToggleButton-root': {
                  color: textColor,
                  borderColor: 'rgba(255,255,255,0.25)',
                  fontSize: '0.95rem',
                  px: 1.5,
                  py: 0.75,
                  minHeight: 38,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                  '&.Mui-selected': { color: textColor, bgcolor: 'rgba(255,255,255,0.25)' },
                },
              }}
            >
              {PHASES.map(p => <ToggleButton key={p} value={p}>{getPhaseLabel(p)}</ToggleButton>)}
            </ToggleButtonGroup>
          </Box>

          {/* Public mode + notes row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            {phase === 'public' && (
              <Select
                value={publicMode}
                onChange={(e) => updateCurrentDay((d: any) => ({ ...d, publicMode: e.target.value as PublicMode }))}
                sx={{ color: textColor, fontSize: '0.9rem', '& .MuiSelect-icon': { color: mutedColor }, '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }, minWidth: 120 }}
              >
                <MenuItem value="free" sx={{ fontSize: '0.95rem' }}>{text.freeSpeech}</MenuItem>
                <MenuItem value="roundRobin" sx={{ fontSize: '0.95rem' }}>{text.roundRobinMode}</MenuItem>
              </Select>
            )}
            <Button variant="outlined" sx={btnSx} onClick={() => setShowStSetupModal(true)} startIcon={<AutoStoriesIcon />}>
              {stFabledIds?.length > 0 ? stFabledIds.length : ''}
            </Button>
            {phase !== 'night' && (
              <Button variant="outlined" sx={btnSx} onClick={() => setNoteOpen(true)} startIcon={<EditNoteIcon />}>
                {language === 'zh' ? '备注' : 'Notes'}
              </Button>
            )}
            <Button variant="outlined" sx={btnSx} onClick={() => setShowAggLogModal(true)} startIcon={<ListIcon />}>
              {language === 'zh' ? '日志' : 'Log'}
            </Button>
          </Box>

          {/* Timer */}
          {hasTimer && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
              {timerEditing ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <TextField
                    value={timerInput}
                    onChange={(e) => setTimerInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTimerSave()}
                    autoFocus placeholder="MM:SS"
                    slotProps={{ input: { style: { color: 'white', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em' } } }}
                    sx={{ width: 105, '& fieldset': { borderColor: 'rgba(255,255,255,0.4)' }, '& .MuiInputBase-root': { py: 0.75 } }}
                  />
                  <Button variant="contained" onClick={handleTimerSave} sx={{ minWidth: 44, px: 1, py: 1 }}><CheckIcon /></Button>
                  <Button variant="outlined" onClick={() => setTimerEditing(false)} sx={{ ...btnSx, minWidth: 44, px: 1, py: 1 }}><CloseIcon /></Button>
                </Box>
              ) : (
                <Box
                  onClick={() => { setTimerInput(fmt(currentTimerSeconds)); setTimerEditing(true) }}
                  sx={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 700, color: alarmActive ? 'warning.light' : textColor, px: 1, py: 0.125, borderRadius: 1, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', letterSpacing: '0.08em', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
                >
                  {fmt(currentTimerSeconds)}
                </Box>
              )}
              <IconButton sx={{ ...iconBtnSx, p: 1 }} onClick={() => setAlarmActive(false)}><NotificationsActiveIcon fontSize="large" /></IconButton>
              <IconButton sx={isTimerRunning ? { ...iconBtnSx, ...TIMER_ACTIVE_SX, p: 1 } : { ...iconBtnSx, ...TIMER_IDLE_SX, p: 1 }} onClick={() => { setIsTimerRunning((c: boolean) => !c); if (alarmActive) setAlarmActive(false) }}>
                {isTimerRunning ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
              </IconButton>
              <IconButton sx={{ ...iconBtnSx, p: 1 }} onClick={() => { updateCurrentDay(syncDayTimers); setIsTimerRunning(false) }}><RefreshIcon fontSize="large" /></IconButton>
              <IconButton sx={{ ...iconBtnSx, p: 1 }} onClick={() => { setIsTimerRunning(false); setAlarmActive(false); setCurrentTimer(0) }}><StopIcon fontSize="large" /></IconButton>
            </Box>
          )}

          {/* Night controls — row 1: BGM */}
          {phase === 'night' && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
              <Button
                variant={audioPlaying ? 'contained' : 'outlined'}
                sx={{ ...btnSx, ...(audioPlaying ? TIMER_ACTIVE_SX : {}) }}
                startIcon={audioPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                onClick={() => audioPlaying ? setAudioPlaying(false) : startNight()}
              >
                BGM
              </Button>
              <Button variant="outlined" sx={btnSx} startIcon={<StopIcon />} onClick={stopNight}>
                {language === 'zh' ? '停止' : 'Stop'}
              </Button>
            </Box>
          )}

          {/* Night controls — row 2: character, wake order, edit */}
          {phase === 'night' && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
              <Button variant={nightShowCharacter ? 'contained' : 'outlined'} sx={btnSx} onClick={() => setNightShowCharacter((v: boolean) => !v)}>
                {language === 'zh' ? '显示角色' : 'Character'}
              </Button>
              <Button variant={nightShowWakeOrder ? 'contained' : 'outlined'} sx={btnSx} onClick={() => setNightShowWakeOrder((v: boolean) => !v)}>
                {language === 'zh' ? '唤醒顺序' : 'Wake Order'}
              </Button>
              <Button variant="outlined" sx={btnSx} onClick={handleOpenCharEditor}>
                {language === 'zh' ? '编辑角色' : 'Edit Characters'}
              </Button>
            </Box>
          )}

          {/* Public round robin controls */}
          {phase === 'public' && publicMode === 'roundRobin' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ color: textColor, fontWeight: 700, fontSize: '1.15rem' }}>#{currentDay.currentSpeakerSeat ?? '—'}</Typography>
              <Button variant="outlined" sx={btnSx} onClick={() => setPickerMode('speaker')}>{text.chooseSpeaker}</Button>
              <Button variant="outlined" sx={btnSx} onClick={() => {
                const all = seats.map((s: any) => s.seat)
                const r = all[Math.floor(Math.random() * Math.max(all.length, 1))]
                updateCurrentDay((d: any) => ({ ...d, currentSpeakerSeat: r ?? 1, roundRobinSpokenSeats: [] }))
              }}>{text.randomSpeaker}</Button>
              <Button variant="outlined" sx={btnSx} onClick={moveToNextSpeaker}>{text.nextSpeaker}</Button>
            </Box>
          )}

          {/* Public free — nomination gate */}
          {phase === 'public' && publicMode === 'free' && (
            <Box sx={{ mb: 1 }}>
              {canNominate
                ? <Button variant="contained" onClick={enterNomination} sx={{ borderRadius: 999, fontSize: '0.95rem', px: 2, py: 0.75, minHeight: 40 }}>{text.startNomination}</Button>
                : <Typography sx={{ color: mutedColor, fontSize: '0.85rem' }}>{text.nominationGate}: {Math.floor(secondsUntilNomination / 60)}:{String(secondsUntilNomination % 60).padStart(2, '0')}</Typography>
              }
            </Box>
          )}

          {/* Nomination controls */}
          {phase === 'nomination' && (
            <Box sx={{ display: 'flex', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
              <Button variant="contained" sx={{ ...btnSx, bgcolor: 'rgba(255,255,255,0.25)' }} onClick={() => setShowNominationSheet(true)} startIcon={<ListIcon />}>
                {language === 'zh' ? '提名' : 'Nominate'}
              </Button>
              <Button variant="outlined" sx={btnSx} onClick={goToNextDay} startIcon={<ArrowForwardIcon />}>
                {language === 'zh' ? '下一天' : 'Next Day'}
              </Button>
            </Box>
          )}

      <ArenaCenterNominationSheet ctx={ctx} />

        </Box>
      </Box>

      <AggregatedLogModal ctx={ctx} />
      <StorytellerSetupModal ctx={ctx} />

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
