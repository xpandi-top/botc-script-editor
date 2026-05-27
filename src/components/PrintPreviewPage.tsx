import { useRef, useState } from 'react'
import {
  Box, Button, CircularProgress, IconButton, Typography, Slider, ToggleButton, ToggleButtonGroup,
  FormControlLabel, Switch, Select, MenuItem, FormControl, InputLabel,
  Divider, Paper, Tooltip, useMediaQuery, useTheme,
} from '@mui/material'

import PrintIcon from '@mui/icons-material/Print'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import MenuIcon from '@mui/icons-material/Menu'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import { SheetArticle } from './SheetArticle'
import {
  FONT_DEFINITIONS, PAGE_SIZE_DEFS, PAGE_PREVIEW_WIDTH_PX, PAGE_PREVIEW_HEIGHT_PX,
  applyPrintOptionsToPortal,
} from './PrintOptionsDialog'
import type { PrintOptions, PageSize, LanguageLayout, WakeOrderMode, TitleAlign, SectionStyle } from './PrintOptionsDialog'
import type { EditableScript, Language, ResolvedScriptCharacter, ResolvedScriptCharacterGroup } from '../types'
import { printOrShare, isNativePlatform } from '../lib/nativePrint'
import { useT } from '../context/I18nContext'
import { FieldLabel, SectionLabel } from './ui'

type Props = {
  activeScript: EditableScript
  activeScriptCharacters: ResolvedScriptCharacter[]
  groupedScriptCharacters: ResolvedScriptCharacterGroup[]
  sheetDensityClass: string
  language: Language
  onLanguageChange: (lang: Language) => void
  getSheetUiLabel: (lang: Language, key: string) => string
  printOptions: PrintOptions
  onOptionsChange: (opts: PrintOptions) => void
  onClose: () => void
  scripts: EditableScript[]
  activeSlug: string
  onScriptChange: (slug: string) => void
  getScriptTitle: (s: EditableScript) => string
}

export function PrintPreviewPage({
  activeScript, activeScriptCharacters, groupedScriptCharacters,
  sheetDensityClass, language, onLanguageChange, getSheetUiLabel,
  printOptions: opts, onOptionsChange, onClose,
  scripts, activeSlug, onScriptChange, getScriptTitle,
}: Props) {
  const { t, tpl } = useT()
  const zh = language === 'zh'
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [panelOpen, setPanelOpen] = useState(true)
  const [printing, setPrinting] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const set = <K extends keyof PrintOptions>(key: K, val: PrintOptions[K]) =>
    onOptionsChange({ ...opts, [key]: val })

  const handlePrint = async () => {
    if (isNativePlatform) {
      // Apply page/margin options to the portal before capture (same as web path)
      applyPrintOptionsToPortal(opts)
      // Capture the print portal (.print-portal) — it has the full print layout,
      // not the mobile-scaled preview which may be hidden or wrongly sized.
      await printOrShare(
        previewRef.current!,
        getScriptTitle(activeScript) || 'script',
        () => setPrinting(true),
        () => setPrinting(false),
        { portalSelector: '.print-portal' },
      )
      return
    }
    applyPrintOptionsToPortal(opts)
    setTimeout(() => window.print(), 80)
  }

  const previewW = PAGE_PREVIEW_WIDTH_PX[opts.pageSize]
  const previewH = PAGE_PREVIEW_HEIGHT_PX[opts.pageSize]

  const fontSelect = (labelStr: string, key: 'fontKeyEn' | 'fontKeyZh') => (
    <FormControl size="small" fullWidth sx={{ mb: 1 }}>
      <InputLabel>{labelStr}</InputLabel>
      <Select
        value={opts[key]}
        label={labelStr}
        onChange={(e) => set(key, e.target.value as PrintOptions['fontKeyEn'])}
        renderValue={(v) => {
          const f = FONT_DEFINITIONS.find((d) => d.key === v)
          return f ? (zh ? f.labelZh : f.label) : String(v)
        }}
      >
        <MenuItem disabled sx={{ fontSize: '0.7rem', opacity: 0.6, py: 0 }}>— {t('theme_system')} —</MenuItem>
        {FONT_DEFINITIONS.filter((f) => f.lang === 'both').map((f) => (
          <MenuItem key={f.key} value={f.key} sx={{ fontFamily: f.css }}>{zh ? f.labelZh : f.label}</MenuItem>
        ))}
        <MenuItem disabled sx={{ fontSize: '0.7rem', opacity: 0.6, py: 0 }}>— {t('english')} —</MenuItem>
        {FONT_DEFINITIONS.filter((f) => f.lang === 'en').map((f) => (
          <MenuItem key={f.key} value={f.key} sx={{ fontFamily: f.css }}>{zh ? f.labelZh : f.label}</MenuItem>
        ))}
        <MenuItem disabled sx={{ fontSize: '0.7rem', opacity: 0.6, py: 0 }}>— {t('chinese_2')} —</MenuItem>
        {FONT_DEFINITIONS.filter((f) => f.lang === 'zh').map((f) => (
          <MenuItem key={f.key} value={f.key} sx={{ fontFamily: f.css }}>{zh ? f.labelZh : f.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  )

  const ptSlider = (labelStr: string, field: 'fontSize' | 'nameFontSize' | 'titleFontSize' | 'sectionFontSize', min: number, max: number) => (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {labelStr}: {opts[field]}pt
      </Typography>
      <Slider value={opts[field]} min={min} max={max} step={0.5}
        onChange={(_, v) => set(field, v as number)}
        marks={[{ value: min, label: `${min}` }, { value: max, label: `${max}` }]}
        sx={{ mt: 0.5, mb: 0 }}
      />
    </Box>
  )

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Top bar */}
      <Paper elevation={2} sx={{ px: { xs: 1, sm: 2 }, py: 1, display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, borderRadius: 0, zIndex: 1, flexShrink: 0 }}>
        <IconButton size="small" onClick={onClose}><ArrowBackIcon fontSize="small" /></IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
          {t('print_preview')}
        </Typography>
        <FormControl size="small" sx={{ flex: 1, mx: { xs: 0.5, sm: 1 }, maxWidth: { xs: 140, sm: 260 } }}>
          <Select value={activeSlug} onChange={(e) => onScriptChange(e.target.value)}>
            {scripts.map((s) => (
              <MenuItem key={s.slug} value={s.slug}>{getScriptTitle(s)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Tooltip title={t('toggle_language')}>
          <IconButton size="small" onClick={() => onLanguageChange(zh ? 'en' : 'zh')}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>{t('lang_switch')}</Typography>
          </IconButton>
        </Tooltip>
        <Tooltip title={panelOpen ? (t('hide_menu')) : (t('show_menu'))}>
          <IconButton size="small" onClick={() => setPanelOpen(v => !v)}>
            {panelOpen ? <MenuOpenIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Button variant="contained" size="small" startIcon={printing ? <CircularProgress size={14} color="inherit" /> : <PrintIcon />} onClick={handlePrint} disabled={printing}>
          {printing ? (t('exporting')) : (t('print'))}
        </Button>
      </Paper>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ── Settings panel ── */}
        {panelOpen && <Box sx={{ width: { xs: '100%', sm: 300 }, flexShrink: 0, overflowY: 'auto', borderRight: { sm: '1px solid' }, borderColor: 'divider', p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          {/* 1 ── Output — biggest decisions first */}
          <Box>
            <SectionLabel>{t('output')}</SectionLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <FieldLabel>{t('language')}</FieldLabel>
                <ToggleButtonGroup value={opts.languageLayout} exclusive size="small"
                  onChange={(_, v) => { if (v) set('languageLayout', v as LanguageLayout) }}
                  sx={{ flexWrap: 'wrap' }}
                >
                  <ToggleButton value="current"            sx={{ fontSize: '0.72rem' }}>{t('current')}</ToggleButton>
                  <ToggleButton value="bilingual-mixed"    sx={{ fontSize: '0.72rem' }}>{t('mixed')}</ToggleButton>
                  <ToggleButton value="bilingual-separate" sx={{ fontSize: '0.72rem' }}>{t('separate')}</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <FormControlLabel
                control={<Switch checked={opts.blackAndWhite} onChange={(e) => set('blackAndWhite', e.target.checked)} size="small" />}
                label={<Typography variant="body2">{t('black_white')}</Typography>}
              />
            </Box>
          </Box>

          <Divider />

          {/* 2 ── Page */}
          <Box>
            <SectionLabel>{t('page')}</SectionLabel>
            <FormControl size="small" fullWidth sx={{ mb: 0.5 }}>
              <InputLabel>{t('page_size')}</InputLabel>
              <Select value={opts.pageSize} label={t('page_size')}
                onChange={(e) => set('pageSize', e.target.value as PageSize)}
              >
                {(Object.entries(PAGE_SIZE_DEFS) as [PageSize, { label: string }][]).map(([k, d]) => (
                  <MenuItem key={k} value={k}>{d.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              {tpl('preview_px_mm', previewW, PAGE_SIZE_DEFS[opts.pageSize].w)}
            </Typography>
          </Box>

          <Divider />

          {/* 3 ── Layout */}
          <Box>
            <SectionLabel>{t('layout')}</SectionLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <FieldLabel>{t('columns')}</FieldLabel>
                <ToggleButtonGroup value={opts.columns} exclusive size="small" onChange={(_, v) => { if (v) set('columns', v) }}>
                  <ToggleButton value={1}>{t('1_col')}</ToggleButton>
                  <ToggleButton value={2}>{t('2_col')}</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* 4 ── Title */}
          <Box>
            <SectionLabel>{t('title')}</SectionLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <FieldLabel>{t('alignment')}</FieldLabel>
                <ToggleButtonGroup value={opts.titleAlign ?? 'left'} exclusive size="small"
                  onChange={(_, v) => { if (v) set('titleAlign', v as TitleAlign) }}>
                  <ToggleButton value="left">{t('left')}</ToggleButton>
                  <ToggleButton value="center">{t('center')}</ToggleButton>
                  <ToggleButton value="right">{t('right')}</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <FormControlLabel
                control={<Switch checked={opts.showAuthor ?? true} onChange={(e) => set('showAuthor', e.target.checked)} size="small" />}
                label={<Typography variant="body2">{t('show_author')}</Typography>}
              />
            </Box>
          </Box>

          <Divider />

          {/* 5 ── Typography */}
          <Box>
            <SectionLabel>{t('typography')}</SectionLabel>
            {fontSelect(t('english_font'), 'fontKeyEn')}
            {fontSelect(t('chinese_font'), 'fontKeyZh')}
            {ptSlider(t('body'), 'fontSize', 7, 14)}
            {ptSlider(t('name'), 'nameFontSize', 8, 18)}
            {ptSlider(t('title'), 'titleFontSize', 12, 36)}
            {ptSlider(t('section'), 'sectionFontSize', 7, 16)}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {tpl('line_height_val', opts.lineHeight)}
              </Typography>
              <Slider value={opts.lineHeight} min={0.9} max={1.8} step={0.05}
                onChange={(_, v) => set('lineHeight', v as number)}
                marks={[{ value: 0.9, label: '0.9' }, { value: 1.8, label: '1.8' }]}
                sx={{ mt: 0.5, mb: 0 }}
              />
            </Box>
          </Box>

          <Divider />

          {/* 6 ── Spacing */}
          <Box>
            <SectionLabel>{t('spacing')}</SectionLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <ToggleButtonGroup value={opts.padding} exclusive size="small" onChange={(_, v) => { if (v) set('padding', v) }} sx={{ flexWrap: 'wrap' }}>
                <ToggleButton value="compact"  sx={{ fontSize: '0.72rem' }}>{t('compact')}</ToggleButton>
                <ToggleButton value="normal"   sx={{ fontSize: '0.72rem' }}>{t('normal')}</ToggleButton>
                <ToggleButton value="spacious" sx={{ fontSize: '0.72rem' }}>{t('spacious')}</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          <Divider />

          {/* 7 ── Section style */}
          <Box>
            <SectionLabel>{t('section_style')}</SectionLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <ToggleButtonGroup value={opts.sectionStyle ?? 'inline'} exclusive size="small"
                onChange={(_, v) => { if (v) set('sectionStyle', v as SectionStyle) }} sx={{ flexWrap: 'wrap' }}>
                <ToggleButton value="inline" sx={{ fontSize: '0.72rem' }}>{t('inline')}</ToggleButton>
                <ToggleButton value="chip"   sx={{ fontSize: '0.72rem' }}>{t('chip')}</ToggleButton>
                <ToggleButton value="line"   sx={{ fontSize: '0.72rem' }}>{t('line')}</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          <Divider />

          {/* 8 ── Icons (size + style merged) */}
          <Box>
            <SectionLabel>{t('icons')}</SectionLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <FieldLabel mb={0}>{tpl('card_icon_px', opts.iconSize)}</FieldLabel>
                <Slider value={opts.iconSize} min={16} max={80} step={4}
                  onChange={(_, v) => set('iconSize', v as number)}
                  marks={[{ value: 16, label: '16' }, { value: 48, label: '48' }, { value: 80, label: '80' }]}
                  sx={{ mt: 0.5, mb: 0 }}
                />
              </Box>
              <FormControlLabel
                control={<Switch checked={opts.showIconCircle} onChange={(e) => set('showIconCircle', e.target.checked)} size="small" />}
                label={<Typography variant="body2">{t('icon_outer_circle')}</Typography>}
              />
              <FormControlLabel
                control={<Switch checked={opts.showCardOutline} onChange={(e) => set('showCardOutline', e.target.checked)} size="small" />}
                label={<Typography variant="body2">{t('card_outline')}</Typography>}
              />
            </Box>
          </Box>

          <Divider />

          {/* 9 ── Wake order */}
          <Box>
            <SectionLabel>{t('wake_order')}</SectionLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <ToggleButtonGroup value={opts.wakeOrder ?? 'side'} exclusive size="small"
                onChange={(_, v) => { if (v) set('wakeOrder', v as WakeOrderMode) }} sx={{ flexWrap: 'wrap' }}>
                <ToggleButton value="side"   sx={{ fontSize: '0.72rem' }}>{t('side')}</ToggleButton>
                <ToggleButton value="bottom" sx={{ fontSize: '0.72rem' }}>{t('bottom')}</ToggleButton>
                <ToggleButton value="none"   sx={{ fontSize: '0.72rem' }}>{t('none')}</ToggleButton>
              </ToggleButtonGroup>
              {(opts.wakeOrder ?? 'side') !== 'none' && (
                <Box>
                  <FieldLabel mb={0}>{tpl('wake_icon_px', opts.wakeIconSize)}</FieldLabel>
                  <Slider value={opts.wakeIconSize} min={12} max={48} step={2}
                    onChange={(_, v) => set('wakeIconSize', v as number)}
                    marks={[{ value: 12, label: '12' }, { value: 28, label: '28' }, { value: 48, label: '48' }]}
                    sx={{ mt: 0.5, mb: 0 }}
                  />
                </Box>
              )}
            </Box>
          </Box>

        </Box>}

        {/* ── Live preview (hidden on mobile when panel open) ── */}
        <Box ref={previewRef} sx={{ flex: 1, overflowY: 'auto', bgcolor: 'grey.200', p: { xs: 1, sm: 3 }, display: panelOpen && isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-start', maxWidth: previewW }}>
            {PAGE_SIZE_DEFS[opts.pageSize].label} — {t('preview_actual_print_may_differ_slightly')}
          </Typography>

          {/* Paper simulation */}
          {opts.languageLayout === 'bilingual-separate' ? (
            ([language, t('zh')] as Language[]).map((lang, i) => (
              <Box key={lang} sx={{ width: previewW, maxWidth: '100%', mb: 4 }}>
                <FieldLabel sx={{ opacity: 0.7 }}>
                  {tpl('section_n', i + 1)} — {lang === 'zh' ? t('chinese') : t('english')}
                </FieldLabel>
                <Box sx={{ position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: previewH, left: 0, right: 0, height: '2px', bgcolor: 'error.light', opacity: 0.6, zIndex: 10,
                    '&::after': { content: `"${t('page_1_end')}"`, position: 'absolute', right: 8, top: 2, fontSize: '0.65rem', color: 'error.main' },
                  }} />
                  <Box sx={{ bgcolor: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', borderRadius: 1, overflow: 'visible' }}>
                    <SheetArticle
                      activeScript={activeScript}
                      activeScriptCharacters={activeScriptCharacters}
                      groupedScriptCharacters={groupedScriptCharacters}
                      bootleggerRulesLabel={getSheetUiLabel(lang, 'bootlegger_rules')}
                      jinxesLabel={getSheetUiLabel(lang, 'jinxes')}
                      isEditMode={false}
                      language={lang}
                      onRemoveCharacter={() => {}}
                      sheetDensityClass={sheetDensityClass}
                      showWakeOrder={false}
                      showEdition={false}
                      showCharacterCount={false}
                      supplementalPlacement="end"
                      printOptions={{ ...opts, languageLayout: 'current' }}
                    />
                  </Box>
                </Box>
              </Box>
            ))
          ) : (
            <Box sx={{ width: previewW, maxWidth: '100%' }}>
              <Box sx={{ position: 'relative' }}>
                {<Box sx={{ position: 'absolute', top: previewH, left: 0, right: 0, height: '2px', bgcolor: 'error.light', opacity: 0.6, zIndex: 10,
                  '&::after': { content: `"${t('page_1_end')}"`, position: 'absolute', right: 8, top: 2, fontSize: '0.65rem', color: 'error.main' },
                }} />}
                <Box sx={{ bgcolor: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', borderRadius: 1, overflow: 'visible' }}>
                  <SheetArticle
                    activeScript={activeScript}
                    activeScriptCharacters={activeScriptCharacters}
                    groupedScriptCharacters={groupedScriptCharacters}
                    bootleggerRulesLabel={getSheetUiLabel(language, 'bootlegger_rules')}
                    jinxesLabel={getSheetUiLabel(language, 'jinxes')}
                    isEditMode={false}
                    language={language}
                    onRemoveCharacter={() => {}}
                    sheetDensityClass={sheetDensityClass}
                    showWakeOrder={false}
                    showEdition={false}
                    showCharacterCount={false}
                    supplementalPlacement="end"
                    printOptions={opts}
                  />
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
