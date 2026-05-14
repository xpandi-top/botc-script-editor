import React, { useRef, useState } from 'react'
import {
  Autocomplete, Box, Button, Chip, Dialog, DialogContent, DialogTitle, FormControl,
  FormControlLabel, IconButton, InputLabel, MenuItem, Paper, Radio, RadioGroup,
  Select, Snackbar, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import DOMPurify from 'dompurify'

const PURIFY_OPTS: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span'],
  ALLOWED_ATTR: [],
}
import { CharacterRevisionPanel } from '../CharacterRevisionPanel'
import { FilterCheckbox } from '../FilterCheckbox'
import { NightOrderPicker } from '../NightOrderPicker'
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
} from '../../catalog'
import type { CharacterFileEntry } from '../../types'
import { processIconFile } from '../../lib/iconResize'
import type { CharacterEntry, CustomCharacter, Language, Team } from '../../types'
import { makeT } from '../../lib/t'

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
}

// ── Custom char dialog state ──────────────────────────────────────────────────

const BLANK_CUSTOM: Omit<CustomCharacter, 'id' | 'createdAt' | 'updatedAt'> = {
  author: '',
  team: 'townsfolk',
  nameEn: '',
  nameZh: '',
  abilityEn: '',
  abilityZh: '',
  icon: undefined,
  edition: 'custom',
  firstNight: undefined,
  otherNight: undefined,
  firstNightReminder: '',
  otherNightReminder: '',
  reminders: [],
}

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
}: Props) {
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [editingChar, setEditingChar] = useState<CustomCharacter | null>(null)
  const [draft, setDraft] = useState<Omit<CustomCharacter, 'id' | 'createdAt' | 'updatedAt'>>(BLANK_CUSTOM)
  const [iconError, setIconError] = useState('')
  const [iconMode, setIconMode] = useState<'url' | 'upload'>('url')
  const [snackMsg, setSnackMsg] = useState('')
  const [hasPackOverrides, setHasPackOverrides] = useState(() => {
    try { return Object.keys(JSON.parse(localStorage.getItem(CHAR_PACK_OVERRIDES_KEY) ?? '{}')).length > 0 } catch { return false }
  })
  const importInputRef = useRef<HTMLInputElement>(null)
  const zh = uiLanguage === 'zh'
  const t = makeT(uiLanguage)

  // ── Download pack ─────────────────────────────────────────────────────────────
  const downloadPack = (edition: string) => {
    const chars: CharacterFileEntry[] = edition === 'all'
      ? allCharacterFiles
      : allCharacterFiles.filter((c) => c.edition === edition)
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
        const pack: CharacterFileEntry[] = Array.isArray(data) ? data : [data]
        applyCharacterPack(pack)
        refreshCharPackOverrides()
        setHasPackOverrides(true)
        setSnackMsg(zh ? `已导入 ${pack.length} 个角色数据` : `Imported ${pack.length} character(s)`)
      } catch {
        setSnackMsg(zh ? '导入失败：JSON 格式错误' : 'Import failed: invalid JSON')
      }
    }
    reader.readAsText(file)
  }

  const handleClearOverrides = () => {
    clearCharacterPackOverrides()
    refreshCharPackOverrides()
    setHasPackOverrides(false)
    setSnackMsg(zh ? '已清除所有包覆盖数据' : 'Cleared all pack overrides')
  }

  const openNew = () => {
    setEditingChar(null)
    setDraft(BLANK_CUSTOM)
    setIconError('')
    setIconMode('url')
    setCustomDialogOpen(true)
  }

  const openEdit = (c: CustomCharacter) => {
    setEditingChar(c)
    setDraft({
      author: c.author, team: c.team,
      nameEn: c.nameEn, nameZh: c.nameZh ?? '',
      abilityEn: c.abilityEn, abilityZh: c.abilityZh ?? '',
      icon: c.icon, edition: c.edition,
      firstNight: c.firstNight, otherNight: c.otherNight,
      firstNightReminder: c.firstNightReminder ?? '',
      otherNightReminder: c.otherNightReminder ?? '',
      reminders: c.reminders ?? [],
    })
    setIconError('')
    setIconMode(c.icon?.startsWith('data:') ? 'upload' : 'url')
    setCustomDialogOpen(true)
  }

  const saveCustom = () => {
    if (!draft.nameEn.trim() || !draft.abilityEn.trim() || !draft.author.trim()) return
    const now = Date.now()
    if (editingChar) {
      setCustomChars((cur) => cur.map((c) => c.id === editingChar.id ? { ...editingChar, ...draft, updatedAt: now } : c))
    } else {
      const base = `custom_${slugify(draft.nameEn)}`
      const id = base + '_' + now.toString(36)
      setCustomChars((cur) => [...cur, { ...draft, id, createdAt: now, updatedAt: now }])
    }
    setCustomDialogOpen(false)
  }

  const deleteCustom = (id: string) => {
    if (!window.confirm(zh ? '确认删除此自定义角色？' : 'Delete this custom character?')) return
    setCustomChars((cur) => cur.filter((c) => c.id !== id))
    // deselect if this was selected
    if (selectedCharacter?.id === id) setSelectedCharacterId('')
  }

  const handleIconUpload = async (file: File) => {
    setIconError('')
    try {
      const dataUrl = await processIconFile(file)
      setDraft((d) => ({ ...d, icon: dataUrl }))
    } catch (e) {
      setIconError(e instanceof Error ? e.message : 'Upload failed')
    }
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
                    <Typography sx={{ fontSize: '0.75rem' }}>{zh ? '下载包' : 'Download'}</Typography>
                  </Box>
                )}
                onChange={(e) => { if (e.target.value) downloadPack(e.target.value as string) }}
                sx={{ minWidth: 110, '& .MuiSelect-select': { py: '4px', fontSize: '0.75rem' } }}
              >
                <MenuItem value="all" sx={{ fontSize: '0.8rem' }}>{zh ? '全部角色' : 'All characters'}</MenuItem>
                {[...new Set(allCharacterFiles.map((c) => c.edition))].sort().map((ed) => (
                  <MenuItem key={ed} value={ed} sx={{ fontSize: '0.8rem' }}>
                    {editionLabels[uiLanguage][ed] ?? toTitleCase(ed)}
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
                {zh ? '导入包' : 'Import'}
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

              {hasPackOverrides && (
                <Chip
                  size="small"
                  label={zh ? '包已激活' : 'Pack active'}
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
              {filteredCharacters.map((character) => {
                const icon = getIconForCharacter(character.id)
                const team = teamLabels[uiLanguage][character.team]
                const edition = editionLabels[uiLanguage][character.edition] ?? toTitleCase(character.edition)
                const currentRevision = getCurrentRevision(character.id)
                const isSelected = character.id === selectedCharacter?.id
                const isCustom = character.id.startsWith('custom_')

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
                          {isCustom && (
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', bgcolor: 'secondary.main', color: 'secondary.contrastText', px: 0.5, borderRadius: 0.5 }}>
                              {t('custom')}
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
              })}
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

      {/* ── Import/export snackbar ── */}
      <Snackbar
        open={Boolean(snackMsg)}
        autoHideDuration={3000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* ── Create / Edit Custom Character Dialog ── */}
      <Dialog open={customDialogOpen} onClose={() => setCustomDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingChar
            ? (zh ? `编辑：${draft.nameEn}` : `Edit: ${draft.nameEn}`)
            : t('new_custom_char')}
          <IconButton size="small" onClick={() => setCustomDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {/* Basic identity */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField size="small" required label={zh ? '名称（EN）' : 'Name (EN)'} value={draft.nameEn} onChange={(e) => setDraft((d) => ({ ...d, nameEn: e.target.value }))} />
            <TextField size="small" label={zh ? '名称（ZH，可选）' : 'Name (ZH, optional)'} value={draft.nameZh ?? ''} onChange={(e) => setDraft((d) => ({ ...d, nameZh: e.target.value }))} />
          </Box>
          <TextField size="small" required label={zh ? '作者' : 'Author'} value={draft.author} onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {/* Edition — autocomplete with known keys + freeSolo for custom */}
            <Autocomplete
              freeSolo
              size="small"
              options={Object.keys(editionLabels[uiLanguage]).filter((k) => k !== 'night-order')}
              getOptionLabel={(option) => editionLabels[uiLanguage][option] ?? toTitleCase(option)}
              value={draft.edition}
              onChange={(_, v) => setDraft((d) => ({ ...d, edition: (v as string) ?? '' }))}
              onInputChange={(_, v, reason) => {
                if (reason === 'input') setDraft((d) => ({ ...d, edition: v }))
              }}
              renderInput={(params) => (
                <TextField {...params} label={zh ? '版块标签' : 'Edition'} />
              )}
            />
            <FormControl size="small">
              <InputLabel>{t('team_label')}</InputLabel>
              <Select value={draft.team} label={t('team_label')} onChange={(e) => setDraft((d) => ({ ...d, team: e.target.value as Team }))}>
                {teamOrder.map((teamId) => <MenuItem key={teamId} value={teamId}>{teamLabels[uiLanguage][teamId] ?? teamId}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {/* Ability text */}
          <TextField size="small" required multiline minRows={2} label={zh ? '技能文本（EN）' : 'Ability Text (EN)'} value={draft.abilityEn} onChange={(e) => setDraft((d) => ({ ...d, abilityEn: e.target.value }))} />
          <TextField size="small" multiline minRows={2} label={zh ? '技能文本（ZH，可选）' : 'Ability Text (ZH, optional)'} value={draft.abilityZh ?? ''} onChange={(e) => setDraft((d) => ({ ...d, abilityZh: e.target.value }))} />

          {/* Icon */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{zh ? '图标（可选，将缩放至 128px）' : 'Icon (optional — resized to 128 px)'}</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <RadioGroup row value={iconMode} onChange={(e) => setIconMode(e.target.value as 'url' | 'upload')}>
                <FormControlLabel value="url" control={<Radio size="small" />} label={<Typography variant="body2">URL</Typography>} />
                <FormControlLabel value="upload" control={<Radio size="small" />} label={<Typography variant="body2">{t('upload')}</Typography>} />
              </RadioGroup>
              {draft.icon && <Box component="img" src={draft.icon} sx={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid', borderColor: 'divider', flexShrink: 0 }} />}
            </Box>
            {iconMode === 'url' ? (
              <TextField size="small" fullWidth placeholder="https://..." value={(!draft.icon?.startsWith('data:') ? draft.icon : '') ?? ''} onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value || undefined }))} />
            ) : (
              <Button size="small" variant="outlined" component="label">
                {zh ? '选择图片' : 'Choose image'}
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIconUpload(f); e.target.value = '' }} />
              </Button>
            )}
            {iconError && <Typography variant="caption" color="error">{iconError}</Typography>}
          </Box>

          {/* Night order — visual pickers */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {zh ? '首夜唤醒位置（可选）' : 'First night wake position (optional)'}
            </Typography>
            <NightOrderPicker
              value={draft.firstNight}
              onChange={(pos) => setDraft((d) => ({ ...d, firstNight: pos }))}
              nightType="first"
              language={uiLanguage}
            />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {zh ? '其他夜唤醒位置（可选）' : 'Other nights wake position (optional)'}
            </Typography>
            <NightOrderPicker
              value={draft.otherNight}
              onChange={(pos) => setDraft((d) => ({ ...d, otherNight: pos }))}
              nightType="other"
              language={uiLanguage}
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField size="small" label={zh ? '首夜提示' : 'First night reminder'} value={draft.firstNightReminder ?? ''} onChange={(e) => setDraft((d) => ({ ...d, firstNightReminder: e.target.value }))} />
            <TextField size="small" label={zh ? '其他夜提示' : 'Other night reminder'} value={draft.otherNightReminder ?? ''} onChange={(e) => setDraft((d) => ({ ...d, otherNightReminder: e.target.value }))} />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button variant="outlined" onClick={() => setCustomDialogOpen(false)}>{t('cancel')}</Button>
            <Button variant="contained" onClick={saveCustom} disabled={!draft.nameEn.trim() || !draft.abilityEn.trim() || !draft.author.trim()}>
              {t('save')}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
}
