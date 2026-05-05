import { Box, Paper, Typography, Divider } from '@mui/material'
import type { FontOption, FontSettings } from '../../hooks/useFontSettings'
import type { Language } from '../../types'

// ── FontPicker ────────────────────────────────────────────────────────────────
function FontPicker({
  label, labelZh, options, selectedId, onSelect, language,
}: {
  label: string
  labelZh: string
  options: FontOption[]
  selectedId: string
  onSelect: (id: string) => void
  language: Language
}) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
        {language === 'zh' ? labelZh : label}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {options.map((opt) => {
          const selected = opt.id === selectedId
          return (
            <Paper
              key={opt.id}
              elevation={selected ? 2 : 0}
              onClick={() => onSelect(opt.id)}
              sx={{
                px: 2, py: 1.25,
                minWidth: 160,
                cursor: 'pointer',
                border: '1.5px solid',
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? 'primary.main' : 'background.paper',
                borderRadius: 1.5,
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: selected ? 'primary.main' : 'text.secondary', boxShadow: 2 },
              }}
            >
              {/* Font name */}
              <Typography sx={{
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: selected ? 'primary.contrastText' : 'text.secondary',
                mb: 0.5,
              }}>
                {language === 'zh' ? opt.labelZh : opt.label}
              </Typography>
              {/* Live preview in the actual font */}
              <Typography sx={{
                fontFamily: `${opt.css}, Georgia, serif`,
                fontSize: '1rem',
                lineHeight: 1.4,
                color: selected ? 'primary.contrastText' : 'text.primary',
              }}>
                {language === 'zh' ? opt.sampleZh : opt.sample}
              </Typography>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}

// ── LivePreview ───────────────────────────────────────────────────────────────
function LivePreview({ language }: { language: Language }) {
  return (
    <Box sx={{ p: 2.5, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h4" gutterBottom>
        {language === 'zh' ? '血月钟楼' : 'Blood on the Clocktower'}
      </Typography>
      <Typography variant="body1" sx={{ mb: 1 }}>
        {language === 'zh'
          ? '今晚，恶魔将再次出击。说书人悄声告知旅行者：不要相信任何人。'
          : 'Tonight, the Demon strikes again. The Storyteller whispers to the Traveler: trust no one.'}
      </Typography>
      <Typography variant="caption">
        {language === 'zh' ? '提名现已开放 · 所需票数：' : 'Nominations are open · Required votes:'}
        {' 7'}
      </Typography>
    </Box>
  )
}

// ── SettingsTab ───────────────────────────────────────────────────────────────
interface SettingsTabProps {
  language: Language
  fontSettings: FontSettings
}

export function SettingsTab({ language, fontSettings }: SettingsTabProps) {
  const {
    enBodyId,    setEnBodyId,    enBodyOptions,
    enDisplayId, setEnDisplayId, enDisplayOptions,
    zhId,        setZhId,        zhOptions,
  } = fontSettings

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>

      {/* ── Section: Live preview ── */}
      <Box>
        <Typography variant="h5" gutterBottom>
          {language === 'zh' ? '字体预览' : 'Font Preview'}
        </Typography>
        <LivePreview language={language} />
      </Box>

      <Divider />

      {/* ── Section: English fonts ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h5">
          {language === 'zh' ? '英文字体' : 'English Fonts'}
        </Typography>

        <FontPicker
          label="Body Text"
          labelZh="正文字体"
          options={enBodyOptions}
          selectedId={enBodyId}
          onSelect={setEnBodyId}
          language={language}
        />

        <FontPicker
          label="Headings & Titles"
          labelZh="标题字体"
          options={enDisplayOptions}
          selectedId={enDisplayId}
          onSelect={setEnDisplayId}
          language={language}
        />
      </Box>

      <Divider />

      {/* ── Section: Chinese font ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h5">
          {language === 'zh' ? '中文字体' : 'Chinese Font'}
        </Typography>

        <FontPicker
          label="Chinese Characters"
          labelZh="中文字符字体"
          options={zhOptions}
          selectedId={zhId}
          onSelect={setZhId}
          language={language}
        />
      </Box>

      <Divider />

      {/* ── Note ── */}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {language === 'zh'
          ? '字体设置保存在本地，刷新后依然有效。Google Fonts 字体需要网络连接。'
          : 'Font settings are saved locally and persist across reloads. Google Fonts require a network connection.'}
      </Typography>
    </Box>
  )
}
