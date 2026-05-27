// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React, { useState, useEffect } from 'react'
import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Chip, Typography, FormControlLabel, Radio, RadioGroup, IconButton, Paper, Collapse } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'
import PersonIcon from '@mui/icons-material/Person'
import { StarRating } from '../../ui/StarRating'
import { useT } from '../../../context/I18nContext'

export function ModalsEndGame({ ctx }: { ctx: StorytellerContext }) {
  const {
    text, endGameResult, setEndGameResult, confirmEndGame, unmarkGameEnded,
    saveGame, currentDay, language, setDays, currentRecordName, showEndGameModal, setShowEndGameModal,
    activeScriptTitle, gameRecords,
    pendingNewGameAfterSave, setPendingNewGameAfterSave, doOpenNewGamePanel,
  } = ctx
  
  const playerCount = currentDay.seats.filter((s: any) => !s.isTraveler).length
  const today = new Date().toISOString().split('T')[0]
  const defaultName = activeScriptTitle ? `${activeScriptTitle.replace(/\s+/g, '_')}_${playerCount}p_${today}` : `Game_${today}`

  const { t } = useT()
  const [recordName, setRecordName] = useState(currentRecordName || defaultName)
  const [markOption, setMarkOption] = useState(currentDay.gameEnded ? 'markDone' : 'unmark')
  const [isVisible, setIsVisible] = useState(false)
  const [teamsExpanded, setTeamsExpanded] = useState(false)

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
    // If triggered from "Save & New" flow, open the new game panel after save
    if (pendingNewGameAfterSave) {
      setPendingNewGameAfterSave?.(false)
      doOpenNewGamePanel?.()
    }
  }

  const handleCancel = () => {
    setIsVisible(false)
    setShowEndGameModal(false)
    if (pendingNewGameAfterSave) setPendingNewGameAfterSave?.(false)
    // Only clear endGameResult if no record has been saved yet for this game.
    // Clearing it when currentRecordName exists would destroy persisted survey data.
    if (!currentRecordName) setTimeout(() => setEndGameResult(null), 100)
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
      <Typography variant="h6">{t('game_end_survey')}</Typography>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('winner')}</Typography>
        <RadioGroup row value={egr.winner || ''} onChange={(e) => setEndGameResult((c: any) => c ? { ...c, winner: e.target.value || null } : c)}>
          <FormControlLabel value="good" control={<Radio />} label={text.good || 'Good'} />
          <FormControlLabel value="evil" control={<Radio />} label={text.evil || 'Evil'} />
          <FormControlLabel value="storyteller" control={<Radio />} label={t('st')} />
        </RadioGroup>
      </Box>

      <FormControl size="small" fullWidth>
        <InputLabel>{t('mvp')}</InputLabel>
        <Select value={egr.mvp ?? ''} onChange={(e) => setEndGameResult((c: any) => c ? { ...c, mvp: e.target.value || null } : c)} label={t('mvp')}>
          <MenuItem value="">{t('select_player')}</MenuItem>
          <MenuItem value="storyteller" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <PersonIcon sx={{ fontSize: '0.9rem', color: 'purple' }} />
            <Box component="span" sx={{ fontStyle: 'italic' }}>{t('storyteller')}</Box>
          </MenuItem>
          {regularSeats.map((s: any) => (
            <MenuItem key={s.seat} value={s.seat}>{s.seat}. {s.name || `Player ${s.seat}`}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <StarRating label={t('is_it_balanced')} value={egr.balanced} onChange={(n) => setEndGameResult((c: any) => c ? { ...c, balanced: n } : c)} />
      <StarRating label={t('fun_for_evil')} value={egr.funEvil} onChange={(n) => setEndGameResult((c: any) => c ? { ...c, funEvil: n } : c)} />
      <StarRating label={t('fun_for_good')} value={egr.funGood} onChange={(n) => setEndGameResult((c: any) => c ? { ...c, funGood: n } : c)} />
      <StarRating label={t('replay_this_script')} value={egr.replay} onChange={(n) => setEndGameResult((c: any) => c ? { ...c, replay: n } : c)} />

      <TextField
        size="small"
        multiline
        rows={2}
        fullWidth
        label={t('other_notes')}
        value={egr.otherNote || ''}
        onChange={(e) => setEndGameResult((c: any) => c ? { ...c, otherNote: e.target.value } : c)}
      />

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => setTeamsExpanded((v) => !v)}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>{t('teams')}</Typography>
          <IconButton size="small" tabIndex={-1}>
            {teamsExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>
        <Collapse in={teamsExpanded}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
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
        </Collapse>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
        <TextField
          size="small"
          fullWidth
          label={t('file_name')}
          value={recordName}
          onChange={(e) => setRecordName(e.target.value)}
        />
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 } }}>
          <InputLabel>{t('jinx_status')}</InputLabel>
          <Select value={markOption} onChange={handleMarkChange} label={t('jinx_status')}>
            <MenuItem value="unmark">{t('not_finished')}</MenuItem>
            <MenuItem value="markDone">{t('finished')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider', flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<CloseIcon />} onClick={handleCancel}>{t('cancel')}</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>{t('save')}</Button>
      </Box>
    </Box>
  )
}
