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
  const zh = language === 'zh'
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [panelOpen, setPanelOpen] = useState(true)
  const [printing, setPrinting] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const set = <K extends keyof PrintOptions>(key: K, val: PrintOptions[K]) =>
    onOptionsChange({ ...opts, [key]: val })

  const handlePrint = async () => {
    if (isNativePlatform && previewRef.current) {
      await printOrShare(
        previewRef.current,
        getScriptTitle(activeScript) || 'script',
        () => setPrinting(true),
        () => setPrinting(false),
      )
      return
    }
    applyPrintOptionsToPortal(opts)
    setTimeout(() => window.print(), 80)
  }

  const previewW = PAGE_PREVIEW_WIDTH_PX[opts.pageSize]
  const previewH = PAGE_PREVIEW_HEIGHT_PX[opts.pageSize]

  const sectionLabel = (text: string) => (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
      {text}
    </Typography>
  )

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
        <MenuItem disabled sx={{ fontSize: '0.7rem', opacity: 0.6, py: 0 }}>— {zh ? '系统' : 'System'} —</MenuItem>
        {FONT_DEFINITIONS.filter((f) => f.lang === 'both').map((f) => (
          <MenuItem key={f.key} value={f.key} sx={{ fontFamily: f.css }}>{zh ? f.labelZh : f.label}</MenuItem>
        ))}
        <MenuItem disabled sx={{ fontSize: '0.7rem', opacity: 0.6, py: 0 }}>— {zh ? '英文' : 'English'} —</MenuItem>
        {FONT_DEFINITIONS.filter((f) => f.lang === 'en').map((f) => (
          <MenuItem key={f.key} value={f.key} sx={{ fontFamily: f.css }}>{zh ? f.labelZh : f.label}</MenuItem>
        ))}
        <MenuItem disabled sx={{ fontSize: '0.7rem', opacity: 0.6, py: 0 }}>— {zh ? '中文' : 'Chinese'} —</MenuItem>
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
          {zh ? '打印预览' : 'Print Preview'}
        </Typography>
        <FormControl size="small" sx={{ flex: 1, mx: { xs: 0.5, sm: 1 }, maxWidth: { xs: 140, sm: 260 } }}>
          <Select value={activeSlug} onChange={(e) => onScriptChange(e.target.value)}>
            {scripts.map((s) => (
              <MenuItem key={s.slug} value={s.slug}>{getScriptTitle(s)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Tooltip title={zh ? '切换语言' : 'Toggle language'}>
          <IconButton size="small" onClick={() => onLanguageChange(zh ? 'en' : 'zh')}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>{zh ? 'EN' : '中'}</Typography>
          </IconButton>
        </Tooltip>
        <Tooltip title={panelOpen ? (zh ? '隐藏菜单' : 'Hide menu') : (zh ? '显示菜单' : 'Show menu')}>
          <IconButton size="small" onClick={() => setPanelOpen(v => !v)}>
            {panelOpen ? <MenuOpenIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Button variant="contained" size="small" startIcon={printing ? <CircularProgress size={14} color="inherit" /> : <PrintIcon />} onClick={handlePrint} disabled={printing}>
          {printing ? (zh ? '生成中…' : 'Exporting…') : (zh ? '打印' : 'Print')}
        </Button>
      </Paper>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ── Settings panel ── */}
        {panelOpen && <Box sx={{ width: { xs: '100%', sm: 300 }, flexShrink: 0, overflowY: 'auto', borderRight: { sm: '1px solid' }, borderColor: 'divider', p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          {/* Page */}
          <Box>
            {sectionLabel(zh ? '纸张' : 'Page')}
            <FormControl size="small" fullWidth sx={{ mb: 0.5 }}>
              <InputLabel>{zh ? '纸张尺寸' : 'Page Size'}</InputLabel>
              <Select value={opts.pageSize} label={zh ? '纸张尺寸' : 'Page Size'}
                onChange={(e) => set('pageSize', e.target.value as PageSize)}
              >
                {(Object.entries(PAGE_SIZE_DEFS) as [PageSize, { label: string }][]).map(([k, d]) => (
                  <MenuItem key={k} value={k}>{d.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              {zh ? `预览: ${previewW}px ≈ ${PAGE_SIZE_DEFS[opts.pageSize].w}mm` : `Preview: ${previewW}px ≈ ${PAGE_SIZE_DEFS[opts.pageSize].w}mm`}
            </Typography>
          </Box>

          <Divider />

          {/* Layout */}
          <Box>
            {sectionLabel(zh ? '布局' : 'Layout')}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{zh ? '列数' : 'Columns'}</Typography>
            <ToggleButtonGroup value={opts.columns} exclusive size="small" onChange={(_, v) => { if (v) set('columns', v) }}>
              <ToggleButton value={1}>{zh ? '单列' : '1 Col'}</ToggleButton>
              <ToggleButton value={2}>{zh ? '双列' : '2 Col'}</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider />

          {/* Icons */}
          <Box>
            {sectionLabel(zh ? '图标' : 'Icons')}
            <Typography variant="caption" color="text.secondary">{zh ? `角色卡图标: ${opts.iconSize}px` : `Card icon: ${opts.iconSize}px`}</Typography>
            <Slider value={opts.iconSize} min={16} max={80} step={4}
              onChange={(_, v) => set('iconSize', v as number)}
              marks={[{ value: 16, label: '16' }, { value: 48, label: '48' }, { value: 80, label: '80' }]}
              sx={{ mt: 0.5, mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">{zh ? `夜序图标: ${opts.wakeIconSize}px` : `Wake icon: ${opts.wakeIconSize}px`}</Typography>
            <Slider value={opts.wakeIconSize} min={12} max={48} step={2}
              onChange={(_, v) => set('wakeIconSize', v as number)}
              marks={[{ value: 12, label: '12' }, { value: 28, label: '28' }, { value: 48, label: '48' }]}
              sx={{ mt: 0.5 }}
            />
          </Box>

          <Divider />

          {/* Typography */}
          <Box>
            {sectionLabel(zh ? '字体' : 'Typography')}
            {fontSelect(zh ? '英文字体' : 'English Font', 'fontKeyEn')}
            {fontSelect(zh ? '中文字体' : 'Chinese Font', 'fontKeyZh')}
            {ptSlider(zh ? '正文字号' : 'Body', 'fontSize', 7, 14)}
            {ptSlider(zh ? '角色名字号' : 'Name', 'nameFontSize', 8, 18)}
            {ptSlider(zh ? '标题字号' : 'Title', 'titleFontSize', 12, 36)}
            {ptSlider(zh ? '区域标题字号' : 'Section', 'sectionFontSize', 7, 16)}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {zh ? `行高: ${opts.lineHeight}` : `Line height: ${opts.lineHeight}`}
              </Typography>
              <Slider value={opts.lineHeight} min={0.9} max={1.8} step={0.05}
                onChange={(_, v) => set('lineHeight', v as number)}
                marks={[{ value: 0.9, label: '0.9' }, { value: 1.8, label: '1.8' }]}
                sx={{ mt: 0.5, mb: 0 }}
              />
            </Box>
          </Box>

          <Divider />

          {/* Spacing */}
          <Box>
            {sectionLabel(zh ? '间距' : 'Spacing')}
            <ToggleButtonGroup value={opts.padding} exclusive size="small" onChange={(_, v) => { if (v) set('padding', v) }}>
              <ToggleButton value="compact">{zh ? '紧凑' : 'Compact'}</ToggleButton>
              <ToggleButton value="normal">{zh ? '正常' : 'Normal'}</ToggleButton>
              <ToggleButton value="spacious">{zh ? '宽松' : 'Spacious'}</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider />

          {/* Title */}
          <Box>
            {sectionLabel(zh ? '标题' : 'Title')}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{zh ? '对齐' : 'Alignment'}</Typography>
            <ToggleButtonGroup value={opts.titleAlign ?? 'left'} exclusive size="small"
              onChange={(_, v) => { if (v) set('titleAlign', v as TitleAlign) }} sx={{ mb: 1 }}>
              <ToggleButton value="left">{zh ? '左' : 'Left'}</ToggleButton>
              <ToggleButton value="center">{zh ? '中' : 'Center'}</ToggleButton>
              <ToggleButton value="right">{zh ? '右' : 'Right'}</ToggleButton>
            </ToggleButtonGroup>
            <FormControlLabel
              control={<Switch checked={opts.showAuthor ?? true} onChange={(e) => set('showAuthor', e.target.checked)} size="small" />}
              label={<Typography variant="body2">{zh ? '显示作者' : 'Show author'}</Typography>}
            />
          </Box>

          <Divider />

          {/* Wake order */}
          <Box>
            {sectionLabel(zh ? '夜序顺序' : 'Wake Order')}
            <ToggleButtonGroup value={opts.wakeOrder ?? 'side'} exclusive size="small"
              onChange={(_, v) => { if (v) set('wakeOrder', v as WakeOrderMode) }} sx={{ flexWrap: 'wrap' }}>
              <ToggleButton value="side" sx={{ fontSize: '0.72rem' }}>{zh ? '侧列' : 'Side'}</ToggleButton>
              <ToggleButton value="bottom" sx={{ fontSize: '0.72rem' }}>{zh ? '底部行' : 'Bottom'}</ToggleButton>
              <ToggleButton value="none" sx={{ fontSize: '0.72rem' }}>{zh ? '不显示' : 'None'}</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider />

          {/* Section style */}
          <Box>
            {sectionLabel(zh ? '区域样式' : 'Section Style')}
            <ToggleButtonGroup value={opts.sectionStyle ?? 'inline'} exclusive size="small"
              onChange={(_, v) => { if (v) set('sectionStyle', v as SectionStyle) }} sx={{ flexWrap: 'wrap' }}>
              <ToggleButton value="inline" sx={{ fontSize: '0.72rem' }}>{zh ? '内联线' : 'Inline'}</ToggleButton>
              <ToggleButton value="chip"   sx={{ fontSize: '0.72rem' }}>{zh ? '标签' : 'Chip'}</ToggleButton>
              <ToggleButton value="line"   sx={{ fontSize: '0.72rem' }}>{zh ? '分割线' : 'Line'}</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider />

          {/* Icon style */}
          <Box>
            {sectionLabel(zh ? '图标样式' : 'Icon Style')}
            <FormControlLabel
              control={<Switch checked={opts.showIconCircle} onChange={(e) => set('showIconCircle', e.target.checked)} size="small" />}
              label={<Typography variant="body2">{zh ? '显示图标外圈' : 'Icon outer circle'}</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={opts.showCardOutline} onChange={(e) => set('showCardOutline', e.target.checked)} size="small" />}
              label={<Typography variant="body2">{zh ? '显示卡片边框' : 'Card outline'}</Typography>}
            />
          </Box>

          <Divider />

          {/* Output */}
          <Box>
            {sectionLabel(zh ? '输出' : 'Output')}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <FormControlLabel
                control={<Switch checked={opts.blackAndWhite} onChange={(e) => set('blackAndWhite', e.target.checked)} size="small" />}
                label={<Typography variant="body2">{zh ? '黑白打印' : 'Black & White'}</Typography>}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>{zh ? '语言' : 'Language'}</Typography>
              <ToggleButtonGroup value={opts.languageLayout} exclusive size="small"
                onChange={(_, v) => { if (v) set('languageLayout', v as LanguageLayout) }}
                sx={{ flexWrap: 'wrap' }}
              >
                <ToggleButton value="current" sx={{ fontSize: '0.72rem' }}>{zh ? '当前语言' : 'Current'}</ToggleButton>
                <ToggleButton value="bilingual-mixed" sx={{ fontSize: '0.72rem' }}>{zh ? '中英混合' : 'Mixed'}</ToggleButton>
                <ToggleButton value="bilingual-separate" sx={{ fontSize: '0.72rem' }}>{zh ? '中英分页' : 'Separate'}</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Box>}

        {/* ── Live preview (hidden on mobile when panel open) ── */}
        <Box ref={previewRef} sx={{ flex: 1, overflowY: 'auto', bgcolor: 'grey.200', p: { xs: 1, sm: 3 }, display: panelOpen && isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-start', maxWidth: previewW }}>
            {PAGE_SIZE_DEFS[opts.pageSize].label} — {zh ? '以下为预览（实际打印可能有细微差异）' : 'Preview — actual print may differ slightly'}
          </Typography>

          {/* Paper simulation */}
          {opts.languageLayout === 'bilingual-separate' ? (
            ([language, language === 'zh' ? 'en' : 'zh'] as Language[]).map((lang, i) => (
              <Box key={lang} sx={{ width: previewW, maxWidth: '100%', mb: 4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, opacity: 0.7 }}>
                  {zh ? `第${i + 1}部分` : `Section ${i + 1}`} — {lang === 'zh' ? '中文' : 'English'}
                </Typography>
                <Box sx={{ position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: previewH, left: 0, right: 0, height: '2px', bgcolor: 'error.light', opacity: 0.6, zIndex: 10,
                    '&::after': { content: `"${zh ? '↑ 第1页结束' : '↑ page 1 end'}"`, position: 'absolute', right: 8, top: 2, fontSize: '0.65rem', color: 'error.main' },
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
                      showWakeOrder
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
                  '&::after': { content: `"${zh ? '↑ 第1页结束' : '↑ page 1 end'}"`, position: 'absolute', right: 8, top: 2, fontSize: '0.65rem', color: 'error.main' },
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
