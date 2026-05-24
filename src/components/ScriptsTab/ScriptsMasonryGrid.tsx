import React, { useDeferredValue, useMemo, useState } from 'react'
import {
  Box, Chip, Divider, IconButton, InputAdornment,
  TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ClearIcon from '@mui/icons-material/Clear'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import SearchIcon from '@mui/icons-material/Search'
import ViewListIcon from '@mui/icons-material/ViewList'
import { allCharacters, getDisplayName } from '../../catalog'
import { MasonryScriptCard } from './MasonryScriptCard'
import { FolderCard } from './FolderCard'
import { SCRIPT_TAG_META, SCRIPT_TAGS } from '../tabs/ScriptsTab.constants'
import type { EditableScript, Language, ScriptFolder } from '../../types'

const OFFICIAL = new Set(['tb', 'bmr', 'snv'])

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 2,
} as const

type Props = {
  scripts: EditableScript[]
  activeScript: EditableScript | undefined
  language: Language
  browseMode: 'list' | 'masonry'
  onBrowseModeChange: (mode: 'list' | 'masonry') => void
  onSelect: (slug: string) => void
  onDetailOpen: () => void
  isBuiltIn: (slug: string) => boolean
  scriptFolders: ScriptFolder[]
  createNewScript: () => void
  importScriptFile: (file: File) => void
  deleteScript: (slug: string) => void
  duplicateScript: (slug: string) => void
  createFolder: (name: string) => ScriptFolder
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  moveScriptToFolder: (slug: string, folderId: string | undefined) => void
}

export function ScriptsMasonryGrid({
  scripts,
  activeScript,
  language,
  onBrowseModeChange,
  onSelect,
  onDetailOpen,
  isBuiltIn,
  scriptFolders,
  createNewScript,
  importScriptFile,
  deleteScript,
  duplicateScript,
  createFolder,
  renameFolder,
  deleteFolder,
  moveScriptToFolder,
}: Props) {
  const zh = language === 'zh'
  const [query, setQuery]               = useState('')
  const [tagFilter, setTagFilter]       = useState<string | null>(null)
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query)

  // ── Character name index ──────────────────────────────────────────────────
  const charNameIndex = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of allCharacters) {
      m.set(c.id, `${getDisplayName(c.id, 'en').toLowerCase()}|${getDisplayName(c.id, 'zh').toLowerCase()}`)
    }
    return m
  }, [])

  // ── Filter ─────────────────────────────────────────────────────────────────
  const { official, community, diy } = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    const passes = (s: EditableScript) => {
      if (tagFilter && !(s.tags ?? []).includes(tagFilter)) return false
      if (!q) return true
      if (s.title.toLowerCase().includes(q))   return true
      if (s.titleZh.toLowerCase().includes(q)) return true
      if (s.author.toLowerCase().includes(q))  return true
      return s.characters.some((id) => charNameIndex.get(id)?.includes(q) ?? false)
    }

    let base = scripts
    if (folderFilter !== null) {
      base = scripts.filter((s) => !isBuiltIn(s.slug) && s.folderId === folderFilter)
    }

    return {
      official:  base.filter((s) => OFFICIAL.has(s.slug)                        && passes(s)),
      community: base.filter((s) => isBuiltIn(s.slug) && !OFFICIAL.has(s.slug) && passes(s)),
      diy:       base.filter((s) => !isBuiltIn(s.slug)                          && passes(s)),
    }
  }, [scripts, deferredQuery, tagFilter, folderFilter, charNameIndex, isBuiltIn])

  // ── Tags in use ────────────────────────────────────────────────────────────
  const filterTags = useMemo(() => {
    const allUsed = [...new Set(scripts.flatMap((s) => s.tags ?? []))]
    return [
      ...SCRIPT_TAGS.filter((t) => allUsed.includes(t)),
      ...allUsed.filter((t) => !SCRIPT_TAG_META[t]),
    ]
  }, [scripts])

  // ── DIY grouping by folder ─────────────────────────────────────────────────
  const diyByFolder = useMemo(() => {
    if (folderFilter !== null) return null
    const isFiltering = !!deferredQuery.trim() || !!tagFilter
    const sorted = [...scriptFolders].sort((a, b) => a.order - b.order)
    const byFolder = sorted
      .map((folder) => ({
        folder,
        scripts: diy.filter((s) => s.folderId === folder.id),
      }))
      .filter(({ scripts: ss }) => ss.length > 0 || !isFiltering)
    const unfoldered = diy.filter((s) => !s.folderId)
    return { byFolder, unfoldered }
  }, [diy, scriptFolders, folderFilter, deferredQuery, tagFilter])

  const total = official.length + community.length + diy.length
  const isFiltering = !!deferredQuery.trim() || !!tagFilter
  const activeFolder = folderFilter ? scriptFolders.find((f) => f.id === folderFilter) : null

  const handleSelect = (slug: string) => { onSelect(slug); onDetailOpen() }

  const handleCreateFolder = () => {
    const name = prompt(zh ? '新建文件夹名称：' : 'New folder name:')
    if (name?.trim()) createFolder(name.trim())
  }

  const chipSx = {
    fontSize: '0.72rem', height: 22, fontWeight: 600,
    '& .MuiChip-icon': { fontSize: '0.85rem' },
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Top bar ── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5,
        borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,
        bgcolor: 'background.paper',
      }}>
        {activeFolder && (
          <Tooltip title={zh ? '返回' : 'Back'}>
            <IconButton size="small" onClick={() => setFolderFilter(null)}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <TextField
          size="small"
          placeholder={zh ? '搜索剧本、作者、角色…' : 'Search scripts, author, characters…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flex: 1, maxWidth: 520, '& .MuiInputBase-root': { borderRadius: 6 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setQuery('')}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />

        {activeFolder && (
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {activeFolder.name}
          </Typography>
        )}
        {isFiltering && !activeFolder && (
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {total} {zh ? '个结果' : 'results'}
          </Typography>
        )}

        <Box sx={{ flex: 1 }} />

        <Tooltip title={zh ? '切换列表视图' : 'Switch to list view'}>
          <IconButton size="small" onClick={() => onBrowseModeChange('list')}>
            <ViewListIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={zh ? '新建文件夹' : 'New folder'}>
          <IconButton size="small" onClick={handleCreateFolder}>
            <CreateNewFolderIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={zh ? '新建剧本' : 'New Script'}>
          <IconButton size="small" onClick={createNewScript}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={zh ? '导入 JSON' : 'Import JSON'}>
          <IconButton size="small" component="label">
            <FileOpenIcon fontSize="small" />
            <input type="file" accept=".json" hidden onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) { importScriptFile(file); e.target.value = '' }
            }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Tag filter chips ── */}
      {filterTags.length > 0 && (
        <Box sx={{
          display: 'flex', flexWrap: 'wrap', gap: 0.5, px: 2, py: 1,
          borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,
          bgcolor: 'background.paper',
        }}>
          <Chip size="small" label={zh ? '全部' : 'All'}
            variant={tagFilter === null ? 'filled' : 'outlined'}
            color={tagFilter === null ? 'primary' : 'default'}
            onClick={() => setTagFilter(null)} sx={chipSx} />
          {filterTags.map((tag) => {
            const meta = SCRIPT_TAG_META[tag]
            const IconComp = meta?.Icon
            return (
              <Chip key={tag} size="small"
                label={meta ? (zh ? meta.zh : meta.en) : tag}
                icon={IconComp ? <IconComp /> : undefined}
                variant={tagFilter === tag ? 'filled' : 'outlined'}
                color={tagFilter === tag ? 'primary' : 'default'}
                onClick={() => setTagFilter((c) => c === tag ? null : tag)}
                sx={chipSx} />
            )
          })}
        </Box>
      )}

      {/* ── Scrollable card grid ── */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
        {total === 0 && !(!isFiltering && scriptFolders.length > 0) ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140 }}>
            <Typography color="text.secondary">
              {zh ? '无结果' : 'No matches'}
            </Typography>
          </Box>
        ) : isFiltering || folderFilter ? (
          /* Flat grid when searching or inside a folder */
          <Box sx={GRID_SX}>
            {[...official, ...community, ...diy].map((s) => (
              <MasonryScriptCard
                key={s.slug}
                script={s}
                isActive={s.slug === activeScript?.slug}
                language={language}
                onSelect={() => handleSelect(s.slug)}
                isDeletable={!isBuiltIn(s.slug)}
                scriptFolders={scriptFolders}
                onDelete={() => deleteScript(s.slug)}
                onDuplicate={isBuiltIn(s.slug) ? () => duplicateScript(s.slug) : undefined}
                onMoveToFolder={!isBuiltIn(s.slug) ? (fid) => moveScriptToFolder(s.slug, fid) : undefined}
              />
            ))}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>

            {/* Official */}
            {official.length > 0 && (
              <GridSection label={zh ? '官方' : 'Official'} count={official.length}>
                <Box sx={GRID_SX}>
                  {official.map((s) => (
                    <MasonryScriptCard key={s.slug} script={s}
                      isActive={s.slug === activeScript?.slug}
                      language={language}
                      onSelect={() => handleSelect(s.slug)}
                      isDeletable={false}
                      onDuplicate={() => duplicateScript(s.slug)}
                    />
                  ))}
                </Box>
              </GridSection>
            )}

            {/* Community */}
            {community.length > 0 && (
              <GridSection label={zh ? '社区' : 'Community'} count={community.length}>
                <Box sx={GRID_SX}>
                  {community.map((s) => (
                    <MasonryScriptCard key={s.slug} script={s}
                      isActive={s.slug === activeScript?.slug}
                      language={language}
                      onSelect={() => handleSelect(s.slug)}
                      isDeletable={false}
                      onDuplicate={() => duplicateScript(s.slug)}
                    />
                  ))}
                </Box>
              </GridSection>
            )}

            {/* DIY: folder tiles + unfoldered scripts */}
            {diyByFolder && (diy.length > 0 || scriptFolders.length > 0) && (
              <GridSection label={zh ? '自制' : 'DIY'} count={diy.length}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                  {/* Folder tiles */}
                  {diyByFolder.byFolder.length > 0 && (
                    <Box sx={GRID_SX}>
                      {diyByFolder.byFolder.map(({ folder, scripts: ss }) => (
                        <FolderCard
                          key={folder.id}
                          folder={folder}
                          scripts={ss}
                          language={language}
                          onOpen={() => setFolderFilter(folder.id)}
                          onRename={(name) => renameFolder(folder.id, name)}
                          onDelete={() => deleteFolder(folder.id)}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Unfoldered scripts */}
                  {diyByFolder.unfoldered.length > 0 && (
                    <>
                      {diyByFolder.byFolder.length > 0 && (
                        <Typography variant="caption" sx={{
                          color: 'text.disabled', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.65rem',
                        }}>
                          {zh ? '未分类' : 'Uncategorized'}
                        </Typography>
                      )}
                      <Box sx={GRID_SX}>
                        {diyByFolder.unfoldered.map((s) => (
                          <MasonryScriptCard key={s.slug} script={s}
                            isActive={s.slug === activeScript?.slug}
                            language={language}
                            onSelect={() => handleSelect(s.slug)}
                            isDeletable={true}
                            scriptFolders={scriptFolders}
                            onDelete={() => deleteScript(s.slug)}
                            onMoveToFolder={(fid) => moveScriptToFolder(s.slug, fid)}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
              </GridSection>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────

function GridSection({ label, count, children }: {
  label: string; count: number; children: React.ReactNode
}) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="overline" sx={{
          fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1,
        }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
          ({count})
        </Typography>
        <Divider sx={{ flex: 1 }} />
      </Box>
      {children}
    </Box>
  )
}
