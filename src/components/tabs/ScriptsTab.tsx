import React, { useDeferredValue, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FixedSizeList, type ListChildComponentProps } from 'react-window'
import { Box, Button, Chip, Collapse, Divider, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
// Collapse kept for section expand/collapse
import PrintIcon from '@mui/icons-material/Print'
import DownloadIcon from '@mui/icons-material/Download'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import MenuIcon from '@mui/icons-material/Menu'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import NoteAltIcon from '@mui/icons-material/NoteAlt'
import SortIcon from '@mui/icons-material/Sort'
import ViewListIcon from '@mui/icons-material/ViewList'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import { allCharacters, getDisplayName } from '../../catalog'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { ScriptList } from '../ScriptList'
import { SheetArticle } from '../SheetArticle'
import { ScriptEditor } from './ScriptEditor'
import { SCRIPT_TAG_META, SCRIPT_TAGS } from './ScriptsTab.constants'
import type {
  CharacterGroup,
  EditableScript,
  Language,
  ResolvedScriptCharacter,
  ResolvedScriptCharacterGroup,
} from '../../types'
import type { PrintOptions } from '../PrintOptionsDialog'

// ── Virtual list ─────────────────────────────────────────────────────────────

const ROW_H = 40  // px per script row

type VRow = { script: EditableScript; deletable: boolean }
type VRowData = {
  rows: VRow[]
  activeSlug: string | undefined
  getScriptTitle: (s: EditableScript) => string
  setActiveSlug: (s: string) => void
  setListOpen: (v: boolean) => void
  isMobile: boolean
  duplicateScript: (s: string) => void
  deleteScript: (s: string) => void
  zh: boolean
}

function ScriptRow({ index, style, data }: ListChildComponentProps<VRowData>) {
  const { rows, activeSlug, getScriptTitle, setActiveSlug, setListOpen, isMobile, duplicateScript, deleteScript, zh } = data
  const { script, deletable } = rows[index]
  return (
    <Box style={style} sx={{ display: 'flex', alignItems: 'center', gap: 0.25, pr: 0.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <ScriptList
          title={getScriptTitle(script)}
          author={script.author || undefined}
          version={script.version}
          isActive={script.slug === activeSlug}
          onSelect={() => { setActiveSlug(script.slug); if (isMobile) setListOpen(false) }}
          tags={script.tags}
        />
      </Box>
      {!deletable && (
        <Tooltip title={zh ? '复制到自制' : 'Copy to DIY'}>
          <IconButton size="small" onClick={() => duplicateScript(script.slug)}
            sx={{ flexShrink: 0, opacity: 0.35, '&:hover': { opacity: 1 } }}>
            <ContentCopyIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      )}
      {deletable && (
        <Tooltip title={zh ? '删除' : 'Delete'}>
          <IconButton size="small" color="error" onClick={() => deleteScript(script.slug)}
            sx={{ flexShrink: 0, opacity: 0.45, '&:hover': { opacity: 1 } }}>
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

type Props = {
  scripts: EditableScript[]
  activeScript: EditableScript | undefined
  uiText: Record<string, string>
  uiLanguage: Language
  isEditMode: boolean
  showWakeOrderPreview: boolean
  setShowWakeOrderPreview: (v: boolean | ((c: boolean) => boolean)) => void
  saveStatus: string
  activeScriptCharacters: ResolvedScriptCharacter[]
  groupedScriptCharacters: ResolvedScriptCharacterGroup[]
  groupedEditorCharacters: CharacterGroup[]
  editorQuery: string
  sheetDensityClass: string
  setIsEditMode: (v: boolean | ((c: boolean) => boolean)) => void
  setEditorQuery: (v: string) => void
  setActiveSlug: (slug: string) => void
  createNewScript: () => void
  importScriptFile: (file: File) => void
  deleteScript: (slug: string) => void
  duplicateScript: (slug: string) => void
  isBuiltIn: (slug: string) => boolean
  downloadScriptFile: () => void
  updateActiveScript: (updater: (script: EditableScript) => EditableScript, nextSlug?: string) => void
  toggleCharacterInScript: (id: string) => void
  getScriptTitle: (script: EditableScript) => string
  getSheetUiLabel: (language: Language, key: string) => string
  printOptions: PrintOptions
  onLanguageChange: (lang: Language) => void
  onPrintClick: () => void
  onCreateCustomFromId?: (id: string) => void
}

export function ScriptsTab({
  scripts,
  activeScript,
  uiText,
  uiLanguage,
  isEditMode,
  showWakeOrderPreview,
  setShowWakeOrderPreview,
  saveStatus,
  activeScriptCharacters,
  groupedScriptCharacters,
  groupedEditorCharacters,
  editorQuery,
  sheetDensityClass,
  setIsEditMode,
  setEditorQuery,
  setActiveSlug,
  createNewScript,
  importScriptFile,
  deleteScript,
  duplicateScript,
  isBuiltIn,
  downloadScriptFile,
  updateActiveScript,
  toggleCharacterInScript,
  getScriptTitle,
  getSheetUiLabel,
  printOptions,
  onLanguageChange,
  onPrintClick,
  onCreateCustomFromId,
}: Props) {
  const { isMobile } = useBreakpoint()
  const [listOpenDesktop, setListOpenDesktop] = useState(true)
  const [listOpenMobile, setListOpenMobile] = useState(false)
  const showList = isMobile ? listOpenMobile : listOpenDesktop
  const setListOpen = isMobile ? setListOpenMobile : setListOpenDesktop
  const [officialOpen, setOfficialOpen] = useState(true)
  const [communityOpen, setCommunityOpen] = useState(true)
  const [diyOpen, setDiyOpen] = useState(true)
  const [viewColumns, setViewColumns] = useState<1 | 2>(1)
  const [scriptSearch, setScriptSearch] = useState('')
  const deferredSearch = useDeferredValue(scriptSearch)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<'default' | 'name' | 'author' | 'chars'>('default')
  const [noteOpen, setNoteOpen] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement | null>(null)
  const [customTagInput, setCustomTagInput] = useState('')

  const zh = uiLanguage === 'zh'
  const tagLabel = (key: string): string =>
    SCRIPT_TAG_META[key]?.[zh ? 'zh' : 'en'] ?? key
  const tagIcon = (key: string): React.ElementType | null =>
    SCRIPT_TAG_META[key]?.Icon ?? null

  // ── Pre-build character name index (built once) ───────────────────────────
  const charNameIndex = useMemo(() => {
    const m = new Map<string, string>()  // charId → "enname|zhname"
    for (const c of allCharacters) {
      const en = getDisplayName(c.id, 'en').toLowerCase()
      const zh2 = getDisplayName(c.id, 'zh').toLowerCase()
      m.set(c.id, `${en}|${zh2}`)
    }
    return m
  }, [])

  // ── Memoized filter + sort ────────────────────────────────────────────────
  const { official, community, diy, isFiltering } = useMemo(() => {
    const OFFICIAL = new Set(['tb', 'bmr', 'snv'])
    const q = deferredSearch.trim().toLowerCase()

    const filterScript = (s: EditableScript) => {
      if (tagFilter && !(s.tags ?? []).includes(tagFilter)) return false
      if (!q) return true
      if (s.title.toLowerCase().includes(q)) return true
      if (s.titleZh.toLowerCase().includes(q)) return true
      if (s.author.toLowerCase().includes(q)) return true
      return s.characters.some((c) => {
        const id = typeof c === 'string' ? c : (c as { id: string }).id
        return charNameIndex.get(id)?.includes(q) ?? false
      })
    }

    const sortScripts = (arr: EditableScript[]) => {
      if (sortKey === 'default') return arr
      return [...arr].sort((a, b) => {
        if (sortKey === 'name') return getScriptTitle(a).localeCompare(getScriptTitle(b))
        if (sortKey === 'author') return (a.author || '').localeCompare(b.author || '')
        if (sortKey === 'chars') return b.characters.length - a.characters.length
        return 0
      })
    }

    return {
      official: sortScripts(scripts.filter((s) => OFFICIAL.has(s.slug) && filterScript(s))),
      community: sortScripts(scripts.filter((s) => isBuiltIn(s.slug) && !OFFICIAL.has(s.slug) && filterScript(s))),
      diy: sortScripts(scripts.filter((s) => !isBuiltIn(s.slug) && filterScript(s))),
      isFiltering: !!q || !!tagFilter,
    }
  }, [scripts, deferredSearch, tagFilter, sortKey, charNameIndex, isBuiltIn, getScriptTitle, uiLanguage])

  const addTag = (tag: string) => {
    if (!activeScript) return
    updateActiveScript((s) => ({
      ...s,
      tags: s.tags?.includes(tag) ? s.tags : [...(s.tags ?? []), tag],
    }))
  }
  const removeTag = (tag: string) => {
    if (!activeScript) return
    updateActiveScript((s) => ({ ...s, tags: (s.tags ?? []).filter((t) => t !== tag) }))
  }

  const gridCols = isMobile ? '1fr' : showList ? '320px 1fr' : '1fr'

  // ── Shared row data for virtual lists ─────────────────────────────────────
  const vRowData: Omit<VRowData, 'rows'> = {
    activeSlug: activeScript?.slug,
    getScriptTitle,
    setActiveSlug,
    setListOpen,
    isMobile,
    duplicateScript,
    deleteScript,
    zh,
  }
  const mkVList = (rows: VRow[], key: string) => {
    if (!rows.length) return null
    const h = Math.min(rows.length * ROW_H, 320)
    return (
      <FixedSizeList key={key} height={h} width="100%" itemCount={rows.length} itemSize={ROW_H}
        itemData={{ ...vRowData, rows }} overscanCount={4}>
        {ScriptRow}
      </FixedSizeList>
    )
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, gap: 2 }}>
      {showList && (
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* ── Toolbar ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700, fontSize: '0.85rem' }}>
              {uiText.scriptSheet}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                ({official.length + community.length + diy.length})
              </Typography>
            </Typography>
            <Tooltip title={zh ? '新建剧本' : 'New Script'}>
              <IconButton size="small" onClick={createNewScript}><AddIcon sx={{ fontSize: 16 }} /></IconButton>
            </Tooltip>
            <Tooltip title={zh ? '导入 JSON' : 'Import JSON'}>
              <IconButton size="small" component="label">
                <FileOpenIcon sx={{ fontSize: 16 }} />
                <input type="file" accept=".json" hidden onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) { importScriptFile(file); e.target.value = '' }
                }} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={() => setListOpen(false)}>
              <MenuOpenIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* ── Search + Sort ── */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <TextField
              size="small" fullWidth
              placeholder={zh ? '搜索剧本、作者、角色…' : 'Search title, author, character…'}
              value={scriptSearch}
              onChange={(e) => setScriptSearch(e.target.value)}
              slotProps={{ input: { sx: { fontSize: '0.78rem', pr: 0.5 } } }}
              sx={{ '& .MuiInputBase-root': { borderRadius: 1.5 } }}
            />
            <Select
              size="small"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              renderValue={() => <SortIcon sx={{ fontSize: 16, display: 'block' }} />}
              sx={{ minWidth: 36, '& .MuiSelect-select': { py: '6px', px: '6px !important', display: 'flex', alignItems: 'center' }, '& .MuiSelect-icon': { display: 'none' } }}
            >
              <MenuItem value="default" sx={{ fontSize: '0.8rem' }}>{zh ? '默认顺序' : 'Default'}</MenuItem>
              <MenuItem value="name"    sx={{ fontSize: '0.8rem' }}>{zh ? '按名称' : 'Name A–Z'}</MenuItem>
              <MenuItem value="author"  sx={{ fontSize: '0.8rem' }}>{zh ? '按作者' : 'Author'}</MenuItem>
              <MenuItem value="chars"   sx={{ fontSize: '0.8rem' }}>{zh ? '按角色数' : 'Char count'}</MenuItem>
            </Select>
          </Box>

          {/* ── Tag filter chips ── */}
          {(() => {
            const allUsedTags = [...new Set(scripts.flatMap((s) => s.tags ?? []))]
            const customUsedTags = allUsedTags.filter((t) => !SCRIPT_TAG_META[t])
            const presetInUse = SCRIPT_TAGS.filter((t) => allUsedTags.includes(t))
            const filterTags = [...presetInUse, ...customUsedTags]
            if (filterTags.length === 0) return null
            const chipSx = { fontSize: '0.72rem', height: 22, fontWeight: 600, '& .MuiChip-icon': { fontSize: '0.85rem' } }
            return (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                <Chip size="small" label={zh ? '全部' : 'All'}
                  variant={tagFilter === null ? 'filled' : 'outlined'}
                  color={tagFilter === null ? 'primary' : 'default'}
                  onClick={() => setTagFilter(null)} sx={chipSx} />
                {filterTags.map((tag) => {
                  const IconComp = tagIcon(tag)
                  return (
                    <Chip key={tag} size="small" label={tagLabel(tag)}
                      icon={IconComp ? <IconComp /> : undefined}
                      variant={tagFilter === tag ? 'filled' : 'outlined'}
                      color={tagFilter === tag ? 'primary' : 'default'}
                      onClick={() => setTagFilter((c) => c === tag ? null : tag)} sx={chipSx} />
                  )
                })}
              </Box>
            )
          })()}

          {isFiltering && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              {official.length + community.length + diy.length} {zh ? '个结果' : 'results'}
            </Typography>
          )}

          {/* ── Script lists ── */}
          {isFiltering ? (
            // Flat list when filtering — no section headers
            <Box>
              {official.length + community.length + diy.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>{zh ? '无结果' : 'No matches'}</Typography>
              ) : mkVList([
                ...official.map((s) => ({ script: s, deletable: false })),
                ...community.map((s) => ({ script: s, deletable: false })),
                ...diy.map((s) => ({ script: s, deletable: true })),
              ], 'flat')}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {/* Official */}
              <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', py: 0.25 }} onClick={() => setOfficialOpen((v) => !v)}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.6rem', lineHeight: 1, flex: 1 }}>
                  {zh ? '官方' : 'Official'} ({official.length})
                </Typography>
                {officialOpen ? <ExpandLessIcon sx={{ fontSize: 13, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 13, color: 'text.secondary' }} />}
              </Box>
              <Collapse in={officialOpen}>
                {mkVList(official.map((s) => ({ script: s, deletable: false })), 'official') ??
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>—</Typography>}
              </Collapse>

              <Divider sx={{ my: 0.25 }} />

              {/* Community */}
              <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', py: 0.25 }} onClick={() => setCommunityOpen((v) => !v)}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.6rem', lineHeight: 1, flex: 1 }}>
                  {zh ? '社区' : 'Community'} ({community.length})
                </Typography>
                {communityOpen ? <ExpandLessIcon sx={{ fontSize: 13, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 13, color: 'text.secondary' }} />}
              </Box>
              <Collapse in={communityOpen}>
                {mkVList(community.map((s) => ({ script: s, deletable: false })), 'community') ??
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>—</Typography>}
              </Collapse>

              <Divider sx={{ my: 0.25 }} />

              {/* DIY */}
              <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', py: 0.25 }} onClick={() => setDiyOpen((v) => !v)}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.6rem', lineHeight: 1, flex: 1 }}>
                  {zh ? '自制' : 'DIY'} ({diy.length})
                </Typography>
                {diyOpen ? <ExpandLessIcon sx={{ fontSize: 13, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 13, color: 'text.secondary' }} />}
              </Box>
              <Collapse in={diyOpen}>
                {mkVList(diy.map((s) => ({ script: s, deletable: true })), 'diy') ?? (
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5, fontStyle: 'italic' }}>
                    {zh ? '点击复制图标添加剧本' : 'Copy a script above to start'}
                  </Typography>
                )}
              </Collapse>
            </Box>
          )}
        </Paper>
      )}

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        {activeScript ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <IconButton size="small" onClick={() => setListOpen(v => !v)} title={showList ? 'Hide list' : 'Show list'}>
                {showList ? <MenuOpenIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
              </IconButton>
              {!isBuiltIn(activeScript.slug) && (
                <Button variant="outlined" size="small" onClick={() => setIsEditMode((c) => !c)}>
                  {isEditMode ? uiText.doneEditing : uiText.editScript}
                </Button>
              )}
              <Tooltip title={uiText.downloadJson}>
                <IconButton size="small" onClick={downloadScriptFile}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={showWakeOrderPreview
                ? (uiLanguage === 'zh' ? '隐藏夜间顺序' : 'Hide night order')
                : (uiLanguage === 'zh' ? '显示夜间顺序' : 'Show night order')}>
                <IconButton size="small"
                  onClick={() => setShowWakeOrderPreview((c) => !c)}
                  color={showWakeOrderPreview ? 'primary' : 'default'}>
                  <NightsStayIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <ToggleButtonGroup size="small" exclusive value={viewColumns} onChange={(_, v) => { if (v) setViewColumns(v) }}>
                <ToggleButton value={1}><ViewListIcon fontSize="small" /></ToggleButton>
                <ToggleButton value={2}><ViewModuleIcon fontSize="small" /></ToggleButton>
              </ToggleButtonGroup>
              {saveStatus && <Typography variant="body2" color="text.secondary">{saveStatus}</Typography>}
              <Box sx={{ flex: 1 }} />
              {/* Language + Print — right side of toolbar */}
              <FormControl size="small" sx={{ minWidth: 72, '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
                <InputLabel>{uiLanguage === 'zh' ? '语言' : 'Lang'}</InputLabel>
                <Select value={uiLanguage} label={uiLanguage === 'zh' ? '语言' : 'Lang'} onChange={(e) => onLanguageChange(e.target.value as Language)}>
                  <MenuItem value="en">EN</MenuItem>
                  <MenuItem value="zh">中文</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title={uiLanguage === 'zh' ? '导出 PDF' : 'Print PDF'}>
                <IconButton size="small" onClick={onPrintClick}>
                  <PrintIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* ── Tags + Note bar (all scripts) ── */}
            {(() => {
              const zh = uiLanguage === 'zh'
              const activeTags = activeScript.tags ?? []
              const note = activeScript.notes ?? ''
              const hasNote = note.trim().length > 0

              return (
                <Box sx={{ mb: 1.5 }}>
                  {/* Tags row */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', mb: 0.5 }}>
                    {activeTags.map((tag) => {
                      const IconComp = tagIcon(tag)
                      return (
                        <Chip key={tag}
                          label={tagLabel(tag)}
                          icon={IconComp ? <IconComp /> : undefined}
                          size="small"
                          onDelete={() => removeTag(tag)}
                          sx={{ fontSize: '0.8rem', fontWeight: 600, '& .MuiChip-icon': { fontSize: '1rem' } }}
                        />
                      )
                    })}
                    {SCRIPT_TAGS.filter((t) => !activeTags.includes(t)).map((tag) => {
                      const IconComp = tagIcon(tag)
                      return (
                        <Chip key={tag}
                          label={tagLabel(tag)}
                          icon={IconComp ? <IconComp /> : undefined}
                          size="small"
                          variant="outlined"
                          onClick={() => addTag(tag)}
                          sx={{ fontSize: '0.75rem', opacity: 0.5, '&:hover': { opacity: 1 }, '& .MuiChip-icon': { fontSize: '0.9rem' } }}
                        />
                      )
                    })}
                    {/* Custom tag input */}
                    <Box
                      component="input"
                      placeholder={zh ? '自定义标签…' : 'Custom tag…'}
                      value={customTagInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') {
                          const t = customTagInput.trim()
                          if (t) { addTag(t); setCustomTagInput('') }
                        } else if (e.key === 'Escape') {
                          setCustomTagInput('')
                        }
                      }}
                      sx={{
                        border: '1px dashed', borderColor: 'divider', borderRadius: '16px',
                        px: 1.25, py: '2px', fontSize: '0.65rem',
                        bgcolor: 'transparent', color: 'text.primary', outline: 'none',
                        width: 110, opacity: 0.55,
                        '&:focus': { opacity: 1, borderColor: 'primary.main', borderStyle: 'solid' },
                        '&::placeholder': { color: 'text.disabled' },
                      }}
                    />

                    {/* Note toggle */}
                    <Tooltip title={zh ? (hasNote ? '查看备注' : '添加备注') : (hasNote ? 'View note' : 'Add note')}>
                      <Chip
                        icon={<NoteAltIcon sx={{ fontSize: '0.85rem !important' }} />}
                        label={hasNote
                          ? (noteOpen ? (zh ? '收起' : 'Collapse') : note.split('\n')[0].slice(0, 40) + (note.length > 40 ? '…' : ''))
                          : (zh ? '添加备注' : 'Add note')}
                        size="small"
                        variant={hasNote ? 'filled' : 'outlined'}
                        color={hasNote ? 'info' : 'default'}
                        onClick={() => setNoteOpen((v) => !v)}
                        sx={{ fontSize: '0.65rem', maxWidth: 220, opacity: hasNote ? 1 : 0.45, '&:hover': { opacity: 1 } }}
                      />
                    </Tooltip>
                  </Box>

                  {/* Collapsible note editor */}
                  <Collapse in={noteOpen} onEntered={() => noteRef.current?.focus()}>
                    <Box sx={{
                      border: '1px solid', borderColor: 'info.main', borderRadius: 1.5,
                      p: 1, bgcolor: 'background.paper',
                    }}>
                      <TextField
                        inputRef={noteRef}
                        fullWidth multiline minRows={2} maxRows={8}
                        size="small"
                        placeholder={zh ? '在此记录剧本备注（仅作者可见）…' : 'Script notes — for your own reference…'}
                        value={note}
                        onChange={(e) =>
                          updateActiveScript((s) => ({ ...s, notes: e.target.value }))
                        }
                        variant="standard"
                        slotProps={{ input: { disableUnderline: true, sx: { fontSize: '0.82rem' } } }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                        <Button size="small" onClick={() => setNoteOpen(false)} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
                          {zh ? '收起' : 'Close'}
                        </Button>
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              )
            })()}

            {!isEditMode && (
              <SheetArticle
                activeScript={activeScript}
                activeScriptCharacters={activeScriptCharacters}
                groupedScriptCharacters={groupedScriptCharacters}
                bootleggerRulesLabel={getSheetUiLabel(uiLanguage, 'bootlegger_rules')}
                jinxesLabel={getSheetUiLabel(uiLanguage, 'jinxes')}
                isEditMode={false}
                language={uiLanguage}
                onRemoveCharacter={toggleCharacterInScript}
                sheetDensityClass={sheetDensityClass}
                showWakeOrder={showWakeOrderPreview}
                viewColumns={viewColumns}
              />
            )}

            {createPortal(
              <div className="print-portal" aria-hidden="true">
                <SheetArticle
                  activeScript={activeScript}
                  activeScriptCharacters={activeScriptCharacters}
                  groupedScriptCharacters={groupedScriptCharacters}
                  bootleggerRulesLabel={getSheetUiLabel(uiLanguage, 'bootlegger_rules')}
                  jinxesLabel={getSheetUiLabel(uiLanguage, 'jinxes')}
                  isEditMode={false}
                  language={uiLanguage}
                  onRemoveCharacter={toggleCharacterInScript}
                  sheetDensityClass={sheetDensityClass}
                  showWakeOrder
                  showEdition={false}
                  showCharacterCount={false}
                  supplementalPlacement="end"
                  printOptions={printOptions}
                />
              </div>,
              document.body
            )}

            {isEditMode && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{uiText.editScript}</Typography>
                  <Typography variant="body2" color="text.secondary">{activeScript.sourceFile}</Typography>
                </Box>
                <ScriptEditor
                  activeScript={activeScript}
                  updateActiveScript={updateActiveScript}
                  uiText={uiText}
                  uiLanguage={uiLanguage}
                  editorQuery={editorQuery}
                  setEditorQuery={setEditorQuery}
                  groupedEditorCharacters={groupedEditorCharacters}
                  activeScriptCharacters={activeScriptCharacters}
                  groupedScriptCharacters={groupedScriptCharacters}
                  toggleCharacterInScript={toggleCharacterInScript}
                  charColumns={viewColumns === 2 ? '2' : '1'}
                  onCreateCustomFromId={onCreateCustomFromId}
                />
              </Box>
            )}
          </>
        ) : (
          <Typography>{uiText.noScripts}</Typography>
        )}
      </Paper>
    </Box>
  )
}
