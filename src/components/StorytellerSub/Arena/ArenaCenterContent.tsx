import type { StorytellerContext } from '../useStoryteller'
import { useState, useMemo } from 'react'
import { Box, Button, TextField, Select, MenuItem, IconButton, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import ListIcon from '@mui/icons-material/List'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
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
      seatNames: Object.fromEntries(seats.map((s: any) => [s.seat, s.name])),
      seatNotes: Object.fromEntries(seats.map((s: any) => [s.seat, s.note || ''])),
      specialNote: '', demonBluffs: [], editMode: true,
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
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button size="large" variant={nightShowCharacter ? 'contained' : 'outlined'} onClick={() => setNightShowCharacter((v: boolean) => !v)} >{language === 'zh' ? '显示角色' : 'Character'}</Button>
        <Button size="large" variant={nightShowWakeOrder ? 'contained' : 'outlined'} onClick={() => setNightShowWakeOrder((v: boolean) => !v)} >{language === 'zh' ? '唤醒顺序' : 'Wake Order'}</Button>
        <Button size="large" variant="outlined" onClick={handleOpenCharacterEditor} >{language === 'zh' ? '编辑' : 'Edit'}</Button>
      </Box>
    </>
  )

  const publicRobinControls = phase === 'public' && publicMode === 'roundRobin' && (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 700, color: 'primary.main' }}>#{currentDay.currentSpeakerSeat ?? '—'}</Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button size="large" variant="outlined" onClick={() => setPickerMode('speaker')} sx={{ fontSize: '0.7rem', px: 0.5 }}>{text.chooseSpeaker}</Button>
        <Button size="large" variant="outlined" onClick={() => {
          const all = seats.map((s: any) => s.seat)
          const r = all[Math.floor(Math.random() * Math.max(all.length, 1))]
          updateCurrentDay((d: any) => ({ ...d, currentSpeakerSeat: r ?? 1, roundRobinSpokenSeats: [] }))
        }} sx={{ fontSize: '0.7rem', px: 0.5 }}>{text.randomSpeaker}</Button>
        <Button size="large" variant="outlined" onClick={moveToNextSpeaker} sx={{ fontSize: '0.7rem', px: 0.5 }}>{text.nextSpeaker}</Button>
      </Box>
    </Box>
  )

  const publicFreeControls = phase === 'public' && publicMode === 'free' && (
    canNominate
      ? <Button variant="contained" onClick={enterNomination} sx={{ borderRadius: 999 }}>{text.startNomination}</Button>
      : <Typography variant="caption" color="text.secondary">{text.nominationGate}: {Math.floor(secondsUntilNomination / 60)}:{String(secondsUntilNomination % 60).padStart(2, '0')}</Typography>
  )

  const nominationControls = phase === 'nomination' && (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Button size="large" variant={showNominationSheet ? 'contained' : 'outlined'} onClick={() => setShowNominationSheet((v: boolean) => !v)} startIcon={<ListIcon />}>{language === 'zh' ? '提名' : 'Nominate'}</Button>
      <Button size="large" variant="outlined" onClick={(e) => { e.stopPropagation(); goToNextDay() }} startIcon={<PlayArrowIcon fontSize="small" />}>{language === 'zh' ? '下一天' : 'Next Day'}</Button>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, p: 1, flex: 1, minWidth: 0, flexGrow: 1 }}>
      
      
      <ToggleButtonGroup value={phase} exclusive onChange={(_, v) => v && setPhase(v)} size="large">
        {PHASES.map(p => <ToggleButton key={p} value={p}>{getPhaseLabel(p, text)}</ToggleButton>)}
      </ToggleButtonGroup>
      <Box>
      {phase === 'public' && <Select size="small" value={publicMode} onChange={(e) => updateCurrentDay((d: any) => ({ ...d, publicMode: e.target.value as PublicMode }))} sx={{ fontSize: '0.85rem', minWidth: 100 }}>
        <MenuItem value="free">{text.freeSpeech}</MenuItem>
        <MenuItem value="roundRobin">{text.roundRobinMode}</MenuItem>
      </Select>}
      <Button size="small" onClick={() => setShowStSetupModal(true)}
        startIcon={stFabledIds?.length > 0 ? <Box component="span" sx={{ fontSize: '0.85rem', lineHeight: 1 }}>{stFabledIds.length}</Box> : <AutoStoriesIcon fontSize="small" />}
        sx={{ fontWeight: 600 }}>
        {language === 'zh' ? '说书人' : 'ST Setup'}
      </Button>
      <Button size="small" onClick={() => setShowAggLogModal(true)} startIcon={<ListIcon fontSize="small" />}>{language === 'zh' ? '日志' : 'Log'}</Button>
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
      {nominationControls}

      <AggregatedLogModal ctx={ctx} />
      <StorytellerSetupModal ctx={ctx} />
    </Box>
  )
}
