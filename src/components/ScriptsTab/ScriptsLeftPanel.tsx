import { useDeferredValue, useMemo, useState } from 'react'
import { Autocomplete, Box, Button, Chip, DialogTitle, IconButton, InputAdornment, Menu, MenuItem, TextField, Tooltip, Typography } from '@mui/material'
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
  const [menu, setMenu] = useState<{ anchor: HTMLElement; script: EditableScript | null } | null>(null)
  const [moveScript, setMoveScript] = useState<EditableScript | null>(null)
  const [pendingDelete, setPendingDelete] = useState<EditableScript | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [section, setSection] = useState<'community' | 'diy'>('diy')
  const [rename, setRename] = useState<{ id: string; name: string } | null>(null)
  const sourceOf = (s: EditableScript): Source => OFFICIAL.has(s.slug) ? 'official' : isBuiltIn(s.slug) ? 'community' : 'mine'
  const labels = { all: t('all'), official: t('official'), community: t('community'), mine: t('nav_mine') }
  const sortLabels = { default: t('default'), name: t('name_az'), author: t('author_2'), chars: t('char_count') }
  const tags = [...new Set(scripts.flatMap(s => s.tags ?? []))]
  const tagTitle = (value: string) => SCRIPT_TAG_META[value]?.[language === 'zh' ? 'zh' : 'en'] ?? value
  const index = useMemo(() => {
    const names = new Map(allCharacters.map(c => [c.id, `${getDisplayName(c.id, 'en')} ${getDisplayName(c.id, 'zh')}`]))
    return new Map(scripts.map(s => [s.slug, [s.title, s.titleZh, s.author, s.slug, ...(s.tags ?? []),
      scriptFolders.find(f => f.id === s.folderId)?.name ?? '', ...s.characters.map(id => `${id} ${names.get(id) ?? ''}`),
      ...s.customCharacters.map(c => c.name ?? ''),
    ].join(' ').toLocaleLowerCase()]))
  }, [scripts, scriptFolders])
  const matches = scripts.filter(s => deferredQuery.toLocaleLowerCase().trim().split(/\s+/).every(token => index.get(s.slug)?.includes(token)) &&
    (!folder || s.folderId === folder) && (!tag || s.tags?.includes(tag)))
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
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      <TextField select size="small" label={t('library_sort')} value={sort} onChange={e => setSort(e.target.value)} sx={{ flex: 1, mt: 0.5 }}>
        {Object.entries(sortLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
      </TextField>
      <Button size="small" onClick={e => setMenu({ anchor: e.currentTarget, script: null })}>{t('nav_manage')}</Button>
    </Box>
    {scriptFolders.length > 0 && <Autocomplete size="small" options={scriptFolders} value={scriptFolders.find(f => f.id === folder) ?? null}
      getOptionLabel={f => f.name} getOptionKey={f => f.id} isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_, f) => { setFolder(f?.id ?? null); setSource('all') }} renderInput={params => <TextField {...params} label={t('library_folder')} />} />}
    {tags.length > 0 && <Autocomplete size="small" options={tags} value={tag} getOptionLabel={tagTitle} onChange={(_, value) => setTag(value)}
      renderInput={params => <TextField {...params} label={t('nav_tag_filter')} />} />}
    {(query || folder || tag) && <Button size="small" onClick={reset}>{t('library_clear_filters')}</Button>}
    {activeScript && !visible.some(s => s.slug === activeScript.slug) && <Button size="small" onClick={reset}>{t('nav_reveal_current')}</Button>}
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {visible.map(script => <Box key={script.slug} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}><ScriptCard script={script} isActive={script.slug === activeScript?.slug} isBuiltIn={isBuiltIn(script.slug)} language={language}
          onSelect={() => { setActiveSlug(script.slug); if (isMobile) onClose() }} /></Box>
        <IconButton size="small" aria-label={`${t('nav_more')}: ${getScriptTitle(script)}`} onClick={e => setMenu({ anchor: e.currentTarget, script })}><MoreHorizIcon fontSize="small" /></IconButton>
      </Box>)}
      {!visible.length && <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary" variant="body2">{source === 'mine' && !query && !folder && !tag ? t('nav_empty_mine') : t('no_matches')}</Typography>
        {source === 'mine' && !query && !folder && !tag && <Button onClick={() => { createNewScript(); if (isMobile) onClose() }}>{t('new_script')}</Button>}
      </Box>}
    </Box>
    <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
      {selected ? [
        <MenuItem key="copy" onClick={() => { duplicateScript(selected.slug); reset(); setSource('mine'); setMenu(null) }}>{t('copy_to_diy')}</MenuItem>,
        !OFFICIAL.has(selected.slug) && <MenuItem key="move" onClick={() => { setMoveScript(selected); setMenu(null) }}>{t('move_to_folder')}</MenuItem>,
        !isBuiltIn(selected.slug) && <MenuItem key="delete" sx={{ color: 'error.main' }} onClick={() => { setPendingDelete(selected); setMenu(null) }}>{t('delete')}</MenuItem>,
      ] : <MenuItem onClick={() => { setManageOpen(true); setMenu(null) }}>{t('nav_folders')}</MenuItem>}
    </Menu>
    <ResponsiveDialog open={Boolean(moveScript)} onClose={() => setMoveScript(null)}>
      <DialogTitle>{t('move_to_folder')} · {moveScript && getScriptTitle(moveScript)}</DialogTitle>
      <ResponsiveDialogContent>
        <Button fullWidth onClick={() => { if (moveScript) moveScriptToFolder(moveScript.slug, undefined); setMoveScript(null) }}>{t('library_unfiled')}</Button>
        {moveFolders.map(f => <Button key={f.id} fullWidth onClick={() => { if (moveScript) moveScriptToFolder(moveScript.slug, f.id); setMoveScript(null) }}>{f.name}</Button>)}
        {!moveFolders.length && <Typography color="text.secondary">{t('nav_no_folders')}</Typography>}
      </ResponsiveDialogContent>
      <ResponsiveDialogActions><Button onClick={() => setMoveScript(null)}>{t('cancel')}</Button></ResponsiveDialogActions>
    </ResponsiveDialog>
    <ResponsiveDialog open={manageOpen} onClose={() => setManageOpen(false)}>
      <DialogTitle>{t('nav_folders')}</DialogTitle>
      <ResponsiveDialogContent>
        <Box sx={{ display: 'grid', gap: 2, py: 1 }}>
          <TextField size="small" label={t('nav_new_folder')} value={folderName} onChange={e => setFolderName(e.target.value)} />
          <TextField select size="small" label={t('library_source')} value={section} onChange={e => setSection(e.target.value as 'community' | 'diy')}>
            <MenuItem value="community">{t('community')}</MenuItem><MenuItem value="diy">{t('nav_mine')}</MenuItem>
          </TextField>
          <Button variant="outlined" disabled={!folderName.trim()} onClick={() => { createFolder(folderName.trim(), section); setFolderName('') }}>{t('nav_new_folder')}</Button>
          {scriptFolders.map(f => <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ flex: 1 }}>{f.name} · {(f.section ?? 'diy') === 'community' ? t('community') : t('nav_mine')}</Typography>
            <Button size="small" onClick={() => setRename({ id: f.id, name: f.name })}>{t('rename_folder')}</Button>
            <Button size="small" color="error" onClick={() => { deleteFolder(f.id); if (folder === f.id) setFolder(null) }}>{t('delete')}</Button>
          </Box>)}
          <Typography variant="caption" color="text.secondary">{t('nav_delete_folder_hint')}</Typography>
        </Box>
      </ResponsiveDialogContent>
      <ResponsiveDialogActions><Button onClick={() => setManageOpen(false)}>{t('close')}</Button></ResponsiveDialogActions>
    </ResponsiveDialog>
    <ResponsiveDialog open={Boolean(rename)} onClose={() => setRename(null)}>
      <DialogTitle>{t('rename_folder')}</DialogTitle>
      <ResponsiveDialogContent><TextField autoFocus fullWidth label={t('nav_folder_name')} value={rename?.name ?? ''} onChange={e => setRename(current => current && { ...current, name: e.target.value })} sx={{ mt: 1 }} /></ResponsiveDialogContent>
      <ResponsiveDialogActions><Button onClick={() => setRename(null)}>{t('cancel')}</Button><Button disabled={!rename?.name.trim()} onClick={() => { if (rename) renameFolder(rename.id, rename.name.trim()); setRename(null) }}>{t('save')}</Button></ResponsiveDialogActions>
    </ResponsiveDialog>
    <ResponsiveDialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
      <DialogTitle>{t('delete')} · {pendingDelete && getScriptTitle(pendingDelete)}</DialogTitle>
      <ResponsiveDialogActions><Button onClick={() => setPendingDelete(null)}>{t('cancel')}</Button><Button color="error" onClick={() => { if (pendingDelete) deleteScript(pendingDelete.slug); setPendingDelete(null) }}>{t('delete')}</Button></ResponsiveDialogActions>
    </ResponsiveDialog>
  </Box>
}
