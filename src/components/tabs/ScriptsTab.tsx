import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Box, Button, Chip, Collapse, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import PrintIcon from '@mui/icons-material/Print'
import DownloadIcon from '@mui/icons-material/Download'
import MenuIcon from '@mui/icons-material/Menu'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import NoteAltIcon from '@mui/icons-material/NoteAlt'
import ViewListIcon from '@mui/icons-material/ViewList'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import SubjectIcon from '@mui/icons-material/Subject'
import SortIcon from '@mui/icons-material/Sort'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { SheetArticle } from '../SheetArticle'
import { ScriptsLeftPanel } from '../ScriptsTab/ScriptsLeftPanel'
import { ScriptsMasonryGrid } from '../ScriptsTab/ScriptsMasonryGrid'
import { NightOrderPreview } from '../ScriptsTab/NightOrderPreview'
import { ScriptEditor } from './ScriptEditor'
import { SCRIPT_TAG_META, SCRIPT_TAGS } from './ScriptsTab.constants'
import type {
  CharacterGroup,
  EditableScript,
  Language,
  ResolvedScriptCharacter,
  ResolvedScriptCharacterGroup,
  ScriptFolder,
} from '../../types'
import type { PrintOptions } from '../PrintOptionsDialog'

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
  scriptFolders: ScriptFolder[]
  createFolder: (name: string) => ScriptFolder
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  toggleFolderCollapsed: (id: string) => void
  moveScriptToFolder: (slug: string, folderId: string | undefined) => void
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
  scriptFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  toggleFolderCollapsed,
  moveScriptToFolder,
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
  const [viewColumns, setViewColumns] = useState<1 | 2>(1)
  const [hideAbility, setHideAbility] = useState(() => isMobile)
  const [browseMode, setBrowseMode] = useState<'list' | 'masonry'>('list')
  const [noteOpen, setNoteOpen] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement | null>(null)
  const [customTagInput, setCustomTagInput] = useState('')

  const zh = uiLanguage === 'zh'
  const tagLabel = (key: string): string =>
    SCRIPT_TAG_META[key]?.[zh ? 'zh' : 'en'] ?? key
  const tagIcon = (key: string): React.ElementType | null =>
    SCRIPT_TAG_META[key]?.Icon ?? null

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

  const gridCols = isMobile
    ? '1fr'
    : browseMode === 'masonry'
      ? (activeScript ? '420px 1fr' : '1fr')
      : (showList ? '320px 1fr' : '1fr')

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, gap: 2, minHeight: 0 }}>
      {/* ── Left / browse panel ── */}
      {browseMode === 'masonry' ? (
        <Paper elevation={0} sx={{
          borderRadius: 3, bgcolor: 'background.paper',
          border: '1px solid', borderColor: 'divider',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          height: '100%',
        }}>
          <ScriptsMasonryGrid
            scripts={scripts}
            activeScript={activeScript}
            language={uiLanguage}
            browseMode={browseMode}
            onBrowseModeChange={setBrowseMode}
            onSelect={setActiveSlug}
            isBuiltIn={isBuiltIn}
            createNewScript={createNewScript}
            importScriptFile={importScriptFile}
          />
        </Paper>
      ) : showList ? (
        <Paper elevation={0} sx={{
          p: 1.5, borderRadius: 3, bgcolor: 'background.paper',
          border: '1px solid', borderColor: 'divider',
          display: 'flex', flexDirection: 'column', gap: 1,
          height: '100%', overflow: 'hidden',
        }}>
          <ScriptsLeftPanel
            scripts={scripts}
            activeScript={activeScript}
            language={uiLanguage}
            isMobile={isMobile}
            browseMode={browseMode}
            onBrowseModeChange={setBrowseMode}
            getScriptTitle={getScriptTitle}
            setActiveSlug={setActiveSlug}
            onClose={() => setListOpen(false)}
            createNewScript={createNewScript}
            importScriptFile={importScriptFile}
            deleteScript={deleteScript}
            duplicateScript={duplicateScript}
            isBuiltIn={isBuiltIn}
            scriptFolders={scriptFolders}
            createFolder={createFolder}
            renameFolder={renameFolder}
            deleteFolder={deleteFolder}
            toggleFolderCollapsed={toggleFolderCollapsed}
            moveScriptToFolder={moveScriptToFolder}
          />
        </Paper>
      ) : null}

      {/* ── Right detail panel — hidden in masonry when no script selected ── */}
      {(browseMode !== 'masonry' || activeScript) && (
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: '100%', boxSizing: 'border-box' }}>
        {activeScript ? (
          <>
            {/* ── Toolbar ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <IconButton size="small" onClick={() => setListOpen((v) => !v)}
                title={showList ? 'Hide list' : 'Show list'}>
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
                ? (zh ? '隐藏夜间顺序' : 'Hide night order')
                : (zh ? '显示夜间顺序' : 'Show night order')}>
                <IconButton size="small"
                  onClick={() => setShowWakeOrderPreview((c) => !c)}
                  color={showWakeOrderPreview ? 'primary' : 'default'}>
                  <NightsStayIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <ToggleButtonGroup size="small" exclusive value={viewColumns}
                onChange={(_, v) => { if (v) setViewColumns(v) }}>
                <ToggleButton value={1}><ViewListIcon fontSize="small" /></ToggleButton>
                <ToggleButton value={2}><ViewModuleIcon fontSize="small" /></ToggleButton>
              </ToggleButtonGroup>
              <Tooltip title={hideAbility
                ? (zh ? '显示能力描述' : 'Show ability text')
                : (zh ? '隐藏能力描述' : 'Hide ability text')}>
                <IconButton size="small"
                  onClick={() => setHideAbility((v) => !v)}
                  color={hideAbility ? 'primary' : 'default'}>
                  {hideAbility ? <SortIcon fontSize="small" /> : <SubjectIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              {saveStatus && <Typography variant="body2" color="text.secondary">{saveStatus}</Typography>}
              <Box sx={{ flex: 1 }} />
              <FormControl size="small" sx={{ minWidth: 72, '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
                <InputLabel>{zh ? '语言' : 'Lang'}</InputLabel>
                <Select value={uiLanguage} label={zh ? '语言' : 'Lang'}
                  onChange={(e) => onLanguageChange(e.target.value as Language)}>
                  <MenuItem value="en">EN</MenuItem>
                  <MenuItem value="zh">中文</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title={zh ? '导出 PDF' : 'Print PDF'}>
                <IconButton size="small" onClick={onPrintClick}>
                  <PrintIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* ── Tags + Note bar ── */}
            {(() => {
              const activeTags = activeScript.tags ?? []
              const note = activeScript.notes ?? ''
              const hasNote = note.trim().length > 0
              return (
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', mb: 0.5 }}>
                    {activeTags.map((tag) => {
                      const IconComp = tagIcon(tag)
                      return (
                        <Chip key={tag} label={tagLabel(tag)}
                          icon={IconComp ? <IconComp /> : undefined}
                          size="small" onDelete={() => removeTag(tag)}
                          sx={{ fontSize: '0.8rem', fontWeight: 600, '& .MuiChip-icon': { fontSize: '1rem' } }} />
                      )
                    })}
                    {SCRIPT_TAGS.filter((t) => !activeTags.includes(t)).map((tag) => {
                      const IconComp = tagIcon(tag)
                      return (
                        <Chip key={tag} label={tagLabel(tag)}
                          icon={IconComp ? <IconComp /> : undefined}
                          size="small" variant="outlined" onClick={() => addTag(tag)}
                          sx={{ fontSize: '0.75rem', opacity: 0.5, '&:hover': { opacity: 1 }, '& .MuiChip-icon': { fontSize: '0.9rem' } }} />
                      )
                    })}
                    <Box component="input"
                      placeholder={zh ? '自定义标签…' : 'Custom tag…'}
                      value={customTagInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') { const t = customTagInput.trim(); if (t) { addTag(t); setCustomTagInput('') } }
                        else if (e.key === 'Escape') setCustomTagInput('')
                      }}
                      sx={{
                        border: '1px dashed', borderColor: 'divider', borderRadius: '16px',
                        px: 1.25, py: '2px', fontSize: '0.65rem',
                        bgcolor: 'transparent', color: 'text.primary', outline: 'none',
                        width: 110, opacity: 0.55,
                        '&:focus': { opacity: 1, borderColor: 'primary.main', borderStyle: 'solid' },
                        '&::placeholder': { color: 'text.disabled' },
                      }} />
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
                        sx={{ fontSize: '0.65rem', maxWidth: 220, opacity: hasNote ? 1 : 0.45, '&:hover': { opacity: 1 } }} />
                    </Tooltip>
                  </Box>
                  <Collapse in={noteOpen} onEntered={() => noteRef.current?.focus()}>
                    <Box sx={{ border: '1px solid', borderColor: 'info.main', borderRadius: 1.5, p: 1, bgcolor: 'background.paper' }}>
                      <TextField inputRef={noteRef} fullWidth multiline minRows={2} maxRows={8} size="small"
                        placeholder={zh ? '在此记录剧本备注（仅作者可见）…' : 'Script notes — for your own reference…'}
                        value={note}
                        onChange={(e) => updateActiveScript((s) => ({ ...s, notes: e.target.value }))}
                        variant="standard"
                        slotProps={{ input: { disableUnderline: true, sx: { fontSize: '0.82rem' } } }} />
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

            {/* ── Night order preview (standalone, collapsible) ── */}
            {!isEditMode && (
              <Box sx={{ mb: 2 }}>
                <NightOrderPreview
                  script={activeScript}
                  language={uiLanguage}
                  open={showWakeOrderPreview}
                  onToggle={() => setShowWakeOrderPreview((c) => !c)}
                />
              </Box>
            )}

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
                showWakeOrder={false}
                viewColumns={viewColumns}
                hideAbility={hideAbility}
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
      )}
    </Box>
  )
}
