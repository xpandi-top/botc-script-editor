import type { StorytellerContext } from '../useStoryteller'
import type { DayState, StorytellerSeat, VoteDraft } from '../types'
import type { SelectChangeEvent } from '@mui/material'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Alert, Box, Button, Typography, TextField, Select, MenuItem, FormControl, InputLabel, FormControlLabel, Checkbox } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import EditNoteIcon from '@mui/icons-material/EditNote'
import ReplayIcon from '@mui/icons-material/Replay'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import HowToVoteIcon from '@mui/icons-material/HowToVote'
import { createDefaultVoteDraft } from '../constants'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import { NominationTimer } from './NominationTimer'
import { NominationHistory } from './NominationHistory'
import { NominationVoteList } from './NominationVoteList'
import { useT } from '../../../context/I18nContext'
import { ResponsiveDialog } from '../../ui'

export function ArenaCenterNominationSheet({ ctx }: { ctx: StorytellerContext }) {
  const {
    language, text, currentDay, updateCurrentDay, pickerMode, setPickerMode,
    showNominationSheet, setShowNominationSheet, requiredVotes, exileRequiredVotes,
    effectiveRequiredVotes,
    rejectNomination, recordVote, votingYesCount, timerDefaults,
    appendEvent,
    linkedDealSession, remoteDealVote, remoteDealVoteResponses, remoteDealVoteError,
    remoteDealVoteStarting, startRemoteDealVote,
  } = ctx

  const { t } = useT()
  const [historyFilter, setHistoryFilter] = useState<'all' | 'exile' | 'nomination'>('all')
  const [showNominationTimer] = useState(true)
  const [selectedTimer, setSelectedTimer] = useState<'nominator' | 'nominee'>('nominator')
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const updateTimer = (newValue: number) => {
    if (selectedTimer === 'nominator') {
      updateCurrentDay((d: DayState) => ({ ...d, nominationActorSeconds: newValue }))
    } else if (selectedTimer === 'nominee') {
      updateCurrentDay((d: DayState) => ({ ...d, nominationTargetSeconds: newValue }))
    }
  }

  const { isMobile } = useBreakpoint()

  if (!showNominationSheet || currentDay?.phase !== 'nomination') return null

  const seats: StorytellerSeat[] = currentDay.seats
  const voteDraft: VoteDraft = currentDay.voteDraft
  const nominationActorSeconds = currentDay.nominationActorSeconds ?? timerDefaults.nominationActorSeconds
  const nominationTargetSeconds = currentDay.nominationTargetSeconds ?? timerDefaults.nominationTargetSeconds
  const currentSeconds = selectedTimer === 'nominator' ? nominationActorSeconds : nominationTargetSeconds

  const handleActorChange = (e: SelectChangeEvent<number | ''>) => {
    const v = parseInt(String(e.target.value))
    if (!isNaN(v)) {
      updateCurrentDay((d: DayState) => ({ ...d, voteDraft: { ...d.voteDraft, actor: v } }))
      setPickerMode('nominee')
    } else {
      updateCurrentDay((d: DayState) => ({ ...d, voteDraft: { ...d.voteDraft, actor: null } }))
    }
  }

  const handleTargetChange = (e: SelectChangeEvent<number | ''>) => {
    const v = parseInt(String(e.target.value))
    if (!isNaN(v)) {
      const targetSeat = seats.find((s) => s.seat === v)
      const autoExile = targetSeat?.isTraveler ?? false
      updateCurrentDay((d: DayState) => ({
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
      updateCurrentDay((d: DayState) => ({
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
    const voted = currentDay.votingState?.votes?.[seatNum]
    const isChecked = voted === true || voteDraft.voters.includes(seatNum)

    if (currentDay.votingState) {
      updateCurrentDay((d: DayState) => ({
        ...d,
        votingState: d.votingState ? {
          ...d.votingState,
          votes: { ...d.votingState.votes, [seatNum]: !isChecked },
        } : null,
      }))
    } else {
      updateCurrentDay((d: DayState) => ({
        ...d,
        voteDraft: {
          ...d.voteDraft,
          voters: isChecked
            ? d.voteDraft.voters.filter((v) => v !== seatNum)
            : [...d.voteDraft.voters, seatNum],
        },
      }))
    }
  }

  const handleClear = () => {
    updateCurrentDay((d: DayState) => ({
      ...d,
      nominationStep: 'waitingForNomination',
      voteDraft: createDefaultVoteDraft(),
      votingState: null
    }))
    setPickerMode('none')
  }

  const handleManualOverride = (value: 'auto' | 'agree' | 'disagree') => {
    updateCurrentDay((d: DayState) => ({
      ...d,
      voteDraft: {
        ...d.voteDraft,
        manualPassed: value === 'agree' ? true : value === 'disagree' ? false : null
      }
    }))
  }

  const yesCount = Object.values(currentDay.votingState?.votes ?? {}).filter(Boolean).length || voteDraft.voters.length || 0

  const content = (
    <ResponsiveDialog open={showNominationSheet} onClose={() => {}} maxWidth="sm" fullWidth slotProps={{ backdrop: { onClick: () => {} }, paper: { ...({ 'data-nomination-popup': true } as Record<string, unknown>) } }} paperSx={{ p: 2, width: isMobile ? '100%' : 420, overflowY: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('nominate')}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button size="small" onClick={() => { setShowNominationSheet(false); setPickerMode('none') }}>
            {t('jinx_status_inactive')}
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
        />
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>{text.actor}</InputLabel>
          <Select<number | ''> value={voteDraft.actor ?? ''} label={text.actor} onChange={handleActorChange}>
            <MenuItem value="">{t('select')}</MenuItem>
            {seats.map((s) => (
              <MenuItem key={s.seat} value={s.seat}>#{s.seat} {s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {pickerMode === 'nominator' && (
          <Typography variant="caption" color="primary">
            {t('click_a_seat_on_the_table_to_select')}
          </Typography>
        )}

        <FormControl size="small" fullWidth>
          <InputLabel>{text.target}</InputLabel>
          <Select<number | ''> value={voteDraft.target ?? ''} label={text.target} onChange={handleTargetChange}>
            <MenuItem value="">{t('select')}</MenuItem>
            <MenuItem value={0} sx={{ gap: 0.75 }}>
              <AutoStoriesIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
              {t('storyteller')}
            </MenuItem>
            {seats.map((s) => (
              <MenuItem key={s.seat} value={s.seat}>#{s.seat} {s.name}{s.isTraveler ? ` (${t('traveler_2')})` : ''}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {pickerMode === 'nominee' && (
          <Typography variant="caption" color="primary">
            {t('click_a_seat_on_the_table_to_select')}
          </Typography>
        )}

        <FormControlLabel
          control={
            <Checkbox
              checked={voteDraft.isExile}
              onChange={(e) => updateCurrentDay((d: DayState) => ({ ...d, voteDraft: { ...d.voteDraft, isExile: e.target.checked } }))}
            />
          }
          label={
            <Box>
              {t('exile_2')}
              <Typography component="span" variant="caption" color="text.secondary">
                {voteDraft.isExile ? ` (≥${exileRequiredVotes}/${seats.length})` : ` (≥${requiredVotes})`}
              </Typography>
            </Box>
          }
        />

        <FormControl size="small" fullWidth>
          <InputLabel>{t('result')}</InputLabel>
          <Select
            value={voteDraft.nominationResult}
            label={t('result')}
            onChange={(e) => updateCurrentDay((d: DayState) => ({ ...d, voteDraft: { ...d.voteDraft, nominationResult: e.target.value as VoteDraft['nominationResult'] } }))}
          >
            <MenuItem value="succeed"><><CheckIcon sx={{ fontSize: '0.9rem', mr: 0.5 }} /> {t('nomination_succeed')}</></MenuItem>
            <MenuItem value="fail"><><CloseIcon sx={{ fontSize: '0.9rem', mr: 0.5 }} /> {t('nomination_failed')}</></MenuItem>
          </Select>
        </FormControl>

        {currentDay.nominationStep !== 'waitingForNomination' && voteDraft.nominationResult === 'succeed' && (
          <>
            {linkedDealSession && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<HowToVoteIcon fontSize="small" />}
                    disabled={remoteDealVoteStarting || !!remoteDealVote || voteDraft.actor === null || voteDraft.target === null}
                    onClick={startRemoteDealVote}
                  >
                    {language === 'zh' ? '开始玩家投票' : 'Start player vote'}
                  </Button>
                  {remoteDealVote && (
                    <Typography variant="caption" color="text.secondary">
                      {language === 'zh' ? '实时投票中' : 'Live vote active'} · {remoteDealVoteResponses.length}/{remoteDealVote.votingOrder.length}
                    </Typography>
                  )}
                </Box>
                {remoteDealVoteError && <Alert severity="warning">{remoteDealVoteError}</Alert>}
              </Box>
            )}
            <NominationVoteList
              seats={seats}
              voteDraft={voteDraft}
              votingState={currentDay.votingState}
              effectiveRequiredVotes={effectiveRequiredVotes}
              yesCount={yesCount}
              votingYesCount={votingYesCount}
              handleVoteToggle={handleVoteToggle}
              updateCurrentDay={updateCurrentDay}
              appendEvent={appendEvent}
              language={language}
            />
          </>
        )}

        <TextField
          size="small"
          fullWidth
          label={t('revision_note')}
          placeholder={t('optional_note')}
          value={voteDraft.note}
          onChange={(e) => updateCurrentDay((d: DayState) => ({ ...d, voteDraft: { ...d.voteDraft, note: e.target.value } }))}
        />

        {voteDraft.nominationResult === 'succeed' && (
          <FormControl size="small" fullWidth>
            <InputLabel>{t('override')}</InputLabel>
            <Select
              value={voteDraft.manualPassed === true ? 'agree' : voteDraft.manualPassed === false ? 'disagree' : 'auto'}
              label={t('override')}
              onChange={(e) => handleManualOverride(e.target.value as 'auto' | 'agree' | 'disagree')}
            >
              <MenuItem value="auto">{t('auto')}</MenuItem>
              <MenuItem value="agree"><><CheckIcon sx={{ fontSize: '0.9rem', mr: 0.5 }} /> {t('system_override_pass')}</></MenuItem>
              <MenuItem value="disagree"><><CloseIcon sx={{ fontSize: '0.9rem', mr: 0.5 }} /> {t('system_override_fail')}</></MenuItem>
            </Select>
          </FormControl>
        )}

        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <Button
            size="small"
            variant="contained"
            disabled={voteDraft.actor === null || voteDraft.target === null}
            onClick={() => voteDraft.nominationResult === 'fail' ? rejectNomination() : recordVote()}
            startIcon={<EditNoteIcon fontSize="small" />}
          >
            {t('record')}
          </Button>
          <Button size="small" onClick={handleClear} startIcon={<ReplayIcon fontSize="small" />}>
            {t('clear')}
          </Button>
        </Box>
      </Box>

      <NominationHistory
        voteHistory={currentDay.voteHistory}
        historyFilter={historyFilter}
        setHistoryFilter={setHistoryFilter}
        language={language}
        updateCurrentDay={updateCurrentDay}
      />
    </ResponsiveDialog>
  )

  return createPortal(content, document.body)
}
