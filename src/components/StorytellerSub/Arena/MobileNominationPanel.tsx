// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Box, Button, Typography, Select, MenuItem, FormControl, InputLabel, Chip, IconButton } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import RefreshIcon from '@mui/icons-material/Refresh'
import { createDefaultVoteDraft } from '../constants'

export function MobileNominationPanel({ ctx }: { ctx: any }) {
  const {
    language, text, currentDay, updateCurrentDay, pickerMode, setPickerMode,
    requiredVotes, exileRequiredVotes, effectiveRequiredVotes,
    rejectNomination, recordVote, votingYesCount, timerDefaults,
  } = ctx

  const [selectedTimer, setSelectedTimer] = useState<'nominator' | 'nominee'>('nominator')
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const seats = currentDay?.seats ?? []
  const voteDraft = currentDay?.voteDraft ?? {}
  const nominationActorSeconds = currentDay?.nominationActorSeconds ?? timerDefaults?.nominationActorSeconds ?? 60
  const nominationTargetSeconds = currentDay?.nominationTargetSeconds ?? timerDefaults?.nominationTargetSeconds ?? 60
  const currentSeconds = selectedTimer === 'nominator' ? nominationActorSeconds : nominationTargetSeconds

  const updateTimer = (val: number) => {
    if (selectedTimer === 'nominator') {
      updateCurrentDay((d: any) => ({ ...d, nominationActorSeconds: val }))
    } else {
      updateCurrentDay((d: any) => ({ ...d, nominationTargetSeconds: val }))
    }
  }

  useEffect(() => {
    if (!isTimerRunning || currentSeconds <= 0) return
    const id = setInterval(() => updateTimer(Math.max(0, currentSeconds - 1)), 1000)
    return () => clearInterval(id)
  }, [isTimerRunning, currentSeconds])

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const handleActorChange = (e: any) => {
    const v = parseInt(e.target.value)
    if (!isNaN(v)) {
      updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, actor: v } }))
      setPickerMode('nominee')
    } else {
      updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, actor: null } }))
    }
  }

  const handleTargetChange = (e: any) => {
    const v = parseInt(e.target.value)
    if (!isNaN(v)) {
      const targetSeat = seats.find((s: any) => s.seat === v)
      updateCurrentDay((d: any) => ({
        ...d,
        nominationStep: 'nominationDecision',
        voteDraft: { ...d.voteDraft, target: v, voters: [], isExile: targetSeat?.isTraveler ?? false },
      }))
    } else {
      updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, target: null, isExile: false } }))
    }
  }

  const handleVoteToggle = (seatNum: number) => {
    const isChecked = currentDay?.votingState?.votes?.[seatNum] === true || voteDraft?.voters?.includes(seatNum)
    if (currentDay?.votingState) {
      updateCurrentDay((d: any) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seatNum]: !isChecked } } : null }))
    } else {
      updateCurrentDay((d: any) => ({
        ...d,
        voteDraft: {
          ...d.voteDraft,
          voters: isChecked ? d.voteDraft.voters.filter((v: number) => v !== seatNum) : [...d.voteDraft.voters, seatNum],
        },
      }))
    }
  }

  const handleClear = () => {
    updateCurrentDay((d: any) => ({ ...d, nominationStep: 'waitingForNomination', voteDraft: createDefaultVoteDraft(), votingState: null }))
    setPickerMode('none')
    setIsTimerRunning(false)
  }

  const yesCount = Object.values(currentDay?.votingState?.votes ?? {}).filter(Boolean).length || voteDraft?.voters?.length || 0
  const showVotes = currentDay?.nominationStep !== 'waitingForNomination' && voteDraft?.nominationResult === 'succeed'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pt: 0.5 }}>
      {/* Timer row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, p: 0.75, bgcolor: 'rgba(133,63,34,0.06)', borderRadius: 1 }}>
        <Select
          size="small"
          value={selectedTimer}
          onChange={(e) => setSelectedTimer(e.target.value as 'nominator' | 'nominee')}
          sx={{ fontSize: '0.75rem', minWidth: 90 }}
        >
          <MenuItem value="nominator" sx={{ fontSize: '0.75rem' }}>{language === 'zh' ? '提名者' : 'Nominator'}</MenuItem>
          <MenuItem value="nominee" sx={{ fontSize: '0.75rem' }}>{language === 'zh' ? '被提名者' : 'Nominee'}</MenuItem>
        </Select>
        <Box sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', px: 0.75, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          {fmt(currentSeconds)}
        </Box>
        <IconButton size="small" onClick={() => setIsTimerRunning(r => !r)} sx={{ bgcolor: isTimerRunning ? 'primary.main' : 'transparent', color: isTimerRunning ? 'white' : 'inherit' }}>
          {isTimerRunning ? <PauseIcon sx={{ fontSize: '1rem' }} /> : <PlayArrowIcon sx={{ fontSize: '1rem' }} />}
        </IconButton>
        <IconButton size="small" onClick={() => { updateTimer(selectedTimer === 'nominator' ? (timerDefaults?.nominationActorSeconds ?? 60) : (timerDefaults?.nominationTargetSeconds ?? 60)); setIsTimerRunning(false) }}>
          <RefreshIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Box>

      {/* Nominator / Nominee selects */}
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>{text.actor}</InputLabel>
          <Select value={voteDraft?.actor ?? ''} label={text.actor} onChange={handleActorChange} sx={{ fontSize: '0.8rem' }}>
            <MenuItem value="" sx={{ fontSize: '0.8rem' }}>—</MenuItem>
            {seats.map((s: any) => <MenuItem key={s.seat} value={s.seat} sx={{ fontSize: '0.8rem' }}>#{s.seat} {s.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>{text.target}</InputLabel>
          <Select value={voteDraft?.target ?? ''} label={text.target} onChange={handleTargetChange} sx={{ fontSize: '0.8rem' }}>
            <MenuItem value="" sx={{ fontSize: '0.8rem' }}>—</MenuItem>
            {seats.map((s: any) => <MenuItem key={s.seat} value={s.seat} sx={{ fontSize: '0.8rem' }}>#{s.seat} {s.name}{s.isTraveler ? ' ✈' : ''}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* Result select */}
      <FormControl size="small" fullWidth>
        <InputLabel sx={{ fontSize: '0.75rem' }}>{language === 'zh' ? '结果' : 'Result'}</InputLabel>
        <Select
          value={voteDraft?.nominationResult ?? ''}
          label={language === 'zh' ? '结果' : 'Result'}
          onChange={(e) => updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, nominationResult: e.target.value } }))}
          sx={{ fontSize: '0.8rem' }}
        >
          <MenuItem value="succeed" sx={{ fontSize: '0.8rem' }}>{language === 'zh' ? '✓ 提名成功' : '✓ Succeed'}</MenuItem>
          <MenuItem value="fail" sx={{ fontSize: '0.8rem' }}>{language === 'zh' ? '✗ 提名失败' : '✗ Failed'}</MenuItem>
        </Select>
      </FormControl>

      {/* Vote chips */}
      {showVotes && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            {language === 'zh' ? '投票 (点击切换)' : 'Votes (tap to toggle)'} — {yesCount}/{effectiveRequiredVotes}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
            {seats.map((s: any) => {
              const isChecked = currentDay?.votingState?.votes?.[s.seat] === true || voteDraft?.voters?.includes(s.seat)
              return (
                <Chip
                  key={s.seat}
                  label={`#${s.seat}`}
                  size="small"
                  variant={isChecked ? 'filled' : 'outlined'}
                  color={isChecked ? 'success' : 'default'}
                  onClick={() => handleVoteToggle(s.seat)}
                  sx={{ fontSize: '0.75rem', height: 28, fontWeight: 700 }}
                />
              )
            })}
          </Box>
        </Box>
      )}

      {/* Record / Clear */}
      <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end' }}>
        <Button
          size="small"
          variant="contained"
          disabled={!voteDraft?.actor || !voteDraft?.target}
          onClick={() => voteDraft?.nominationResult === 'fail' ? rejectNomination() : recordVote()}
          sx={{ fontSize: '0.75rem' }}
        >
          {language === 'zh' ? '📝 记录' : '📝 Record'}
        </Button>
        <Button size="small" onClick={handleClear} sx={{ fontSize: '0.75rem' }}>
          {language === 'zh' ? '↺ 清空' : '↺ Clear'}
        </Button>
      </Box>
    </Box>
  )
}
