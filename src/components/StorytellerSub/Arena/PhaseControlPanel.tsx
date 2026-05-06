// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React, { useState, useMemo } from 'react'
import {
  Box, Button, IconButton, Tooltip, Typography, ToggleButton, ToggleButtonGroup,
  Select, MenuItem, TextField,
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

const PANEL_COLORS: Record<string, string> = {
  night: 'rgba(25,20,45,0.98)',
  private: 'rgba(45,38,82,0.98)',
  public: 'rgba(22,52,28,0.98)',
  nomination: 'rgba(82,12,12,0.98)',
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const TIMER_ACTIVE_SX = { bgcolor: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.5)' }
const TIMER_IDLE_SX = { bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.25)' }

// Nomination needs more room (vote list renders inside)
const PANEL_HEIGHT: Record<string, string> = {
  night: '36dvh',
  private: '32dvh',
  public: '34dvh',
  nomination: '46dvh',
}

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

  const [timerEditing, setTimerEditing] = useState(false)
  const [timerInput, setTimerInput] = useState('')

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
          borderTop: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '12px 12px 0 0',
          display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75,
          cursor: 'pointer',
          minHeight: 48,
        }}
        onClick={() => setCollapsed(false)}
      >
        {/* Drag handle pip */}
        <Box sx={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 32, height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />
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
          bottom: 'var(--safe-bottom, 0px)',
          left: 0, right: 0,
          zIndex: 100,
          bgcolor: bgColor,
          borderTop: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          height: PANEL_HEIGHT[phase] ?? '34dvh',
          // Landscape phones: cap so controls stay reachable
          '@media (max-height: 500px) and (orientation: landscape)': {
            height: phase === 'nomination' ? '72vh' : '60vh',
          },
          // Smooth phase colour + height transitions
          transition: 'background-color 0.35s ease, height 0.2s ease',
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
                  px: 1,
                  py: 0.5,
                  minHeight: 38,
                  minWidth: 40,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                  '&.Mui-selected': { color: textColor, bgcolor: 'rgba(255,255,255,0.25)' },
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
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
                    slotProps={{ input: { style: { color: 'white', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em' } } }}
                    sx={{ width: 105, '& fieldset': { borderColor: 'rgba(255,255,255,0.4)' }, '& .MuiInputBase-root': { py: 0.75 } }}
                  />
                  <Button variant="contained" onClick={handleTimerSave} sx={{ minWidth: 44, px: 1, py: 1 }}><CheckIcon /></Button>
                  <Button variant="outlined" onClick={() => setTimerEditing(false)} sx={{ ...btnSx, minWidth: 44, px: 1, py: 1 }}><CloseIcon /></Button>
                </Box>
              ) : (
                <Box
                  onClick={() => { setTimerInput(fmt(currentTimerSeconds)); setTimerEditing(true) }}
                  sx={{
                    fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 700,
                    color: alarmActive ? 'warning.light' : textColor,
                    px: 1, py: 0.125, borderRadius: 1,
                    border: '1px solid rgba(255,255,255,0.25)',
                    cursor: 'pointer', letterSpacing: '0.08em',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
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
              <IconButton sx={{ ...iconBtnSx, p: 1 }} onClick={() => setAlarmActive(false)}><NotificationsActiveIcon fontSize="large" /></IconButton>
              <IconButton sx={isTimerRunning ? { ...iconBtnSx, ...TIMER_ACTIVE_SX, p: 1 } : { ...iconBtnSx, ...TIMER_IDLE_SX, p: 1 }} onClick={() => { setIsTimerRunning((c: boolean) => !c); if (alarmActive) setAlarmActive(false) }}>
                {isTimerRunning ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
              </IconButton>
              <IconButton sx={{ ...iconBtnSx, p: 1 }} onClick={() => { updateCurrentDay(syncDayTimers); setIsTimerRunning(false) }}><RefreshIcon fontSize="large" /></IconButton>
              <IconButton sx={{ ...iconBtnSx, p: 1 }} onClick={() => { setIsTimerRunning(false); setAlarmActive(false); setCurrentTimer(0) }}><StopIcon fontSize="large" /></IconButton>
            </Box>
          )}

          {/* Night controls — single icon row */}
          {phase === 'night' && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1, alignItems: 'center' }}>
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
              <Box sx={{ width: 1, height: 24, bgcolor: 'rgba(255,255,255,0.2)', mx: 0.25 }} />
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

      <AggregatedLogModal ctx={ctx} />
      <StorytellerSetupModal ctx={ctx} />
    </>
  )
}
