// @ts-nocheck
import React from 'react'
import { Box, Button, TextField, Typography, Paper, Select, MenuItem, FormControl, InputLabel, Chip, Grid, IconButton } from '@mui/material'
import { uniqueStrings } from '../constants'
import { BASE_URL } from '../constants'

export function RightPopupSettings({ ctx }: { ctx: any }) {
  const {
    language, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool,
    playerNamePool, setPlayerNamePool, currentDay, updateSeat, resetSeatNames,
    seatTagDrafts, setSeatTagDrafts, addCustomTag, clearUnusedCustomTags,
    loadTagsPreset, setLoadTagsPreset, setActiveRightPopup, text,
  } = ctx

  const defaultTags = language === 'zh'
    ? ['死亡', '处决', '旅人', '无投票权']
    : ['Dead', 'Executed', 'Traveler', 'No vote']

  const handleChange = (key: string, value: string | number) => {
    setTimerDefaults((c: any) => ({ ...c, [key]: value }))
  }

  const timerFields = [
    { key: 'privateSeconds', label: text.privateDefault },
    { key: 'publicFreeSeconds', label: text.publicFreeDefault },
    { key: 'publicRoundRobinSeconds', label: text.publicRoundRobinDefault },
    { key: 'nominationDelayMinutes', label: text.nominationDelayDefault },
    { key: 'nominationWaitSeconds', label: text.nominationWaitDefault },
    { key: 'nominationActorSeconds', label: text.actorSpeechDefault },
    { key: 'nominationTargetSeconds', label: text.targetSpeechDefault },
    { key: 'nominationVoteSeconds', label: text.voteDefault },
  ]

  return (
    <Paper sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{text.settings}</Typography>
        <IconButton size="small" onClick={() => setActiveRightPopup(null)}>✕</IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{language === 'zh' ? '倒计时设置' : 'Countdown Settings'}</Typography>
          <Grid container spacing={1}>
            {timerFields.map((f) => (
              <Grid key={f.key} size={{ xs: 6 }}>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  label={f.label}
                  value={timerDefaults?.[f.key] ?? 0}
                  onChange={(e) => handleChange(f.key, Number(e.target.value) || 0)}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{text.alarmSound}</Typography>
          <FormControl size="small" fullWidth sx={{ mb: 1 }}>
            <InputLabel>{language === 'zh' ? '闹钟声音' : 'Alarm Sound'}</InputLabel>
            <Select
              value={timerDefaults?.alarmSound ?? ''}
              label={language === 'zh' ? '闹钟声音' : 'Alarm Sound'}
              onChange={(e) => handleChange('alarmSound', e.target.value)}
            >
              <MenuItem value="">Default Beep</MenuItem>
              <MenuItem value={`${BASE_URL}audio/alarm/Alarm Clock Sound 6402.mp3`}>Alarm Clock</MenuItem>
              <MenuItem value={`${BASE_URL}audio/alarm/Clock Tower Alarm Sound.mp3`}>Clock Tower</MenuItem>
              <MenuItem value={`${BASE_URL}audio/alarm/Vintage Clock Sound Effect.mp3`}>Vintage Clock</MenuItem>
              <MenuItem value={`${BASE_URL}audio/alarm/Old Spring Alarm Clock Sound Effect.mp3`}>Spring Clock</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" component="label" size="small" fullWidth>
            {language === 'zh' ? '上传自定义音效' : 'Upload Custom Sound'}
            <input type="file" accept=".mp3,.wav,.ogg" hidden onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const url = URL.createObjectURL(file)
                setTimerDefaults((c: any) => ({ ...c, alarmSound: url }))
              }
            }} />
          </Button>
        </Paper>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{text.tagSettings}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{text.defaultTags}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {defaultTags.map((tag) => (
              <Chip key={`default-${tag}`} label={tag} size="small" />
            ))}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{text.loadPredefinedTags}</Typography>
          <TextField
            size="small"
            fullWidth
            multiline
            rows={2}
            placeholder={language === 'zh' ? '逗号分隔标签...' : 'Comma-separated tags...'}
            value={loadTagsPreset ?? ''}
            onChange={(e) => setLoadTagsPreset(e.target.value)}
          />
          <Button size="small" onClick={() => {
            const tags = loadTagsPreset?.split(',').map((t: string) => t.trim()).filter(Boolean) ?? []
            setCustomTagPool((cur: string[]) => uniqueStrings([...cur, ...tags]))
            setLoadTagsPreset('')
          }} sx={{ mt: 0.5 }}>{text.loadPreset}</Button>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{text.tagPool}</Typography>
            <Button size="small" onClick={clearUnusedCustomTags}>{text.clearUnusedTags}</Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(customTagPool ?? []).map((tag: string) => (
              <Chip
                key={`tagpool-${tag}`}
                label={tag}
                size="small"
                onDelete={() => setCustomTagPool((cur: string[]) => cur.filter((t) => t !== tag))}
              />
            ))}
          </Box>
        </Paper>
      </Box>
    </Paper>
  )
}