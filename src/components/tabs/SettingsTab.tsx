import { Box, Paper, Typography, Divider, ToggleButtonGroup, ToggleButton } from '@mui/material'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import type { FontOption, FontSettings, UiScale } from '../../hooks/useFontSettings'
import { UI_SCALE_OPTIONS, ZH_SAME_AS_EN_ID } from '../../hooks/useFontSettings'
import type { Language } from '../../types'
import { useThemeMode } from '../../context/ThemeMode'

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
                minWidth: 150,
                maxWidth: 220,
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
                fontSize: '0.7rem',
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
                fontSize: '0.92rem',
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
function LivePreview({
  language, enBodyCss, enDisplayCss, zhCss,
}: {
  language: Language
  enBodyCss: string
  enDisplayCss: string
  zhCss: string
}) {
  const zh = language === 'zh'

  const previewCards = [
    {
      key: 'en-body',
      label: zh ? '英文正文' : 'English Body',
      fontFamily: `${enBodyCss}, Georgia, serif`,
      title: 'The Storyteller speaks in shadow.',
      body: 'Tonight, the Demon strikes again. Trust no one. Nominations are open — required votes: 7.',
      isLarge: false,
    },
    {
      key: 'en-display',
      label: zh ? '英文标题' : 'English Title',
      fontFamily: `${enDisplayCss}, Georgia, serif`,
      title: 'Blood on the Clocktower',
      body: 'Trouble Brewing · Sects & Violets',
      isLarge: true,
    },
    {
      key: 'zh-body',
      label: zh ? '中文正文' : 'Chinese Body',
      fontFamily: `${zhCss}, "PingFang SC", sans-serif`,
      title: '说书人在黑暗中低语。',
      body: '今晚，恶魔再度出击。提名现已开放，所需票数为七票。',
      isLarge: false,
    },
    {
      key: 'zh-display',
      label: zh ? '中文标题' : 'Chinese Title',
      fontFamily: `${zhCss}, "PingFang SC", sans-serif`,
      title: '染血钟楼谜团',
      body: '暗流涌动 · 梦陨春宵',
      isLarge: true,
    },
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
      {previewCards.map((card) => (
        <Box key={card.key} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem', fontWeight: 600 }}>
            {card.label}
          </Typography>
          <Typography sx={{
            fontFamily: card.fontFamily,
            fontSize: card.isLarge ? '1.4rem' : '0.875rem',
            lineHeight: card.isLarge ? 1.25 : 1.5,
            fontWeight: card.isLarge ? 600 : 400,
            mb: 0.5,
            color: 'text.primary',
          }}>
            {card.title}
          </Typography>
          <Typography sx={{
            fontFamily: card.fontFamily,
            fontSize: card.isLarge ? '0.875rem' : '0.78rem',
            color: 'text.secondary',
            lineHeight: 1.4,
          }}>
            {card.body}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

// ── SettingsTab ───────────────────────────────────────────────────────────────
interface SettingsTabProps {
  language: Language
  onLanguageChange: (l: Language) => void
  fontSettings: FontSettings
}

export function SettingsTab({ language, onLanguageChange, fontSettings }: SettingsTabProps) {
  const { mode, setMode } = useThemeMode()
  const {
    enBodyId,    setEnBodyId,    enBodyOptions,
    enDisplayId, setEnDisplayId, enDisplayOptions,
    zhId,        setZhId,        zhOptions,
    uiScale,     setUiScale,
  } = fontSettings

  const zh = language === 'zh'

  // Resolve current CSS strings for preview
  const enBodyCss    = enBodyOptions.find((o) => o.id === enBodyId)?.css    ?? enBodyOptions[0].css
  const enDisplayCss = enDisplayOptions.find((o) => o.id === enDisplayId)?.css ?? enDisplayOptions[0].css
  const zhRaw        = zhOptions.find((o) => o.id === zhId)?.css            ?? zhOptions[0].css
  // Sentinel "same as EN" resolves to current EN body font for preview
  const zhCss        = zhRaw === ZH_SAME_AS_EN_ID ? enBodyCss : zhRaw

  // ZH font picker: replace sentinel css with resolved css so card previews
  // render in the correct font rather than the literal sentinel string.
  const zhOptionsResolved = zhOptions.map((o) =>
    o.id === ZH_SAME_AS_EN_ID ? { ...o, css: enBodyCss } : o
  )

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>

      {/* ── Section: Language ── */}
      <Box>
        <Typography variant="h5" gutterBottom>
          {zh ? '语言' : 'Language'}
        </Typography>
        <ToggleButtonGroup value={language} exclusive onChange={(_, v) => { if (v) onLanguageChange(v as Language) }}>
          <ToggleButton value="zh" sx={{ px: 3, py: 1 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }}>中文</Typography>
              <Typography sx={{ fontSize: '0.65rem', opacity: 0.7 }}>Chinese</Typography>
            </Box>
          </ToggleButton>
          <ToggleButton value="en" sx={{ px: 3, py: 1 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }}>English</Typography>
              <Typography sx={{ fontSize: '0.65rem', opacity: 0.7 }}>英文</Typography>
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Divider />

      {/* ── Section: Theme ── */}
      <Box>
        <Typography variant="h5" gutterBottom>
          {zh ? '界面主题' : 'Theme'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {zh ? '在明亮的羊皮纸风格与黑暗血腥风格之间切换。' : 'Switch between the warm parchment light theme and the dark crimson theme.'}
        </Typography>
        <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => { if (v) setMode(v) }}>
          <ToggleButton value="light" sx={{ px: 3, py: 1, gap: 1 }}>
            <LightModeIcon fontSize="small" />
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.2 }}>{zh ? '明亮' : 'Light'}</Typography>
              <Typography sx={{ fontSize: '0.65rem', opacity: 0.7 }}>{zh ? '羊皮纸风格' : 'Parchment'}</Typography>
            </Box>
          </ToggleButton>
          <ToggleButton value="dark" sx={{ px: 3, py: 1, gap: 1 }}>
            <DarkModeIcon fontSize="small" />
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.2 }}>{zh ? '黑暗' : 'Dark'}</Typography>
              <Typography sx={{ fontSize: '0.65rem', opacity: 0.7 }}>{zh ? '血腥猩红' : 'Crimson'}</Typography>
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Divider />

      {/* ── Section: Live preview ── */}
      <Box>
        <Typography variant="h5" gutterBottom>
          {zh ? '字体预览' : 'Font Preview'}
        </Typography>
        <LivePreview
          language={language}
          enBodyCss={enBodyCss}
          enDisplayCss={enDisplayCss}
          zhCss={zhCss}
        />
      </Box>

      <Divider />

      {/* ── Section: UI size ── */}
      <Box>
        <Typography variant="h5" gutterBottom>
          {zh ? '界面文字大小' : 'Interface Size'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {zh
            ? '调整整体界面文字大小。"大"和"特大"会放大所有文字、间距和控件。'
            : 'Scales all UI text, spacing, and controls uniformly.'}
        </Typography>
        <ToggleButtonGroup value={uiScale} exclusive onChange={(_, v) => { if (v) setUiScale(v as UiScale) }}>
          {UI_SCALE_OPTIONS.map((opt) => (
            <ToggleButton key={opt.id} value={opt.id} sx={{ px: 3, py: 1 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: opt.id === 'default' ? '0.875rem' : opt.id === 'large' ? '1rem' : '1.15rem', fontWeight: 600, lineHeight: 1.2 }}>
                  {zh ? opt.labelZh : opt.label}
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: 'inherit', opacity: 0.7 }}>
                  {opt.px}px
                </Typography>
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Divider />

      {/* ── Section: English fonts ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h5">
          {zh ? '英文字体' : 'English Fonts'}
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
          {zh ? '中文字体' : 'Chinese Font'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: -2 }}>
          {zh
            ? '中文字体同时用于正文和标题。'
            : 'Chinese font applies to both body text and titles.'}
        </Typography>

        <FontPicker
          label="Chinese Characters"
          labelZh="中文字符字体"
          options={zhOptionsResolved}
          selectedId={zhId}
          onSelect={setZhId}
          language={language}
        />
      </Box>

      <Divider />

      {/* ── Note ── */}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {zh
          ? '字体设置保存在本地，刷新后依然有效。Google Fonts 字体需要网络连接。界面大小设置会立即生效。'
          : 'Font settings are saved locally and persist across reloads. Google Fonts require a network connection. Size changes apply instantly.'}
      </Typography>
    </Box>
  )
}
