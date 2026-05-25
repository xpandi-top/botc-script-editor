// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React from 'react'
import { Box, Button, Typography, Paper, FormControlLabel, Checkbox, Chip, Divider } from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { makeT, makeTpl } from '../../../lib/t'

export function ModalsExport({ ctx }: { ctx: StorytellerContext }) {
  const {
    language, days, gameRecords,
    showExportModal, setShowExportModal,
    exportConfig, setExportConfig,
    exportGameJson, exportGameSetup, exportEndGameResults,
  } = ctx

  if (!showExportModal) return null

  const allDayNums = days.map((d: any) => d.day)
  const selectedDays = exportConfig.dayFilter === 'all' ? allDayNums : exportConfig.dayFilter as number[]
  const zh = language === 'zh'
  const t = makeT(language)
  const tpl = makeTpl(language)

  const toggleDay = (day: number) => {
    const cur = exportConfig.dayFilter === 'all' ? allDayNums : exportConfig.dayFilter as number[]
    const next = cur.includes(day) ? cur.filter((d: number) => d !== day) : [...cur, day]
    setExportConfig((c: any) => ({ ...c, dayFilter: next.length === allDayNums.length ? 'all' : next }))
  }

  const handleExportSetup = () => {
    exportGameSetup()
    setShowExportModal(false)
  }

  const handleExportResults = () => {
    exportEndGameResults(gameRecords)
    setShowExportModal(false)
  }

  const handleExportLog = () => {
    exportGameJson(exportConfig)
    setShowExportModal(false)
  }

  const checkOptions = [
    { key: 'includeSeats', label: t('seat_info') },
    { key: 'includeVotes', label: t('vote_history') },
    { key: 'includeSkills', label: t('ability_history') },
    { key: 'includeEvents', label: t('event_log') },
    { key: 'includeStNotes', label: t('st_private_notes') },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">{t('export')}</Typography>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Paper variant="outlined" sx={{ flex: 1, p: 1.5, cursor: 'pointer' }} onClick={handleExportSetup}>
          <Typography variant="h4">🎭</Typography>
          <Typography variant="subtitle2">{t('game_setup')}</Typography>
          <Typography variant="caption" color="text.secondary">{t('charactersseatsteams')}</Typography>
        </Paper>
        <Paper 
          variant="outlined" 
          sx={{ flex: 1, p: 1.5, cursor: gameRecords.length === 0 ? 'default' : 'pointer', opacity: gameRecords.length === 0 ? 0.5 : 1 }}
          onClick={gameRecords.length > 0 ? handleExportResults : undefined}
        >
          <EmojiEventsIcon sx={{ fontSize: '2rem', color: 'warning.main' }} />
          <Typography variant="subtitle2">{t('end_game_results')}</Typography>
          <Typography variant="caption" color="text.secondary">{tpl('n_records', gameRecords.length)}</Typography>
        </Paper>
      </Box>

      <Divider />

      <Typography variant="subtitle2">{t('game_log')}</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {checkOptions.map(({ key, label }) => (
          <FormControlLabel
            key={key}
            control={
              <Checkbox
                checked={exportConfig[key]}
                onChange={(e) => setExportConfig((c: any) => ({ ...c, [key]: e.target.checked }))}
              />
            }
            label={label}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={exportConfig.dayFilter === 'all'}
              onChange={(e) => setExportConfig((c: any) => ({ ...c, dayFilter: e.target.checked ? 'all' : allDayNums }))}
            />
          }
          label={t('all_days')}
        />
        {allDayNums.map((day: number) => (
          <Chip
            key={day}
            label={`Day ${day}`}
            size="small"
            onClick={() => toggleDay(day)}
            color={selectedDays.includes(day) ? 'primary' : 'default'}
            variant={selectedDays.includes(day) ? 'filled' : 'outlined'}
            disabled={exportConfig.dayFilter === 'all'}
          />
        ))}
      </Box>

      <Button variant="contained" onClick={handleExportLog} fullWidth>
        ⬇ {t('download_log_json')}
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={() => setShowExportModal(false)}>
          {t('close')}
        </Button>
      </Box>
    </Box>
  )
}
