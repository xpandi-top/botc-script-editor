// @ts-nocheck
import React from 'react'
import { Box, Button, Typography, Paper, FormControlLabel, Checkbox, Chip, Divider } from '@mui/material'

export function ModalsExport({ ctx }: { ctx: any }) {
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
    { key: 'includeSeats', label: zh ? '座位信息' : 'Seat info' },
    { key: 'includeVotes', label: zh ? '投票记录' : 'Vote history' },
    { key: 'includeSkills', label: zh ? '技能记录' : 'Skill history' },
    { key: 'includeEvents', label: zh ? '事件日志' : 'Event log' },
    { key: 'includeStNotes', label: zh ? 'ST 私密备注' : 'ST private notes' },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">{zh ? '导出' : 'Export'}</Typography>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Paper variant="outlined" sx={{ flex: 1, p: 1.5, cursor: 'pointer' }} onClick={handleExportSetup}>
          <Typography variant="h4">🎭</Typography>
          <Typography variant="subtitle2">{zh ? '游戏设置' : 'Game Setup'}</Typography>
          <Typography variant="caption" color="text.secondary">{zh ? '角色·座位·阵营' : 'Characters·Seats·Teams'}</Typography>
        </Paper>
        <Paper 
          variant="outlined" 
          sx={{ flex: 1, p: 1.5, cursor: gameRecords.length === 0 ? 'default' : 'pointer', opacity: gameRecords.length === 0 ? 0.5 : 1 }}
          onClick={gameRecords.length > 0 ? handleExportResults : undefined}
        >
          <Typography variant="h4">🏆</Typography>
          <Typography variant="subtitle2">{zh ? '对局结果' : 'End Game Results'}</Typography>
          <Typography variant="caption" color="text.secondary">{zh ? `${gameRecords.length} 条记录` : `${gameRecords.length} record${gameRecords.length !== 1 ? 's' : ''}`}</Typography>
        </Paper>
      </Box>

      <Divider />

      <Typography variant="subtitle2">{zh ? '详细日志' : 'Game Log'}</Typography>

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
          label={zh ? '所有回合' : 'All days'}
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
        ⬇ {zh ? '下载日志 JSON' : 'Download Log JSON'}
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={() => setShowExportModal(false)}>
          {zh ? '关闭' : 'Close'}
        </Button>
      </Box>
    </Box>
  )
}