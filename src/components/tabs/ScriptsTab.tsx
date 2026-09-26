import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Alert, Box, Button, CircularProgress, Collapse, DialogTitle, FormControlLabel, IconButton, MenuItem, Paper, Popover, Switch, TextField, Tooltip, Typography } from '@mui/material'
import { ScriptImportDialog } from '../ScriptsTab/ScriptImportDialog'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PrintIcon from '@mui/icons-material/Print'
import DownloadIcon from '@mui/icons-material/Download'
import ShareIcon from '@mui/icons-material/Share'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import MenuIcon from '@mui/icons-material/Menu'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import { encodeShareParam, buildShareUrl } from '../../lib/shareUrl'
import { createShortLink } from '../../lib/firebaseShortUrl'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { SheetArticle } from '../SheetArticle'
import { ScriptsLeftPanel } from '../ScriptsTab/ScriptsLeftPanel'
import { ScriptsMasonryGrid } from '../ScriptsTab/ScriptsMasonryGrid'
import { NightOrderPreview } from '../ScriptsTab/NightOrderPreview'
import { ScriptEditor } from './ScriptEditor'
import { FeedbackButton } from '../Feedback'
import { scriptRequest } from '../../lib/feedback/snapshot'
import { ScriptTagsPanel } from '../ScriptsTab/ScriptTagsPanel'
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
import { useT } from '../../context/I18nContext'
import { ResponsiveDialog, ResponsiveDialogActions, ResponsiveDialogContent } from '../ui'

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
  importScripts: (scripts: EditableScript[], folderId?: string) => void
  deleteScript: (slug: string) => void
  duplicateScript: (slug: string) => void
  isBuiltIn: (slug: string) => boolean
  scriptFolders: ScriptFolder[]
  createFolder: (name: string, section?: 'community' | 'diy') => ScriptFolder
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
  importScripts,
  deleteScript,
  duplicateScript,
  isBuiltIn,
  scriptFolders,
  createFolder,
  renameFolder,
  deleteFolder,
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
  const { t } = useT()
  const [displayAnchor, setDisplayAnchor] = useState<HTMLElement | null>(null)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
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
            setShareError(t('short_link_failed_using_direct_link_instead'))
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
      <Paper variant="outlined" sx={{ gridColumn: '1 / -1', p: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', borderRadius: '12px', bgcolor: 'background.paper', boxShadow: 'none' }}>
        <Typography variant="h6" sx={{ flex: 1, flexBasis: { xs: '100%', sm: 'auto' }, whiteSpace: 'nowrap' }}>{t('library_title')} <Typography component="span" color="text.secondary">{scripts.length}</Typography></Typography>
        <Button variant="contained" onClick={() => { createNewScript(); setMasonryDetailOpen(true); setIsEditMode(true); if (isMobile) setListOpen(false) }}>{t('new_script')}</Button>
        <Button variant="outlined" onClick={() => setImportOpen(true)}>{t('library_import')}</Button>
        <Button onClick={e => setDisplayAnchor(e.currentTarget)} aria-expanded={Boolean(displayAnchor)}>{t('library_display_settings')}</Button>
      </Paper>
      <Popover open={Boolean(displayAnchor)} anchorEl={displayAnchor} onClose={() => setDisplayAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Box sx={{ p: 2, width: 280, display: 'grid', gap: 2 }}>
          <Typography variant="subtitle2">{t('library_display_settings')}</Typography>
          <TextField select size="small" label={t('library_browse_view')} value={browseMode} onChange={e => { handleBrowseModeChange(e.target.value as 'list' | 'masonry'); setDisplayAnchor(null) }}>
            <MenuItem value="list">{t('library_list_view')}</MenuItem><MenuItem value="masonry">{t('library_card_view')}</MenuItem>
          </TextField>
          <TextField select size="small" label={t('library_reading_layout')} value={viewColumns} onChange={e => setViewColumns(Number(e.target.value) as 1 | 2)}>
            <MenuItem value={1}>{t('single_column')}</MenuItem><MenuItem value={2}>{t('two_columns')}</MenuItem>
          </TextField>
          <FormControlLabel control={<Switch checked={!hideAbility} onChange={(_, checked) => setHideAbility(!checked)} />} label={t('show_ability_text')} />
          <TextField select size="small" label={t('lang')} value={uiLanguage} onChange={e => onLanguageChange(e.target.value as Language)}>
            <MenuItem value="en">EN</MenuItem><MenuItem value="zh">中文</MenuItem>
          </TextField>
        </Box>
      </Popover>
      {importOpen && <ScriptImportDialog open onClose={() => setImportOpen(false)} folders={scriptFolders} onImport={(items, folder) => { importScripts(items, folder); setMasonryDetailOpen(true); if (isMobile) setListOpen(false) }} />}
      <ResponsiveDialog open={exportOpen} onClose={() => setExportOpen(false)}>
        <DialogTitle>{t('library_export')} · {activeScript && getScriptTitle(activeScript)}</DialogTitle>
        <ResponsiveDialogContent><Box sx={{ display: 'grid', gap: 2, py: 1 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => { downloadScriptFile(); setExportOpen(false) }}>{t('library_export_json')}</Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => { setExportOpen(false); onPrintClick() }}>{t('library_export_pdf')}</Button>
          <Button variant="outlined" startIcon={<ShareIcon />} onClick={() => { setExportOpen(false); void openShareDialog() }}>{t('library_export_link')}</Button>
        </Box></ResponsiveDialogContent>
        <ResponsiveDialogActions><Button onClick={() => setExportOpen(false)}>{t('cancel')}</Button></ResponsiveDialogActions>
      </ResponsiveDialog>
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
            deleteScript={deleteScript}
            duplicateScript={duplicateScript}
            createFolder={createFolder}
            renameFolder={renameFolder}
            deleteFolder={deleteFolder}
            moveScriptToFolder={moveScriptToFolder}
          />
        </Paper>
      )}

      {/* ── Left sidebar (list mode only) ── */}
      {browseMode === 'list' && showList && (
        <Paper elevation={0} sx={{
          p: 1.5, borderRadius: 3, bgcolor: 'background.paper',
          border: '1px solid', borderColor: 'divider',
          display: 'flex', flexDirection: 'column', gap: 1,
          height: { xs: 'calc(100dvh - 260px)', sm: 'calc(100dvh - 220px)' }, minHeight: 300, overflow: 'hidden',
        }}>
          <ScriptsLeftPanel
            createNewScript={() => { createNewScript(); setIsEditMode(true) }}
            scripts={scripts}
            activeScript={activeScript}
            language={uiLanguage}
            isMobile={isMobile}
            getScriptTitle={getScriptTitle}
            setActiveSlug={slug => { setActiveSlug(slug); if (isMobile) setListOpen(false) }}
            onClose={() => setListOpen(false)}
            deleteScript={deleteScript}
            duplicateScript={duplicateScript}
            isBuiltIn={isBuiltIn}
            scriptFolders={scriptFolders}
            createFolder={createFolder}
            renameFolder={renameFolder}
            deleteFolder={deleteFolder}
            moveScriptToFolder={moveScriptToFolder}
          />
        </Paper>
      )}

      {/* ── Detail panel — list mode always; masonry mode only when detail open ── */}
      {(browseMode === 'list' ? !(isMobile && showList) : masonryDetailOpen) && (
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: '100%', boxSizing: 'border-box' }}>
        {activeScript ? (
          <>
            {/* ── Toolbar ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {browseMode === 'masonry' ? (
                /* Back to card gallery */
                <Tooltip title={t('back_to_card_view')}>
                  <IconButton size="small" aria-label={t('back_to_card_view')} onClick={() => setMasonryDetailOpen(false)}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                !showList && <Button size="small" startIcon={<MenuIcon />} onClick={() => setListOpen(true)}>{t('library_choose_script')}</Button>
              )}
              {!isBuiltIn(activeScript.slug) && (
                <Button variant="outlined" size="small" onClick={() => setIsEditMode((c) => !c)}>
                  {isEditMode ? uiText.doneEditing : uiText.editScript}
                </Button>
              )}
              {isBuiltIn(activeScript.slug) && <Button size="small" variant="outlined" onClick={() => { duplicateScript(activeScript.slug); setIsEditMode(true) }}>{t('library_copy_edit')}</Button>}
              <Button size="small" variant="contained" onClick={() => setExportOpen(true)}>{t('library_export')}</Button>
              <Tooltip describeChild title={t('library_organize_hint')}>
                <Button size="small" startIcon={<LocalOfferOutlinedIcon />} onClick={() => setTagsOpen(v => !v)} aria-expanded={tagsOpen}
                  variant={tagsOpen ? 'outlined' : 'text'}>
                  {t('library_tags_notes')}{activeScript.tags?.length ? ` · ${activeScript.tags.length}` : ''}{activeScript.notes?.trim() ? ' •' : ''}
                </Button>
              </Tooltip>
              {saveStatus && <Typography role="status" variant="body2" color="text.secondary">{saveStatus}</Typography>}
              <FeedbackButton sx={{ ml: 'auto' }} request={() => scriptRequest(activeScript, 'scripts/toolbar')} />

            </Box>

            <Collapse in={tagsOpen}>
              <ScriptTagsPanel key={activeScript.slug} script={activeScript} language={uiLanguage} updateScript={updateActiveScript}
                scripts={scripts} folders={scriptFolders} canMove={!['tb', 'bmr', 'snv'].includes(activeScript.slug)}
                section={isBuiltIn(activeScript.slug) ? 'community' : 'diy'} moveScriptToFolder={moveScriptToFolder}
                createFolder={createFolder} renameFolder={renameFolder} deleteFolder={deleteFolder} />
            </Collapse>

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
                supplementalPlacement="end"
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
      <ResponsiveDialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" mobile="compact">
        <DialogTitle>{t('share_script')}</DialogTitle>
        <ResponsiveDialogContent>
          {shareLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">{t('generating_link')}</Typography>
            </Box>
          )}
          {shareError && <Alert severity="warning" sx={{ mb: 1 }}>{shareError}</Alert>}
          {!shareLoading && shareUrl && (
            <Box sx={{ mt: 1 }}>
              {isCurrentBuiltIn ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('share_link_permanent_note')}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('share_link_24h_note')}
                </Typography>
              )}
              <TextField
                fullWidth size="small" value={shareUrl} slotProps={{ input: { readOnly: true } }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                sx={{ fontFamily: 'monospace', '& input': { fontSize: '0.78rem' } }}
              />
            </Box>
          )}
        </ResponsiveDialogContent>
        <ResponsiveDialogActions>
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
              {shareCopied ? (t('share_log_copied')) : (t('copy_link'))}
            </Button>
          )}
          <Button onClick={() => setShareDialogOpen(false)}>
            {t('close')}
          </Button>
        </ResponsiveDialogActions>
      </ResponsiveDialog>
    </Box>
  )
}
