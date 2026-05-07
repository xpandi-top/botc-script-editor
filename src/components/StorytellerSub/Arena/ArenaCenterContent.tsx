import type { StorytellerContext } from '../useStoryteller'
import { useState, useMemo } from 'react'
import { Box, Button, TextField, Select, MenuItem, IconButton, Typography, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import CasinoIcon from '@mui/icons-material/Casino'
import HowToVoteIcon from '@mui/icons-material/HowToVote'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import { AggregatedLogModal } from './AggregatedLogModal'
import { StorytellerSetupModal } from './StorytellerSetupModal'
import type { Phase, PublicMode } from '../types'

const PHASES: Phase[] = ['night', 'private', 'public', 'nomination']
const TIMER_CONTROL_SX = { bgcolor: 'rgba(133,63,34,0.15)', border: '1px solid', borderColor: 'primary.main' }
const TIMER_IDLE_SX = { bgcolor: 'transparent', border: '1px solid', borderColor: 'divider' }

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const getPhaseLabel = (phase: string, text: any) => {
  switch (phase) {
    case 'night': return text.nightPhase
    case 'private': return text.privateChat
    case 'public': return text.publicChat
    default: return text.nomination
  }
}

export function ArenaCenterContent({ ctx }: { ctx: StorytellerContext }) {
  const {
    language, text, currentDay, updateCurrentDay,
    hasTimer, currentTimerSeconds, isTimerRunning, setIsTimerRunning,
    setCurrentTimer, syncDayTimers, setPickerMode,
    audioPlaying, setAudioPlaying, startNight, stopNight,
    canNominate, secondsUntilNomination,
    showNominationSheet, setShowNominationSheet,
    enterNomination, moveToNextSpeaker, goToNextDay, setPhase,
    alarmActive, setAlarmActive, nightShowCharacter, setNightShowCharacter,
    nightShowWakeOrder, setNightShowWakeOrder, setNewGamePanel, activeScriptSlug,
    setShowAggLogModal, setShowStSetupModal, stFabledIds,
  } = ctx
  const [timerEditing, setTimerEditing] = useState(false)
  const [timerInput, setTimerInput] = useState('')

  const phase = currentDay.phase
  const publicMode = currentDay.publicMode
  const seats = useMemo(() => currentDay.seats, [currentDay.seats])

  const handleTimerSave = () => {
    const [m = '0', s = '0'] = timerInput.split(':')
    setCurrentTimer((parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0))
    setTimerEditing(false)
  }

  const handleTimerEdit = () => {
    setTimerInput(formatTime(currentTimerSeconds))
    setTimerEditing(true)
  }

  const handleStopTimer = () => {
    setIsTimerRunning(false)
    setAlarmActive(false)
    setCurrentTimer(0)
  }

  const handleResetTimer = () => {
    updateCurrentDay(syncDayTimers)
    setIsTimerRunning(false)
  }

  const handleOpenCharacterEditor = () => {
    const regularSeats = seats.filter((s: any) => !s.isTraveler)
    const travelerSeats = seats.filter((s: any) => s.isTraveler)

    setNewGamePanel({
      playerCount: regularSeats.length,
      travelerCount: travelerSeats.length,
      scriptSlug: activeScriptSlug || '',
      allowDuplicateChars: false,
      allowEmptyChars: false,
      allowSameNames: false,
      assignments: Object.fromEntries(seats.map((s: any) => [s.seat, s.characterId || ''])),
      userAssignments: Object.fromEntries(seats.map((s: any) => [s.seat, s.userCharacterId || ''])),
      travelerAssignments: Object.fromEntries(seats.filter((s: any) => s.isTraveler).map((s: any) => [s.seat, s.characterId || ''])),
      seatNames: Object.fromEntries(seats.map((s: any) => [s.seat, s.name])),
      seatNotes: Object.fromEntries(seats.map((s: any) => [s.seat, s.note || ''])),
      specialNote: '', demonBluffs: [], charPool: [], editMode: true,
    })
  }

  const nightControls = phase === 'night' && (
    <>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <IconButton size="large" onClick={(e) => { e.stopPropagation(); audioPlaying ? setAudioPlaying(false) : startNight() }} sx={audioPlaying ? TIMER_CONTROL_SX : TIMER_IDLE_SX}>
          {audioPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton size="large" onClick={(e) => { e.stopPropagation(); stopNight() }}><StopIcon /></IconButton>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title={nightShowCharacter ? (language === 'zh' ? '隐藏角色' : 'Hide Characters') : (language === 'zh' ? '显示角色' : 'Show Characters')}>
          <IconButton size="large" onClick={() => setNightShowCharacter((v: boolean) => !v)} sx={nightShowCharacter ? TIMER_CONTROL_SX : TIMER_IDLE_SX}>
            <VisibilityIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={nightShowWakeOrder ? (language === 'zh' ? '隐藏唤醒顺序' : 'Hide Wake Order') : (language === 'zh' ? '显示唤醒顺序' : 'Show Wake Order')}>
          <IconButton size="large" onClick={() => setNightShowWakeOrder((v: boolean) => !v)} sx={nightShowWakeOrder ? TIMER_CONTROL_SX : TIMER_IDLE_SX}>
            <FormatListNumberedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={language === 'zh' ? '编辑角色' : 'Edit Characters'}>
          <IconButton size="large" onClick={handleOpenCharacterEditor}><ManageAccountsIcon /></IconButton>
        </Tooltip>
      </Box>
    </>
  )

  const publicRobinControls = phase === 'public' && publicMode === 'roundRobin' && (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 700, color: 'primary.main' }}>#{currentDay.currentSpeakerSeat ?? '—'}</Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title={text.chooseSpeaker}>
          <IconButton size="large" onClick={() => setPickerMode('speaker')}><PersonAddIcon /></IconButton>
        </Tooltip>
        <Tooltip title={text.randomSpeaker}>
          <IconButton size="large" onClick={() => {
            const all = seats.map((s: any) => s.seat)
            const r = all[Math.floor(Math.random() * Math.max(all.length, 1))]
            updateCurrentDay((d: any) => ({ ...d, currentSpeakerSeat: r ?? 1, roundRobinSpokenSeats: [] }))
          }}><CasinoIcon /></IconButton>
        </Tooltip>
        <Tooltip title={text.nextSpeaker}>
          <IconButton size="large" onClick={moveToNextSpeaker}><WbSunnyIcon /></IconButton>
        </Tooltip>
      </Box>
    </Box>
  )

  const publicFreeControls = phase === 'public' && publicMode === 'free' && (
    canNominate
      ? <Tooltip title={text.startNomination}>
          <IconButton size="large" onClick={enterNomination} color="primary">
            <HowToVoteIcon />
          </IconButton>
        </Tooltip>
      : <Typography variant="caption" color="text.secondary">{text.nominationGate}: {Math.floor(secondsUntilNomination / 60)}:{String(secondsUntilNomination % 60).padStart(2, '0')}</Typography>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, p: 1, flex: 1, minWidth: 0, flexGrow: 1 }}>
      
      
      <ToggleButtonGroup value={phase} exclusive onChange={(_, v) => v && setPhase(v)} size="large">
        {PHASES.map(p => <ToggleButton key={p} value={p}>{getPhaseLabel(p, text)}</ToggleButton>)}
      </ToggleButtonGroup>
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
      {phase === 'public' && <Select size="small" value={publicMode} onChange={(e) => updateCurrentDay((d: any) => ({ ...d, publicMode: e.target.value as PublicMode }))} sx={{ fontSize: '0.85rem', minWidth: 100 }}>
        <MenuItem value="free">{text.freeSpeech}</MenuItem>
        <MenuItem value="roundRobin">{text.roundRobinMode}</MenuItem>
      </Select>}
      <Tooltip title={language === 'zh' ? '说书人设置' : 'ST Setup'}>
        <IconButton size="large" onClick={() => setShowStSetupModal(true)} sx={stFabledIds?.length > 0 ? { position: 'relative' } : {}}>
          <AutoStoriesIcon />
          {stFabledIds?.length > 0 && (
            <Box component="span" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'primary.main', color: 'white', fontSize: '0.6rem', fontWeight: 700, borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stFabledIds.length}
            </Box>
          )}
        </IconButton>
      </Tooltip>
      <Tooltip title={language === 'zh' ? '日志' : 'Log'}>
        <IconButton size="large" onClick={() => setShowAggLogModal(true)}><ViewTimelineIcon /></IconButton>
      </Tooltip>
      {phase === 'nomination' && (
        <>
          <Tooltip title={language === 'zh' ? '提名' : 'Nominate'}>
            <IconButton size="large" onClick={() => setShowNominationSheet((v: boolean) => !v)} sx={showNominationSheet ? TIMER_CONTROL_SX : TIMER_IDLE_SX}>
              <HowToVoteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={language === 'zh' ? '下一天' : 'Next Day'}>
            <IconButton size="large" onClick={(e) => { e.stopPropagation(); goToNextDay() }}><ArrowForwardIosIcon /></IconButton>
          </Tooltip>
        </>
      )}
     </Box>
      {hasTimer && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {timerEditing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <TextField size="small" value={timerInput} onChange={(e) => setTimerInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTimerSave()} autoFocus placeholder="MM:SS" slotProps={{ input: { style: { fontSize: '1rem', fontWeight: 700, textAlign: 'center' } } }} sx={{ width: 75 }} />
                <Button size="small" variant="contained" onClick={handleTimerSave} sx={{ minWidth: 28, px: 0.5 }}><CheckIcon fontSize="small" /></Button>
                <Button size="small" variant="outlined" color="error" onClick={() => setTimerEditing(false)} sx={{ minWidth: 28, px: 0.5 }}><CloseIcon fontSize="small" /></Button>
              </Box>
            ) : (
              <Box onClick={handleTimerEdit} sx={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, bgcolor: alarmActive ? 'warning.light' : 'background.paper', px: 1.5, py: 0.25, borderRadius: 1, border: '1px solid', borderColor: 'divider', cursor: 'pointer', letterSpacing: '0.1em', userSelect: 'none', '&:hover': { bgcolor: 'action.hover' } }}>
                {formatTime(currentTimerSeconds)}
              </Box>
            )}
            {alarmActive && <IconButton size="large" onClick={() => setAlarmActive(false)}><NotificationsActiveIcon /></IconButton>}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="large" onClick={() => { setIsTimerRunning((c: boolean) => !c); if (alarmActive) setAlarmActive(false) }} sx={isTimerRunning ? TIMER_CONTROL_SX : TIMER_IDLE_SX}>
              {isTimerRunning ? <PauseIcon/> : <PlayArrowIcon />}
            </IconButton>
            <IconButton size="large" onClick={handleResetTimer}><RefreshIcon/></IconButton>
            <IconButton size="large" onClick={handleStopTimer}><StopIcon/></IconButton>
          </Box>
        </>
      )}

      {nightControls}
      {publicRobinControls}
      {publicFreeControls}

      <AggregatedLogModal ctx={ctx} />
      <StorytellerSetupModal ctx={ctx} />
    </Box>
  )
}
