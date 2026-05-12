import { useState } from 'react'
import {
  Box, Button, Chip, Dialog, DialogContent, DialogTitle, FormControl,
  FormControlLabel, IconButton, InputLabel, MenuItem, Paper, Radio, RadioGroup,
  Select, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import DOMPurify from 'dompurify'
import { CharacterRevisionPanel } from '../CharacterRevisionPanel'
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
} from '../../catalog'
import { processIconFile } from '../../lib/iconResize'
import type { CharacterEntry, CustomCharacter, Language, Team } from '../../types'

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
  edition: 'Custom',
  firstNight: undefined,
  otherNight: undefined,
  firstNightReminder: '',
  otherNightReminder: '',
  reminders: [],
}

import React from 'react'

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
  const zh = uiLanguage === 'zh'

  const openNew = () => {
    setEditingChar(null)
    setDraft(BLANK_CUSTOM)
    setIconError('')
    setIconMode('url')
    setCustomDialogOpen(true)
  }

  const openEdit = (c: CustomCharacter) => {
    setEditingChar(c)
    setDraft({ author: c.author, team: c.team, nameEn: c.nameEn, nameZh: c.nameZh ?? '', abilityEn: c.abilityEn, abilityZh: c.abilityZh ?? '', icon: c.icon, edition: c.edition, firstNight: c.firstNight, otherNight: c.otherNight, firstNightReminder: c.firstNightReminder ?? '', otherNightReminder: c.otherNightReminder ?? '', reminders: c.reminders ?? [] })
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
              <FormControl size="small" sx={{ minWidth: 72, '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
                <InputLabel>{uiLanguage === 'zh' ? '语言' : 'Lang'}</InputLabel>
                <Select value={uiLanguage} label={uiLanguage === 'zh' ? '语言' : 'Lang'} onChange={(e) => onLanguageChange(e.target.value as Language)}>
                  <MenuItem value="en">EN</MenuItem>
                  <MenuItem value="zh">中文</MenuItem>
                </Select>
              </FormControl>
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
          </Box>

          {/* ── Custom characters section ── */}
          {(customChars.length > 0 || true) && (
            <Box sx={{ px: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1.5 }}>
                  {zh ? '自定义角色' : 'Custom Characters'} ({customChars.length})
                </Typography>
                <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={openNew} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                  {zh ? '新建' : 'New'}
                </Button>
              </Box>
              {customChars.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {customChars.map((c) => (
                    <Chip
                      key={c.id}
                      size="small"
                      avatar={c.icon ? <Box component="img" src={c.icon} sx={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} /> : undefined}
                      label={zh && c.nameZh ? c.nameZh : c.nameEn}
                      sx={{ fontSize: '0.72rem', bgcolor: 'action.hover' }}
                      onClick={() => openEdit(c)}
                      onDelete={() => deleteCustom(c.id)}
                      deleteIcon={<DeleteIcon sx={{ fontSize: '0.9rem !important' }} />}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Scrollable character list */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
            <Box sx={{ display: 'grid', gap: 1 }}>
              {filteredCharacters.map((character) => {
                const icon = getIconForCharacter(character.id)
                const team = teamLabels[uiLanguage][character.team]
                const edition = editionLabels[uiLanguage][character.edition] ?? toTitleCase(character.edition)
                const currentRevision = getCurrentRevision(character.id)
                const isSelected = character.id === selectedCharacter?.id

                return (
                  <Button
                    key={character.id}
                    onClick={() => handleSelect(character.id)}
                    sx={{
                      display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5,
                      justifyContent: 'flex-start', border: '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
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
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{team}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        {character.id} · {edition} · {currentRevision}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getAbilityText(character.id, uiLanguage)) }} />
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
            chineseTextLabel={uiText.chineseText}
            currentLabel={uiText.current}
            currentRevisionLabel={uiText.currentRevision}
            englishTextLabel={uiText.englishText}
            language={uiLanguage}
            noCharacterSelectedLabel={uiText.noCharacterSelected}
            revisionNoteLabel={uiText.revisionNote}
            revisionHistoryLabel={uiText.revisionHistory}
            title={uiText.characterVersions}
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
            chineseTextLabel={uiText.chineseText}
            currentLabel={uiText.current}
            currentRevisionLabel={uiText.currentRevision}
            englishTextLabel={uiText.englishText}
            language={uiLanguage}
            noCharacterSelectedLabel={uiText.noCharacterSelected}
            revisionNoteLabel={uiText.revisionNote}
            revisionHistoryLabel={uiText.revisionHistory}
            title={uiText.characterVersions}
          />
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Custom Character Dialog ── */}
      <Dialog open={customDialogOpen} onClose={() => setCustomDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingChar
            ? (zh ? `编辑：${draft.nameEn}` : `Edit: ${draft.nameEn}`)
            : (zh ? '新建自定义角色' : 'New Custom Character')}
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
            <TextField size="small" label={zh ? '版块标签' : 'Edition label'} value={draft.edition} onChange={(e) => setDraft((d) => ({ ...d, edition: e.target.value }))} />
            <FormControl size="small">
              <InputLabel>{zh ? '阵营' : 'Team'}</InputLabel>
              <Select value={draft.team} label={zh ? '阵营' : 'Team'} onChange={(e) => setDraft((d) => ({ ...d, team: e.target.value as Team }))}>
                {teamOrder.map((t) => <MenuItem key={t} value={t}>{teamLabels[uiLanguage][t] ?? t}</MenuItem>)}
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
                <FormControlLabel value="upload" control={<Radio size="small" />} label={<Typography variant="body2">{zh ? '上传' : 'Upload'}</Typography>} />
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

          {/* Night order */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField size="small" type="number" label={zh ? '首夜顺序（可选）' : 'First night pos (opt)'} value={draft.firstNight ?? ''} onChange={(e) => setDraft((d) => ({ ...d, firstNight: e.target.value ? Number(e.target.value) : undefined }))} helperText={zh ? '数字越小越早唤醒' : 'Lower = earlier wake'} />
            <TextField size="small" type="number" label={zh ? '其他夜顺序（可选）' : 'Other night pos (opt)'} value={draft.otherNight ?? ''} onChange={(e) => setDraft((d) => ({ ...d, otherNight: e.target.value ? Number(e.target.value) : undefined }))} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField size="small" label={zh ? '首夜提示' : 'First night reminder'} value={draft.firstNightReminder ?? ''} onChange={(e) => setDraft((d) => ({ ...d, firstNightReminder: e.target.value }))} />
            <TextField size="small" label={zh ? '其他夜提示' : 'Other night reminder'} value={draft.otherNightReminder ?? ''} onChange={(e) => setDraft((d) => ({ ...d, otherNightReminder: e.target.value }))} />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button variant="outlined" onClick={() => setCustomDialogOpen(false)}>{zh ? '取消' : 'Cancel'}</Button>
            <Button variant="contained" onClick={saveCustom} disabled={!draft.nameEn.trim() || !draft.abilityEn.trim() || !draft.author.trim()}>
              {zh ? '保存' : 'Save'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
}
