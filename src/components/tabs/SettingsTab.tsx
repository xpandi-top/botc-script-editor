import { useState } from 'react'
import {
  Alert, Box, Button, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Divider,
  FormControlLabel, Radio, RadioGroup, Stack,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import type { FontSettings, UiScale } from '../../hooks/useFontSettings'
import { UI_SCALE_OPTIONS, ZH_SAME_AS_EN_ID } from '../../hooks/useFontSettings'
import type { CloudSyncState } from '../../hooks/useCloudSync'
import { exportEverything, readBundleFile, applyBundle } from '../../lib/bundleIO'
import type { Language } from '../../types'
import { useThemeMode } from '../../context/ThemeMode'
import { FontPicker, LivePreview } from '../settings/FontSection'
import { CloudSyncSection } from '../settings/CloudSyncSection'
import { makeT } from '../../lib/t'

// ── SettingsTab ───────────────────────────────────────────────────────────────
interface SettingsTabProps {
  cloudSync: CloudSyncState
  language: Language
  onLanguageChange: (l: Language) => void
  fontSettings: FontSettings
}

export function SettingsTab({ language, onLanguageChange, fontSettings, cloudSync: cloud }: SettingsTabProps) {
  const t = makeT(language)
  const { mode, setMode } = useThemeMode()
  const [importDialog, setImportDialog] = useState(false)
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [importError, setImportError] = useState('')
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
        <Typography variant="h5" gutterBottom>{t('language')}</Typography>
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
        <Typography variant="h5" gutterBottom>{t('theme')}</Typography>
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
          <ToggleButton value="system" sx={{ px: 3, py: 1, gap: 1 }}>
            <SettingsBrightnessIcon fontSize="small" />
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.2 }}>{t('theme_system')}</Typography>
              <Typography sx={{ fontSize: '0.65rem', opacity: 0.7 }}>{t('theme_system_sub')}</Typography>
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Divider />

      {/* ── Section: Live preview ── */}
      <Box>
        <Typography variant="h5" gutterBottom>{t('font_preview')}</Typography>
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
        <Typography variant="h5" gutterBottom>{t('interface_size')}</Typography>
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
        <Typography variant="h5">{t('english_fonts')}</Typography>

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
        <Typography variant="h5">{t('chinese_font')}</Typography>
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

      <Divider />

      <CloudSyncSection cloud={cloud} language={language} />

      <Divider />

      {/* ── Section: Export / Import ── */}
      <Box>
        <Typography variant="h5" gutterBottom>{t('backup_import')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 480 }}>
          {zh
            ? '导出包含脚本、自定义角色、版本覆盖和脚本元数据的完整备份文件。可分享给他人或在新设备导入。'
            : 'Export a full backup containing scripts, custom characters, revision overrides, and script metadata. Share with others or import on a new device.'}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="outlined" startIcon={<DownloadIcon />}
            onClick={exportEverything}
          >
            {t('export_everything')}
          </Button>
          <Button
            variant="outlined" startIcon={<UploadIcon />}
            onClick={() => { setImportFile(null); setImportStatus('idle'); setImportError(''); setImportDialog(true) }}
          >
            {t('import_bundle')}
          </Button>
        </Stack>
      </Box>

      {/* ── Import Dialog ── */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('import_bundle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
            {importFile ? importFile.name : t('choose_json_file')}
            <input type="file" accept=".json" hidden onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) { setImportFile(f); setImportStatus('idle') }
              e.target.value = ''
            }} />
          </Button>

          <Box>
            <DialogContentText variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              {t('import_mode')}
            </DialogContentText>
            <RadioGroup row value={importMode} onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}>
              <FormControlLabel value="merge" control={<Radio size="small" />}
                label={<Typography variant="body2">{t('merge_keep_existing')}</Typography>} />
              <FormControlLabel value="replace" control={<Radio size="small" />}
                label={<Typography variant="body2">{t('replace_overwrite')}</Typography>} />
            </RadioGroup>
          </Box>

          {importStatus === 'ok' && (
            <Alert severity="success">
              {zh ? '导入成功，请刷新页面。' : 'Import successful — reload the page to apply.'}
            </Alert>
          )}
          {importStatus === 'error' && (
            <Alert severity="error">{importError}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            disabled={!importFile || importStatus === 'ok'}
            onClick={async () => {
              if (!importFile) return
              try {
                const bundle = await readBundleFile(importFile)
                applyBundle(bundle, { mode: importMode })
                setImportStatus('ok')
              } catch (e) {
                setImportError(e instanceof Error ? e.message : String(e))
                setImportStatus('error')
              }
            }}
          >
            {t('import_bundle')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
