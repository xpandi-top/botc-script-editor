import React, { useDeferredValue, useMemo, useState } from 'react'
import {
  Box, Chip, Divider, IconButton, InputAdornment,
  TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ClearIcon from '@mui/icons-material/Clear'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import SearchIcon from '@mui/icons-material/Search'
import { allCharacters, getDisplayName } from '../../catalog'
import { MasonryScriptCard } from './MasonryScriptCard'
import { SCRIPT_TAG_META, SCRIPT_TAGS } from '../tabs/ScriptsTab.constants'
import type { EditableScript, Language } from '../../types'

const OFFICIAL = new Set(['tb', 'bmr', 'snv'])

type Props = {
  scripts: EditableScript[]
  activeScript: EditableScript | undefined
  language: Language
  onSelect: (slug: string) => void
  isBuiltIn: (slug: string) => boolean
  createNewScript: () => void
  importScriptFile: (file: File) => void
}

export function ScriptsMasonryGrid({
  scripts,
  activeScript,
  language,
  onSelect,
  isBuiltIn,
  createNewScript,
  importScriptFile,
}: Props) {
  const zh = language === 'zh'
  const [query, setQuery]       = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
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
    const filter = (s: EditableScript) => {
      if (tagFilter && !(s.tags ?? []).includes(tagFilter)) return false
      if (!q) return true
      if (s.title.toLowerCase().includes(q))   return true
      if (s.titleZh.toLowerCase().includes(q)) return true
      if (s.author.toLowerCase().includes(q))  return true
      return s.characters.some((id) => charNameIndex.get(id)?.includes(q) ?? false)
    }
    return {
      official:  scripts.filter((s) => OFFICIAL.has(s.slug) && filter(s)),
      community: scripts.filter((s) => isBuiltIn(s.slug) && !OFFICIAL.has(s.slug) && filter(s)),
      diy:       scripts.filter((s) => !isBuiltIn(s.slug) && filter(s)),
    }
  }, [scripts, deferredQuery, tagFilter, charNameIndex, isBuiltIn])

  // ── Tags in use ────────────────────────────────────────────────────────────
  const filterTags = useMemo(() => {
    const allUsed = [...new Set(scripts.flatMap((s) => s.tags ?? []))]
    return [
      ...SCRIPT_TAGS.filter((t) => allUsed.includes(t)),
      ...allUsed.filter((t) => !SCRIPT_TAG_META[t]),
    ]
  }, [scripts])

  const chipSx = {
    fontSize: '0.72rem', height: 22, fontWeight: 600,
    '& .MuiChip-icon': { fontSize: '0.85rem' },
  }

  const total = official.length + community.length + diy.length
  const isFiltering = !!deferredQuery.trim() || !!tagFilter

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* ── Top bar ── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5,
        borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,
        bgcolor: 'background.paper',
      }}>
        <TextField
          size="small"
          placeholder={zh ? '搜索剧本、作者、角色…' : 'Search scripts, author, characters…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flex: 1, maxWidth: 480, '& .MuiInputBase-root': { borderRadius: 6 } }}
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
        {isFiltering && (
          <Typography variant="caption" color="text.secondary">
            {total} {zh ? '个结果' : 'results'}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={zh ? '新建剧本' : 'New Script'}>
          <IconButton size="small" onClick={createNewScript}><AddIcon /></IconButton>
        </Tooltip>
        <Tooltip title={zh ? '导入 JSON' : 'Import JSON'}>
          <IconButton size="small" component="label">
            <FileOpenIcon />
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

      {/* ── Scrollable grid area ── */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
        {total === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
            <Typography color="text.secondary">{zh ? '无结果' : 'No matches'}</Typography>
          </Box>
        ) : isFiltering ? (
          // Flat masonry when filtering
          <MasonryColumns
            scripts={[...official, ...community, ...diy]}
            activeSlug={activeScript?.slug}
            isBuiltInFn={isBuiltIn}
            language={language}
            onSelect={onSelect}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {official.length > 0 && (
              <Section label={zh ? '官方' : 'Official'} count={official.length}>
                <MasonryColumns
                  scripts={official}
                  activeSlug={activeScript?.slug}
                  isBuiltInFn={isBuiltIn}
                  language={language}
                  onSelect={onSelect}
                />
              </Section>
            )}
            {community.length > 0 && (
              <Section label={zh ? '社区' : 'Community'} count={community.length}>
                <MasonryColumns
                  scripts={community}
                  activeSlug={activeScript?.slug}
                  isBuiltInFn={isBuiltIn}
                  language={language}
                  onSelect={onSelect}
                />
              </Section>
            )}
            {diy.length > 0 && (
              <Section label={zh ? '自制' : 'DIY'} count={diy.length}>
                <MasonryColumns
                  scripts={diy}
                  activeSlug={activeScript?.slug}
                  isBuiltInFn={isBuiltIn}
                  language={language}
                  onSelect={onSelect}
                />
              </Section>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

// ── Masonry columns ───────────────────────────────────────────────────────────

function MasonryColumns({
  scripts,
  activeSlug,
  isBuiltInFn,
  language,
  onSelect,
}: {
  scripts: EditableScript[]
  activeSlug: string | undefined
  isBuiltInFn: (slug: string) => boolean
  language: Language
  onSelect: (slug: string) => void
}) {
  return (
    <Box sx={{
      // CSS masonry via columns — no external library needed
      columns: { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
      columnGap: 1.5,
    }}>
      {scripts.map((script) => (
        <Box key={script.slug} sx={{ breakInside: 'avoid', mb: 1.5, display: 'inline-block', width: '100%' }}>
          <MasonryScriptCard
            script={script}
            isActive={script.slug === activeSlug}
            isBuiltIn={isBuiltInFn(script.slug)}
            language={language}
            onSelect={() => onSelect(script.slug)}
          />
        </Box>
      ))}
    </Box>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function Section({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="overline" sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1 }}>
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
