import { useState } from 'react'
import { Box, Button, TextField, Select, MenuItem, IconButton, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import RefreshIcon from '@mui/icons-material/Refresh'
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
    setNewGamePanel, activeScriptSlug, appendEvent,
  } = ctx

  const [quickNote, setQuickNote] = useState('')
  const stepIdx = NOM_STEPS.indexOf(currentDay.nominationStep)

  const handleAddQuickNote = () => {
    const note = quickNote.trim()
    if (!note) return
    const kind = currentDay.phase === 'night' ? 'tagChange' : 'stateChange'
    const updatedDay = appendEvent(currentDay, kind, `${note}`)
    updateCurrentDay(() => updatedDay)
    setQuickNote('')
  }

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

      <Box sx={{ display: 'flex', gap: 0.5, width: '60%' }}>
          <TextField
            size="medium"
            placeholder={language === 'zh' ? '添加备注...' : 'Add note...'}
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddQuickNote() }}
            sx={{ flex: 1 }}
          />
          <Button size="medium" variant="outlined" onClick={handleAddQuickNote} sx={{ px: 1 }}>{language === 'zh' ? '添加' : 'Add'}</Button>
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
          <TextField
            size="medium"
            value={`${String(Math.floor(currentTimerSeconds / 60)).padStart(2, '0')}:${String(currentTimerSeconds % 60).padStart(2, '0')}`}
            onChange={(e) => {
              const val = e.target.value
              if (val.includes(':')) {
                const [mPart, sPart] = val.split(':')
                setCurrentTimer((parseInt(mPart, 10) || 0) * 60 + (parseInt(sPart, 10) || 0))
              } else {
                const n = parseInt(val, 10)
                if (!isNaN(n)) setCurrentTimer(n)
              }
            }}
            inputMode="numeric"
            sx={{ width: 70, bgcolor: alarmActive ? 'warning.light' : 'transparent' }}
          />
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
    </Box>
  )
}