import { useRef, useState } from 'react'
import {
  Box, Typography, Slider, ToggleButton, ToggleButtonGroup,
  FormControlLabel, Switch, Select, MenuItem, FormControl, InputLabel,
  useMediaQuery, useTheme,
} from '@mui/material'

import { PrintTopBar } from './PrintStudio/PrintTopBar'
import { SheetArticle } from './SheetArticle'
import {
  FONT_DEFINITIONS, PAGE_SIZE_DEFS, PAGE_PREVIEW_WIDTH_PX,
} from './PrintOptionsDialog'
import type { PrintOptions, PageSize, LanguageLayout, WakeOrderMode, TitleAlign, SectionStyle } from './PrintOptionsDialog'
import type { EditableScript, Language, ResolvedScriptCharacter, ResolvedScriptCharacterGroup } from '../types'
import { exportSheetPdf, isNativePlatform } from '../lib/nativePrint'
import { useT } from '../context/I18nContext'
import { FieldLabel } from './ui'
import { PrintMenuSection } from './PrintStudio/PrintMenuSection'
import { FeedbackButton } from './Feedback'
import { plainOptions } from '../lib/feedback/snapshot'

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
  /** Switch to the token studio (the top bar's tokens | sheet toggle). */
  onOpenTokenStudio?: () => void
  scripts: EditableScript[]
  activeSlug: string
  onScriptChange: (slug: string) => void
  getScriptTitle: (s: EditableScript) => string
}

export function PrintPreviewPage({
  activeScript, activeScriptCharacters, groupedScriptCharacters,
  sheetDensityClass, language, onLanguageChange, getSheetUiLabel,
  printOptions: opts, onOptionsChange, onClose, onOpenTokenStudio,
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
    // Measures the print portal's real DOM geometry and cuts pages at card/section
    // boundaries instead of relying on the browser's CSS print pagination — see
    // paginateSheet.ts. Produces a real multi-page PDF: downloaded on web, shared
    // via the OS sheet on native.
    await exportSheetPdf(
      opts,
      getScriptTitle(activeScript) || 'script',
      '.print-portal',
      () => setPrinting(true),
      () => setPrinting(false),
    )
  }

  const previewW = PAGE_PREVIEW_WIDTH_PX[opts.pageSize]

  const fontSelect = (labelStr: string, key: 'fontKeyEn' | 'fontKeyZh') => (
    <FormControl size="small" fullWidth>
      <InputLabel id={`sheet-${key}-label`}>{labelStr}</InputLabel>
      <Select
        value={opts[key]}
        labelId={`sheet-${key}-label`}
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
    <Box>
      <Typography variant="caption" color="text.secondary">
        {labelStr}: {opts[field]}pt
      </Typography>
      <Slider value={opts[field]} min={min} max={max} step={0.5}
        aria-label={labelStr} valueLabelDisplay="auto" valueLabelFormat={(value) => `${value} pt`}
        onChange={(_, v) => set(field, v as number)}
        marks={[{ value: min, label: `${min}` }, { value: max, label: `${max}` }]}
        sx={{ mt: 0.5 }}
      />
    </Box>
  )

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <PrintTopBar
        mode="sheet"
        onModeChange={onOpenTokenStudio ? (mode) => { if (mode === 'tokens') onOpenTokenStudio() } : undefined}
        onClose={onClose}
        scripts={scripts}
        activeSlug={activeSlug}
        onScriptChange={onScriptChange}
        getScriptTitle={getScriptTitle}
        language={language}
        onLanguageChange={onLanguageChange}
        /* This page covers the app header: its flag is the only report button here. */
        feedback={<FeedbackButton request={() => ({
          target: { type: 'print', script: activeScript.slug },
          surface: 'print/sheet',
          label: `${t('print_preview')} · ${getScriptTitle(activeScript)}`,
          parts: ['sheet'],
          snapshot: { native: isNativePlatform, options: plainOptions(opts) },
        })} />}
        panelOpen={panelOpen}
        onPanelOpenChange={setPanelOpen}
        panelId="sheet-print-settings"
        onExport={handlePrint}
        exporting={printing}
      />

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ── Settings panel: four groups, biggest decisions first ── */}
        {panelOpen && <Box id="sheet-print-settings" sx={{ width: { xs: '100%', sm: 320, md: 340 }, flexShrink: 0, overflowY: 'auto', borderRight: { sm: '1px solid' }, borderColor: 'divider', px: 2, py: 0.5, display: 'flex', flexDirection: 'column' }}>

          {/* 1 ── Output & paper */}
          <PrintMenuSection title={t('print_section_output_page')}>
            <Box>
              <FieldLabel>{t('language')}</FieldLabel>
              <ToggleButtonGroup aria-label={t('language')} value={opts.languageLayout} exclusive size="small"
                onChange={(_, v) => { if (v) set('languageLayout', v as LanguageLayout) }}
                sx={{ flexWrap: 'wrap' }}
              >
                <ToggleButton value="current"            sx={{ fontSize: '0.72rem' }}>{t('print_language_current')}</ToggleButton>
                <ToggleButton value="bilingual-mixed"    sx={{ fontSize: '0.72rem' }}>{t('print_language_mixed')}</ToggleButton>
                <ToggleButton value="bilingual-separate" sx={{ fontSize: '0.72rem' }}>{t('print_language_separate')}</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box>
              <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                <InputLabel id="sheet-page-size-label">{t('page_size')}</InputLabel>
                <Select value={opts.pageSize} labelId="sheet-page-size-label" label={t('page_size')}
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
            <FormControlLabel
              control={<Switch checked={opts.blackAndWhite} onChange={(e) => set('blackAndWhite', e.target.checked)} size="small" />}
              label={<Typography variant="body2">{t('black_white')}</Typography>}
            />
          </PrintMenuSection>

          {/* 2 ── Layout: columns, title, sections, spacing */}
          <PrintMenuSection title={t('layout')}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <FieldLabel>{t('columns')}</FieldLabel>
                <ToggleButtonGroup aria-label={t('columns')} value={opts.columns} exclusive size="small" onChange={(_, v) => { if (v) set('columns', v) }}>
                  <ToggleButton value={1}>{t('1_col')}</ToggleButton>
                  <ToggleButton value={2}>{t('2_col')}</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box>
                <FieldLabel>{t('title')} · {t('alignment')}</FieldLabel>
                <ToggleButtonGroup aria-label={`${t('title')} · ${t('alignment')}`} value={opts.titleAlign ?? 'left'} exclusive size="small"
                  onChange={(_, v) => { if (v) set('titleAlign', v as TitleAlign) }}>
                  <ToggleButton value="left">{t('left')}</ToggleButton>
                  <ToggleButton value="center">{t('center')}</ToggleButton>
                  <ToggleButton value="right">{t('right')}</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
            <FormControlLabel
              control={<Switch checked={opts.showAuthor ?? true} onChange={(e) => set('showAuthor', e.target.checked)} size="small" />}
              label={<Typography variant="body2">{t('show_author')}</Typography>}
            />
            <Box>
              <FieldLabel>{t('section_style')}</FieldLabel>
              <ToggleButtonGroup aria-label={t('section_style')} value={opts.sectionStyle ?? 'inline'} exclusive size="small"
                onChange={(_, v) => { if (v) set('sectionStyle', v as SectionStyle) }} sx={{ flexWrap: 'wrap' }}>
                <ToggleButton value="inline" sx={{ fontSize: '0.72rem' }}>{t('inline')}</ToggleButton>
                <ToggleButton value="chip"   sx={{ fontSize: '0.72rem' }}>{t('chip')}</ToggleButton>
                <ToggleButton value="line"   sx={{ fontSize: '0.72rem' }}>{t('line')}</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box>
              <FieldLabel>{t('spacing')}</FieldLabel>
              <ToggleButtonGroup aria-label={t('spacing')} value={opts.padding} exclusive size="small" onChange={(_, v) => { if (v) set('padding', v) }} sx={{ flexWrap: 'wrap' }}>
                <ToggleButton value="compact"  sx={{ fontSize: '0.72rem' }}>{t('compact')}</ToggleButton>
                <ToggleButton value="normal"   sx={{ fontSize: '0.72rem' }}>{t('normal')}</ToggleButton>
                <ToggleButton value="spacious" sx={{ fontSize: '0.72rem' }}>{t('spacious')}</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box>
              <FieldLabel mb={0}>{tpl('row_spacing_px', opts.rowSpacing)}</FieldLabel>
              <Slider aria-label={tpl('row_spacing_px', opts.rowSpacing)} valueLabelDisplay="auto" value={opts.rowSpacing} min={0} max={24} step={1}
                onChange={(_, v) => set('rowSpacing', v as number)}
                marks={[{ value: 0, label: '0' }, { value: 12, label: '12' }, { value: 24, label: '24' }]}
                sx={{ mt: 0.5 }}
              />
            </Box>
          </PrintMenuSection>

          {/* 3 ── Typography */}
          <PrintMenuSection title={t('typography')}>
            {fontSelect(t('english_font'), 'fontKeyEn')}
            {fontSelect(t('chinese_font'), 'fontKeyZh')}
            {ptSlider(t('body'), 'fontSize', 7, 14)}
            {ptSlider(t('name'), 'nameFontSize', 8, 18)}
            {ptSlider(t('title'), 'titleFontSize', 12, 36)}
            {ptSlider(t('section'), 'sectionFontSize', 7, 16)}
            <Box>
              <Typography variant="caption" color="text.secondary">
                {tpl('line_height_val', opts.lineHeight)}
              </Typography>
              <Slider aria-label={tpl('line_height_val', opts.lineHeight)} valueLabelDisplay="auto" value={opts.lineHeight} min={0.9} max={1.8} step={0.05}
                onChange={(_, v) => set('lineHeight', v as number)}
                marks={[{ value: 0.9, label: '0.9' }, { value: 1.8, label: '1.8' }]}
                sx={{ mt: 0.5 }}
              />
            </Box>
          </PrintMenuSection>

          {/* 4 ── Icons & wake order */}
          <PrintMenuSection title={t('print_section_icons_wake')}>
            <Box>
              <FieldLabel mb={0}>{tpl('card_icon_px', opts.iconSize)}</FieldLabel>
              <Slider aria-label={tpl('card_icon_px', opts.iconSize)} valueLabelDisplay="auto" value={opts.iconSize} min={16} max={80} step={4}
                onChange={(_, v) => set('iconSize', v as number)}
                marks={[{ value: 16, label: '16' }, { value: 48, label: '48' }, { value: 80, label: '80' }]}
                sx={{ mt: 0.5 }}
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
            <Box>
              <FieldLabel>{t('wake_order')}</FieldLabel>
              <ToggleButtonGroup aria-label={t('wake_order')} value={opts.wakeOrder ?? 'side'} exclusive size="small"
                onChange={(_, v) => { if (v) set('wakeOrder', v as WakeOrderMode) }} sx={{ flexWrap: 'wrap' }}>
                <ToggleButton value="side"   sx={{ fontSize: '0.72rem' }}>{t('side')}</ToggleButton>
                <ToggleButton value="bottom" sx={{ fontSize: '0.72rem' }}>{t('bottom')}</ToggleButton>
                <ToggleButton value="none"   sx={{ fontSize: '0.72rem' }}>{t('none')}</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {(opts.wakeOrder ?? 'side') !== 'none' && (
              <Box>
                <FieldLabel mb={0}>{tpl('wake_icon_px', opts.wakeIconSize)}</FieldLabel>
                <Slider aria-label={tpl('wake_icon_px', opts.wakeIconSize)} valueLabelDisplay="auto" value={opts.wakeIconSize} min={12} max={48} step={2}
                  onChange={(_, v) => set('wakeIconSize', v as number)}
                  marks={[{ value: 12, label: '12' }, { value: 28, label: '28' }, { value: 48, label: '48' }]}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            )}
          </PrintMenuSection>

        </Box>}

        {/* ── Live preview (hidden on mobile when panel open) ── */}
        <Box ref={previewRef} sx={{ flex: 1, minWidth: 0, overflowY: 'auto', bgcolor: 'grey.200', p: { xs: 1, sm: 3 }, display: panelOpen && isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
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
            ))
          ) : (
            <Box sx={{ width: previewW, maxWidth: '100%' }}>
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
          )}
        </Box>
      </Box>
    </Box>
  )
}
