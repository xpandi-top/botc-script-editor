import { useEffect, useDeferredValue, useMemo, useState } from 'react'
import { FixedSizeList, type ListChildComponentProps } from 'react-window'
import {
  Box, Chip, Collapse, Divider, IconButton, Select,
  MenuItem, TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import FolderIcon from '@mui/icons-material/Folder'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import SortIcon from '@mui/icons-material/Sort'
import { allCharacters, getDisplayName } from '../../catalog'
import { ScriptCard } from './ScriptCard'
import { SCRIPT_TAG_META, SCRIPT_TAGS } from '../tabs/ScriptsTab.constants'
import type { EditableScript, Language } from '../../types'

// ── Constants ────────────────────────────────────────────────────────────────

const OFFICIAL = new Set(['tb', 'bmr', 'snv'])
const ROW_H = 48  // row height

// ── Virtual row ──────────────────────────────────────────────────────────────

type VRow = { script: EditableScript; deletable: boolean }
type VRowData = {
  rows: VRow[]
  activeSlug: string | undefined
  language: Language
  onSelect: (slug: string) => void
  onClose: () => void
  isMobile: boolean
  duplicateScript: (slug: string) => void
  deleteScript: (slug: string) => void
}

function ScriptRow({ index, style, data }: ListChildComponentProps<VRowData>) {
  const { rows, activeSlug, language, onSelect, onClose, isMobile, duplicateScript, deleteScript } = data
  const { script, deletable } = rows[index]

  return (
    <Box style={style} sx={{ display: 'flex', alignItems: 'center', gap: 0.25, pr: 0.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <ScriptCard
          script={script}
          isActive={script.slug === activeSlug}
          isBuiltIn={!deletable}
          language={language}
          onSelect={() => { onSelect(script.slug); if (isMobile) onClose() }}
        />
      </Box>
      {!deletable && (
        <Tooltip title={language === 'zh' ? '复制到自制' : 'Copy to DIY'}>
          <IconButton size="small" onClick={() => duplicateScript(script.slug)}
            sx={{ flexShrink: 0, opacity: 0.35, '&:hover': { opacity: 1 } }}>
            <ContentCopyIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      )}
      {deletable && (
        <Tooltip title={language === 'zh' ? '删除' : 'Delete'}>
          <IconButton size="small" color="error" onClick={() => deleteScript(script.slug)}
            sx={{ flexShrink: 0, opacity: 0.45, '&:hover': { opacity: 1 } }}>
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────

type Props = {
  scripts: EditableScript[]
  activeScript: EditableScript | undefined
  language: Language
  isMobile: boolean
  getScriptTitle: (s: EditableScript) => string
  setActiveSlug: (slug: string) => void
  onClose: () => void
  createNewScript: () => void
  importScriptFile: (file: File) => void
  deleteScript: (slug: string) => void
  duplicateScript: (slug: string) => void
  isBuiltIn: (slug: string) => boolean
}

// ── Component ────────────────────────────────────────────────────────────────

export function ScriptsLeftPanel({
  scripts,
  activeScript,
  language,
  isMobile,
  getScriptTitle,
  setActiveSlug,
  onClose,
  createNewScript,
  importScriptFile,
  deleteScript,
  duplicateScript,
  isBuiltIn,
}: Props) {
  const zh = language === 'zh'

  const [officialOpen, setOfficialOpen]   = useState(true)
  const [communityOpen, setCommunityOpen] = useState(true)
  const [diyOpen, setDiyOpen]             = useState(true)
  const [scriptSearch, setScriptSearch]   = useState('')
  const deferredSearch = useDeferredValue(scriptSearch)
  const [tagFilter, setTagFilter]         = useState<string | null>(null)
  const [sortKey, setSortKey]             = useState<'default' | 'name' | 'author' | 'chars'>('default')

  // ── Character name index ──────────────────────────────────────────────────
  const charNameIndex = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of allCharacters) {
      const en = getDisplayName(c.id, 'en').toLowerCase()
      const zh2 = getDisplayName(c.id, 'zh').toLowerCase()
      m.set(c.id, `${en}|${zh2}`)
    }
    return m
  }, [])

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const { official, community, diy, isFiltering } = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()

    const filter = (s: EditableScript) => {
      if (tagFilter && !(s.tags ?? []).includes(tagFilter)) return false
      if (!q) return true
      if (s.title.toLowerCase().includes(q)) return true
      if (s.titleZh.toLowerCase().includes(q)) return true
      if (s.author.toLowerCase().includes(q)) return true
      return s.characters.some((id) => charNameIndex.get(id)?.includes(q) ?? false)
    }

    const sort = (arr: EditableScript[]) => {
      if (sortKey === 'default') return arr
      return [...arr].sort((a, b) => {
        if (sortKey === 'name')   return getScriptTitle(a).localeCompare(getScriptTitle(b))
        if (sortKey === 'author') return (a.author || '').localeCompare(b.author || '')
        if (sortKey === 'chars')  return b.characters.length - a.characters.length
        return 0
      })
    }

    return {
      official:    sort(scripts.filter((s) => OFFICIAL.has(s.slug)       && filter(s))),
      community:   sort(scripts.filter((s) => isBuiltIn(s.slug) && !OFFICIAL.has(s.slug) && filter(s))),
      diy:         sort(scripts.filter((s) => !isBuiltIn(s.slug)         && filter(s))),
      isFiltering: !!q || !!tagFilter,
    }
  }, [scripts, deferredSearch, tagFilter, sortKey, charNameIndex, isBuiltIn, getScriptTitle])

  // ── Auto-expand section containing the active script ─────────────────────
  const activeSlug = activeScript?.slug
  useEffect(() => {
    if (!activeSlug || isFiltering) return
    if (diy.some((s) => s.slug === activeSlug))       { setDiyOpen(true);       return }
    if (community.some((s) => s.slug === activeSlug)) { setCommunityOpen(true); return }
    if (official.some((s) => s.slug === activeSlug))  { setOfficialOpen(true);  return }
  }, [activeSlug])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tag filter chips (only tags in use) ──────────────────────────────────
  const filterTags = useMemo(() => {
    const allUsed = [...new Set(scripts.flatMap((s) => s.tags ?? []))]
    const custom  = allUsed.filter((t) => !SCRIPT_TAG_META[t])
    const preset  = SCRIPT_TAGS.filter((t) => allUsed.includes(t))
    return [...preset, ...custom]
  }, [scripts])

  // ── Virtual list builder ─────────────────────────────────────────────────
  const rowData: Omit<VRowData, 'rows'> = {
    activeSlug: activeScript?.slug,
    language,
    onSelect: setActiveSlug,
    onClose,
    isMobile,
    duplicateScript,
    deleteScript,
  }

  const mkList = (rows: VRow[], key: string) => {
    if (!rows.length) return null
    const h = Math.min(rows.length * ROW_H, 400)
    return (
      <FixedSizeList key={key} height={h} width="100%" itemCount={rows.length}
        itemSize={ROW_H} itemData={{ ...rowData, rows }} overscanCount={4}>
        {ScriptRow}
      </FixedSizeList>
    )
  }

  const chipSx = {
    fontSize: '0.72rem', height: 22, fontWeight: 600,
    '& .MuiChip-icon': { fontSize: '0.85rem' },
  }

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', gap: 1,
      height: '100%', minHeight: 0,
    }}>
      {/* ── Toolbar ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700, fontSize: '0.85rem' }}>
          {zh ? '剧本' : 'Scripts'}
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
        <IconButton size="small" onClick={onClose}>
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
          slotProps={{ input: { sx: { fontSize: '0.78rem', pr: 0.5 } }, htmlInput: { 'data-tutorial': 'script-search' } }}
          sx={{ '& .MuiInputBase-root': { borderRadius: 1.5 } }}
        />
        <Select
          size="small" value={sortKey}
          onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
          renderValue={() => <SortIcon sx={{ fontSize: 16, display: 'block' }} />}
          sx={{
            minWidth: 36,
            '& .MuiSelect-select': { py: '6px', px: '6px !important', display: 'flex', alignItems: 'center' },
            '& .MuiSelect-icon': { display: 'none' },
          }}
        >
          <MenuItem value="default" sx={{ fontSize: '0.8rem' }}>{zh ? '默认顺序' : 'Default'}</MenuItem>
          <MenuItem value="name"    sx={{ fontSize: '0.8rem' }}>{zh ? '按名称'   : 'Name A–Z'}</MenuItem>
          <MenuItem value="author"  sx={{ fontSize: '0.8rem' }}>{zh ? '按作者'   : 'Author'}</MenuItem>
          <MenuItem value="chars"   sx={{ fontSize: '0.8rem' }}>{zh ? '按角色数' : 'Char count'}</MenuItem>
        </Select>
      </Box>

      {/* ── Tag filter chips ── */}
      {filterTags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
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

      {isFiltering && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
          {official.length + community.length + diy.length} {zh ? '个结果' : 'results'}
        </Typography>
      )}

      {/* ── Script sections ── */}
      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {isFiltering ? (
          // Flat list when filtering
          official.length + community.length + diy.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
              {zh ? '无结果' : 'No matches'}
            </Typography>
          ) : mkList([
            ...official.map((s) => ({ script: s, deletable: false })),
            ...community.map((s) => ({ script: s, deletable: false })),
            ...diy.map((s) => ({ script: s, deletable: true })),
          ], 'flat')
        ) : (
          <>
            {/* Official */}
            <SectionHeader label={zh ? '官方' : 'Official'} count={official.length}
              open={officialOpen} onToggle={() => setOfficialOpen((v) => !v)} />
            <Collapse in={officialOpen}>
              {mkList(official.map((s) => ({ script: s, deletable: false })), 'official') ??
                <EmptyRow />}
            </Collapse>

            <Divider sx={{ my: 0.25 }} />

            {/* Community */}
            <SectionHeader label={zh ? '社区' : 'Community'} count={community.length}
              open={communityOpen} onToggle={() => setCommunityOpen((v) => !v)} />
            <Collapse in={communityOpen}>
              {mkList(community.map((s) => ({ script: s, deletable: false })), 'community') ??
                <EmptyRow />}
            </Collapse>

            <Divider sx={{ my: 0.25 }} />

            {/* DIY */}
            <SectionHeader label={zh ? '自制' : 'DIY'} count={diy.length}
              open={diyOpen} onToggle={() => setDiyOpen((v) => !v)} />
            <Collapse in={diyOpen}>
              {mkList(diy.map((s) => ({ script: s, deletable: true })), 'diy') ?? (
                <Typography variant="caption" color="text.secondary"
                  sx={{ pl: 0.5, fontStyle: 'italic', fontSize: '0.75rem' }}>
                  {zh ? '点击复制图标添加剧本' : 'Copy a script above to start'}
                </Typography>
              )}
            </Collapse>

            {/* ── Folder placeholder (Phase 3) ── */}
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.75,
              px: 1, py: 0.75, borderRadius: 1.5,
              border: '1px dashed', borderColor: 'divider',
              opacity: 0.45,
            }}>
              <FolderIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                {zh ? '文件夹（即将推出）' : 'Folders — coming soon'}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function SectionHeader({ label, count, open, onToggle }: {
  label: string; count: number; open: boolean; onToggle: () => void
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', py: 0.25 }}
      onClick={onToggle}>
      <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.6rem', lineHeight: 1, flex: 1 }}>
        {label} ({count})
      </Typography>
      {open
        ? <ExpandLessIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
        : <ExpandMoreIcon sx={{ fontSize: 13, color: 'text.secondary' }} />}
    </Box>
  )
}

function EmptyRow() {
  return <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>—</Typography>
}
