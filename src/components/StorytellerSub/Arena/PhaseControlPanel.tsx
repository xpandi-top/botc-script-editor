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
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined'
import SaveIcon from '@mui/icons-material/Save'
import { BgmBar } from '../BgmBar'
import RefreshIcon from '@mui/icons-material/Refresh'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline'
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
import DeleteIcon from '@mui/icons-material/Delete'
import { ArenaCenterNominationSheet } from './ArenaCenterNominationSheet'
import { AggregatedLogModal } from './AggregatedLogModal'
import { StorytellerSetupModal } from './StorytellerSetupModal'
import type { Phase, PublicMode } from '../types'
import { useT } from '../../../context/I18nContext'

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
    goToNextDay, goToPreviousDay, setSelectedDayId, setDialogState,
    hasTimer, currentTimerSeconds, isTimerRunning, setIsTimerRunning,
    setCurrentTimer, syncDayTimers, setPickerMode,
    audioPlaying, setAudioPlaying, startNight, stopNight, sendYTCommand,
    audioTracks, selectedAudioSrc, setSelectedAudioSrc, bgmVolume, setBgmVolume,
    handleLocalFileChange, handleUrlTrackAdd, deleteTrack, renameTrack,
    canNominate, secondsUntilNomination,
    showNominationSheet, setShowNominationSheet,
    enterNomination, moveToNextSpeaker, setPhase,
    alarmActive, setAlarmActive, nightShowCharacter, setNightShowCharacter,
    nightShowWakeOrder, setNightShowWakeOrder, openCharacterEditor,
    openNewGamePanel, openEndGamePanel,
    showAggLogModal, setShowAggLogModal, setShowStSetupModal, stFabledIds,
  } = ctx

  const { t } = useT()
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
          <Typography sx={{ color: mutedColor, fontSize: '0.72rem' }}>{t('expand')}</Typography>
        </Box>
      </Box>
    )
  }

  return (
    <>
      <Box
        data-tutorial="st-phase-panel"
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
          {/* Row 1: Day navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <IconButton sx={iconBtnSx} onClick={() => goToPreviousDay()}>
              <ArrowBackIcon />
            </IconButton>
            <Select
              value={currentDay.id}
              onChange={(e) => setSelectedDayId(e.target.value)}
              renderValue={(id) => { const d = days.find((d: any) => d.id === id); return d ? `Day ${d.day}` : '' }}
              sx={{ color: textColor, fontWeight: 700, fontSize: '1rem', '& .MuiSelect-icon': { color: mutedColor }, '& fieldset': { borderColor: btnBorder }, '& .MuiOutlinedInput-root': { background: 'transparent' }, '& .MuiSelect-select': { color: textColor }, background: 'transparent', minWidth: 100 }}
            >
              {days.map((d: any) => (
                <MenuItem key={d.id} value={d.id} sx={{ fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', gap: 1, pr: 0.5 }}>
                  <span style={{ flex: 1 }}>Day {d.day}</span>
                  {days.length > 1 && (
                    <Tooltip title={t('delete_this_day')}>
                      <IconButton
                        size="small"
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setDialogState({ kind: 'deleteDay', dayId: d.id, dayNum: d.day }) }}
                        sx={{ p: 0.25, flexShrink: 0, color: 'error.main', opacity: 0.7, '&:hover': { opacity: 1 } }}
                      >
                        <DeleteIcon sx={{ fontSize: '0.85rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </MenuItem>
              ))}
            </Select>
            <IconButton sx={iconBtnSx} onClick={() => goToNextDay()}>
              <ArrowForwardIcon />
            </IconButton>
          </Box>

          {/* Row 2: Phase selector buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
            <ToggleButtonGroup
              value={phase} exclusive
              onChange={(_, v) => v && setPhase(v)}
              sx={{
                gap: 1,
                '& .MuiToggleButton-root': {
                  color: textColor,
                  borderColor: btnBorder,
                  px: 1.5, py: 0.5, minHeight: 38, minWidth: 48,
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

          {/* Public mode + ST Settings / Log / New Game / Save / Print row */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 1, flexWrap: 'nowrap', overflowX: 'auto' }}>
            {phase === 'public' && (
              <Select
                value={publicMode}
                onChange={(e) => updateCurrentDay((d: any) => ({ ...d, publicMode: e.target.value as PublicMode }))}
                sx={{ color: textColor, fontSize: '0.9rem', '& .MuiSelect-icon': { color: mutedColor }, '& fieldset': { borderColor: btnBorder }, '& .MuiSelect-select': { color: textColor }, background: 'transparent', minWidth: 120 }}
              >
                <MenuItem value="free" sx={{ fontSize: '0.95rem' }}>{text.freeSpeech}</MenuItem>
                <MenuItem value="roundRobin" sx={{ fontSize: '0.95rem' }}>{text.roundRobinMode}</MenuItem>
              </Select>
            )}

            {/* Edit Characters */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Tooltip title={t('edit_characters')}>
                <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={openCharacterEditor}>
                  <ManageAccountsIcon />
                </IconButton>
              </Tooltip>
              <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, userSelect: 'none' }}>{t('characters_section')}</Typography>
            </Box>

            {/* Log */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Tooltip title={t('log')}>
                <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={() => setShowAggLogModal(true)}>
                  <ViewTimelineIcon />
                </IconButton>
              </Tooltip>
              <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, userSelect: 'none' }}>{t('log')}</Typography>
            </Box>

            {/* New Game */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Tooltip title={t('new_game')}>
                <IconButton data-tutorial="st-new-game-btn" sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={openNewGamePanel}>
                  <AddCircleOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, userSelect: 'none' }}>{t('new')}</Typography>
            </Box>

            {/* Save Record */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Tooltip title={t('save_record')}>
                <IconButton data-tutorial="st-save-btn" sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={openEndGamePanel}>
                  <SaveIcon />
                </IconButton>
              </Tooltip>
              <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, userSelect: 'none' }}>{t('save')}</Typography>
            </Box>

            {phase === 'nomination' && (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                  <Tooltip title={t('nominate')}>
                    <IconButton sx={{ ...iconBtnSx, ...(showNominationSheet ? TIMER_ACTIVE_SX : TIMER_IDLE_SX), p: 0.75 }} onClick={() => setShowNominationSheet((v: boolean) => !v)}>
                      <HowToVoteIcon />
                    </IconButton>
                  </Tooltip>
                  <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, userSelect: 'none' }}>{t('vote_label')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                  <Tooltip title={t('next_day')}>
                    <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={goToNextDay}>
                      <ArrowForwardIosIcon />
                    </IconButton>
                  </Tooltip>
                  <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, userSelect: 'none' }}>{t('next')}</Typography>
                </Box>
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
                    sx={{ width: 105, '& fieldset': { borderColor: btnBorder }, '& .MuiInputBase-root': { py: 0.75, background: 'transparent' } }}
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

          {/* Night controls */}
          {phase === 'night' && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1, flexDirection: 'column' }}>
              <BgmBar
                audioPlaying={audioPlaying}
                onTogglePlay={() => {
                  // Call sendYTCommand SYNCHRONOUSLY here — inside the user gesture.
                  // On iOS Safari postMessage to a cross-origin iframe must happen
                  // in the same call stack as the gesture; useEffect fires too late.
                  if (audioPlaying) { sendYTCommand('pauseVideo'); setAudioPlaying(false) }
                  else { sendYTCommand('playVideo'); startNight() }
                }}
                onStop={stopNight}
                audioTracks={audioTracks}
                selectedAudioSrc={selectedAudioSrc}
                setSelectedAudioSrc={setSelectedAudioSrc}
                bgmVolume={bgmVolume}
                setBgmVolume={setBgmVolume}
                handleLocalFileChange={handleLocalFileChange}
                handleUrlTrackAdd={handleUrlTrackAdd}
                deleteTrack={deleteTrack}
                renameTrack={renameTrack}
                language={language}
                iconSize="medium"
                sx={{ border: `1px solid ${btnBorder}`, bgcolor: 'transparent', borderRadius: 2, px: 0.5, py: 0.5 }}
                buttonSx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }}
                activeButtonSx={{ ...TIMER_ACTIVE_SX }}
                selectSx={{
                  color: textColor,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: btnBorder },
                  '.MuiSvgIcon-root': { color: textColor },
                }}
                sliderSx={{ color: textColor }}
              />
              <Box sx={{ gap: 1, display: 'flex' }}>
                <Tooltip title={nightShowCharacter ? (t('hide_characters')) : (t('show_characters'))}>
                  <IconButton sx={{ ...iconBtnSx, ...(nightShowCharacter ? TIMER_ACTIVE_SX : TIMER_IDLE_SX), p: 0.75 }} onClick={() => setNightShowCharacter((v: boolean) => !v)}>
                    {nightShowCharacter ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title={nightShowWakeOrder ? (t('hide_wake_order')) : (t('show_wake_order'))}>
                  <IconButton sx={{ ...iconBtnSx, ...(nightShowWakeOrder ? TIMER_ACTIVE_SX : TIMER_IDLE_SX), p: 0.75 }} onClick={() => setNightShowWakeOrder((v: boolean) => !v)}>
                    <FormatListNumberedIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('edit_characters')}>
                  <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={openCharacterEditor}>
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

        </Box>
      </Box>
      <ArenaCenterNominationSheet ctx={ctx} />
      <AggregatedLogModal ctx={ctx} />
      <StorytellerSetupModal ctx={ctx} />
    </>
  )
}
