import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, TextField, Tooltip, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PrintIcon from '@mui/icons-material/Print'
import DownloadIcon from '@mui/icons-material/Download'
import ShareIcon from '@mui/icons-material/Share'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import MenuIcon from '@mui/icons-material/Menu'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import NoteAltIcon from '@mui/icons-material/NoteAlt'
import ViewListIcon from '@mui/icons-material/ViewList'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import SubjectIcon from '@mui/icons-material/Subject'
import SortIcon from '@mui/icons-material/Sort'
import { encodeShareParam, buildShareUrl } from '../../lib/shareUrl'
import { createShortLink } from '../../lib/firebaseShortUrl'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { SheetArticle } from '../SheetArticle'
import { ScriptsLeftPanel } from '../ScriptsTab/ScriptsLeftPanel'
import { ScriptsMasonryGrid } from '../ScriptsTab/ScriptsMasonryGrid'
import { NightOrderPreview } from '../ScriptsTab/NightOrderPreview'
import { ScriptEditor } from './ScriptEditor'
import { SCRIPT_TAG_META, SCRIPT_TAGS } from './ScriptsTab.constants'
import type {
  CharacterGroup,
  CustomCharacter,
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
  /** Whether the current script is built-in (stable slug, no encoding needed) */
  isCurrentBuiltIn: boolean
  /** Global custom characters (CharactersTab) — needed to embed into share payload */
  customChars: CustomCharacter[]
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
  isCurrentBuiltIn,
  customChars,
}: Props) {
  const { isMobile } = useBreakpoint()
  const [listOpenDesktop, setListOpenDesktop] = useState(true)
  const [listOpenMobile, setListOpenMobile] = useState(false)
  const showList = isMobile ? listOpenMobile : listOpenDesktop
  const setListOpen = isMobile ? setListOpenMobile : setListOpenDesktop
  const [viewColumns, setViewColumns] = useState<1 | 2>(1)
  const [hideAbility, setHideAbility] = useState(() => isMobile)
  // Masonry card-view detail overlay — when true the full detail panel is shown over the grid
  const [masonryDetailOpen, setMasonryDetailOpen] = useState(false)

  // ── Script share dialog ───────────────────────────────────────────────────
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareCopied, setShareCopied] = useState(false)

  const openShareDialog = () => {
    if (!activeScript) return
    setShareDialogOpen(true)
    setShareError('')
    setShareUrl('')
    setShareLoading(true)
    setShareCopied(false)

    if (isCurrentBuiltIn) {
      // Built-in script: stable slug — no Firebase needed, link never expires.
      // Use buildShareUrl so VITE_APP_URL / capacitor origins are handled correctly.
      try {
        const base = new URL(buildShareUrl('s', activeScript.slug))
        base.searchParams.set('t', 'scripts')
        setShareUrl(base.toString())
      } catch {
        // Last-resort fallback: just show relative path
        setShareUrl(`?t=scripts&s=${encodeURIComponent(activeScript.slug)}`)
      }
      setShareLoading(false)
    } else {
      // Embed any globally-registered custom chars referenced by this script
      // that aren't already inline in customCharacters[].
      // Recipients won't have these in their catalog — embedding ensures they render.
      const charSet = new Set(activeScript.characters)
      const alreadyInline = new Set(activeScript.customCharacters.map((c) => c.id))
      const missing = customChars.filter((c) => charSet.has(c.id) && !alreadyInline.has(c.id))
      const scriptToShare: EditableScript = missing.length > 0
        ? {
            ...activeScript,
            customCharacters: [
              ...activeScript.customCharacters,
              ...missing.map((c) => ({
                id: c.id,
                name: c.nameEn,
                ...(c.nameZh ? { name_zh: c.nameZh } : {}),
                ability: c.abilityEn,
                ...(c.abilityZh ? { ability_zh: c.abilityZh } : {}),
                team: c.team,
                edition: c.edition,
                ...(c.icon ? { image: c.icon } : {}),
                ...(c.firstNight !== undefined ? { firstNight: c.firstNight } : {}),
                ...(c.otherNight !== undefined ? { otherNight: c.otherNight } : {}),
                ...(c.firstNightReminder ? { firstNightReminder: c.firstNightReminder } : {}),
                ...(c.otherNightReminder ? { otherNightReminder: c.otherNightReminder } : {}),
                ...(c.reminders?.length ? { reminders: c.reminders } : {}),
                ...(c.remindersGlobal?.length ? { remindersGlobal: c.remindersGlobal } : {}),
                ...(c.jinxes?.length ? { jinxes: c.jinxes } : {}),
              })),
            ],
          }
        : activeScript

      // Custom script: encode full script + create Firebase short link
      encodeShareParam(scriptToShare)
        .then(async (encoded) => {
          try {
            const shortId = await createShortLink(encoded)
            setShareUrl(buildShareUrl('ss', shortId))
          } catch {
            // Firebase unavailable — fall back to raw encoded in URL
            // (loadable via the direct-decode path in useShareParam)
            setShareError(zh ? '无法创建短链接，已生成长链接。' : 'Short link failed — using direct link instead.')
            setShareUrl(buildShareUrl('ss', encoded))
          }
          setShareLoading(false)
        })
        .catch((e: unknown) => {
          setShareError(e instanceof Error ? e.message : String(e))
          setShareLoading(false)
        })
    }
  }
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

  // In masonry mode the grid is always single-column (full-width);
  // detail panel replaces the grid when masonryDetailOpen.
  const gridCols = isMobile
    ? '1fr'
    : (browseMode === 'list' && showList ? '320px 1fr' : '1fr')

  const handleBrowseModeChange = (mode: 'list' | 'masonry') => {
    setBrowseMode(mode)
    if (mode === 'masonry') setMasonryDetailOpen(false)
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, gap: 2, minHeight: 0 }}>
      {/* ── Card gallery (masonry mode — full width, hides when detail open) ── */}
      {browseMode === 'masonry' && !masonryDetailOpen && (
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
            onBrowseModeChange={handleBrowseModeChange}
            onSelect={setActiveSlug}
            onDetailOpen={() => setMasonryDetailOpen(true)}
            isBuiltIn={isBuiltIn}
            scriptFolders={scriptFolders}
            createNewScript={createNewScript}
            importScriptFile={importScriptFile}
          />
        </Paper>
      )}

      {/* ── Left sidebar (list mode only) ── */}
      {browseMode === 'list' && showList && (
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
            onBrowseModeChange={handleBrowseModeChange}
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
      )}

      {/* ── Detail panel — list mode always; masonry mode only when detail open ── */}
      {(browseMode === 'list' || masonryDetailOpen) && (
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: '100%', boxSizing: 'border-box' }}>
        {activeScript ? (
          <>
            {/* ── Toolbar ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {browseMode === 'masonry' ? (
                /* Back to card gallery */
                <Tooltip title={zh ? '返回卡片视图' : 'Back to card view'}>
                  <IconButton size="small" onClick={() => setMasonryDetailOpen(false)}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                /* Toggle list sidebar */
                <IconButton size="small" onClick={() => setListOpen((v) => !v)}
                  title={showList ? 'Hide list' : 'Show list'}>
                  {showList ? <MenuOpenIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
                </IconButton>
              )}
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
              <Tooltip title={zh ? '复制分享链接' : 'Copy share link'}>
                <IconButton size="small" onClick={openShareDialog}>
                  <ShareIcon fontSize="small" />
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
              <Tooltip title={viewColumns === 2
                ? (zh ? '单列视图' : 'Single column')
                : (zh ? '双列视图' : 'Two columns')}>
                <IconButton size="small" onClick={() => setViewColumns((v) => (v === 1 ? 2 : 1))}>
                  {viewColumns === 2
                    ? <ViewListIcon fontSize="small" />
                    : <ViewModuleIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
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

      {/* ── Script share dialog ── */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{zh ? '分享剧本' : 'Share Script'}</DialogTitle>
        <DialogContent>
          {shareLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">{zh ? '生成链接…' : 'Generating link…'}</Typography>
            </Box>
          )}
          {shareError && <Alert severity="warning" sx={{ mb: 1 }}>{shareError}</Alert>}
          {!shareLoading && shareUrl && (
            <Box sx={{ mt: 1 }}>
              {isCurrentBuiltIn ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {zh ? '此链接会直接打开此剧本。链接永久有效。' : 'This link opens this script directly. Link never expires.'}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {zh ? '此链接包含剧本的完整副本，24小时后失效。' : 'This link contains a full copy of the script. Valid for 24 hours.'}
                </Typography>
              )}
              <TextField
                fullWidth size="small" value={shareUrl} slotProps={{ input: { readOnly: true } }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                sx={{ fontFamily: 'monospace', '& input': { fontSize: '0.78rem' } }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!shareLoading && shareUrl && (
            <Button
              startIcon={shareCopied ? <CheckIcon /> : <ContentCopyIcon />}
              color={shareCopied ? 'success' : 'primary'}
              onClick={() => {
                navigator.clipboard.writeText(shareUrl)
                  .then(() => { setShareCopied(true); setTimeout(() => { setShareCopied(false); setShareDialogOpen(false) }, 1800) })
                  .catch(() => { setShareCopied(true); setTimeout(() => { setShareCopied(false); setShareDialogOpen(false) }, 1800) })
              }}
            >
              {shareCopied ? (zh ? '已复制！' : 'Copied!') : (zh ? '复制链接' : 'Copy Link')}
            </Button>
          )}
          <Button onClick={() => setShareDialogOpen(false)}>
            {zh ? '关闭' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
