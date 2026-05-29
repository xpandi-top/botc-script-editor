import type { StorytellerContext } from '../useStoryteller'
import type { TimerDefaults } from '../types'
import { Box, Button, TextField, Typography, Paper, Select, MenuItem, FormControl, InputLabel, Chip, Grid, IconButton, Switch, FormControlLabel } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { uniqueStrings, DEFAULT_ALARM_SOUNDS, INITIAL_AUDIO_TRACKS } from '../constants'
import { useT } from '../../../context/I18nContext'

type TimerDefaultNumberKey = Extract<{
  [K in keyof TimerDefaults]: TimerDefaults[K] extends number ? K : never
}[keyof TimerDefaults], string>

type TimerField = {
  key: TimerDefaultNumberKey
  label: string
}

export function RightPopupSettings({ ctx }: { ctx: StorytellerContext }) {
  const { t } = useT()
  const {
    language, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool,
    clearUnusedCustomTags,
    loadTagsPreset, setLoadTagsPreset, setActiveRightPopup, text,
    audioTracks, setAudioTracks, setSelectedAudioSrc, setAudioPlaying,
  } = ctx

  const defaultTags = language === 'zh'
    ? ['死亡', '处决', '旅行者', '无投票权']
    : ['Dead', 'Executed', 'Traveler', 'No vote']

  const handleChange = <K extends keyof TimerDefaults>(key: K, value: TimerDefaults[K]) => {
    setTimerDefaults((current) => ({ ...current, [key]: value }))
  }

  const timerFields: TimerField[] = [
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
        <IconButton size="small" onClick={() => setActiveRightPopup(null)}><CloseIcon fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('countdown_settings')}</Typography>
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
            <InputLabel>{t('alarm_sound')}</InputLabel>
            <Select
              value={timerDefaults?.alarmSound ?? ''}
              label={t('alarm_sound')}
              onChange={(e) => handleChange('alarmSound', e.target.value)}
            >
              <MenuItem value="">Default Beep</MenuItem>
              {DEFAULT_ALARM_SOUNDS.map((track) => (
                <MenuItem key={track.src} value={track.src}>{track.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" component="label" size="small" fullWidth>
            {t('upload_custom_sound')}
            <input type="file" accept=".mp3,.wav,.ogg" hidden onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const url = URL.createObjectURL(file)
                handleChange('alarmSound', url)
              }
            }} />
          </Button>
        </Paper>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('default_bgm')}</Typography>
          <FormControl size="small" fullWidth sx={{ mb: 1 }}>
            <InputLabel>{t('default_track')}</InputLabel>
            <Select
              value={timerDefaults?.defaultBgmSrc ?? ''}
              label={t('default_track')}
              onChange={(e) => {
                handleChange('defaultBgmSrc', e.target.value)
                setSelectedAudioSrc(e.target.value)
              }}
            >
              {(audioTracks ?? INITIAL_AUDIO_TRACKS).map((track) => (
                <MenuItem key={track.src} value={track.src}>{track.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" component="label" size="small" fullWidth sx={{ mb: 1 }}>
            {t('upload_local_bgm')}
            <input type="file" accept=".mp3,.wav,.ogg" hidden onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const url = URL.createObjectURL(file)
                setAudioTracks((cur) => {
                  if (cur.some((track) => track.src === url)) return cur
                  return [...cur, { name: file.name, src: url }]
                })
                handleChange('defaultBgmSrc', url)
                setSelectedAudioSrc(url)
                setAudioPlaying(true)
              }
            }} />
          </Button>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={timerDefaults?.phaseSwitchSoundEnabled !== false}
                onChange={(e) => handleChange('phaseSwitchSoundEnabled', e.target.checked)}
              />
            }
            label={<Typography variant="body2">{t('phase_switch_sound')}</Typography>}
          />
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
            placeholder={t('commaseparated_tags')}
            value={loadTagsPreset ?? ''}
            onChange={(e) => setLoadTagsPreset(e.target.value)}
          />
          <Button size="small" onClick={() => {
            const tags = loadTagsPreset?.split(',').map((t: string) => t.trim()).filter(Boolean) ?? []
            setCustomTagPool((cur) => uniqueStrings([...cur, ...tags]))
            setLoadTagsPreset('')
          }} sx={{ mt: 0.5 }}>{text.loadPreset}</Button>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{text.tagPool}</Typography>
            <Button size="small" onClick={clearUnusedCustomTags}>{text.clearUnusedTags}</Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(customTagPool ?? []).map((tag) => (
              <Chip
                key={`tagpool-${tag}`}
                label={tag}
                size="small"
                onDelete={() => setCustomTagPool((cur) => cur.filter((t) => t !== tag))}
              />
            ))}
          </Box>
        </Paper>
      </Box>
    </Paper>
  )
}
