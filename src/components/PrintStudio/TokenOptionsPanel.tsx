import { useRef } from 'react'
import {
  Box, Typography, Divider, Slider, ToggleButton, ToggleButtonGroup,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  TextField, IconButton, Button, Checkbox, FormGroup, FormControlLabel as FCL,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { FONT_DEFINITIONS, PAGE_SIZE_DEFS } from '../PrintOptionsDialog'
import type { PageSize } from '../PrintOptionsDialog'
import type { TokenPrintOptions, TokenShape, NameDisplay, AbilityDisplay, MarkerDef } from './types'
import type { ResolvedScriptCharacter } from '../../types'
import { getDisplayName } from '../../catalog'
import type { Language } from '../../types'

interface Props {
  opts: TokenPrintOptions
  onChange: (opts: TokenPrintOptions) => void
  scriptCharacters: ResolvedScriptCharacter[]
  language: Language
}

export function TokenOptionsPanel({ opts, onChange, scriptCharacters, language }: Props) {
  const zh = language === 'zh'
  const set = <K extends keyof TokenPrintOptions>(key: K, val: TokenPrintOptions[K]) =>
    onChange({ ...opts, [key]: val })

  const bgImgRef  = useRef<HTMLInputElement>(null)
  const wmImgRef  = useRef<HTMLInputElement>(null)

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

  const allIds = scriptCharacters.map((c) => c.id)
  const selSet = new Set(opts.selectedCharacterIds)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>

      {/* Mode */}
      <Box>
        {label(zh ? '模式' : 'Mode')}
        <ToggleButtonGroup value={opts.mode} exclusive size="small"
          onChange={(_, v) => { if (v) set('mode', v) }}>
          <ToggleButton value="characters">{zh ? '角色代币' : 'Character Tokens'}</ToggleButton>
          <ToggleButton value="custom-tags">{zh ? '自定义标签' : 'Custom Tags'}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Divider />

      {/* ── Character selection ── */}
      {opts.mode === 'characters' && (
        <Box>
          {label(zh ? '选择角色' : 'Characters')}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
            <Button size="small" variant="text" sx={{ fontSize: '0.7rem', py: 0 }}
              onClick={() => set('selectedCharacterIds', allIds)}>
              {zh ? '全选' : 'All'}
            </Button>
            <Button size="small" variant="text" sx={{ fontSize: '0.7rem', py: 0 }}
              onClick={() => set('selectedCharacterIds', [])}>
              {zh ? '清空' : 'None'}
            </Button>
          </Box>
          <FormGroup sx={{ maxHeight: 200, overflowY: 'auto', pl: 0.5 }}>
            {scriptCharacters.map((c) => (
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
          {label(zh ? '标签类型' : 'Tag Type')}
          <ToggleButtonGroup value={opts.tagMode} exclusive size="small"
            onChange={(_, v) => { if (v) set('tagMode', v) }} sx={{ mb: 1.5 }}>
            <ToggleButton value="numbers">{zh ? '编号' : 'Numbers'}</ToggleButton>
            <ToggleButton value="markers">{zh ? '状态标记' : 'Markers'}</ToggleButton>
          </ToggleButtonGroup>

          {opts.tagMode === 'numbers' && (
            <Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField size="small" type="number" label={zh ? '起始' : 'From'}
                  value={opts.numberFrom} sx={{ width: 80 }}
                  onChange={(e) => set('numberFrom', Number(e.target.value))} />
                <TextField size="small" type="number" label={zh ? '结束' : 'To'}
                  value={opts.numberTo} sx={{ width: 80 }}
                  onChange={(e) => set('numberTo', Number(e.target.value))} />
              </Box>
              <TextField size="small" fullWidth label={zh ? '底部标签（可选）' : 'Label (optional)'}
                value={opts.numberLabel} sx={{ mb: 1 }}
                onChange={(e) => set('numberLabel', e.target.value)} />
              {ptSlider(zh ? '数字字号' : 'Number size', 'numberFontSize', 10, 48)}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">{zh ? '背景色' : 'BG color'}</Typography>
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
                  <TextField size="small" label={zh ? '图标' : 'Icon'} value={m.icon}
                    sx={{ width: 54 }}
                    slotProps={{ htmlInput: { style: { fontSize: '1.1rem', textAlign: 'center' } } }}
                    onChange={(e) => updateMarker(m.id, { icon: e.target.value })} />
                  <TextField size="small" label={zh ? '标签' : 'Label'} value={m.label}
                    sx={{ flex: 1, minWidth: 80 }}
                    onChange={(e) => updateMarker(m.id, { label: e.target.value })} />
                  <TextField size="small" type="number" label={zh ? '数量' : 'Qty'} value={m.quantity}
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
                {zh ? '添加标记' : 'Add marker'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      <Divider />

      {/* Token shape + size */}
      <Box>
        {label(zh ? '形状与大小' : 'Shape & Size')}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {zh ? '形状' : 'Shape'}
        </Typography>
        <ToggleButtonGroup value={opts.shape} exclusive size="small"
          onChange={(_, v) => { if (v) set('shape', v as TokenShape) }} sx={{ mb: 1 }}>
          <ToggleButton value="circle">{zh ? '圆形' : 'Circle'}</ToggleButton>
          <ToggleButton value="hexagon">{zh ? '六边形' : 'Hex'}</ToggleButton>
          <ToggleButton value="square">{zh ? '方形' : 'Square'}</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {zh ? `直径: ${opts.diameterMm}mm` : `Diameter: ${opts.diameterMm}mm`}
          </Typography>
          <Slider value={opts.diameterMm} min={25} max={80} step={1}
            onChange={(_, v) => set('diameterMm', v as number)}
            marks={[{ value: 25, label: '25' }, { value: 50, label: '50' }, { value: 80, label: '80' }]}
            size="small" sx={{ mt: 0.5, mb: 0 }} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {zh ? `间距: ${opts.gapMm}mm` : `Gap: ${opts.gapMm}mm`}
          </Typography>
          <Slider value={opts.gapMm} min={1} max={10} step={0.5}
            onChange={(_, v) => set('gapMm', v as number)}
            size="small" sx={{ mt: 0.5, mb: 0 }} />
        </Box>
      </Box>

      <Divider />

      {/* Text */}
      {opts.mode === 'characters' && (
        <>
          <Box>
            {label(zh ? '文字' : 'Text')}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {zh ? '角色名' : 'Name'}
            </Typography>
            <ToggleButtonGroup value={opts.nameDisplay} exclusive size="small"
              onChange={(_, v) => { if (v) set('nameDisplay', v as NameDisplay) }} sx={{ mb: 1 }}>
              <ToggleButton value="en">EN</ToggleButton>
              <ToggleButton value="zh">中文</ToggleButton>
              <ToggleButton value="both">{zh ? '双语' : 'Both'}</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {zh ? '能力文字' : 'Ability'}
            </Typography>
            <ToggleButtonGroup value={opts.abilityDisplay} exclusive size="small"
              onChange={(_, v) => { if (v) set('abilityDisplay', v as AbilityDisplay) }} sx={{ mb: 0.5, flexWrap: 'wrap' }}>
              <ToggleButton value="en">EN</ToggleButton>
              <ToggleButton value="zh">中文</ToggleButton>
              <ToggleButton value="both">{zh ? '双语' : 'Both'}</ToggleButton>
              <ToggleButton value="hidden">{zh ? '隐藏' : 'Hide'}</ToggleButton>
            </ToggleButtonGroup>
            {opts.abilityDisplay !== 'hidden' && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, mt: 0.5 }}>
                  {zh ? '排列方式' : 'Style'}
                </Typography>
                <ToggleButtonGroup value={opts.abilityStyle} exclusive size="small"
                  onChange={(_, v) => { if (v) set('abilityStyle', v as 'arc' | 'straight') }} sx={{ mb: 1 }}>
                  <ToggleButton value="arc">{zh ? '弧形' : 'Arc'}</ToggleButton>
                  <ToggleButton value="straight">{zh ? '直排' : 'Straight'}</ToggleButton>
                </ToggleButtonGroup>
              </>
            )}
            {ptSlider(zh ? '角色名字号' : 'Name size', 'nameFontSize', 5, 16)}
            {opts.abilityDisplay !== 'hidden' && ptSlider(zh ? '能力文字字号' : 'Ability size', 'abilityFontSize', 3, 10)}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">{zh ? '图标大小' : 'Icon size'}: {Math.round(opts.iconSizeRatio * 100)}%</Typography>
              <Slider value={opts.iconSizeRatio} min={0.4} max={1.6} step={0.05}
                onChange={(_, v) => set('iconSizeRatio', v as number)}
                marks={[{ value: 0.4, label: '40%' }, { value: 1.0, label: '100%' }, { value: 1.6, label: '160%' }]}
                size="small" sx={{ mt: 0.5, mb: 0 }} />
            </Box>
          </Box>

          <Box>
            {fontSelect(zh ? '英文字体' : 'EN Font', 'fontKeyEn')}
            {fontSelect(zh ? '中文字体' : 'ZH Font', 'fontKeyZh')}
          </Box>

          <Divider />
        </>
      )}

      {/* Background */}
      <Box>
        {label(zh ? '背景' : 'Background')}
        <ToggleButtonGroup value={opts.bgType} exclusive size="small"
          onChange={(_, v) => { if (v) set('bgType', v as TokenPrintOptions['bgType']) }} sx={{ mb: 1 }}>
          <ToggleButton value="none">{zh ? '无' : 'None'}</ToggleButton>
          <ToggleButton value="color">{zh ? '纯色' : 'Color'}</ToggleButton>
          <ToggleButton value="image">{zh ? '图片' : 'Image'}</ToggleButton>
        </ToggleButtonGroup>

        {opts.bgType === 'color' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">{zh ? '颜色' : 'Color'}</Typography>
            <input type="color" value={opts.bgColor}
              onChange={(e) => set('bgColor', e.target.value)}
              style={{ width: 40, height: 28, border: 'none', padding: 0, cursor: 'pointer' }} />
          </Box>
        )}

        {opts.bgType === 'image' && (
          <Box>
            <input ref={bgImgRef} type="file" accept="image/*" hidden onChange={handleBgImageUpload} />
            <Button size="small" variant="outlined" onClick={() => bgImgRef.current?.click()} sx={{ mb: 0.5 }}>
              {opts.bgImage ? (zh ? '更换图片' : 'Change image') : (zh ? '上传图片' : 'Upload image')}
            </Button>
            {opts.bgImage && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 0.5 }}>
                  {zh ? '填充方式' : 'Fit'}
                </Typography>
                <ToggleButtonGroup value={opts.bgFit} exclusive size="small"
                  onChange={(_, v) => { if (v) set('bgFit', v as TokenPrintOptions['bgFit']) }}>
                  <ToggleButton value="cover">{zh ? '填充' : 'Cover'}</ToggleButton>
                  <ToggleButton value="contain">{zh ? '适应' : 'Contain'}</ToggleButton>
                  <ToggleButton value="stretch">{zh ? '拉伸' : 'Stretch'}</ToggleButton>
                </ToggleButtonGroup>
              </>
            )}
          </Box>
        )}
      </Box>

      <Divider />

      {/* Border */}
      <Box>
        {label(zh ? '边框' : 'Border')}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {zh ? `宽度: ${opts.borderWidth}px` : `Width: ${opts.borderWidth}px`}
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
        {label(zh ? '输出' : 'Output')}
        <FormControl size="small" fullWidth sx={{ mb: 1 }}>
          <InputLabel>{zh ? '纸张' : 'Page size'}</InputLabel>
          <Select value={opts.pageSize} label={zh ? '纸张' : 'Page size'}
            onChange={(e) => set('pageSize', e.target.value as PageSize)}>
            {(Object.entries(PAGE_SIZE_DEFS) as [PageSize, { label: string }][]).map(([k, d]) => (
              <MenuItem key={k} value={k}>{d.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={opts.blackAndWhite} size="small"
            onChange={(e) => set('blackAndWhite', e.target.checked)} />}
          label={<Typography variant="body2">{zh ? '黑白打印' : 'Black & white'}</Typography>}
        />
      </Box>

      <Divider />

      {/* Watermark */}
      <Box>
        {label(zh ? '水印（可选）' : 'Watermark (optional)')}
        <FormControlLabel
          control={<Switch checked={opts.watermarkEnabled} size="small"
            onChange={(e) => set('watermarkEnabled', e.target.checked)} />}
          label={<Typography variant="body2">{zh ? '启用水印' : 'Enable watermark'}</Typography>}
        />

        {opts.watermarkEnabled && (
          <Box sx={{ mt: 1, pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
            <ToggleButtonGroup value={opts.watermark.type} exclusive size="small"
              onChange={(_, v) => { if (v) onChange({ ...opts, watermark: { ...opts.watermark, type: v } }) }}
              sx={{ mb: 1 }}>
              <ToggleButton value="text">{zh ? '文字' : 'Text'}</ToggleButton>
              <ToggleButton value="image">{zh ? '图片' : 'Image'}</ToggleButton>
            </ToggleButtonGroup>

            {opts.watermark.type === 'text' ? (
              <Box>
                <TextField size="small" fullWidth label={zh ? '水印文字' : 'Watermark text'}
                  value={opts.watermark.text} sx={{ mb: 1 }}
                  onChange={(e) => onChange({ ...opts, watermark: { ...opts.watermark, text: e.target.value } })} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">{zh ? '颜色' : 'Color'}</Typography>
                  <input type="color" value={opts.watermark.color}
                    onChange={(e) => onChange({ ...opts, watermark: { ...opts.watermark, color: e.target.value } })}
                    style={{ width: 32, height: 24, border: 'none', padding: 0, cursor: 'pointer' }} />
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">{zh ? `字号: ${opts.watermark.fontSize}pt` : `Size: ${opts.watermark.fontSize}pt`}</Typography>
                  <Slider value={opts.watermark.fontSize} min={4} max={16} step={0.5} size="small"
                    onChange={(_, v) => onChange({ ...opts, watermark: { ...opts.watermark, fontSize: v as number } })}
                    sx={{ mt: 0.5, mb: 0 }} />
                </Box>
              </Box>
            ) : (
              <Box sx={{ mb: 1 }}>
                <input ref={wmImgRef} type="file" accept="image/*" hidden onChange={handleWmImageUpload} />
                <Button size="small" variant="outlined" onClick={() => wmImgRef.current?.click()}>
                  {opts.watermark.imageData ? (zh ? '更换图片' : 'Change') : (zh ? '上传图片' : 'Upload')}
                </Button>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {zh ? '位置' : 'Position'}
            </Typography>
            <ToggleButtonGroup value={opts.watermark.position} exclusive size="small"
              onChange={(_, v) => { if (v) onChange({ ...opts, watermark: { ...opts.watermark, position: v } }) }}
              sx={{ mb: 1 }}>
              <ToggleButton value="center" sx={{ fontSize: '0.7rem' }}>{zh ? '居中' : 'Center'}</ToggleButton>
              <ToggleButton value="bottom-center" sx={{ fontSize: '0.7rem' }}>{zh ? '底部' : 'Bottom'}</ToggleButton>
              <ToggleButton value="bottom-right" sx={{ fontSize: '0.7rem' }}>{zh ? '右下' : 'B-Right'}</ToggleButton>
            </ToggleButtonGroup>

            <Box>
              <Typography variant="caption" color="text.secondary">
                {zh ? `透明度: ${Math.round(opts.watermark.opacity * 100)}%` : `Opacity: ${Math.round(opts.watermark.opacity * 100)}%`}
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
