// @ts-nocheck
import React from 'react'
import { Box, Button, Typography, TextField, Paper, Select, MenuItem, FormControl, InputLabel, FormControlLabel, Checkbox, Grid, IconButton, Chip } from '@mui/material'
import { createDefaultVoteDraft } from '../constants'

export function ArenaCenterNominationSheet({ ctx }: { ctx: any }) {
  const { 
    language, text, currentDay, updateCurrentDay, pickerMode, setPickerMode, 
    showNominationSheet, setShowNominationSheet, requiredVotes, exileRequiredVotes, 
    effectiveRequiredVotes, draftPassedBySystem, draftPassed, isVotingComplete, 
    rejectNomination, recordVote, setDialogState, votingYesCount,
  } = ctx

  const seats = currentDay?.seats ?? []
  const voteDraft = currentDay?.voteDraft ?? {}

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

  const yesCount = Object.values(currentDay?.votingState?.votes ?? {}).filter(Boolean).length || voteDraft?.voters?.length || 0

  return (
    <Paper elevation={8} sx={{ p: 2, width: 360, borderRadius: 2 }} onClick={(e) => e.stopPropagation()}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{language === 'zh' ? '提名' : 'Nominate'}</Typography>
        <Button size="small" onClick={() => { setShowNominationSheet(false); setPickerMode('none') }}>
          {language === 'zh' ? '隐藏' : 'Hide'}
        </Button>
      </Box>

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
          <Box>
            <Typography variant="caption" color="text.secondary">
              {language === 'zh' ? '投票' : 'Votes'} ({language === 'zh' ? '手动覆盖' : 'override'})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {seats.map((s: any) => {
                const voted = currentDay?.votingState?.votes?.[s.seat]
                const isChecked = voted === true || voteDraft?.voters?.includes(s.seat)
                return (
                  <Chip
                    key={s.seat}
                    label={`#${s.seat}`}
                    size="small"
                    variant={isChecked ? 'filled' : 'outlined'}
                    color={isChecked ? 'success' : 'default'}
                    onClick={() => handleVoteToggle(s.seat)}
                  />
                )
              })}
            </Box>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {language === 'zh' ? '同意' : 'Yes'}: <strong>{yesCount}</strong> / {effectiveRequiredVotes}
              {voteDraft?.isExile && <Chip size="small" label={language === 'zh' ? '放逐' : 'Exile'} sx={{ ml: 0.5 }} />}
            </Typography>
          </Box>
        )}

        <TextField
          size="small"
          fullWidth
          label={language === 'zh' ? '备注' : 'Note'}
          placeholder={language === 'zh' ? '可选备注…' : 'Optional note…'}
          value={voteDraft?.note ?? ''}
          onChange={(e) => updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, note: e.target.value } }))}
        />

        {currentDay?.nominationStep !== 'waitingForNomination' && voteDraft?.nominationResult === 'succeed' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption">{language === 'zh' ? '票数' : 'Count'}</Typography>
            <IconButton size="small" onClick={() => {
              const cur = voteDraft?.voteCountOverride ?? votingYesCount
              updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, voteCountOverride: Math.max(0, cur - 1) } }))
            }}>−</IconButton>
            <Typography variant="body2">
              {votingYesCount}<small> / {effectiveRequiredVotes}</small>
            </Typography>
            <IconButton size="small" onClick={() => {
              const cur = voteDraft?.voteCountOverride ?? votingYesCount
              updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, voteCountOverride: cur + 1 } }))
            }}>+</IconButton>
            {voteDraft?.voteCountOverride !== null && (
              <Button size="small" onClick={() => updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, voteCountOverride: null } }))}>
                ↺
              </Button>
            )}
          </Box>
        )}

        {voteDraft?.nominationResult === 'succeed' && (
          <FormControl size="small" fullWidth>
            <InputLabel>{language === 'zh' ? '覆盖' : 'Override'}</InputLabel>
            <Select
              value={voteDraft?.manualPassed === true ? 'agree' : voteDraft?.manualPassed === false ? 'disagree' : 'auto'}
              label={language === 'zh' ? '覆盖' : 'Override'}
              onChange={(e) => {
                const v = e.target.value
                updateCurrentDay((d: any) => ({ 
                  ...d, 
                  voteDraft: { 
                    ...d.voteDraft, 
                    manualPassed: v === 'agree' ? true : v === 'disagree' ? false : null 
                  } 
                }))
              }}
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

      <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          {language === 'zh' ? '今日提名记录' : "Today's Nominations"}
        </Typography>
        {(currentDay?.voteHistory ?? []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">{language === 'zh' ? '暂无记录' : 'None yet'}</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
            {(currentDay?.voteHistory ?? []).map((record: any) => (
              <Box key={record.id} sx={{ 
                p: 0.5, 
                borderRadius: 1, 
                bgcolor: record.failed ? 'error.light' : 'success.light',
              }}>
                <Typography variant="body2">
                  #{record.actor} → #{record.target}
                </Typography>
                <Typography variant="caption">
                  {record.failed 
                    ? (language === 'zh' ? '提名失败' : 'Nom. Failed')
                    : `${language === 'zh' ? '票' : 'vote'}(${record.voteCount}/${record.requiredVotes})${record.note ? ` · ${record.note}` : ''}`
                  }
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  )
}