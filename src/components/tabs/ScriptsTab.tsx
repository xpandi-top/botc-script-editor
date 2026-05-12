import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Box, Button, Chip, Collapse, Divider, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
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
import ViewListIcon from '@mui/icons-material/ViewList'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { ScriptList } from '../ScriptList'
import { SheetArticle } from '../SheetArticle'
import { ScriptEditor } from './ScriptEditor'
import type {
  CharacterGroup,
  EditableScript,
  Language,
  ResolvedScriptCharacter,
  ResolvedScriptCharacterGroup,
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
  availableEditions: string[]
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
  availableEditions,
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
  const [editionFilter, setEditionFilter] = useState<string | null>(null)

  const gridCols = isMobile ? '1fr' : showList ? '280px 1fr' : '1fr'

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, gap: 2 }}>
      {showList && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{uiText.scriptSheet}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title={uiLanguage === 'zh' ? '新建剧本' : 'New Script'}>
                <IconButton size="small" onClick={createNewScript}><AddIcon fontSize="small" /></IconButton>
              </Tooltip>
              <Tooltip title={uiLanguage === 'zh' ? '导入 JSON' : 'Import JSON'}>
                <IconButton size="small" component="label">
                  <FileOpenIcon fontSize="small" />
                  <input type="file" accept=".json" hidden onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) { importScriptFile(file); e.target.value = '' }
                  }} />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={() => setListOpen(false)} title="Hide list">
                <MenuOpenIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          {(() => {
            const OFFICIAL = new Set(['tb', 'bmr', 'snv'])
            const zh = uiLanguage === 'zh'

            // ── Filter logic ──────────────────────────────────────
            const q = scriptSearch.trim().toLowerCase()
            const filterScript = (s: EditableScript) => {
              if (editionFilter && s.edition !== editionFilter) return false
              if (!q) return true
              return (
                s.title.toLowerCase().includes(q) ||
                s.titleZh.toLowerCase().includes(q) ||
                s.author.toLowerCase().includes(q) ||
                s.edition.toLowerCase().includes(q)
              )
            }

            const allEditions = [...new Set(scripts.map((s) => s.edition).filter(Boolean))]
            const official = scripts.filter((s) => OFFICIAL.has(s.slug) && filterScript(s))
            const community = scripts.filter((s) => isBuiltIn(s.slug) && !OFFICIAL.has(s.slug) && filterScript(s))
            const diy = scripts.filter((s) => !isBuiltIn(s.slug) && filterScript(s))
            const isFiltering = !!q || !!editionFilter

            const SectionHeader = ({ label, count, open, onToggle }: { label: string; count: number; open: boolean; onToggle: () => void }) => (
              <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={onToggle}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.6rem', lineHeight: 1, flex: 1 }}>
                  {label} ({count})
                </Typography>
                {open ? <ExpandLessIcon sx={{ fontSize: 14, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
              </Box>
            )

            const renderGroup = (group: typeof scripts, deletable: boolean) =>
              group.map((script) => (
                <Box key={script.slug} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <ScriptList
                      title={getScriptTitle(script)}
                      isActive={script.slug === activeScript?.slug}
                      onSelect={() => { setActiveSlug(script.slug); if (isMobile) setListOpen(false) }}
                    />
                  </Box>
                  {!deletable && (
                    <Tooltip title={zh ? '复制到自制' : 'Copy to DIY'}>
                      <IconButton size="small"
                        onClick={() => duplicateScript(script.slug)}
                        sx={{ flexShrink: 0, opacity: 0.4, '&:hover': { opacity: 1 } }}>
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {deletable && (
                    <Tooltip title={zh ? '删除' : 'Delete'}>
                      <IconButton size="small" color="error"
                        onClick={() => deleteScript(script.slug)}
                        sx={{ flexShrink: 0, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              ))

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {/* Search */}
                <TextField
                  size="small" fullWidth
                  placeholder={zh ? '搜索剧本…' : 'Search scripts…'}
                  value={scriptSearch}
                  onChange={(e) => setScriptSearch(e.target.value)}
                  sx={{ mb: 0.5 }}
                  slotProps={{ input: { sx: { fontSize: '0.8rem' } } }}
                />
                {/* Edition filter chips */}
                {allEditions.length > 1 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                    <Chip
                      size="small" label={zh ? '全部' : 'All'}
                      variant={editionFilter === null ? 'filled' : 'outlined'}
                      onClick={() => setEditionFilter(null)}
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                    {allEditions.map((ed) => (
                      <Chip key={ed} size="small"
                        label={ed}
                        variant={editionFilter === ed ? 'filled' : 'outlined'}
                        onClick={() => setEditionFilter((c) => c === ed ? null : ed)}
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    ))}
                  </Box>
                )}
                {isFiltering && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    {official.length + community.length + diy.length} {zh ? '个结果' : 'results'}
                  </Typography>
                )}
                <Divider />
                <SectionHeader label={zh ? '官方' : 'Official'} count={official.length} open={officialOpen} onToggle={() => setOfficialOpen((v) => !v)} />
                <Collapse in={officialOpen}>
                  <Box sx={{ display: 'grid', gap: 1, pt: 0.5 }}>{official.length > 0 ? renderGroup(official, false) : isFiltering ? <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>{zh ? '无结果' : 'No matches'}</Typography> : null}</Box>
                </Collapse>
                {(community.length > 0 || isFiltering) && (
                  <>
                    <Divider sx={{ my: 0.25 }} />
                    <SectionHeader label={zh ? '社区' : 'Community'} count={community.length} open={communityOpen} onToggle={() => setCommunityOpen((v) => !v)} />
                    <Collapse in={communityOpen}>
                      <Box sx={{ display: 'grid', gap: 1, pt: 0.5 }}>{community.length > 0 ? renderGroup(community, false) : <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>{zh ? '无结果' : 'No matches'}</Typography>}</Box>
                    </Collapse>
                  </>
                )}
                <Divider sx={{ my: 0.25 }} />
                <SectionHeader label={zh ? '自制' : 'DIY'} count={diy.length} open={diyOpen} onToggle={() => setDiyOpen((v) => !v)} />
                <Collapse in={diyOpen}>
                  <Box sx={{ display: 'grid', gap: 1, pt: 0.5 }}>
                    {diy.length > 0 ? renderGroup(diy, true) : (
                      <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5, fontStyle: 'italic' }}>
                        {isFiltering ? (zh ? '无结果' : 'No matches') : (zh ? '点击复制图标添加剧本' : 'Copy a script above to start')}
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )
          })()}
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
                  availableEditions={availableEditions}
                  charColumns={viewColumns === 2 ? '2' : '1'}
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
