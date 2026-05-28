import { useRef, useState } from 'react'
import {
  Box, Typography, Divider, Slider, ToggleButton, ToggleButtonGroup,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  TextField, IconButton, Button, Checkbox, FormGroup, FormControlLabel as FCL,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import { FONT_DEFINITIONS, PAGE_SIZE_DEFS } from '../PrintOptionsDialog'
import type { PageSize } from '../PrintOptionsDialog'
import type { TokenPrintOptions, TokenShape, NameDisplay, AbilityDisplay, MarkerDef } from './types'
import type { ResolvedScriptCharacter, Team } from '../../types'
import { getDisplayName, getAbilityTextForScript } from '../../catalog'
import type { Language } from '../../types'
import { useT } from '../../context/I18nContext'
import { makeTpl } from '../../lib/t'

type TeamFilter = 'all' | Team | 'traveler' | 'fabled' | 'experimental' | 'loric'

interface Props {
  opts: TokenPrintOptions
  onChange: (opts: TokenPrintOptions) => void
  scriptCharacters: ResolvedScriptCharacter[]
  language: Language
  pinnedRevisions?: Record<string, string>
}

const TEAM_FILTERS: { value: TeamFilter; en: string; zh: string }[] = [
  { value: 'all', en: 'All', zh: '全部' },
  { value: 'townsfolk', en: 'Townsfolk', zh: '镇民' },
  { value: 'outsider', en: 'Outsider', zh: '外来者' },
  { value: 'minion', en: 'Minion', zh: '爪牙' },
  { value: 'demon', en: 'Demon', zh: '恶魔' },
  { value: 'traveler', en: 'Traveler', zh: '旅行者' },
  { value: 'fabled', en: 'Fabled', zh: '传说' },
  { value: 'experimental', en: 'Experimental', zh: '实验' },
  { value: 'loric', en: 'Loric', zh: '奇遇' },
]

export function TokenOptionsPanel({ opts, onChange, scriptCharacters, language, pinnedRevisions }: Props) {
  const zh = language === 'zh'
  const { t } = useT()
  const tpl = makeTpl(language)
  const set = <K extends keyof TokenPrintOptions>(key: K, val: TokenPrintOptions[K]) =>
    onChange({ ...opts, [key]: val })

  const [search, setSearch] = useState('')
  const [teamFilters, setTeamFilters] = useState<Set<TeamFilter>>(new Set(['all']))

  const toggleTeamFilter = (f: TeamFilter) => {
    const next = new Set(teamFilters)
    if (f === 'all') {
      next.clear()
      next.add('all')
    } else {
      next.delete('all')
      if (next.has(f)) {
        next.delete(f)
        if (next.size === 0) next.add('all')
      } else {
        next.add(f)
      }
    }
    setTeamFilters(next)
  }

  const bgImgRef = useRef<HTMLInputElement>(null)
  const wmImgRef = useRef<HTMLInputElement>(null)

  // Filter characters by team, edition, and search
  const filteredCharacters = scriptCharacters.filter(c => {
    // Team filter - use AND logic (must match all selected filters)
    if (!teamFilters.has('all')) {
      const matches = Array.from(teamFilters).every(f => {
        if (f === 'experimental') return c.edition === 'experimental'
        if (f === 'loric') return c.edition === 'loric'
        if (f === 'fabled') return c.team === 'fabled'
        if (f === 'traveler') return c.team === 'traveler'
        return c.team === f
      })
      if (!matches) return false
    }
    // Search filter
    if (search) {
      const q = search.toLowerCase()
      const nameEn = getDisplayName(c.id, 'en').toLowerCase()
      const nameZh = getDisplayName(c.id, 'zh').toLowerCase()
      const abilityEn = getAbilityTextForScript(c.id, 'en', pinnedRevisions).toLowerCase()
      const abilityZh = getAbilityTextForScript(c.id, 'zh', pinnedRevisions).toLowerCase()
      if (!c.id.toLowerCase().includes(q) &&
          !nameEn.includes(q) && !nameZh.includes(q) &&
          !abilityEn.includes(q) && !abilityZh.includes(q)) {
        return false
      }
    }
    return true
  })

  const label = (text: string) => (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
      {text}
    </Typography>
  )

  const ptSlider = (text: string, key: 'nameFontSize' | 'abilityFontSize' | 'numberFontSize', min: number, max: number) => (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary">{text}: {opts[key]}pt</Typography>
      <Slider value={opts[key]} min={min} max={max} step={0.5}
        onChange={(_, v) => set(key, v as number)}
        marks={[{ value: min, label: `${min}` }, { value: max, label: `${max}` }]}
        size="small" sx={{ mt: 0.5, mb: 0 }} />
    </Box>
  )

  const fontSelect = (labelStr: string, key: 'fontKeyEn' | 'fontKeyZh') => (
    <FormControl size="small" fullWidth sx={{ mb: 1 }}>
      <InputLabel>{labelStr}</InputLabel>
      <Select value={opts[key]} label={labelStr}
        onChange={(e) => set(key, e.target.value as TokenPrintOptions['fontKeyEn'])}>
        {FONT_DEFINITIONS.map((f) => (
          <MenuItem key={f.key} value={f.key} sx={{ fontFamily: f.css }}>
            {zh ? f.labelZh : f.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )

  function handleBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => set('bgImage', ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleWmImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onChange({ ...opts, watermark: { ...opts.watermark, imageData: ev.target?.result as string } })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function updateMarker(id: string, patch: Partial<MarkerDef>) {
    onChange({ ...opts, markers: opts.markers.map((m) => m.id === id ? { ...m, ...patch } : m) })
  }
  function removeMarker(id: string) {
    onChange({ ...opts, markers: opts.markers.filter((m) => m.id !== id) })
  }
  function addMarker() {
    const newM: MarkerDef = { id: `m-${Date.now()}`, icon: '★', label: '', quantity: 2, bgColor: '#888888' }
    onChange({ ...opts, markers: [...opts.markers, newM] })
  }

  const filteredIds = filteredCharacters.map((c) => c.id)
  const selSet = new Set(opts.selectedCharacterIds)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>

      {/* Mode */}
      <Box>
        {label(t('mode'))}
        <ToggleButtonGroup value={opts.mode} exclusive size="small"
          onChange={(_, v) => { if (v) set('mode', v) }}>
          <ToggleButton value="characters">{t('character_markers')}</ToggleButton>
          <ToggleButton value="custom-tags">{t('custom_tags')}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Divider />

{/* ── Character selection ── */}
      {opts.mode === 'characters' && (
        <Box>
          {label(t('characters'))}
          
          {/* Search */}
          <TextField
            fullWidth size="small" placeholder={t('search_id_name_desc')}
            value={search} onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} /> } }}
            sx={{ mb: 1 }}
          />
          
          {/* Team filter */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {TEAM_FILTERS.map(f => (
              <Button
                key={f.value}
                size="small" variant={teamFilters.has(f.value) ? 'contained' : 'outlined'}
                onClick={() => toggleTeamFilter(f.value)}
                sx={{ fontSize: '0.65rem', py: 0.25, px: 0.5, minWidth: 0 }}
              >
                {zh ? f.zh : f.en}
              </Button>
            ))}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
            <Button size="small" variant="text" sx={{ fontSize: '0.7rem', py: 0 }}
              onClick={() => set('selectedCharacterIds', filteredIds)}>
              {t('all')}
            </Button>
            <Button size="small" variant="text" sx={{ fontSize: '0.7rem', py: 0 }}
              onClick={() => set('selectedCharacterIds', [])}>
              {t('none')}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', alignSelf: 'center' }}>
              {filteredCharacters.length} {t('chars')}
            </Typography>
          </Box>
          
          <FormGroup sx={{ maxHeight: 200, overflowY: 'auto', pl: 0.5 }}>
            {filteredCharacters.map((c) => (
              <FCL
                key={c.id}
                control={
                  <Checkbox
                    size="small"
                    checked={selSet.has(c.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...opts.selectedCharacterIds, c.id]
                        : opts.selectedCharacterIds.filter((id) => id !== c.id)
                      set('selectedCharacterIds', next)
                    }}
                    sx={{ py: 0 }}
                  />
                }
                label={
                  <Typography variant="caption">
                    {getDisplayName(c.id, language)} ({c.team})
                  </Typography>
                }
              />
            ))}
          </FormGroup>
        </Box>
      )}

      {/* ── Custom Tags ── */}
      {opts.mode === 'custom-tags' && (
        <Box>
          {label(t('tag_type'))}
          <ToggleButtonGroup value={opts.tagMode} exclusive size="small"
            onChange={(_, v) => { if (v) set('tagMode', v) }} sx={{ mb: 1.5 }}>
            <ToggleButton value="numbers">{t('numbers')}</ToggleButton>
            <ToggleButton value="markers">{t('markers')}</ToggleButton>
          </ToggleButtonGroup>

          {opts.tagMode === 'numbers' && (
            <Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField size="small" type="number" label={t('from')}
                  value={opts.numberFrom} sx={{ width: 80 }}
                  onChange={(e) => set('numberFrom', Number(e.target.value))} />
                <TextField size="small" type="number" label={t('to')}
                  value={opts.numberTo} sx={{ width: 80 }}
                  onChange={(e) => set('numberTo', Number(e.target.value))} />
              </Box>
              <TextField size="small" fullWidth label={t('label_optional')}
                value={opts.numberLabel} sx={{ mb: 1 }}
                onChange={(e) => set('numberLabel', e.target.value)} />
              {ptSlider(t('number_size'), 'numberFontSize', 10, 48)}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">{t('bg_color')}</Typography>
                <input type="color" value={opts.numberBgColor}
                  onChange={(e) => set('numberBgColor', e.target.value)}
                  style={{ width: 32, height: 24, border: 'none', padding: 0, cursor: 'pointer' }} />
              </Box>
            </Box>
          )}

          {opts.tagMode === 'markers' && (
            <Box>
              {opts.markers.map((m) => (
                <Box key={m.id} sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0.75, flexWrap: 'wrap' }}>
                  <TextField size="small" label={t('icon')} value={m.icon}
                    sx={{ width: 54 }}
                    slotProps={{ htmlInput: { style: { fontSize: '1.1rem', textAlign: 'center' } } }}
                    onChange={(e) => updateMarker(m.id, { icon: e.target.value })} />
                  <TextField size="small" label={t('label')} value={m.label}
                    sx={{ flex: 1, minWidth: 80 }}
                    onChange={(e) => updateMarker(m.id, { label: e.target.value })} />
                  <TextField size="small" type="number" label={t('qty')} value={m.quantity}
                    sx={{ width: 54 }}
                    onChange={(e) => updateMarker(m.id, { quantity: Math.max(1, Number(e.target.value)) })} />
                  <input type="color" value={m.bgColor}
                    onChange={(e) => updateMarker(m.id, { bgColor: e.target.value })}
                    style={{ width: 28, height: 28, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 4 }} />
                  <IconButton size="small" onClick={() => removeMarker(m.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={addMarker}>
                {t('add_marker')}
              </Button>
            </Box>
          )}
        </Box>
      )}

      <Divider />

      {/* Token shape + size */}
      <Box>
        {label(t('shape_size'))}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {t('shape')}
        </Typography>
        <ToggleButtonGroup value={opts.shape} exclusive size="small"
          onChange={(_, v) => { if (v) set('shape', v as TokenShape) }} sx={{ mb: 1, flexWrap: 'wrap' }}>
          <ToggleButton value="circle">{t('circle')}</ToggleButton>
          <ToggleButton value="hexagon">{t('hex')}</ToggleButton>
          <ToggleButton value="square">{t('square')}</ToggleButton>
          <ToggleButton value="rectangle">{zh ? '矩形' : 'Rect'}</ToggleButton>
        </ToggleButtonGroup>

        {opts.shape !== 'rectangle' && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {tpl('diameter_mm', opts.diameterMm)}
            </Typography>
            <Slider value={opts.diameterMm} min={10} max={80} step={1}
              onChange={(_, v) => set('diameterMm', v as number)}
              marks={[{ value: 25, label: '25' }, { value: 50, label: '50' }, { value: 80, label: '80' }]}
              size="small" sx={{ mt: 0.5, mb: 0 }} />
          </Box>
        )}

        {opts.shape === 'rectangle' && (
          <Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {zh ? `宽度: ${opts.rectWidthMm}mm` : `Width: ${opts.rectWidthMm}mm`}
              </Typography>
              <Slider value={opts.rectWidthMm} min={40} max={150} step={1}
                onChange={(_, v) => set('rectWidthMm', v as number)}
                marks={[{ value: 60, label: '60' }, { value: 100, label: '100' }, { value: 150, label: '150' }]}
                size="small" sx={{ mt: 0.5, mb: 0 }} />
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {zh ? `高度: ${opts.rectHeightMm}mm` : `Height: ${opts.rectHeightMm}mm`}
              </Typography>
              <Slider value={opts.rectHeightMm} min={15} max={80} step={1}
                onChange={(_, v) => set('rectHeightMm', v as number)}
                marks={[{ value: 25, label: '25' }, { value: 45, label: '45' }, { value: 80, label: '80' }]}
                size="small" sx={{ mt: 0.5, mb: 0 }} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {zh ? '图标位置' : 'Icon Position'}
            </Typography>
            <ToggleButtonGroup value={opts.rectIconPosition} exclusive size="small"
              onChange={(_, v) => { if (v) set('rectIconPosition', v as 'left' | 'right') }} sx={{ mb: 1 }}>
              <ToggleButton value="left">{zh ? '左' : 'Left'}</ToggleButton>
              <ToggleButton value="right">{zh ? '右' : 'Right'}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
        <Box>
          <Typography variant="caption" color="text.secondary">
            {tpl('gap_mm', opts.gapMm)}
          </Typography>
          <Slider value={opts.gapMm} min={0} max={10} step={0.5}
            onChange={(_, v) => set('gapMm', v as number)}
            marks={[{ value: 0, label: '0' }, { value: 5, label: '5' }, { value: 10, label: '10' }]}
            size="small" sx={{ mt: 0.5, mb: 0 }} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {tpl('margin_mm', opts.marginMm)}
          </Typography>
          <Slider value={opts.marginMm} min={0} max={30} step={1}
            onChange={(_, v) => set('marginMm', v as number)}
            marks={[{ value: 0, label: '0' }, { value: 15, label: '15' }, { value: 30, label: '30' }]}
            size="small" sx={{ mt: 0.5, mb: 0 }} />
        </Box>
      </Box>

      <Divider />

      {/* Text */}
      {opts.mode === 'characters' && (
        <>
          <Box>
            {label(t('text'))}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {t('name')}
            </Typography>
            <ToggleButtonGroup value={opts.nameDisplay} exclusive size="small"
              onChange={(_, v) => { if (v) set('nameDisplay', v as NameDisplay) }} sx={{ mb: 1 }}>
              <ToggleButton value="en">EN</ToggleButton>
              <ToggleButton value="zh">中文</ToggleButton>
              <ToggleButton value="both">{t('both')}</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {t('ability')}
            </Typography>
            <ToggleButtonGroup value={opts.abilityDisplay} exclusive size="small"
              onChange={(_, v) => { if (v) set('abilityDisplay', v as AbilityDisplay) }} sx={{ mb: 0.5, flexWrap: 'wrap' }}>
              <ToggleButton value="en">EN</ToggleButton>
              <ToggleButton value="zh">中文</ToggleButton>
              <ToggleButton value="both">{t('both')}</ToggleButton>
              <ToggleButton value="hidden">{t('jinx_status_inactive')}</ToggleButton>
            </ToggleButtonGroup>
            {opts.abilityDisplay !== 'hidden' && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, mt: 0.5 }}>
                  {t('style')}
                </Typography>
                <ToggleButtonGroup value={opts.abilityStyle} exclusive size="small"
                  onChange={(_, v) => { if (v) set('abilityStyle', v as 'arc' | 'straight') }} sx={{ mb: 1 }}>
                  <ToggleButton value="arc">{t('arc')}</ToggleButton>
                  <ToggleButton value="straight">{t('straight')}</ToggleButton>
                </ToggleButtonGroup>
              </>
            )}
            {ptSlider(t('name_size'), 'nameFontSize', 5, 16)}
            {opts.abilityDisplay !== 'hidden' && ptSlider(t('ability_size'), 'abilityFontSize', 3, 10)}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">{t('icon_size')}: {Math.round(opts.iconSizeRatio * 100)}%</Typography>
              <Slider value={opts.iconSizeRatio} min={0.4} max={2.0} step={0.05}
                onChange={(_, v) => set('iconSizeRatio', v as number)}
                marks={[{ value: 0.5, label: '50%' }, { value: 1.0, label: '100%' }, { value: 1.5, label: '150%' }, { value: 2.0, label: '200%' }]}
                size="small" sx={{ mt: 0.5, mb: 0 }} />
            </Box>
          </Box>

          <Box>
            {fontSelect(t('en_font'), 'fontKeyEn')}
            {fontSelect(t('zh_font'), 'fontKeyZh')}
          </Box>

          <Divider />
        </>
      )}

      {/* Background */}
      <Box>
        {label(t('background'))}
        <ToggleButtonGroup value={opts.bgType} exclusive size="small"
          onChange={(_, v) => { if (v) set('bgType', v as TokenPrintOptions['bgType']) }} sx={{ mb: 1 }}>
          <ToggleButton value="none">{t('none')}</ToggleButton>
          <ToggleButton value="color">{t('color')}</ToggleButton>
          <ToggleButton value="image">{t('image')}</ToggleButton>
        </ToggleButtonGroup>

        {opts.bgType === 'color' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">{t('color')}</Typography>
            <input type="color" value={opts.bgColor}
              onChange={(e) => set('bgColor', e.target.value)}
              style={{ width: 40, height: 28, border: 'none', padding: 0, cursor: 'pointer' }} />
          </Box>
        )}

        {opts.bgType === 'image' && (
          <Box>
            <input ref={bgImgRef} type="file" accept="image/*" hidden onChange={handleBgImageUpload} />
            <Button size="small" variant="outlined" onClick={() => bgImgRef.current?.click()} sx={{ mb: 0.5 }}>
              {opts.bgImage ? (t('change_image')) : (t('upload_image'))}
            </Button>
            {opts.bgImage && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 0.5 }}>
                  {t('fit')}
                </Typography>
                <ToggleButtonGroup value={opts.bgFit} exclusive size="small"
                  onChange={(_, v) => { if (v) set('bgFit', v as TokenPrintOptions['bgFit']) }}>
                  <ToggleButton value="cover">{t('cover')}</ToggleButton>
                  <ToggleButton value="contain">{t('contain')}</ToggleButton>
                  <ToggleButton value="stretch">{t('stretch')}</ToggleButton>
                </ToggleButtonGroup>
              </>
            )}
          </Box>
        )}
      </Box>

      <Divider />

      {/* Border */}
      <Box>
        {label(t('border'))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {tpl('border_width_px', opts.borderWidth)}
          </Typography>
          <input type="color" value={opts.borderColor}
            onChange={(e) => set('borderColor', e.target.value)}
            style={{ width: 32, height: 24, border: 'none', padding: 0, cursor: 'pointer' }} />
        </Box>
        <Slider value={opts.borderWidth} min={0} max={6} step={0.5}
          onChange={(_, v) => set('borderWidth', v as number)}
          size="small" />
      </Box>

      <Divider />

      {/* Output */}
      <Box>
        {label(t('output'))}
        <FormControl size="small" fullWidth sx={{ mb: 1 }}>
          <InputLabel>{t('page_size')}</InputLabel>
          <Select value={opts.pageSize} label={t('page_size')}
            onChange={(e) => set('pageSize', e.target.value as PageSize)}>
            {(Object.entries(PAGE_SIZE_DEFS) as [PageSize, { label: string }][]).map(([k, d]) => (
              <MenuItem key={k} value={k}>{d.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={opts.showWakeIndicators} size="small"
            onChange={(e) => set('showWakeIndicators', e.target.checked)} />}
          label={<Typography variant="body2">{t('wake_order_indicators')}</Typography>}
        />
        <FormControlLabel
          control={<Switch checked={opts.showSetupIndicators} size="small"
            onChange={(e) => set('showSetupIndicators', e.target.checked)} />}
          label={<Typography variant="body2">{t('setup_indicators')}</Typography>}
        />
        <FormControlLabel
          control={<Switch checked={opts.blackAndWhite} size="small"
            onChange={(e) => set('blackAndWhite', e.target.checked)} />}
          label={<Typography variant="body2">{t('black_white')}</Typography>}
        />
      </Box>

      <Divider />

      {/* Watermark */}
      <Box>
        {label(t('watermark_optional'))}
        <FormControlLabel
          control={<Switch checked={opts.watermarkEnabled} size="small"
            onChange={(e) => set('watermarkEnabled', e.target.checked)} />}
          label={<Typography variant="body2">{t('enable_watermark')}</Typography>}
        />

        {opts.watermarkEnabled && (
          <Box sx={{ mt: 1, pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
            <ToggleButtonGroup value={opts.watermark.type} exclusive size="small"
              onChange={(_, v) => { if (v) onChange({ ...opts, watermark: { ...opts.watermark, type: v } }) }}
              sx={{ mb: 1 }}>
              <ToggleButton value="text">{t('text')}</ToggleButton>
              <ToggleButton value="image">{t('image')}</ToggleButton>
            </ToggleButtonGroup>

            {opts.watermark.type === 'text' ? (
              <Box>
                <TextField size="small" fullWidth label={t('watermark_text')}
                  value={opts.watermark.text} sx={{ mb: 1 }}
                  onChange={(e) => onChange({ ...opts, watermark: { ...opts.watermark, text: e.target.value } })} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t('color')}</Typography>
                  <input type="color" value={opts.watermark.color}
                    onChange={(e) => onChange({ ...opts, watermark: { ...opts.watermark, color: e.target.value } })}
                    style={{ width: 32, height: 24, border: 'none', padding: 0, cursor: 'pointer' }} />
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">{tpl('watermark_size_pt', opts.watermark.fontSize)}</Typography>
                  <Slider value={opts.watermark.fontSize} min={4} max={16} step={0.5} size="small"
                    onChange={(_, v) => onChange({ ...opts, watermark: { ...opts.watermark, fontSize: v as number } })}
                    sx={{ mt: 0.5, mb: 0 }} />
                </Box>
              </Box>
            ) : (
              <Box sx={{ mb: 1 }}>
                <input ref={wmImgRef} type="file" accept="image/*" hidden onChange={handleWmImageUpload} />
                <Button size="small" variant="outlined" onClick={() => wmImgRef.current?.click()}>
                  {opts.watermark.imageData ? (t('change')) : (t('upload'))}
                </Button>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {t('position')}
            </Typography>
            <ToggleButtonGroup value={opts.watermark.position} exclusive size="small"
              onChange={(_, v) => { if (v) onChange({ ...opts, watermark: { ...opts.watermark, position: v } }) }}
              sx={{ mb: 1 }}>
              <ToggleButton value="center" sx={{ fontSize: '0.7rem' }}>{t('center')}</ToggleButton>
              <ToggleButton value="bottom-center" sx={{ fontSize: '0.7rem' }}>{t('bottom')}</ToggleButton>
              <ToggleButton value="bottom-right" sx={{ fontSize: '0.7rem' }}>{t('bright')}</ToggleButton>
            </ToggleButtonGroup>

            <Box>
              <Typography variant="caption" color="text.secondary">
                {tpl('watermark_opacity_pct', Math.round(opts.watermark.opacity * 100))}
              </Typography>
              <Slider value={opts.watermark.opacity} min={0.05} max={0.8} step={0.05} size="small"
                onChange={(_, v) => onChange({ ...opts, watermark: { ...opts.watermark, opacity: v as number } })}
                sx={{ mt: 0.5, mb: 0 }} />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}
