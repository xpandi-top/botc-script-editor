// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Chip, Typography, FormControlLabel, Radio, RadioGroup, IconButton, Paper } from '@mui/material'
import { StarRating } from '../../ui/StarRating'

export function ModalsEndGame({ ctx }: { ctx: any }) {
  const { 
    text, endGameResult, setEndGameResult, confirmEndGame, unmarkGameEnded, 
    saveGame, currentDay, language, setDays, currentRecordName, showEndGameModal, setShowEndGameModal,
    activeScriptTitle, gameRecords,
  } = ctx
  
  const playerCount = currentDay.seats.filter((s: any) => !s.isTraveler).length
  const today = new Date().toISOString().split('T')[0]
  const defaultName = activeScriptTitle ? `${activeScriptTitle.replace(/\s+/g, '_')}_${playerCount}p_${today}` : `Game_${today}`

  const [recordName, setRecordName] = useState(currentRecordName || defaultName)
  const [markOption, setMarkOption] = useState(currentDay.gameEnded ? 'markDone' : 'unmark')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => { setRecordName(currentRecordName || defaultName) }, [currentRecordName, defaultName])
  useEffect(() => { if (showEndGameModal) setIsVisible(true) }, [showEndGameModal])

  const egr = endGameResult
  if (!isVisible || !egr) return null

  const togglePlayerTeam = (seat: number, team: 'evil' | 'good') => {
    setEndGameResult((c: any) => {
      if (!c) return c
      const next = c.playerTeams[seat] === team ? null : team
      return { ...c, playerTeams: { ...c.playerTeams, [seat]: next } }
    })
  }

  const handleSave = () => {
    const existing = gameRecords?.find((r: any) => r.recordName === recordName)
    const surveyData = {
      winner: egr.winner,
      mvp: egr.mvp,
      balanced: egr.balanced,
      funEvil: egr.funEvil,
      funGood: egr.funGood,
      replay: egr.replay,
      otherNote: egr.otherNote,
      playerTeams: egr.playerTeams,
    }
    if (existing) {
      saveGame(recordName, existing.id, surveyData)
    } else {
      confirmEndGame(recordName, surveyData)
    }
    setIsVisible(false)
    setShowEndGameModal(false)
  }

  const handleCancel = () => {
    setIsVisible(false)
    setShowEndGameModal(false)
    setTimeout(() => setEndGameResult(null), 100)
  }

  const handleMarkChange = (e: any) => {
    setMarkOption(e.target.value)
    if (e.target.value === 'unmark') {
      unmarkGameEnded()
    } else if (e.target.value === 'markDone') {
      setDays((d: any) => d.map((day: any) => day.id === currentDay.id ? { ...day, gameEnded: true } : day))
    }
  }

  const regularSeats = currentDay?.seats?.filter((s: any) => !s.isTraveler) ?? []

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">{language === 'zh' ? '结算与调查' : 'Game End & Survey'}</Typography>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{language === 'zh' ? '获胜方' : 'Winner'}</Typography>
        <RadioGroup row value={egr.winner || ''} onChange={(e) => setEndGameResult((c: any) => c ? { ...c, winner: e.target.value || null } : c)}>
          <FormControlLabel value="good" control={<Radio />} label={text.good || 'Good'} />
          <FormControlLabel value="evil" control={<Radio />} label={text.evil || 'Evil'} />
          <FormControlLabel value="storyteller" control={<Radio />} label={language === 'zh' ? '说书人' : 'ST'} />
        </RadioGroup>
      </Box>

      <FormControl size="small" fullWidth>
        <InputLabel>{language === 'zh' ? 'MVP' : 'MVP'}</InputLabel>
        <Select value={egr.mvp ?? ''} onChange={(e) => setEndGameResult((c: any) => c ? { ...c, mvp: e.target.value || null } : c)} label={language === 'zh' ? 'MVP' : 'MVP'}>
          <MenuItem value="">{language === 'zh' ? '选择玩家' : 'Select player'}</MenuItem>
          {regularSeats.map((s: any) => (
            <MenuItem key={s.seat} value={s.seat}>{s.seat}. {s.name || `Player ${s.seat}`}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <StarRating label={language === 'zh' ? '平衡性' : 'Is it balanced'} value={egr.balanced} onChange={(n) => setEndGameResult((c: any) => c ? { ...c, balanced: n } : c)} />
      <StarRating label={language === 'zh' ? 'evil方乐趣' : 'Fun for evil'} value={egr.funEvil} onChange={(n) => setEndGameResult((c: any) => c ? { ...c, funEvil: n } : c)} />
      <StarRating label={language === 'zh' ? '正义方乐趣' : 'Fun for good'} value={egr.funGood} onChange={(n) => setEndGameResult((c: any) => c ? { ...c, funGood: n } : c)} />
      <StarRating label={language === 'zh' ? '重玩愿望' : 'Replay this script'} value={egr.replay} onChange={(n) => setEndGameResult((c: any) => c ? { ...c, replay: n } : c)} />

      <TextField
        size="small"
        multiline
        rows={2}
        fullWidth
        label={language === 'zh' ? '其他备注' : 'Other notes'}
        value={egr.otherNote || ''}
        onChange={(e) => setEndGameResult((c: any) => c ? { ...c, otherNote: e.target.value } : c)}
      />

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{language === 'zh' ? '阵营' : 'Teams'}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {regularSeats.map((s: any) => {
            const team = egr.playerTeams?.[s.seat]
            return (
              <Chip
                key={s.seat}
                label={`${s.seat}. ${s.name || `P${s.seat}`} ${team === 'evil' ? '🔴' : team === 'good' ? '🔵' : '⚪'}`}
                clickable
                color={team === 'evil' ? 'error' : team === 'good' ? 'primary' : 'default'}
                variant={team ? 'filled' : 'outlined'}
                onClick={() => togglePlayerTeam(s.seat, team === 'evil' ? 'good' : 'evil')}
              />
            )
          })}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          fullWidth
          label={language === 'zh' ? '文件名' : 'File name'}
          value={recordName}
          onChange={(e) => setRecordName(e.target.value)}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{language === 'zh' ? '状态' : 'Status'}</InputLabel>
          <Select value={markOption} onChange={handleMarkChange} label={language === 'zh' ? '状态' : 'Status'}>
            <MenuItem value="unmark">{language === 'zh' ? '未结束' : 'Not Finished'}</MenuItem>
            <MenuItem value="markDone">{language === 'zh' ? '已结束' : 'Finished'}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button variant="outlined" onClick={handleCancel}>{language === 'zh' ? '取消' : 'Cancel'}</Button>
        <Button variant="contained" onClick={handleSave}>💾 {language === 'zh' ? '保存' : 'Save'}</Button>
      </Box>
    </Box>
  )
}