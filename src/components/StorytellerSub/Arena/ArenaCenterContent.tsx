import { useState, useMemo } from 'react'
import { Box, Button, TextField, Select, MenuItem, IconButton, Typography, ToggleButton, ToggleButtonGroup, Dialog, FormControlLabel, Switch } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloseIcon from '@mui/icons-material/Close'
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

export function ArenaCenterContent({ ctx }: { ctx: any }) {
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
  } = ctx

  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [publicNote, setPublicNote] = useState('')
  const [stNote, setStNote] = useState('')
  const [showStNote, setShowStNote] = useState(false)
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
        <Button size="large" variant={nightShowCharacter ? 'contained' : 'outlined'} onClick={() => setNightShowCharacter((v: boolean) => !v)} sx={{ fontSize: '0.75rem', px: 1 }}>👁 {language === 'zh' ? '显示角色' : 'Character'}</Button>
        <Button size="large" variant={nightShowWakeOrder ? 'contained' : 'outlined'} onClick={() => setNightShowWakeOrder((v: boolean) => !v)} sx={{ fontSize: '0.75rem', px: 1 }}>🔢 {language === 'zh' ? '唤醒顺序' : 'Wake Order'}</Button>
        <Button size="large" variant="outlined" onClick={handleOpenCharacterEditor} sx={{ fontSize: '0.75rem', px: 1 }}>🎭 {language === 'zh' ? '编辑' : 'Edit'}</Button>
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
      : <Typography variant="caption" color="text.secondary">{text.nominationGate}: {Math.ceil(secondsUntilNomination / 60)}:{String(secondsUntilNomination % 60).padStart(2, '0')}</Typography>
  )

  const nominationControls = phase === 'nomination' && (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Button size="large" variant={showNominationSheet ? 'contained' : 'outlined'} onClick={() => setShowNominationSheet((v: boolean) => !v)}>📋 {language === 'zh' ? '提名' : 'Nominate'}</Button>
      <Button size="large" variant="outlined" onClick={(e) => { e.stopPropagation(); goToNextDay() }}>▶ {language === 'zh' ? '下一天' : 'Next Day'}</Button>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, p: 1, flex: 1, minWidth: 0, flexGrow: 1 }}>
      <ToggleButtonGroup value={phase} exclusive onChange={(_, v) => v && setPhase(v)} size="large">
        {PHASES.map(p => <ToggleButton key={p} value={p}>{getPhaseLabel(p, text)}</ToggleButton>)}
      </ToggleButtonGroup>

      <Button size="medium" variant="outlined" onClick={() => setNoteModalOpen(true)} startIcon="📝">{language === 'zh' ? '备注' : 'Notes'}</Button>

      {phase === 'public' && <Select size="medium" value={publicMode} onChange={(e) => updateCurrentDay((d: any) => ({ ...d, publicMode: e.target.value as PublicMode }))} sx={{ fontSize: '0.85rem', minWidth: 100 }}>
        <MenuItem value="free">{text.freeSpeech}</MenuItem>
        <MenuItem value="roundRobin">{text.roundRobinMode}</MenuItem>
      </Select>}

      {hasTimer && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {timerEditing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <TextField size="small" value={timerInput} onChange={(e) => setTimerInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTimerSave()} autoFocus placeholder="MM:SS" slotProps={{ input: { style: { fontSize: '1rem', fontWeight: 700, textAlign: 'center' } } }} sx={{ width: 75 }} />
                <Button size="small" variant="contained" onClick={handleTimerSave} sx={{ minWidth: 28, px: 0.5, fontSize: '0.75rem' }}>✓</Button>
                <Button size="small" variant="outlined" color="error" onClick={() => setTimerEditing(false)} sx={{ minWidth: 28, px: 0.5, fontSize: '0.75rem' }}>✕</Button>
              </Box>
            ) : (
              <Box onClick={handleTimerEdit} sx={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, bgcolor: alarmActive ? 'warning.light' : 'background.paper', px: 1.5, py: 0.25, borderRadius: 1, border: '1px solid', borderColor: 'divider', cursor: 'pointer', letterSpacing: '0.1em', userSelect: 'none', '&:hover': { bgcolor: 'action.hover' } }}>
                {formatTime(currentTimerSeconds)}
              </Box>
            )}
            {alarmActive && <IconButton size="large" onClick={() => setAlarmActive(false)}>🔔</IconButton>}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="large" onClick={() => { setIsTimerRunning((c: boolean) => !c); if (alarmActive) setAlarmActive(false) }} sx={isTimerRunning ? TIMER_CONTROL_SX : TIMER_IDLE_SX}>
              {isTimerRunning ? <PauseIcon sx={{ fontSize: '0.9rem' }} /> : <PlayArrowIcon sx={{ fontSize: '0.9rem' }} />}
            </IconButton>
            <IconButton size="large" onClick={handleResetTimer}><RefreshIcon sx={{ fontSize: '0.9rem' }} /></IconButton>
            <IconButton size="large" onClick={handleStopTimer}><StopIcon sx={{ fontSize: '0.9rem' }} /></IconButton>
          </Box>
        </>
      )}

      {nightControls}
      {publicRobinControls}
      {publicFreeControls}
      {nominationControls}

      <Dialog open={noteModalOpen} onClose={() => setNoteModalOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { p: 2, borderRadius: 2 } } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{language === 'zh' ? '全局备注' : 'Global Notes'}</Typography>
          <IconButton size="small" onClick={() => setNoteModalOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField multiline rows={3} fullWidth label={language === 'zh' ? '公开备注 (全员可见)' : 'Public Note (visible to all)'} value={publicNote} onChange={(e) => setPublicNote(e.target.value)} placeholder={language === 'zh' ? '输入公开备注...' : 'Enter public note...'} />
          <FormControlLabel control={<Switch checked={showStNote} onChange={(e) => setShowStNote(e.target.checked)} />} label={language === 'zh' ? '显示ST备注' : 'Show ST Note'} />
          {showStNote && <TextField multiline rows={3} fullWidth label={language === 'zh' ? 'ST备注 (仅ST可见)' : 'ST Note (ST only)'} value={stNote} onChange={(e) => setStNote(e.target.value)} placeholder={language === 'zh' ? '输入ST备注...' : 'Enter ST note...'} sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover' } }} />}
        </Box>
      </Dialog>
    </Box>
  )
}
