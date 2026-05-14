import React, { useRef, useState } from 'react'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import { NightOrderManager } from '../NightOrderManager'
import {
  Box, Button, Chip, Dialog, DialogContent, DialogTitle, FormControl,
  IconButton, InputLabel, Paper, Select, MenuItem, Snackbar, TextField, Tooltip, Typography,
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
import type { CharacterFileEntry } from '../../types'
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
  const [nightOrderOpen, setNightOrderOpen] = useState(false)
  const [editingChar, setEditingChar] = useState<CustomCharacter | null>(null)
  const [snackMsg, setSnackMsg] = useState('')
  const [hasPackOverrides, setHasPackOverrides] = useState(() => {
    try { return Object.keys(JSON.parse(localStorage.getItem(CHAR_PACK_OVERRIDES_KEY) ?? '{}')).length > 0 } catch { return false }
  })
  const importInputRef = useRef<HTMLInputElement>(null)
  const addCharInputRef = useRef<HTMLInputElement>(null)
  const zh = uiLanguage === 'zh'
  const t = makeT(uiLanguage)

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
          setSnackMsg(zh ? `已更新角色：${name}` : `Updated character: ${name}`)
        } else {
          // Add as new custom character
          const now = Date.now()
          const newChar: CustomCharacter = {
            id: entry.id.startsWith('custom_') ? entry.id : `custom_${entry.id}_${now.toString(36)}`,
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
          setSnackMsg(zh ? `已添加新角色：${name}` : `Added new character: ${name}`)
        }
      } catch {
        setSnackMsg(zh ? '导入失败：无效的角色 JSON' : 'Import failed: invalid character JSON')
      }
    }
    reader.readAsText(file)
  }

  const openNew = () => { setEditingChar(null); setCustomDialogOpen(true) }
  const openEdit = (c: CustomCharacter) => { setEditingChar(c); setCustomDialogOpen(true) }

  const handleSaveCustom = (draft: Omit<CustomCharacter, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now()
    if (editingChar) {
      setCustomChars((cur) => cur.map((c) => c.id === editingChar.id ? { ...editingChar, ...draft, updatedAt: now } : c))
    } else {
      const id = `custom_${slugify(draft.nameEn)}_${now.toString(36)}`
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
    if (!window.confirm(zh ? '确认删除此自定义角色？' : 'Delete this custom character?')) return
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
                <Tooltip title={zh ? '从 JSON 文件导入角色' : 'Add character from JSON file'}>
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
                {[...new Set(customChars.map((c) => c.edition))].sort().map((ed) => (
                  <MenuItem key={`custom-${ed}`} value={ed} sx={{ fontSize: '0.8rem' }}>
                    {toTitleCase(ed)}{zh ? '（自定义）' : ' (custom)'}
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

              <Button
                size="small"
                variant="outlined"
                startIcon={<NightsStayIcon fontSize="small" />}
                onClick={() => setNightOrderOpen(true)}
                sx={{ textTransform: 'none', fontSize: '0.75rem', py: '3px' }}
              >
                {zh ? '夜晚顺序' : 'Night Order'}
              </Button>

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
      <CustomCharDialog
        open={customDialogOpen}
        onClose={() => setCustomDialogOpen(false)}
        editingChar={editingChar}
        uiLanguage={uiLanguage}
        onSave={handleSaveCustom}
      />

      {/* ── Night Order Manager ── */}
      <NightOrderManager
        open={nightOrderOpen}
        onClose={() => setNightOrderOpen(false)}
        language={uiLanguage}
      />
    </>
  )
}
