import { useState } from 'react'
import { Box, Button, TextField, Select, MenuItem, IconButton, Typography, ToggleButton, ToggleButtonGroup, Dialog, FormControlLabel, Switch } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloseIcon from '@mui/icons-material/Close'
import type { Phase, PublicMode, NominationStep } from '../types'

const NOM_STEPS: NominationStep[] = [
  'waitingForNomination', 'nominationDecision', 'actorSpeech',
  'readyForTargetSpeech', 'targetSpeech', 'readyToVote', 'voting', 'votingDone',
]

export function ArenaCenterLeft({ ctx }: { ctx: any }) {
  const {
    language, text, currentDay, updateCurrentDay,
    hasTimer, currentTimerSeconds, isTimerRunning, setIsTimerRunning,
    setCurrentTimer, syncDayTimers, setPickerMode,
    audioPlaying, setAudioPlaying, startNight, stopNight,
    canNominate, secondsUntilNomination,
    showNominationSheet, setShowNominationSheet,
    enterNomination, confirmNomination, confirmTargetSpeech, startVoting,
    moveToNextSpeaker, goToNextDay, setPhase,
    alarmActive, setAlarmActive,
    nightShowCharacter, setNightShowCharacter,
    nightShowWakeOrder, setNightShowWakeOrder,
    setNewGamePanel, activeScriptSlug,
  } = ctx

  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [publicNote, setPublicNote] = useState('')
  const [stNote, setStNote] = useState('')
  const [showStNote, setShowStNote] = useState(false)
  const [timerEditing, setTimerEditing] = useState(false)
  const [timerInput, setTimerInput] = useState('')
  const stepIdx = NOM_STEPS.indexOf(currentDay.nominationStep)

  const handleCloseNoteModal = () => {
    setShowStNote(false)
    setNoteModalOpen(false)
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleTimerEdit = () => {
    const m = Math.floor(currentTimerSeconds / 60)
    const s = currentTimerSeconds % 60
    setTimerInput(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    setTimerEditing(true)
  }

  const handleTimerSave = () => {
    const parts = timerInput.split(':')
    const m = parseInt(parts[0], 10) || 0
    const s = parseInt(parts[1], 10) || 0
    setCurrentTimer(m * 60 + s)
    setTimerEditing(false)
  }

  const noteModal = noteModalOpen ? (
    <Dialog open={noteModalOpen} onClose={handleCloseNoteModal} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { p: 2, borderRadius: 2 } } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{language === 'zh' ? '全局备注' : 'Global Notes'}</Typography>
        <IconButton size="small" onClick={handleCloseNoteModal}><CloseIcon /></IconButton>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          multiline
          rows={3}
          fullWidth
          label={language === 'zh' ? '公开备注 (全员可见)' : 'Public Note (visible to all)'}
          value={publicNote}
          onChange={(e) => setPublicNote(e.target.value)}
          placeholder={language === 'zh' ? '输入公开备注...' : 'Enter public note...'}
        />
        <FormControlLabel
          control={<Switch checked={showStNote} onChange={(e) => setShowStNote(e.target.checked)} />}
          label={language === 'zh' ? '显示ST备注' : 'Show ST Note'}
        />
        {showStNote && (
          <TextField
            multiline
            rows={3}
            fullWidth
            label={language === 'zh' ? 'ST备注 (仅ST可见)' : 'ST Note (ST only)'}
            value={stNote}
            onChange={(e) => setStNote(e.target.value)}
            placeholder={language === 'zh' ? '输入ST备注...' : 'Enter ST note...'}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover' } }}
          />
        )}
      </Box>
    </Dialog>
  ) : null

  const handleOpenCharacterEditor = () => {
    const regularSeats = currentDay.seats.filter((s: any) => !s.isTraveler)
    const travelerSeats = currentDay.seats.filter((s: any) => s.isTraveler)
    const assignments: Record<number, string> = {}
    const userAssignments: Record<number, string> = {}
    const seatNames: Record<number, string> = {}
    const seatNotes: Record<number, string> = {}

    for (const seat of currentDay.seats) {
      assignments[seat.seat] = seat.characterId || ''
      userAssignments[seat.seat] = seat.userCharacterId || ''
      seatNames[seat.seat] = seat.name
      seatNotes[seat.seat] = seat.note || ''
    }

    setNewGamePanel({
      playerCount: regularSeats.length,
      travelerCount: travelerSeats.length,
      scriptSlug: activeScriptSlug || '',
      allowDuplicateChars: false,
      allowEmptyChars: false,
      allowSameNames: false,
      assignments, userAssignments, seatNames, seatNotes,
      specialNote: '', demonBluffs: [], editMode: true,
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, p: 1, flex: 1, minWidth: 0, flexGrow: 1 }}>
      <ToggleButtonGroup
        value={currentDay.phase}
        exclusive
        onChange={(_, v) => v && setPhase(v)}
        size="large"
      >
        {(['night', 'private', 'public', 'nomination'] as Phase[]).map((p) => (
          <ToggleButton key={p} value={p}>
            {p === 'night' ? text.nightPhase
              : p === 'private' ? text.privateChat
              : p === 'public' ? text.publicChat
              : text.nomination}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box sx={{ display: 'flex', gap: 0.5, width: '60%', justifyContent: 'center' }}>
          <Button 
            size="medium" 
            variant="outlined" 
            onClick={() => setNoteModalOpen(true)}
            startIcon={<span>📝</span>}
          >
            {language === 'zh' ? '备注' : 'Notes'}
          </Button>
        </Box>

        {currentDay.phase === 'public' && (
        <Select
          size="medium"
          value={currentDay.publicMode}
          onChange={(e) => updateCurrentDay((d: any) => ({ ...d, publicMode: e.target.value as PublicMode }))}
          sx={{ fontSize: '0.85rem', minWidth: 100 }}
        >
          <MenuItem value="free">{text.freeSpeech}</MenuItem>
          <MenuItem value="roundRobin">{text.roundRobinMode}</MenuItem>
        </Select>
      )}

      {hasTimer && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {timerEditing ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <TextField
                size="small"
                value={timerInput}
                onChange={(e) => setTimerInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTimerSave() }}
                autoFocus
                placeholder="MM:SS"
                slotProps={{ input: { style: { fontSize: '1.2rem', fontWeight: 700, textAlign: 'center', width: 70, padding: '4px 6px' } } }}
                sx={{ width: 80 }}
              />
              <Button size="small" variant="contained" onClick={handleTimerSave} sx={{ minWidth: 32, px: 0.5 }}>
                ✓
              </Button>
            </Box>
          ) : (
            <Box 
              onClick={handleTimerEdit}
              sx={{ 
                fontFamily: 'monospace',
                fontSize: '2rem', 
                fontWeight: 700, 
                bgcolor: alarmActive ? 'warning.light' : 'background.paper',
                px: 1.5, 
                py: 0.25,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                letterSpacing: '0.1em',
                userSelect: 'none',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              {formatTimer(currentTimerSeconds)}
            </Box>
          )}
          {alarmActive && <IconButton size="large" onClick={() => setAlarmActive(false)}>🔔</IconButton>}
        </Box>
      )}

      {hasTimer && (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="large"
            onClick={() => { setIsTimerRunning((c: boolean) => !c); if (alarmActive) setAlarmActive(false) }}
            sx={{ bgcolor: isTimerRunning ? 'rgba(133,63,34,0.15)' : 'transparent', border: '1px solid', borderColor: isTimerRunning ? 'primary.main' : 'divider' }}
          >
            {isTimerRunning ? <PauseIcon sx={{ fontSize: '0.9rem' }} /> : <PlayArrowIcon sx={{ fontSize: '0.9rem' }} />}
          </IconButton>
          <IconButton size="large" onClick={() => { updateCurrentDay(syncDayTimers); setIsTimerRunning(false) }}>
            <RefreshIcon sx={{ fontSize: '0.9rem' }} />
          </IconButton>
          <IconButton size="large" onClick={() => { setIsTimerRunning(false); setAlarmActive(false); setCurrentTimer(0) }}>
            <StopIcon sx={{ fontSize: '0.9rem' }} />
          </IconButton>
        </Box>
      )}

      {currentDay.phase === 'night' && (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="large"
            onClick={(e) => { e.stopPropagation(); audioPlaying ? setAudioPlaying(false) : startNight() }}
            sx={{ bgcolor: audioPlaying ? 'rgba(133,63,34,0.15)' : 'transparent', border: '1px solid', borderColor: audioPlaying ? 'primary.main' : 'divider' }}
          >
            {audioPlaying ? <PauseIcon /> : <PlayArrowIcon/>}
          </IconButton>
          <IconButton size="large" onClick={(e) => { e.stopPropagation(); stopNight() }}>
            <StopIcon />
          </IconButton>
        </Box>
      )}

      {currentDay.phase === 'night' && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button size="large" variant={nightShowCharacter ? 'contained' : 'outlined'} onClick={() => setNightShowCharacter((v: boolean) => !v)} sx={{ fontSize: '0.75rem', px: 1 }}>
            👁 {language === 'zh' ? '显示角色' : 'Character'}
          </Button>
          <Button size="large" variant={nightShowWakeOrder ? 'contained' : 'outlined'} onClick={() => setNightShowWakeOrder((v: boolean) => !v)} sx={{ fontSize: '0.75rem', px: 1 }}>
            🔢 {language === 'zh' ? '唤醒顺序' : 'Wake Order'}
          </Button>
          <Button size="large" variant="outlined" onClick={handleOpenCharacterEditor} sx={{ fontSize: '0.75rem', px: 1 }}>
            🎭 {language === 'zh' ? '编辑' : 'Edit'}
          </Button>
        </Box>
      )}

      {currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 700, color: 'primary.main' }}>#{currentDay.currentSpeakerSeat ?? '—'}</Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button size="large" variant="outlined" onClick={() => setPickerMode('speaker')} sx={{ fontSize: '0.7rem', px: 0.5 }}>{text.chooseSpeaker}</Button>
            <Button size="large" variant="outlined" onClick={() => {
              const all = currentDay.seats.map((s: any) => s.seat)
              const r = all[Math.floor(Math.random() * Math.max(all.length, 1))]
              updateCurrentDay((d: any) => ({ ...d, currentSpeakerSeat: r ?? 1, roundRobinSpokenSeats: [] }))
            }} sx={{ fontSize: '0.7rem', px: 0.5 }}>{text.randomSpeaker}</Button>
            <Button size="large" variant="outlined" onClick={moveToNextSpeaker} sx={{ fontSize: '0.7rem', px: 0.5 }}>{text.nextSpeaker}</Button>
          </Box>
        </Box>
      )}

      {currentDay.phase === 'public' && currentDay.publicMode === 'free' && (
        canNominate
          ? <Button variant="contained" onClick={enterNomination} sx={{ borderRadius: 999 }}>{text.startNomination}</Button>
          : <Typography variant="caption" color="text.secondary">
              {text.nominationGate}: {Math.ceil(secondsUntilNomination / 60)}:{String(secondsUntilNomination % 60).padStart(2, '0')}
            </Typography>
      )}

      {currentDay.phase === 'nomination' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[
              { idx: 1, label: '🎙', done: stepIdx > 2, action: confirmNomination },
              { idx: 3, label: '🎯', done: stepIdx > 4, action: confirmTargetSpeech },
              { idx: 5, label: '🗳', done: stepIdx > 5, action: startVoting },
            ].map(({ idx, label, done, action }) => (
              <IconButton
                key={idx}
                onClick={action}
                size="large"
                sx={{ bgcolor: stepIdx === idx ? 'primary.main' : done ? 'rgba(133,63,34,0.2)' : 'transparent', color: stepIdx === idx ? 'white' : 'inherit' }}
              >
                {label}{done && ' ✓'}
              </IconButton>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              size="large"
              variant={showNominationSheet ? 'contained' : 'outlined'}
              onClick={() => setShowNominationSheet((v: boolean) => !v)}
            >
              📋 {language === 'zh' ? '提名' : 'Nominate'}
            </Button>
            <Button size="large" variant="outlined" onClick={(e) => { e.stopPropagation(); goToNextDay() }}>
              ▶ {language === 'zh' ? '下一天' : 'Next Day'}
            </Button>
          </Box>
        </Box>
      )}
      {noteModal}
    </Box>
  )
}