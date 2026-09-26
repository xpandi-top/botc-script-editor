import { useDeferredValue, useMemo, useState } from 'react'
import { Box, Button, Chip, DialogTitle, IconButton, InputAdornment, ListSubheader, Menu, MenuItem, TextField, Tooltip, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined'
import { ScriptFolderManager } from './ScriptFolderManager'
import { hoverRevealSx, HOVER_REVEAL_CLASS } from './hoverReveal'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import CloseIcon from '@mui/icons-material/Close'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import { allCharacters, getDisplayName } from '../../catalog'
import { useT } from '../../context/I18nContext'
import { ResponsiveDialog, ResponsiveDialogActions, ResponsiveDialogContent } from '../ui'
import { ScriptCard } from './ScriptCard'
import { SCRIPT_TAG_META } from '../tabs/ScriptsTab.constants'
import type { EditableScript, Language, ScriptFolder } from '../../types'

const OFFICIAL = new Set(['tb', 'bmr', 'snv'])
const UNFILED = '__unfiled'
type Source = 'all' | 'official' | 'community' | 'mine'
type Props = {
  scripts: EditableScript[]; activeScript: EditableScript | undefined; language: Language; isMobile: boolean
  getScriptTitle: (s: EditableScript) => string; setActiveSlug: (slug: string) => void; onClose: () => void
  createNewScript: () => void; deleteScript: (slug: string) => void; duplicateScript: (slug: string) => void
  isBuiltIn: (slug: string) => boolean; scriptFolders: ScriptFolder[]
  createFolder: (name: string, section?: 'community' | 'diy') => ScriptFolder
  renameFolder: (id: string, name: string) => void; deleteFolder: (id: string) => void
  moveScriptToFolder: (slug: string, folderId: string | undefined) => void
}

export function ScriptsLeftPanel({ scripts, activeScript, language, isMobile, getScriptTitle, setActiveSlug, onClose,
  createNewScript, deleteScript, duplicateScript, isBuiltIn, scriptFolders, createFolder, renameFolder, deleteFolder, moveScriptToFolder }: Props) {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [source, setSource] = useState<Source>('all')
  const [sort, setSort] = useState('default')
  const [folder, setFolder] = useState<string | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ anchor: HTMLElement; script: EditableScript } | null>(null)
  const [moveScript, setMoveScript] = useState<EditableScript | null>(null)
  const [pendingDelete, setPendingDelete] = useState<EditableScript | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const sourceOf = (s: EditableScript): Source => OFFICIAL.has(s.slug) ? 'official' : isBuiltIn(s.slug) ? 'community' : 'mine'
  const labels = { all: t('all'), official: t('official'), community: t('community'), mine: t('nav_mine') }
  const sortLabels = { default: t('default'), name: t('name_az'), author: t('author_2'), chars: t('char_count') }
  const tags = [...new Set(scripts.flatMap(s => s.tags ?? []))]
  const tagTitle = (value: string) => SCRIPT_TAG_META[value]?.[language === 'zh' ? 'zh' : 'en'] ?? value
  const index = useMemo(() => {
    const names = new Map(allCharacters.map(c => [c.id, `${getDisplayName(c.id, 'en')} ${getDisplayName(c.id, 'zh')}`]))
    return new Map(scripts.map(s => [s.slug, [s.title, s.titleZh, s.author, s.slug, s.meta.source?.name ?? '', ...(s.tags ?? []),
      scriptFolders.find(f => f.id === s.folderId)?.name ?? '', ...s.characters.map(id => `${id} ${names.get(id) ?? ''}`),
      ...s.customCharacters.map(c => c.name ?? ''),
    ].join(' ').toLocaleLowerCase()]))
  }, [scripts, scriptFolders])
  const matches = scripts.filter(s => deferredQuery.toLocaleLowerCase().trim().split(/\s+/).every(token => index.get(s.slug)?.includes(token)) &&
    (!folder || (folder === UNFILED ? !s.folderId : s.folderId === folder)) && (!tag || s.tags?.includes(tag)))
  const visible = matches.filter(s => source === 'all' || sourceOf(s) === source).sort((a, b) => {
    if (sort === 'name') return getScriptTitle(a).localeCompare(getScriptTitle(b), language)
    if (sort === 'author') return a.author.localeCompare(b.author, language) || getScriptTitle(a).localeCompare(getScriptTitle(b), language)
    if (sort === 'chars') return b.characters.length - a.characters.length
    return (sourceOf(a) === 'official' ? 0 : sourceOf(a) === 'community' ? 1 : 2) - (sourceOf(b) === 'official' ? 0 : sourceOf(b) === 'community' ? 1 : 2)
  })
  const reset = () => { setQuery(''); setFolder(null); setTag(null); setSource('all') }
  const selected = menu?.script
  const moveFolders = moveScript ? scriptFolders.filter(f => (f.section ?? 'diy') === (isBuiltIn(moveScript.slug) ? 'community' : 'diy')) : []

  return <Box component="nav" aria-label={t('nav_scripts')} sx={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0, height: '100%' }}>
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      <TextField size="small" fullWidth label={t('search_title_author_character')} value={query} onChange={e => setQuery(e.target.value)}
        slotProps={{ htmlInput: { 'data-tutorial': 'script-search' }, input: { endAdornment: query ? <InputAdornment position="end"><IconButton size="small" aria-label={t('clear')} onClick={() => setQuery('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment> : undefined } }} />
      <Tooltip title={t('nav_hide')}><IconButton size="small" aria-label={t('nav_hide')} onClick={onClose}><MenuOpenIcon fontSize="small" /></IconButton></Tooltip>
    </Box>
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }} role="group" aria-label={t('library_source')}>
      {(['all', 'official', 'community', 'mine'] as const).map(value => <Chip key={value} size="small" label={`${labels[value]} ${value === 'all' ? matches.length : matches.filter(s => sourceOf(s) === value).length}`}
        color={source === value ? 'primary' : 'default'} variant={source === value ? 'filled' : 'outlined'} aria-pressed={source === value}
        onClick={() => setSource(value)} sx={{ '& .MuiChip-label': { px: 0.75 } }} />)}
    </Box>
    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mt: 0.5 }}>
      <TextField select size="small" label={t('library_sort')} value={sort} onChange={e => setSort(e.target.value)} sx={{ flex: 1, minWidth: 0 }}>
        {Object.entries(sortLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
      </TextField>
      {scriptFolders.length > 0 && <TextField select size="small" label={t('library_folder_short')} value={folder ?? ''}
        onChange={e => { setFolder(e.target.value || null); if (e.target.value) setSource('all') }} sx={{ flex: 1, minWidth: 0 }}
        slotProps={{ select: { displayEmpty: true, renderValue: (value) => value === '' ? t('all') : value === UNFILED ? t('library_unfiled') : scriptFolders.find(f => f.id === value)?.name ?? '' }, inputLabel: { shrink: true } }}>
        <MenuItem value="">{t('library_all_folders')}</MenuItem>
        <MenuItem value={UNFILED}>{t('library_unfiled')}</MenuItem>
        {(['community', 'diy'] as const).flatMap(section => {
          const items = scriptFolders.filter(f => (f.section ?? 'diy') === section)
          return items.length ? [<ListSubheader key={section}>{section === 'community' ? t('community') : t('nav_mine')}</ListSubheader>,
            ...items.map(f => <MenuItem key={f.id} value={f.id} sx={{ overflowWrap: 'anywhere' }}>{f.name}</MenuItem>)] : []
        })}
      </TextField>}
      {scriptFolders.length > 0
        ? <Tooltip title={t('nav_folders')}><IconButton aria-label={t('nav_folders')} onClick={() => setManageOpen(true)} sx={{ flexShrink: 0 }}><FolderOutlinedIcon fontSize="small" /></IconButton></Tooltip>
        : <Button size="small" startIcon={<FolderOutlinedIcon />} onClick={() => setManageOpen(true)} sx={{ flexShrink: 0 }}>{t('nav_folders')}</Button>}
    </Box>
    {tags.length > 0 && <Box role="group" aria-label={t('nav_tag_filter')} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
      {tags.map(value => {
        const Icon = SCRIPT_TAG_META[value]?.Icon
        return <Chip key={value} size="small" label={tagTitle(value)} icon={Icon ? <Icon /> : undefined}
          color={tag === value ? 'primary' : 'default'} variant={tag === value ? 'filled' : 'outlined'} aria-pressed={tag === value}
          onClick={() => setTag(current => current === value ? null : value)} sx={{ maxWidth: '100%', '& .MuiChip-icon': { fontSize: '0.9rem' } }} />
      })}
    </Box>}
    {((query || folder || tag || source !== 'all') || (activeScript && !visible.some(s => s.slug === activeScript.slug))) && <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
      <Typography variant="caption" color="text.secondary" role="status" sx={{ mr: 'auto' }}>{visible.length} / {scripts.length}</Typography>
      {activeScript && !visible.some(s => s.slug === activeScript.slug) && <Button size="small" onClick={reset}>{t('nav_reveal_current')}</Button>}
      {(query || folder || tag || source !== 'all') && <Button size="small" onClick={reset}>{t('library_clear_filters')}</Button>}
    </Box>}
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {visible.map(script => <Box key={script.slug} sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ...hoverRevealSx }}>
        <Box sx={{ flex: 1, minWidth: 0 }}><ScriptCard script={script} isActive={script.slug === activeScript?.slug} isBuiltIn={isBuiltIn(script.slug)} language={language}
          folderName={folder ? undefined : scriptFolders.find(f => f.id === script.folderId)?.name}
          onSelect={() => { setActiveSlug(script.slug); if (isMobile) onClose() }} /></Box>
        <IconButton size="small" className={script.slug === activeScript?.slug || menu?.script.slug === script.slug ? undefined : HOVER_REVEAL_CLASS}
          aria-label={`${t('nav_more')}: ${getScriptTitle(script)}`} aria-haspopup="menu" onClick={e => setMenu({ anchor: e.currentTarget, script })}><MoreHorizIcon fontSize="small" /></IconButton>
      </Box>)}
      {!visible.length && <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary" variant="body2">{source === 'mine' && !query && !folder && !tag ? t('nav_empty_mine') : t('no_matches')}</Typography>
        {source === 'mine' && !query && !folder && !tag && <Button onClick={() => { createNewScript(); if (isMobile) onClose() }}>{t('new_script')}</Button>}
      </Box>}
    </Box>
    <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
      {selected ? [
        <MenuItem key="copy" onClick={() => { duplicateScript(selected.slug); reset(); setSource('mine'); setMenu(null) }}>{t('copy_to_diy')}</MenuItem>,
        !OFFICIAL.has(selected.slug) && <MenuItem key="move" onClick={() => { setMoveScript(selected); setMenu(null) }}><DriveFileMoveOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />{t('move_to_folder')}</MenuItem>,
        !isBuiltIn(selected.slug) && <MenuItem key="delete" sx={{ color: 'error.main' }} onClick={() => { setPendingDelete(selected); setMenu(null) }}>{t('delete')}</MenuItem>,
      ] : null}
    </Menu>
    <ResponsiveDialog open={Boolean(moveScript)} onClose={() => setMoveScript(null)}>
      <DialogTitle>{t('move_to_folder')} · {moveScript && getScriptTitle(moveScript)}</DialogTitle>
      <ResponsiveDialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{t('library_current_folder')}: {scriptFolders.find(f => f.id === moveScript?.folderId)?.name ?? t('library_unfiled')}</Typography>
        <Button fullWidth startIcon={<FolderOutlinedIcon />} endIcon={!moveScript?.folderId ? <CheckIcon /> : undefined} variant={!moveScript?.folderId ? 'outlined' : 'text'} aria-current={!moveScript?.folderId ? 'location' : undefined} onClick={() => { if (moveScript) moveScriptToFolder(moveScript.slug, undefined); setMoveScript(null) }} sx={{ justifyContent: 'flex-start', mb: 0.5 }}>{t('library_unfiled')}</Button>
        {moveFolders.map(f => <Button key={f.id} fullWidth startIcon={<FolderOutlinedIcon />} endIcon={moveScript?.folderId === f.id ? <CheckIcon /> : undefined} variant={moveScript?.folderId === f.id ? 'outlined' : 'text'} aria-current={moveScript?.folderId === f.id ? 'location' : undefined} onClick={() => { if (moveScript) moveScriptToFolder(moveScript.slug, f.id); setMoveScript(null) }} sx={{ justifyContent: 'flex-start', mb: 0.5, textAlign: 'left', overflowWrap: 'anywhere' }}>{f.name}</Button>)}
        {!moveFolders.length && <Button startIcon={<FolderOutlinedIcon />} onClick={() => { setMoveScript(null); setManageOpen(true) }}>{t('nav_folders')}</Button>}
      </ResponsiveDialogContent>
      <ResponsiveDialogActions><Button onClick={() => setMoveScript(null)}>{t('cancel')}</Button></ResponsiveDialogActions>
    </ResponsiveDialog>
    <ScriptFolderManager open={manageOpen} onClose={() => setManageOpen(false)} scripts={scripts} folders={scriptFolders}
      createFolder={createFolder} renameFolder={renameFolder} deleteFolder={id => { deleteFolder(id); if (folder === id) setFolder(null) }} />
    <ResponsiveDialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
      <DialogTitle>{t('delete')} · {pendingDelete && getScriptTitle(pendingDelete)}</DialogTitle>
      <ResponsiveDialogContent><Typography>{t('library_delete_script_hint')}</Typography></ResponsiveDialogContent>
      <ResponsiveDialogActions><Button onClick={() => setPendingDelete(null)}>{t('cancel')}</Button><Button color="error" onClick={() => { if (pendingDelete) deleteScript(pendingDelete.slug); setPendingDelete(null) }}>{t('delete')}</Button></ResponsiveDialogActions>
    </ResponsiveDialog>
  </Box>
}
