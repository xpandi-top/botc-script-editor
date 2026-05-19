import React, { useEffect, useRef, useState } from 'react'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import { NightOrderManager } from '../NightOrderManager'
import { JinxManager } from '../JinxManager'
import {
  Box, Button, Checkbox, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl,
  IconButton, InputLabel, Paper, Select, MenuItem, Snackbar, TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import UploadIcon from '@mui/icons-material/Upload'
import DOMPurify from 'dompurify'

const PURIFY_OPTS: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span'],
  ALLOWED_ATTR: [],
}
import { CharacterRevisionPanel } from '../CharacterRevisionPanel'
import { CustomCharDialog } from '../CustomCharDialog'
import { FilterCheckbox } from '../FilterCheckbox'
import {
  editionLabels,
  getAbilityText,
  getDisplayName,
  getIconForCharacter,
  getCurrentRevision,
  teamLabels,
  teamOrder,
  toTitleCase,
  slugify,
  allCharacterFiles,
  applyCharacterPack,
  clearCharacterPackOverrides,
  refreshCharPackOverrides,
  CHAR_PACK_OVERRIDES_KEY,
  REVISION_OVERRIDES_KEY,
  refreshRevisionOverrides,
} from '../../catalog'

// Read pack overrides at render time to know which chars have overrides applied
function getPackOverrideIds(): Set<string> {
  try { return new Set(Object.keys(JSON.parse(localStorage.getItem(CHAR_PACK_OVERRIDES_KEY) ?? '{}'))) } catch { return new Set() }
}
import type { CharacterFileEntry } from '../../types'
import type { CharacterEntry, CustomCharacter, Language, Team } from '../../types'
import { makeT, makeTpl } from '../../lib/t'

type Props = {
  uiText: Record<string, string>
  uiLanguage: Language
  filteredCharacters: CharacterEntry[]
  availableEditions: string[]
  selectedTeams: Team[]
  selectedEditions: string[]
  selectedCharacter: CharacterEntry | undefined
  characterQuery: string
  setCharacterQuery: (v: string) => void
  setSelectedCharacterId: (id: string) => void
  toggleTeam: (team: Team) => void
  toggleEdition: (edition: string) => void
  onLanguageChange: (lang: Language) => void
  customChars: CustomCharacter[]
  setCustomChars: React.Dispatch<React.SetStateAction<CustomCharacter[]>>
  initialNewCharId?: string | null
  onInitialNewCharConsumed?: () => void
}

// ── Script-schema normalizer ──────────────────────────────────────────────────
// BOTC scripts embed characters as: { id, name, ability, team, ... } (flat, no en/zh).
// We normalize to CharacterFileEntry with locale sections.

function normalizePackEntry(raw: unknown): CharacterFileEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' ? r.id.trim() : null
  if (!id || id.startsWith('_')) return null  // skip _meta etc.

  const team = (typeof r.team === 'string' ? r.team : 'townsfolk') as Team
  const edition = typeof r.edition === 'string' ? r.edition : 'custom'

  // Already in our locale format (has en/zh objects)
  if (r.en && typeof r.en === 'object') {
    return { ...r, id, team, edition } as unknown as CharacterFileEntry
  }

  // Script schema: flat name/ability fields
  const nameFlat  = typeof r.name     === 'string' ? r.name     : undefined
  const nameEng   = typeof r.name_eng === 'string' ? r.name_eng : undefined  // some zh scripts
  const abilityFlat = typeof r.ability === 'string' ? r.ability : undefined
  // Detect Chinese text by CJK codepoint range
  const isChinese = nameFlat ? /[一-鿿㐀-䶿]/.test(nameFlat) : false

  const result: CharacterFileEntry = { id, team, edition }

  if (isChinese) {
    result.zh = { name: nameFlat, ability: abilityFlat }
    if (nameEng) result.en = { name: nameEng }
  } else {
    result.en = { name: nameFlat, ability: abilityFlat }
    if (nameEng) result.zh = { name: nameEng }  // some packs store zh in name_eng position
  }

  // Preserve mechanical fields if present
  if (typeof r.firstNight === 'number')           result.firstNight = r.firstNight
  if (typeof r.otherNight === 'number')           result.otherNight = r.otherNight
  if (typeof r.firstNightReminder === 'string')   result.firstNightReminder = r.firstNightReminder
  if (typeof r.otherNightReminder === 'string')   result.otherNightReminder = r.otherNightReminder
  if (typeof r.setup === 'boolean')               result.setup = r.setup
  if (Array.isArray(r.reminders))
    result.reminders = r.reminders.filter((x): x is string => typeof x === 'string')
  if (Array.isArray(r.remindersGlobal))
    result.remindersGlobal = r.remindersGlobal.filter((x): x is string => typeof x === 'string')

  // Preserve image: normalize array → first string
  if (typeof r.image === 'string' && r.image)
    result.image = r.image
  else if (Array.isArray(r.image) && typeof r.image[0] === 'string')
    result.image = r.image[0]

  return result
}

// ── Pack Import Preview Dialog ────────────────────────────────────────────────

// Per-entry edits (keyed by ORIGINAL id)
type PackEdit = {
  id?: string       // user-overridden ID
  team?: Team
  edition?: string
  setup?: boolean
  firstNight?: string   // stored as string for text field; parsed to number on confirm
  otherNight?: string
  image?: string    // icon URL (string; array already collapsed to first element)
  author?: string   // custom character author attribution
  reminders?: string        // comma-separated; split to array on confirm
  remindersGlobal?: string  // comma-separated
  en?: { name?: string; ability?: string }
  zh?: { name?: string; ability?: string }
}

// authorByOrigId: maps original char ID → author string for new (non-catalog) chars
type PackImportDialogProps = {
  open: boolean
  onClose: () => void
  pack: CharacterFileEntry[]
  language: Language
  knownIds: Set<string>
  existingCustomIds: Set<string>
  onConfirm: (selected: CharacterFileEntry[], authorByOrigId: Record<string, string>) => void
}

function PackImportDialog({ open, onClose, pack, language, knownIds, existingCustomIds, onConfirm }: PackImportDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [edits, setEdits] = useState<Record<string, PackEdit>>({})
  const zh = language === 'zh'

  React.useEffect(() => {
    if (open) {
      setSelected(new Set(pack.map((c) => c.id)))
      setExpanded(new Set())
      // Auto-initialize edits with cleaned IDs.
      // For new chars (not in catalog), pre-fill with custom_ prefix.
      const initialEdits: Record<string, PackEdit> = {}
      for (const c of pack) {
        const isKnown = knownIds.has(c.id)
        if (isKnown) {
          // Catalog char: clean if dirty, no prefix needed
          const clean = slugify(c.id)
          if (clean && clean !== c.id) initialEdits[c.id] = { id: clean }
        } else {
          // New char: ensure custom_ prefix + clean slug
          const base = c.id.startsWith('custom_') ? c.id : `custom_${slugify(c.id) || c.id}`
          if (base !== c.id) initialEdits[c.id] = { id: base }
        }
      }
      setEdits(initialEdits)
    }
  }, [open, pack])

  const toggleSelect = (origId: string) => setSelected((s) => {
    const n = new Set(s); n.has(origId) ? n.delete(origId) : n.add(origId); return n
  })
  const toggleExpand = (origId: string) => setExpanded((s) => {
    const n = new Set(s); n.has(origId) ? n.delete(origId) : n.add(origId); return n
  })
  const selectAll  = () => setSelected(new Set(pack.map((c) => c.id)))
  const selectNone = () => setSelected(new Set())

  const patchEdit = (origId: string, patch: Partial<PackEdit>) => {
    setEdits((prev) => ({ ...prev, [origId]: { ...prev[origId], ...patch } }))
  }
  const patchEditLocale = (origId: string, lang: 'en' | 'zh', field: 'name' | 'ability', value: string) => {
    setEdits((prev) => {
      const cur = prev[origId] ?? {}
      return { ...prev, [origId]: { ...cur, [lang]: { ...cur[lang], [field]: value } } }
    })
  }

  const splitTokens = (s: string | undefined): string[] | undefined => {
    if (s === undefined) return undefined
    const arr = s.split(',').map((t) => t.trim()).filter(Boolean)
    return arr.length > 0 ? arr : []
  }

  const handleConfirm = () => {
    const out: CharacterFileEntry[] = []
    const authorByOrigId: Record<string, string> = {}
    for (const c of pack) {
      if (!selected.has(c.id)) continue
      const e = edits[c.id] ?? {}
      const finalId   = e.id?.trim() || c.id
      const firstNum  = e.firstNight !== undefined ? (parseFloat(e.firstNight) || undefined) : c.firstNight
      const otherNum  = e.otherNight !== undefined ? (parseFloat(e.otherNight) || undefined) : c.otherNight
      const rawImg    = Array.isArray(c.image) ? c.image[0] : (c.image as string | undefined)
      const finalImg  = e.image !== undefined ? (e.image.trim() || undefined) : (rawImg || undefined)
      // Reminders: edit override (split from comma string) → original entry value
      const finalReminders       = e.reminders       !== undefined ? splitTokens(e.reminders)       : c.reminders
      const finalRemindersGlobal = e.remindersGlobal !== undefined ? splitTokens(e.remindersGlobal) : c.remindersGlobal
      if (e.author?.trim()) authorByOrigId[finalId] = e.author.trim()
      out.push({
        ...c,
        id:               finalId,
        team:             e.team    ?? c.team,
        edition:          e.edition ?? c.edition,
        setup:            e.setup   ?? c.setup,
        firstNight:       firstNum,
        otherNight:       otherNum,
        image:            finalImg,
        reminders:        finalReminders,
        remindersGlobal:  finalRemindersGlobal,
        en: e.en ? { ...c.en, ...e.en } : c.en,
        zh: e.zh ? { ...c.zh, ...e.zh } : c.zh,
      })
    }
    onConfirm(out, authorByOrigId)
  }

  // Effective (post-edit) IDs for counting
  const effectiveId = (c: CharacterFileEntry) => edits[c.id]?.id?.trim() || c.id
  const selectedEffIds = new Set(pack.filter((c) => selected.has(c.id)).map(effectiveId))
  const newCount  = [...selectedEffIds].filter((id) => !knownIds.has(id)).length
  const overCount = [...selectedEffIds].filter((id) =>  knownIds.has(id)).length

  // Detect dirty ID (doesn't match its own slugified form)
  const isIdDirty = (id: string) => { const s = slugify(id); return s !== id && s.length > 0 }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {zh ? '导入角色包预览' : 'Import Character Pack'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {zh
              ? `共 ${pack.length} 个角色 · 已选 ${selected.size}`
              : `${pack.length} characters · ${selected.size} selected`}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="small" onClick={selectAll}  sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0 }}>{zh ? '全选' : 'All'}</Button>
        <Button size="small" onClick={selectNone} sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0 }}>{zh ? '取消全选' : 'None'}</Button>
        {newCount  > 0 && <Chip size="small" label={zh ? `新增 ${newCount}`  : `${newCount} new`}       color="success" sx={{ fontSize: '0.7rem', height: 20 }} />}
        {overCount > 0 && <Chip size="small" label={zh ? `覆盖 ${overCount}` : `${overCount} overrides`} color="warning" sx={{ fontSize: '0.7rem', height: 20 }} />}
      </Box>

      <Divider />
      <DialogContent sx={{ p: 0 }}>
        {pack.map((c, i) => {
          const e        = edits[c.id] ?? {}
          const finalId  = e.id?.trim() || c.id
          const effIsNew = !knownIds.has(finalId)
          const isSel    = selected.has(c.id)
          const isExp    = expanded.has(c.id)
          const idDirty  = isIdDirty(c.id) && !e.id   // original is dirty and not yet fixed

          const nameEn    = e.en?.name    ?? c.en?.name    ?? c.id
          const nameZh    = e.zh?.name    ?? c.zh?.name    ?? ''
          const abilityEn = e.en?.ability ?? c.en?.ability ?? ''
          const abilityZh = e.zh?.ability ?? c.zh?.ability ?? ''
          const teamVal   = e.team    ?? c.team
          const editionVal= e.edition ?? c.edition
          const setupVal  = e.setup   ?? c.setup ?? false
          const fnVal     = e.firstNight !== undefined ? e.firstNight : (c.firstNight?.toString() ?? '')
          const onVal     = e.otherNight !== undefined ? e.otherNight : (c.otherNight?.toString() ?? '')
          // Effective image: edit override → normalized entry image → undefined
          const rawImgEntry = Array.isArray(c.image) ? c.image[0] : (c.image as string | undefined)
          const imageVal  = e.image !== undefined ? e.image : (rawImgEntry ?? '')
          const imageUrl  = imageVal.trim() || null
          const authorVal = e.author ?? ''
          // Reminders: edit (comma-sep string) → join original array → empty string
          const remindersVal       = e.reminders       !== undefined ? e.reminders       : (c.reminders?.join(', ')       ?? '')
          const remindersGlobalVal = e.remindersGlobal !== undefined ? e.remindersGlobal : (c.remindersGlobal?.join(', ') ?? '')
          const displayName = zh ? (nameZh || nameEn) : nameEn

          return (
            <Box key={c.id}>
              {i > 0 && <Divider />}
              {/* Row header */}
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75,
                bgcolor: isSel ? 'transparent' : 'action.disabledBackground',
                opacity: isSel ? 1 : 0.6,
              }}>
                <Checkbox size="small" checked={isSel} onChange={() => toggleSelect(c.id)} sx={{ p: 0.25, flexShrink: 0 }} />
                {/* Character image preview */}
                {imageUrl ? (
                  <Box component="img" src={imageUrl} alt=""
                    onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none' }}
                    sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'contain',
                      bgcolor: 'background.default', flexShrink: 0, border: '1px solid', borderColor: 'divider' }} />
                ) : (
                  <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'action.disabledBackground',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.disabled' }}>
                      {(nameEn || c.id).slice(0, 2).toUpperCase()}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.3 }}>{displayName}</Typography>
                    <Chip size="small"
                      label={effIsNew ? (zh ? '新增' : 'NEW') : (zh ? '覆盖' : 'UPDATE')}
                      color={effIsNew ? 'success' : 'warning'} variant="outlined"
                      sx={{ fontSize: '0.62rem', height: 18, '& .MuiChip-label': { px: 0.5 } }} />
                    <Chip size="small" label={teamVal} variant="outlined"
                      sx={{ fontSize: '0.62rem', height: 18, '& .MuiChip-label': { px: 0.5 }, textTransform: 'capitalize' }} />
                    {idDirty && (
                      <Chip size="small" label={zh ? 'ID需清理' : 'dirty ID'} color="error" variant="outlined"
                        sx={{ fontSize: '0.62rem', height: 18, '& .MuiChip-label': { px: 0.5 } }} />
                    )}
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>{finalId}</Typography>
                  </Box>
                  {!isExp && abilityEn && (
                    <Typography variant="caption" color="text.secondary"
                      sx={{ display: 'block', mt: 0.25, fontSize: '0.75rem', lineHeight: 1.35 }}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(zh ? (abilityZh || abilityEn) : abilityEn, PURIFY_OPTS) }} />
                  )}
                </Box>
                <IconButton size="small" onClick={() => toggleExpand(c.id)} sx={{ p: 0.25, flexShrink: 0 }}>
                  {isExp ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </Box>

              {/* Expanded edit form */}
              <Collapse in={isExp}>
                <Box sx={{ px: 2, pb: 1.5, pt: 0.75, bgcolor: 'action.hover', display: 'flex', flexDirection: 'column', gap: 1.25 }}>

                  {/* ID row with clean suggestion + duplicate check */}
                  <Box>
                    <TextField size="small" fullWidth
                      label={zh ? '角色 ID（唯一标识）' : 'Character ID (unique key)'}
                      value={e.id ?? c.id}
                      onChange={(ev) => patchEdit(c.id, { id: ev.target.value })}
                      error={(() => {
                        const raw = e.id ?? c.id
                        if (!/^[a-z0-9_-]+$/.test(raw)) return true
                        // Duplicate: same as another pack entry (different origId) or existing custom char
                        const otherPack = pack.some((p) => p.id !== c.id && (edits[p.id]?.id?.trim() || p.id) === raw)
                        return otherPack || existingCustomIds.has(raw)
                      })()}
                      helperText={(() => {
                        const raw = e.id ?? c.id
                        const clean = slugify(raw)
                        if (!/^[a-z0-9_-]+$/.test(raw)) return zh ? '只允许小写字母、数字、-、_' : 'Only lowercase letters, digits, - _'
                        const otherPack = pack.some((p) => p.id !== c.id && (edits[p.id]?.id?.trim() || p.id) === raw)
                        if (otherPack) return zh ? '⚠ 与包内另一角色 ID 重复' : '⚠ Duplicate ID within this pack'
                        if (existingCustomIds.has(raw)) return zh ? '⚠ 已存在同名自定义角色' : '⚠ Custom character with this ID already exists'
                        if (raw !== clean && clean) return (zh ? '建议: ' : 'Suggested: ') + clean
                        return ''
                      })()}
                      slotProps={{
                        input: {
                          endAdornment: (() => {
                            const raw = e.id ?? c.id
                            const clean = slugify(raw)
                            return (raw !== clean && clean) ? (
                              <Button size="small" onClick={() => patchEdit(c.id, { id: clean })}
                                sx={{ textTransform: 'none', fontSize: '0.7rem', px: 0.75, py: 0, minWidth: 0 }}>
                                {zh ? '应用' : 'Apply'}
                              </Button>
                            ) : null
                          })() as React.ReactNode,
                        },
                      }}
                    />
                  </Box>

                  {/* Names row */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField size="small" fullWidth label={zh ? '英文名' : 'Name (EN)'}
                      value={nameEn}
                      onChange={(ev) => patchEditLocale(c.id, 'en', 'name', ev.target.value)} />
                    <TextField size="small" fullWidth label={zh ? '中文名' : 'Name (ZH)'}
                      value={nameZh}
                      onChange={(ev) => patchEditLocale(c.id, 'zh', 'name', ev.target.value)} />
                  </Box>

                  {/* Ability rows */}
                  <TextField size="small" fullWidth multiline minRows={2}
                    label={zh ? '能力文本 (EN)' : 'Ability (EN)'}
                    value={abilityEn}
                    onChange={(ev) => patchEditLocale(c.id, 'en', 'ability', ev.target.value)} />
                  <TextField size="small" fullWidth multiline minRows={2}
                    label={zh ? '能力文本 (ZH)' : 'Ability (ZH)'}
                    value={abilityZh}
                    onChange={(ev) => patchEditLocale(c.id, 'zh', 'ability', ev.target.value)} />

                  {/* Team / Edition / Setup row */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                      <InputLabel sx={{ fontSize: '0.8rem' }}>{zh ? '阵营' : 'Team'}</InputLabel>
                      <Select
                        value={teamVal} label={zh ? '阵营' : 'Team'}
                        onChange={(ev) => patchEdit(c.id, { team: ev.target.value as Team })}
                        sx={{ fontSize: '0.8rem' }}
                      >
                        {teamOrder.map((t) => (
                          <MenuItem key={t} value={t} sx={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{t}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField size="small" label={zh ? '版本/来源' : 'Edition'}
                      value={editionVal}
                      onChange={(ev) => patchEdit(c.id, { edition: ev.target.value })}
                      sx={{ width: 100 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pt: 0.5 }}>
                      <Checkbox size="small" checked={setupVal} sx={{ p: 0.25 }}
                        onChange={(ev) => patchEdit(c.id, { setup: ev.target.checked })} />
                      <Typography variant="caption" color="text.secondary">{zh ? '影响setup' : 'Setup'}</Typography>
                    </Box>
                  </Box>

                  {/* Night order positions */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField size="small" sx={{ width: 130 }}
                      label={zh ? '第一夜顺序' : 'First Night #'}
                      value={fnVal} type="number" slotProps={{ htmlInput: { min: 0 } }}
                      onChange={(ev) => patchEdit(c.id, { firstNight: ev.target.value })} />
                    <TextField size="small" sx={{ width: 130 }}
                      label={zh ? '其他夜顺序' : 'Other Night #'}
                      value={onVal} type="number" slotProps={{ htmlInput: { min: 0 } }}
                      onChange={(ev) => patchEdit(c.id, { otherNight: ev.target.value })} />
                  </Box>

                  {/* Author */}
                  <TextField size="small" fullWidth
                    label={zh ? '作者' : 'Author'}
                    value={authorVal}
                    placeholder={zh ? '（留空则显示"Imported"）' : 'Leave empty → "Imported"'}
                    onChange={(ev) => patchEdit(c.id, { author: ev.target.value })}
                  />

                  {/* Reminder tokens */}
                  <TextField size="small" fullWidth
                    label={zh ? '提示标记（逗号分隔）' : 'Reminder tokens (comma-separated)'}
                    value={remindersVal}
                    placeholder={zh ? '例如: Wrong, Drunk' : 'e.g. Wrong, Drunk'}
                    helperText={zh ? '放置于其他玩家座位上的标记' : 'Tokens placed on other players\' seats'}
                    onChange={(ev) => patchEdit(c.id, { reminders: ev.target.value })}
                  />
                  <TextField size="small" fullWidth
                    label={zh ? '全局提示标记（逗号分隔）' : 'Global reminder tokens (comma-separated)'}
                    value={remindersGlobalVal}
                    placeholder={zh ? '例如: No Ability' : 'e.g. No Ability'}
                    helperText={zh ? '所有座位均可使用的标记' : 'Tokens available on all seats'}
                    onChange={(ev) => patchEdit(c.id, { remindersGlobal: ev.target.value })}
                  />

                  {/* Image URL with live preview */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField size="small" fullWidth
                      label={zh ? '角色图片 URL' : 'Icon Image URL'}
                      value={imageVal}
                      placeholder="https://..."
                      onChange={(ev) => patchEdit(c.id, { image: ev.target.value })}
                      helperText={imageUrl ? (zh ? '预览见右侧' : 'Preview on right') : (zh ? '留空使用默认占位符' : 'Leave empty for placeholder')}
                    />
                    {/* Live preview circle */}
                    {imageUrl ? (
                      <Box component="img" src={imageUrl} alt=""
                        onError={(ev) => { (ev.target as HTMLImageElement).style.visibility = 'hidden' }}
                        sx={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'contain', flexShrink: 0,
                          border: '1.5px solid', borderColor: 'divider', bgcolor: 'background.default', mt: 0.5 }} />
                    ) : (
                      <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'action.disabledBackground',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.5,
                        border: '1.5px dashed', borderColor: 'divider' }}>
                        <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
                          {(nameEn || c.id).slice(0, 2).toUpperCase()}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                </Box>
              </Collapse>
            </Box>
          )
        })}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 2, py: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>{zh ? '取消' : 'Cancel'}</Button>
        <Button variant="contained" disabled={selected.size === 0} onClick={handleConfirm} sx={{ textTransform: 'none' }}>
          {zh ? `导入 ${selected.size} 个` : `Import ${selected.size}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Custom char dialog state ──────────────────────────────────────────────────


export function CharactersTab({
  uiText,
  uiLanguage,
  filteredCharacters,
  availableEditions,
  selectedTeams,
  selectedEditions,
  selectedCharacter,
  characterQuery,
  setCharacterQuery,
  setSelectedCharacterId,
  toggleTeam,
  toggleEdition,
  onLanguageChange,
  customChars,
  setCustomChars,
  initialNewCharId,
  onInitialNewCharConsumed,
}: Props) {
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [nightOrderOpen, setNightOrderOpen] = useState(false)
  const [jinxOpen, setJinxOpen] = useState(false)
  const [editingChar, setEditingChar] = useState<CustomCharacter | null>(null)
  const [snackMsg, setSnackMsg] = useState('')
  const [hasPackOverrides, setHasPackOverrides] = useState(() => {
    try { return Object.keys(JSON.parse(localStorage.getItem(CHAR_PACK_OVERRIDES_KEY) ?? '{}')).length > 0 } catch { return false }
  })
  const [importPreviewPack, setImportPreviewPack] = useState<CharacterFileEntry[]>([])
  const [importPreviewOpen, setImportPreviewOpen] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const addCharInputRef = useRef<HTMLInputElement>(null)
  const t = makeT(uiLanguage)
  const tpl = makeTpl(uiLanguage)

  // ── Download pack ─────────────────────────────────────────────────────────────
  const downloadPack = (edition: string) => {
    // Convert custom chars to CharacterFileEntry shape for export
    const customEntries: CharacterFileEntry[] = customChars.map((c) => ({
      id: c.id,
      team: c.team,
      edition: c.edition,
      en: { name: c.nameEn, ability: c.abilityEn },
      ...(c.nameZh || c.abilityZh ? { zh: { name: c.nameZh, ability: c.abilityZh } } : {}),
    }))

    const allEntries = [...allCharacterFiles, ...customEntries]

    const chars: CharacterFileEntry[] = edition === 'all'
      ? allEntries
      : allEntries.filter((c) => c.edition === edition)

    const blob = new Blob([JSON.stringify(chars, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = edition === 'all' ? 'botc_characters_all.json' : `botc_characters_${edition}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import pack ───────────────────────────────────────────────────────────────
  const handleImportPack = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        const raw: unknown[] = Array.isArray(data) ? data : [data]
        // Normalize: handles both script-schema format and our CharacterFileEntry format
        const pack = raw.map(normalizePackEntry).filter((c): c is CharacterFileEntry => c !== null)
        if (!pack.length) { setSnackMsg(t('import_failed_json')); return }
        setImportPreviewPack(pack)
        setImportPreviewOpen(true)
      } catch {
        setSnackMsg(t('import_failed_json'))
      }
    }
    reader.readAsText(file)
  }

  const knownCatalogIds = React.useMemo(
    () => new Set(allCharacterFiles.map((c) => c.id)),
    [],
  )

  const handleConfirmImport = (selected: CharacterFileEntry[], authorByOrigId: Record<string, string>) => {
    const overrides: CharacterFileEntry[] = []
    const newChars: CustomCharacter[] = []
    const now = Date.now()

    for (const entry of selected) {
      if (knownCatalogIds.has(entry.id)) {
        // Existing catalog char — update via pack overrides
        overrides.push(entry)
      } else {
        // New character — add to customChars so it appears in the list
        const imgRaw = Array.isArray(entry.image) ? entry.image[0] : (entry.image as string | undefined)
        const icon = imgRaw?.trim() || undefined
        const author = authorByOrigId[entry.id] ?? 'Imported'
        newChars.push({
          id: entry.id,
          author,
          team: entry.team as Team,
          edition: entry.edition ?? 'Custom',
          nameEn: entry.en?.name ?? entry.id,
          nameZh: entry.zh?.name,
          abilityEn: entry.en?.ability ?? '',
          abilityZh: entry.zh?.ability,
          icon,
          firstNight: entry.firstNight,
          otherNight: entry.otherNight,
          firstNightReminder: entry.firstNightReminder,
          otherNightReminder: entry.otherNightReminder,
          reminders: entry.reminders,
          remindersGlobal: entry.remindersGlobal,
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    if (overrides.length > 0) {
      applyCharacterPack(overrides)
      refreshCharPackOverrides()
      setHasPackOverrides(true)
    }
    if (newChars.length > 0) {
      setCustomChars((cur) => [...cur, ...newChars])
    }

    setImportPreviewOpen(false)
    setSnackMsg(
      uiLanguage === 'zh'
        ? `已导入 ${selected.length} 个角色${newChars.length > 0 ? `（${newChars.length} 新增）` : ''}`
        : `Imported ${selected.length} character${selected.length !== 1 ? 's' : ''}${newChars.length > 0 ? ` (${newChars.length} new)` : ''}`
    )
  }

  const handleClearOverrides = () => {
    clearCharacterPackOverrides()
    refreshCharPackOverrides()
    setHasPackOverrides(false)
    setSnackMsg(t('cleared_pack_overrides'))
  }

  // ── Add single character from file ───────────────────────────────────────────
  const handleAddCharFromFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string)
        const entry: CharacterFileEntry = Array.isArray(raw) ? raw[0] : raw
        if (!entry?.id || !entry?.team) throw new Error('missing id or team')

        const isKnown = allCharacterFiles.some((c) => c.id === entry.id)
        if (isKnown) {
          // Override locale data for existing catalog character
          applyCharacterPack([entry])
          refreshCharPackOverrides()
          setHasPackOverrides(true)
          const name = entry.en?.name ?? entry.id
          setSnackMsg(tpl('updated_character', name))
        } else {
          // Add as new custom character
          const now = Date.now()
          const newChar: CustomCharacter = {
            id: entry.id.startsWith('custom_') ? entry.id : `custom_${entry.id}`,
            author: 'Imported',
            team: entry.team as Team,
            edition: entry.edition ?? 'Custom',
            nameEn: entry.en?.name ?? entry.id,
            nameZh: entry.zh?.name,
            abilityEn: entry.en?.ability ?? '',
            abilityZh: entry.zh?.ability,
            createdAt: now,
            updatedAt: now,
          }
          setCustomChars((cur) => [...cur, newChar])
          const name = newChar.nameEn
          setSnackMsg(tpl('added_character', name))
        }
      } catch {
        setSnackMsg(t('import_failed_char_json'))
      }
    }
    reader.readAsText(file)
  }

  const openNew = () => { setEditingChar(null); setCustomDialogOpen(true) }
  const openEdit = (c: CustomCharacter) => { setEditingChar(c); setCustomDialogOpen(true) }

  // Auto-open create dialog when a pending ID is passed from another tab
  useEffect(() => {
    if (!initialNewCharId) return
    setEditingChar(null)
    setCustomDialogOpen(true)
    onInitialNewCharConsumed?.()
  }, [initialNewCharId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveCustom = (draft: Omit<CustomCharacter, 'id' | 'createdAt' | 'updatedAt'>, customId?: string) => {
    const now = Date.now()
    if (editingChar) {
      setCustomChars((cur) => cur.map((c) => c.id === editingChar.id ? { ...editingChar, ...draft, updatedAt: now } : c))
    } else {
      const rawId = customId?.trim()
      const id = rawId
        ? (rawId.startsWith('custom_') ? rawId : `custom_${rawId}`)
        : `custom_${slugify(draft.nameEn)}_${now.toString(36)}`
      setCustomChars((cur) => [...cur, { ...draft, id, createdAt: now, updatedAt: now }])
      // Write v1 revision so revision panel shows history immediately
      try {
        const stored = JSON.parse(localStorage.getItem(REVISION_OVERRIDES_KEY) ?? '{}')
        stored[id] = {
          current_revision: 'v1',
          revisions: [{ id: 'v1', note: '' }],
          locale_en: { v1: draft.abilityEn },
          ...(draft.abilityZh?.trim() ? { locale_zh: { v1: draft.abilityZh } } : {}),
        }
        localStorage.setItem(REVISION_OVERRIDES_KEY, JSON.stringify(stored))
        refreshRevisionOverrides()
      } catch { /* ignore */ }
    }
    setCustomDialogOpen(false)
  }

  const deleteCustom = (id: string) => {
    if (!window.confirm(t('confirm_delete_char'))) return
    setCustomChars((cur) => cur.filter((c) => c.id !== id))
    // deselect if this was selected
    if (selectedCharacter?.id === id) setSelectedCharacterId('')
  }

  const handleSelect = (id: string) => {
    setSelectedCharacterId(id)
    setMobileDetailOpen(true)
  }

  const revisionPanelProps = {
    chineseTextLabel: uiText.chineseText,
    currentLabel: uiText.current,
    currentRevisionLabel: uiText.currentRevision,
    englishTextLabel: uiText.englishText,
    language: uiLanguage,
    noCharacterSelectedLabel: uiText.noCharacterSelected,
    revisionNoteLabel: uiText.revisionNote,
    revisionHistoryLabel: uiText.revisionHistory,
    title: uiText.characterVersions,
    onEditCustom: openEdit,
    onDeleteCustom: deleteCustom,
    customChars,
  }

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, height: { lg: 'calc(100vh - 160px)' }, alignItems: 'flex-start' }}>
        {/* ── Left: list panel ── */}
        <Paper elevation={0} sx={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
          height: { lg: '100%' },
          overflow: 'hidden',
        }}>
          {/* Sticky filters */}
          <Box sx={{ p: 2, pb: 1, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box>
                <Typography variant="h6">{uiText.allCharacters}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {filteredCharacters.length} {uiText.resultsSuffix}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={openNew}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                  {t('custom')}
                </Button>
                <Tooltip title={t('add_char_from_json')}>
                  <IconButton size="small" onClick={() => addCharInputRef.current?.click()} sx={{ color: 'text.secondary' }}>
                    <UploadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <input
                  ref={addCharInputRef}
                  type="file"
                  accept=".json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleAddCharFromFile(f)
                    e.target.value = ''
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 72, '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
                  <InputLabel>{uiLanguage === 'zh' ? '语言' : 'Lang'}</InputLabel>
                  <Select value={uiLanguage} label={uiLanguage === 'zh' ? '语言' : 'Lang'} onChange={(e) => onLanguageChange(e.target.value as Language)}>
                    <MenuItem value="en">EN</MenuItem>
                    <MenuItem value="zh">中文</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <TextField
              fullWidth size="small"
              placeholder={uiText.searchCharacters}
              value={characterQuery}
              onChange={(e) => setCharacterQuery(e.target.value)}
              sx={{ mb: 1.5 }}
            />

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
              {teamOrder.map((team) => (
                <FilterCheckbox key={team} checked={selectedTeams.includes(team)}
                  label={teamLabels[uiLanguage][team]} onChange={() => toggleTeam(team)} />
              ))}
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {availableEditions.map((edition) => (
                <FilterCheckbox key={edition} checked={selectedEditions.includes(edition)}
                  label={editionLabels[uiLanguage][edition] ?? toTitleCase(edition)}
                  onChange={() => toggleEdition(edition)} />
              ))}
            </Box>

            {/* ── Import / Export row ── */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1, alignItems: 'center' }}>
              <Select
                size="small"
                displayEmpty
                value=""
                renderValue={() => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DownloadIcon sx={{ fontSize: '0.9rem' }} />
                    <Typography sx={{ fontSize: '0.75rem' }}>{t('download_pack')}</Typography>
                  </Box>
                )}
                onChange={(e) => { if (e.target.value) downloadPack(e.target.value as string) }}
                sx={{ minWidth: 110, '& .MuiSelect-select': { py: '4px', fontSize: '0.75rem' } }}
              >
                <MenuItem value="all" sx={{ fontSize: '0.8rem' }}>{t('all_characters')}</MenuItem>
                {[...new Set(allCharacterFiles.map((c) => c.edition))].sort().map((ed) => (
                  <MenuItem key={ed} value={ed} sx={{ fontSize: '0.8rem' }}>
                    {editionLabels[uiLanguage][ed] ?? toTitleCase(ed)}
                  </MenuItem>
                ))}
                {[...new Set(customChars.map((c) => c.edition))].sort().map((ed) => (
                  <MenuItem key={`custom-${ed}`} value={ed} sx={{ fontSize: '0.8rem' }}>
                    {toTitleCase(ed)}{t('custom_edition_suffix')}
                  </MenuItem>
                ))}
              </Select>

              <Button
                size="small"
                variant="outlined"
                startIcon={<UploadIcon fontSize="small" />}
                onClick={() => importInputRef.current?.click()}
                sx={{ textTransform: 'none', fontSize: '0.75rem', py: '3px' }}
              >
                {t('import_pack')}
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImportPack(f)
                  e.target.value = ''
                }}
              />

              <Button
                size="small"
                variant="outlined"
                startIcon={<NightsStayIcon fontSize="small" />}
                onClick={() => setNightOrderOpen(true)}
                sx={{ textTransform: 'none', fontSize: '0.75rem', py: '3px' }}
              >
                {t('night_order')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SyncAltIcon fontSize="small" />}
                onClick={() => setJinxOpen(true)}
                sx={{ textTransform: 'none', fontSize: '0.75rem', py: '3px' }}
              >
                {t('jinxes')}
              </Button>

              {hasPackOverrides && (
                <Chip
                  size="small"
                  label={t('pack_active')}
                  color="secondary"
                  onDelete={handleClearOverrides}
                  sx={{ fontSize: '0.7rem', height: 22 }}
                />
              )}
            </Box>
          </Box>

          {/* Scrollable character list */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
            <Box sx={{ display: 'grid', gap: 1 }}>
              {(() => {
                const packOverrideIds = getPackOverrideIds()
                return filteredCharacters.map((character) => {
                const icon = getIconForCharacter(character.id)
                const team = teamLabels[uiLanguage][character.team]
                const edition = editionLabels[uiLanguage][character.edition] ?? toTitleCase(character.edition)
                const currentRevision = getCurrentRevision(character.id)
                const isSelected = character.id === selectedCharacter?.id
                const isCustom = character.id.startsWith('custom_')
                const hasPackOverride = !isCustom && packOverrideIds.has(character.id)
                // "New" = custom char added within last 60 seconds (imported this session)
                const customEntry = customChars.find((c) => c.id === character.id)
                const isNewlyImported = customEntry && (Date.now() - customEntry.createdAt < 60_000) && customEntry.author === 'Imported'

                return (
                  <Button
                    key={character.id}
                    onClick={() => handleSelect(character.id)}
                    sx={{
                      display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5,
                      justifyContent: 'flex-start', border: '1px solid',
                      borderColor: isSelected ? 'primary.main' : isCustom ? 'secondary.main' : 'divider',
                      borderRadius: 2,
                      bgcolor: isSelected ? 'action.selected' : 'background.paper',
                      textTransform: 'none',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    {icon ? (
                      <Box component="img" src={icon} alt="" sx={{ width: 48, height: 48, borderRadius: 999, objectFit: 'contain', bgcolor: 'background.default', flexShrink: 0 }} />
                    ) : (
                      <Box sx={{ width: 48, height: 48, borderRadius: 999, bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>{character.id.slice(0, 2).toUpperCase()}</Typography>
                      </Box>
                    )}
                    <Box sx={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 600 }}>{getDisplayName(character.id, uiLanguage)}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                          {isNewlyImported && (
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', bgcolor: 'success.main', color: 'success.contrastText', px: 0.5, borderRadius: 0.5 }}>
                              {uiLanguage === 'zh' ? '新' : 'NEW'}
                            </Typography>
                          )}
                          {isCustom && !isNewlyImported && (
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', bgcolor: 'secondary.main', color: 'secondary.contrastText', px: 0.5, borderRadius: 0.5 }}>
                              {t('custom')}
                            </Typography>
                          )}
                          {hasPackOverride && (
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', bgcolor: 'warning.main', color: 'warning.contrastText', px: 0.5, borderRadius: 0.5 }}>
                              {uiLanguage === 'zh' ? '已覆盖' : 'PACK'}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">{team}</Typography>
                        </Box>
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        {character.id} · {edition} · {currentRevision}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getAbilityText(character.id, uiLanguage), PURIFY_OPTS) }} />
                    </Box>
                  </Button>
                )
              })
              })()}
            </Box>
          </Box>
        </Paper>

        {/* ── Right panel: desktop only ── */}
        <Box sx={{ display: { xs: 'none', lg: 'block' }, width: 380, flexShrink: 0, height: '100%', overflowY: 'auto' }}>
          <CharacterRevisionPanel
            character={selectedCharacter}
            {...revisionPanelProps}
          />
        </Box>
      </Box>

      {/* ── Mobile: detail popup ── */}
      <Dialog
        open={mobileDetailOpen}
        onClose={() => setMobileDetailOpen(false)}
        fullScreen
        sx={{ display: { lg: 'none' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
          <Box sx={{ flex: 1 }}>
            {selectedCharacter && (
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {getDisplayName(selectedCharacter.id, uiLanguage)}
              </Typography>
            )}
          </Box>
          <IconButton onClick={() => setMobileDetailOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <CharacterRevisionPanel
            character={selectedCharacter}
            {...revisionPanelProps}
          />
        </DialogContent>
      </Dialog>

      {/* ── Pack Import Preview ── */}
      <PackImportDialog
        open={importPreviewOpen}
        onClose={() => setImportPreviewOpen(false)}
        pack={importPreviewPack}
        language={uiLanguage}
        knownIds={knownCatalogIds}
        existingCustomIds={React.useMemo(() => new Set(customChars.map((c) => c.id)), [customChars])}
        onConfirm={handleConfirmImport}
      />

      {/* ── Import/export snackbar ── */}
      <Snackbar
        open={Boolean(snackMsg)}
        autoHideDuration={3000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* ── Create / Edit Custom Character Dialog ── */}
      <CustomCharDialog
        open={customDialogOpen}
        onClose={() => setCustomDialogOpen(false)}
        editingChar={editingChar}
        uiLanguage={uiLanguage}
        onSave={handleSaveCustom}
        initialId={editingChar ? undefined : initialNewCharId}
      />

      {/* ── Night Order Manager ── */}
      <NightOrderManager
        open={nightOrderOpen}
        onClose={() => setNightOrderOpen(false)}
        language={uiLanguage}
      />

      {/* ── Jinx Manager ── */}
      <JinxManager
        open={jinxOpen}
        onClose={() => setJinxOpen(false)}
        language={uiLanguage}
      />
    </>
  )
}
