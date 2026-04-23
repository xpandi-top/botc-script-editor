// @ts-nocheck
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Box, Button, Typography, TextField, Select, MenuItem, FormControl, InputLabel, FormControlLabel, Checkbox, Dialog } from '@mui/material'
import { createDefaultVoteDraft } from '../constants'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import { NominationTimer } from './NominationTimer'
import { NominationHistory } from './NominationHistory'
import { NominationVoteList } from './NominationVoteList'

export function ArenaCenterNominationSheet({ ctx }: { ctx: any }) {
  const {
    language, text, currentDay, updateCurrentDay, pickerMode, setPickerMode,
    showNominationSheet, setShowNominationSheet, requiredVotes, exileRequiredVotes,
    effectiveRequiredVotes, draftPassedBySystem, draftPassed, isVotingComplete,
    rejectNomination, recordVote, setDialogState, votingYesCount, timerDefaults,
  } = ctx

  const [historyFilter, setHistoryFilter] = useState<'all' | 'exile' | 'nomination'>('all')
  const [showNominationTimer, setShowNominationTimer] = useState(true)
  const [selectedTimer, setSelectedTimer] = useState<'nominator' | 'nominee'>('nominator')
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const seats = currentDay?.seats ?? []
  const voteDraft = currentDay?.voteDraft ?? {}
  const nominationActorSeconds = currentDay?.nominationActorSeconds ?? timerDefaults?.nominationActorSeconds ?? 60
  const nominationTargetSeconds = currentDay?.nominationTargetSeconds ?? timerDefaults?.nominationTargetSeconds ?? 60

  const currentSeconds = selectedTimer === 'nominator' ? nominationActorSeconds : nominationTargetSeconds

  const updateTimer = (newValue: number) => {
    if (selectedTimer === 'nominator') {
      updateCurrentDay((d: any) => ({ ...d, nominationActorSeconds: newValue }))
    } else if (selectedTimer === 'nominee') {
      updateCurrentDay((d: any) => ({ ...d, nominationTargetSeconds: newValue }))
    }
  }

  const { isMobile } = useBreakpoint()

  if (!showNominationSheet || currentDay?.phase !== 'nomination') return null

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
      const autoExile = targetSeat?.isTraveler ?? false
      updateCurrentDay((d: any) => ({
        ...d,
        nominationStep: 'nominationDecision',
        voteDraft: {
          ...d.voteDraft,
          target: v,
          voters: [],
          isExile: autoExile
        }
      }))
    } else {
      updateCurrentDay((d: any) => ({
        ...d,
        voteDraft: {
          ...d.voteDraft,
          target: null,
          isExile: false
        }
      }))
    }
  }

  const handleVoteToggle = (seatNum: number) => {
    const voted = currentDay?.votingState?.votes?.[seatNum]
    const isChecked = voted === true || voteDraft?.voters?.includes(seatNum)

    if (currentDay?.votingState) {
      updateCurrentDay((d: any) => ({
        ...d,
        votingState: d.votingState ? {
          ...d.votingState,
          votes: { ...d.votingState.votes, [seatNum]: !isChecked },
        } : null,
      }))
    } else {
      updateCurrentDay((d: any) => ({
        ...d,
        voteDraft: {
          ...d.voteDraft,
          voters: isChecked
            ? d.voteDraft.voters.filter((v: number) => v !== seatNum)
            : [...d.voteDraft.voters, seatNum],
        },
      }))
    }
  }

  const handleClear = () => {
    updateCurrentDay((d: any) => ({
      ...d,
      nominationStep: 'waitingForNomination',
      voteDraft: createDefaultVoteDraft(),
      votingState: null
    }))
    setPickerMode('none')
  }

  const handleManualOverride = (value: string) => {
    updateCurrentDay((d: any) => ({
      ...d,
      voteDraft: {
        ...d.voteDraft,
        manualPassed: value === 'agree' ? true : value === 'disagree' ? false : null
      }
    }))
  }

  const yesCount = Object.values(currentDay?.votingState?.votes ?? {}).filter(Boolean).length || voteDraft?.voters?.length || 0

  const content = (
    <Dialog open={showNominationSheet} onClose={() => {}} disableEscapeKeyDown maxWidth="sm" fullWidth fullScreen={isMobile} slotProps={{ backdrop: { onClick: () => {} }, paper: { 'data-nomination-popup': true, sx: { p: 2, width: isMobile ? '100%' : 420, borderRadius: isMobile ? 0 : 2, overflowY: 'auto' } } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{language === 'zh' ? '提名' : 'Nominate'}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button size="small" onClick={() => { setShowNominationSheet(false); setPickerMode('none') }}>
            {language === 'zh' ? '隐藏' : 'Hide'}
          </Button>
        </Box>
      </Box>

      {showNominationTimer && (
        <NominationTimer
          selectedTimer={selectedTimer}
          setSelectedTimer={setSelectedTimer}
          currentSeconds={currentSeconds}
          updateTimer={updateTimer}
          isTimerRunning={isTimerRunning}
          setIsTimerRunning={setIsTimerRunning}
          timerDefaults={timerDefaults}
          language={language}
        />
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>{text.actor}</InputLabel>
          <Select value={voteDraft?.actor ?? ''} label={text.actor} onChange={handleActorChange}>
            <MenuItem value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</MenuItem>
            {seats.map((s: any) => (
              <MenuItem key={s.seat} value={s.seat}>#{s.seat} {s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {pickerMode === 'nominator' && (
          <Typography variant="caption" color="primary">
            {language === 'zh' ? '← 点击圆桌上的座位进行选择' : '← Click a seat on the table to select'}
          </Typography>
        )}

        <FormControl size="small" fullWidth>
          <InputLabel>{text.target}</InputLabel>
          <Select value={voteDraft?.target ?? ''} label={text.target} onChange={handleTargetChange}>
            <MenuItem value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</MenuItem>
            {seats.map((s: any) => (
              <MenuItem key={s.seat} value={s.seat}>#{s.seat} {s.name}{s.isTraveler ? ` (${language === 'zh' ? '旅人' : 'Traveler'})` : ''}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {pickerMode === 'nominee' && (
          <Typography variant="caption" color="primary">
            {language === 'zh' ? '← 点击圆桌上的座位进行选择' : '← Click a seat on the table to select'}
          </Typography>
        )}

        <FormControlLabel
          control={
            <Checkbox
              checked={voteDraft?.isExile ?? false}
              onChange={(e) => updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, isExile: e.target.checked } }))}
            />
          }
          label={
            <Box>
              {language === 'zh' ? '放逐模式' : 'Exile'}
              <Typography component="span" variant="caption" color="text.secondary">
                {voteDraft?.isExile ? ` (≥${exileRequiredVotes}/${seats.length})` : ` (≥${requiredVotes})`}
              </Typography>
            </Box>
          }
        />

        <FormControl size="small" fullWidth>
          <InputLabel>{language === 'zh' ? '结果' : 'Result'}</InputLabel>
          <Select
            value={voteDraft?.nominationResult ?? ''}
            label={language === 'zh' ? '结果' : 'Result'}
            onChange={(e) => updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, nominationResult: e.target.value } }))}
          >
            <MenuItem value="succeed">{language === 'zh' ? '✓ 提名成功' : '✓ Succeed'}</MenuItem>
            <MenuItem value="fail">{language === 'zh' ? '✗ 提名失败' : '✗ Failed'}</MenuItem>
          </Select>
        </FormControl>

        {currentDay?.nominationStep !== 'waitingForNomination' && voteDraft?.nominationResult === 'succeed' && (
          <NominationVoteList
            seats={seats}
            voteDraft={voteDraft}
            votingState={currentDay?.votingState}
            effectiveRequiredVotes={effectiveRequiredVotes}
            yesCount={yesCount}
            votingYesCount={votingYesCount}
            handleVoteToggle={handleVoteToggle}
            updateCurrentDay={updateCurrentDay}
            language={language}
          />
        )}

        <TextField
          size="small"
          fullWidth
          label={language === 'zh' ? '备注' : 'Note'}
          placeholder={language === 'zh' ? '可选备注…' : 'Optional note…'}
          value={voteDraft?.note ?? ''}
          onChange={(e) => updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, note: e.target.value } }))}
        />

        {voteDraft?.nominationResult === 'succeed' && (
          <FormControl size="small" fullWidth>
            <InputLabel>{language === 'zh' ? '覆盖' : 'Override'}</InputLabel>
            <Select
              value={voteDraft?.manualPassed === true ? 'agree' : voteDraft?.manualPassed === false ? 'disagree' : 'auto'}
              label={language === 'zh' ? '覆盖' : 'Override'}
              onChange={(e) => handleManualOverride(e.target.value)}
            >
              <MenuItem value="auto">{language === 'zh' ? '自动判定' : 'Auto'}</MenuItem>
              <MenuItem value="agree">{language === 'zh' ? '✓ 强制通过' : '✓ Override Pass'}</MenuItem>
              <MenuItem value="disagree">{language === 'zh' ? '✗ 强制失败' : '✗ Override Fail'}</MenuItem>
            </Select>
          </FormControl>
        )}

        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <Button
            size="small"
            variant="contained"
            disabled={!voteDraft?.actor || !voteDraft?.target}
            onClick={() => voteDraft?.nominationResult === 'fail' ? rejectNomination() : recordVote()}
          >
            {language === 'zh' ? '📝 记录' : '📝 Record'}
          </Button>
          <Button size="small" onClick={handleClear}>
            {language === 'zh' ? '↺ 清空' : '↺ Clear'}
          </Button>
        </Box>
      </Box>

      <NominationHistory
        voteHistory={currentDay?.voteHistory ?? []}
        historyFilter={historyFilter}
        setHistoryFilter={setHistoryFilter}
        language={language}
      />
    </Dialog>
  )

  return createPortal(content, document.body)
}