// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React, { useState, useMemo } from 'react'
import {
  Box, Button, IconButton, Tooltip, Typography, ToggleButton, ToggleButtonGroup,
  Select, MenuItem, TextField, useTheme,
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
import HowToVoteIcon from '@mui/icons-material/HowToVote'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import BedtimeIcon from '@mui/icons-material/Bedtime'
import LockIcon from '@mui/icons-material/Lock'
import GavelIcon from '@mui/icons-material/Gavel'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import ShuffleIcon from '@mui/icons-material/Shuffle'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import { ArenaCenterNominationSheet } from './ArenaCenterNominationSheet'
import { AggregatedLogModal } from './AggregatedLogModal'
import { StorytellerSetupModal } from './StorytellerSetupModal'
import type { Phase, PublicMode } from '../types'

const PHASES: Phase[] = ['night', 'private', 'public', 'nomination']

const PANEL_COLORS_DARK: Record<string, string> = {
  night:      'linear-gradient(135deg, rgba(22,28,40,0.20), rgba(40,51,71,0.20))',
  private:    'linear-gradient(135deg, rgba(78,65,52,0.20), rgba(106,88,68,0.20))',
  public:     'linear-gradient(135deg, rgba(36,50,67,0.20), rgba(57,76,97,0.20))',
  nomination: 'linear-gradient(135deg, rgba(74,56,43,0.20), rgba(106,82,61,0.20))',
}
const PANEL_COLORS_LIGHT: Record<string, string> = {
  night:      'linear-gradient(135deg, rgba(43,52,71,0.20), rgba(68,80,106,0.20))',
  private:    'linear-gradient(135deg, rgba(245,232,209,0.20), rgba(231,212,178,0.20))',
  public:     'linear-gradient(135deg, rgba(238,246,255,0.20), rgba(220,235,250,0.20))',
  nomination: 'linear-gradient(135deg, rgba(236,220,200,0.20), rgba(214,184,150,0.20))',
}
// Light-theme phases that use a bright background → need dark text/buttons
const LIGHT_BG_PHASES = new Set(['private', 'public', 'nomination'])

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`


const PHASE_ICONS: Record<string, React.ReactNode> = {
  night: <BedtimeIcon sx={{ fontSize: '1rem' }} />,
  private: <LockIcon sx={{ fontSize: '1rem' }} />,
  public: <WbSunnyIcon sx={{ fontSize: '1rem' }} />,
  nomination: <GavelIcon sx={{ fontSize: '1rem' }} />,
}

export function PhaseControlPanel({ ctx, collapsed, setCollapsed }: { ctx: StorytellerContext; collapsed: boolean; setCollapsed: (v: boolean) => void }) {
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

  const muiTheme = useTheme()
  const isDark = muiTheme.palette.mode === 'dark'

  const [timerEditing, setTimerEditing] = useState(false)
  const [timerInput, setTimerInput] = useState('')

  const phase = currentDay.phase
  const publicMode = currentDay.publicMode
  const seats = useMemo(() => currentDay.seats, [currentDay.seats])

  // Phase background gradient
  const bgGradient = (isDark ? PANEL_COLORS_DARK : PANEL_COLORS_LIGHT)[phase]
    ?? (isDark ? 'linear-gradient(135deg, #1a1520, #2a2035)' : 'linear-gradient(135deg, #ddd, #eee)')

  // Text and UI element colors — light-bg phases in light theme use dark ink
  const useDarkInk = !isDark && LIGHT_BG_PHASES.has(phase)
  const textColor   = useDarkInk ? 'rgba(30,20,10,0.88)'  : 'rgba(255,255,255,0.92)'
  const mutedColor  = useDarkInk ? 'rgba(30,20,10,0.50)'  : 'rgba(255,255,255,0.55)'
  const pipColor    = useDarkInk ? 'rgba(0,0,0,0.22)'     : 'rgba(255,255,255,0.30)'
  const borderColor = useDarkInk ? 'rgba(0,0,0,0.10)'     : 'rgba(255,255,255,0.18)'
  const btnOverlay  = useDarkInk ? 'rgba(0,0,0,0.07)'     : 'rgba(255,255,255,0.08)'
  const btnOverlayHover = useDarkInk ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.15)'
  const btnBorder   = useDarkInk ? 'rgba(0,0,0,0.28)'     : 'rgba(255,255,255,0.50)'

  const TIMER_ACTIVE_SX = { bgcolor: useDarkInk ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.25)', border: `1px solid ${useDarkInk ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.5)'}` }
  const TIMER_IDLE_SX   = { bgcolor: useDarkInk ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)', border: `1px solid ${useDarkInk ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.25)'}` }

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

  const btnSx = { color: textColor, borderColor: btnBorder, fontSize: '0.95rem', px: 1.5, py: 0.75, minHeight: 40, minWidth: 0, fontWeight: 500, bgcolor: btnOverlay, '&:hover': { borderColor: btnBorder, bgcolor: btnOverlayHover } }
  const iconBtnSx = { color: textColor, p: 0.75 }

  if (collapsed) {
    return (
      <Box
        sx={{
          position: 'fixed', bottom: 'calc(56px + var(--safe-bottom, 0px))',
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 600,
          zIndex: 1200, background: bgGradient,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: `1px solid ${borderColor}`,
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75,
          cursor: 'pointer',
          minHeight: 48,
        }}
        onClick={() => setCollapsed(false)}
      >
        {/* Drag handle pip */}
        <Box sx={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 32, height: 3, borderRadius: 2, bgcolor: pipColor }} />
        <Typography sx={{
          color: alarmActive ? 'warning.light' : textColor,
          fontWeight: 700, fontSize: '0.82rem', flex: 1,
          ...(alarmActive && {
            animation: 'timerAlarmPulse 0.9s ease-in-out infinite',
            '@keyframes timerAlarmPulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.3 },
            },
          }),
        }}>
          Day {currentDay.day} · {getPhaseLabel(phase)}
          {hasTimer && ` · ${fmt(currentTimerSeconds)}`}
        </Typography>
        {alarmActive && <NotificationsActiveIcon sx={{ fontSize: '1rem', color: 'warning.light' }} />}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: mutedColor }}>
          <UnfoldMoreIcon sx={{ fontSize: '1rem' }} />
          <Typography sx={{ color: mutedColor, fontSize: '0.72rem' }}>{language === 'zh' ? '展开' : 'Expand'}</Typography>
        </Box>
      </Box>
    )
  }

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: 'calc(56px + var(--safe-bottom, 0px))',
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 600,
          minHeight: 200,
          zIndex: 1200,
          background: bgGradient,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: `1px solid ${borderColor}`,
          borderRadius: '20px',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {/* Drag handle + collapse */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pt: 0.5, pb: 0.25, cursor: 'pointer', flexShrink: 0 }} onClick={() => setCollapsed(true)}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: pipColor }} />
        </Box>

        <Box sx={{ overflowY: 'auto', maxHeight: '38dvh', px: 1.5, pb: 1.5 }}>
          {/* Day nav + phase selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
            <IconButton sx={iconBtnSx} onClick={() => goToPreviousDay()}>
              <ArrowBackIcon />
            </IconButton>
            <Select
              value={currentDay.id}
              onChange={(e) => setSelectedDayId(e.target.value)}
              sx={{ color: textColor, fontWeight: 700, fontSize: '1rem', '& .MuiSelect-icon': { color: mutedColor }, '& fieldset': { borderColor: btnBorder }, minWidth: 100 }}
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
                gap: 1, 
                '& .MuiToggleButton-root': {
                  color: textColor,
                  borderColor: btnBorder,
                  px: 1, py: 0.5, minHeight: 38, minWidth: 40,
                  bgcolor: btnOverlay,
                  '&:hover': { bgcolor: btnOverlayHover },
                  '&.Mui-selected': { color: textColor, bgcolor: useDarkInk ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.25)' },
                },
              }}
            >
              {PHASES.map(p => (
                <Tooltip key={p} title={getPhaseLabel(p)} placement="top">
                  <ToggleButton value={p}>{PHASE_ICONS[p]}</ToggleButton>
                </Tooltip>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Public mode + ST Settings / Log row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
            {phase === 'public' && (
              <Select
                value={publicMode}
                onChange={(e) => updateCurrentDay((d: any) => ({ ...d, publicMode: e.target.value as PublicMode }))}
                sx={{ color: textColor, fontSize: '0.9rem', '& .MuiSelect-icon': { color: mutedColor }, '& fieldset': { borderColor: btnBorder }, minWidth: 120 }}
              >
                <MenuItem value="free" sx={{ fontSize: '0.95rem' }}>{text.freeSpeech}</MenuItem>
                <MenuItem value="roundRobin" sx={{ fontSize: '0.95rem' }}>{text.roundRobinMode}</MenuItem>
              </Select>
            )}
            <Tooltip title={language === 'zh' ? '说书人设置' : 'ST Setup'}>
              <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75, position: 'relative' }} onClick={() => setShowStSetupModal(true)}>
                <AutoStoriesIcon />
                {stFabledIds?.length > 0 && (
                  <Box component="span" sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'warning.main', color: 'black', fontSize: '0.55rem', fontWeight: 700, borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    {stFabledIds.length}
                  </Box>
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title={language === 'zh' ? '日志' : 'Log'}>
              <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={() => setShowAggLogModal(true)}>
                <ListIcon />
              </IconButton>
            </Tooltip>
            {phase === 'nomination' && (
              <>
                <Tooltip title={language === 'zh' ? '提名' : 'Nominate'}>
                  <IconButton sx={{ ...iconBtnSx, ...(showNominationSheet ? TIMER_ACTIVE_SX : TIMER_IDLE_SX), p: 0.75 }} onClick={() => setShowNominationSheet((v: boolean) => !v)}>
                    <HowToVoteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={language === 'zh' ? '下一天' : 'Next Day'}>
                  <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={goToNextDay}>
                    <WbSunnyIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
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
                    slotProps={{ input: { style: { color: textColor, fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em' } } }}
                    sx={{ width: 105, '& fieldset': { borderColor: btnBorder }, '& .MuiInputBase-root': { py: 0.75 } }}
                  />
                  <Button variant="contained" onClick={handleTimerSave} sx={{ minWidth: 44, px: 1, py: 1 }}><CheckIcon /></Button>
                  <Button variant="outlined" onClick={() => setTimerEditing(false)} sx={{ ...btnSx, minWidth: 44, px: 1, py: 1 }}><CloseIcon /></Button>
                </Box>
              ) : (
                <Box
                  onClick={() => { setTimerInput(fmt(currentTimerSeconds)); setTimerEditing(true) }}
                  sx={{
                    fontFamily: 'monospace', fontSize: '1.35rem', fontWeight: 700,
                    color: alarmActive ? 'warning.light' : textColor,
                    px: 1, py: 0.125, borderRadius: 1,
                    border: `1px solid ${btnBorder}`,
                    cursor: 'pointer', letterSpacing: '0.08em',
                    '&:hover': { bgcolor: btnOverlay },
                    // Pulse animation when alarm fires
                    ...(alarmActive && {
                      animation: 'timerAlarmPulse 0.9s ease-in-out infinite',
                      '@keyframes timerAlarmPulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.25 },
                      },
                    }),
                  }}
                >
                  {fmt(currentTimerSeconds)}
                </Box>
              )}
              <IconButton sx={{ ...iconBtnSx, p: 0.75 }} onClick={() => setAlarmActive(false)}><NotificationsActiveIcon /></IconButton>
              <IconButton sx={isTimerRunning ? { ...iconBtnSx, ...TIMER_ACTIVE_SX, p: 0.75 } : { ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={() => { setIsTimerRunning((c: boolean) => !c); if (alarmActive) setAlarmActive(false) }}>
                {isTimerRunning ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
              <IconButton sx={{ ...iconBtnSx, p: 0.75 }} onClick={() => { updateCurrentDay(syncDayTimers); setIsTimerRunning(false) }}><RefreshIcon /></IconButton>
              <IconButton sx={{ ...iconBtnSx, p: 0.75 }} onClick={() => { setIsTimerRunning(false); setAlarmActive(false); setCurrentTimer(0) }}><StopIcon /></IconButton>
            </Box>
          )}

          {/* Night controls — single icon row */}
          {phase === 'night' && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1, alignItems: 'left', flexDirection: 'column'}}>
              <Box sx={{gap:2, display:'flex', alignItems:'center'}}>
              <Tooltip title={audioPlaying ? (language === 'zh' ? '暂停BGM' : 'Pause BGM') : (language === 'zh' ? '播放BGM' : 'Play BGM')}>
                <IconButton sx={{ ...iconBtnSx, ...(audioPlaying ? TIMER_ACTIVE_SX : TIMER_IDLE_SX), p: 0.75 }} onClick={() => audioPlaying ? setAudioPlaying(false) : startNight()}>
                  {audioPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title={language === 'zh' ? '停止BGM' : 'Stop BGM'}>
                <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={stopNight}>
                  <StopIcon />
                </IconButton>
              </Tooltip>
              </Box>
              <Box sx={{gap:2, display:'flex'}}>
              <Tooltip title={nightShowCharacter ? (language === 'zh' ? '隐藏角色' : 'Hide Characters') : (language === 'zh' ? '显示角色' : 'Show Characters')}>
                <IconButton sx={{ ...iconBtnSx, ...(nightShowCharacter ? TIMER_ACTIVE_SX : TIMER_IDLE_SX), p: 0.75 }} onClick={() => setNightShowCharacter((v: boolean) => !v)}>
                  {nightShowCharacter ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title={nightShowWakeOrder ? (language === 'zh' ? '隐藏唤醒顺序' : 'Hide Wake Order') : (language === 'zh' ? '显示唤醒顺序' : 'Show Wake Order')}>
                <IconButton sx={{ ...iconBtnSx, ...(nightShowWakeOrder ? TIMER_ACTIVE_SX : TIMER_IDLE_SX), p: 0.75 }} onClick={() => setNightShowWakeOrder((v: boolean) => !v)}>
                  <FormatListNumberedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={language === 'zh' ? '编辑角色' : 'Edit Characters'}>
                <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={handleOpenCharEditor}>
                  <ManageAccountsIcon />
                </IconButton>
              </Tooltip>
              </Box>
            </Box>
          )}

          {/* Public round robin controls */}
          {phase === 'public' && publicMode === 'roundRobin' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ color: textColor, fontWeight: 700, fontSize: '1.15rem', minWidth: 32, textAlign: 'center' }}>
                #{currentDay.currentSpeakerSeat ?? '—'}
              </Typography>
              <Tooltip title={text.chooseSpeaker}>
                <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={() => setPickerMode('speaker')}>
                  <PersonAddIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={text.randomSpeaker}>
                <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={() => {
                  const all = seats.map((s: any) => s.seat)
                  const r = all[Math.floor(Math.random() * Math.max(all.length, 1))]
                  updateCurrentDay((d: any) => ({ ...d, currentSpeakerSeat: r ?? 1, roundRobinSpokenSeats: [] }))
                }}>
                  <ShuffleIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={text.nextSpeaker}>
                <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={moveToNextSpeaker}>
                  <SkipNextIcon />
                </IconButton>
              </Tooltip>
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

      <ArenaCenterNominationSheet ctx={ctx} />

        </Box>
      </Box>
      <ArenaCenterNominationSheet ctx={ctx} />
      <AggregatedLogModal ctx={ctx} />
      <StorytellerSetupModal ctx={ctx} />
    </>
  )
}
