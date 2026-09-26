import { useState } from 'react'
import { Alert, Box, Button, Chip, DialogTitle, IconButton, MenuItem, TextField, Tooltip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import { useT } from '../../context/I18nContext'
import { ResponsiveDialog, ResponsiveDialogActions, ResponsiveDialogContent } from '../ui'
import type { EditableScript, ScriptFolder } from '../../types'

type Section = 'community' | 'diy'

export function ScriptFolderManager({ open, onClose, scripts, folders, createFolder, renameFolder, deleteFolder }: {
  open: boolean
  onClose: () => void
  scripts: EditableScript[]
  folders: ScriptFolder[]
  createFolder: (name: string, section?: Section) => ScriptFolder
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
}) {
  const { t } = useT()
  const [name, setName] = useState('')
  const [section, setSection] = useState<Section>('diy')
  const [rename, setRename] = useState<{ id: string; name: string } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ScriptFolder | null>(null)
  const sectionLabel = (value: Section) => value === 'community' ? t('community') : t('nav_mine')
  const saveRename = () => {
    if (!rename?.name.trim()) return
    renameFolder(rename.id, rename.name.trim())
    setRename(null)
  }
  const create = () => {
    if (!name.trim()) return
    createFolder(name.trim(), section)
    setName('')
  }

  return <>
    <ResponsiveDialog open={open} onClose={onClose} maxWidth="sm">
      <DialogTitle>{t('nav_folders')}</DialogTitle>
      <ResponsiveDialogContent>
        {/* One-line create form: name · where it lives · add */}
        <Box component="form" onSubmit={event => { event.preventDefault(); create() }}
          sx={{ display: 'flex', flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: 1, alignItems: 'center', pt: 1 }}>
          <TextField size="small" label={t('nav_new_folder')} value={name} onChange={event => setName(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }}
            sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: 0 }} />
          <TextField select size="small" label={t('library_source')} value={section} onChange={event => setSection(event.target.value as Section)}
            sx={{ flex: { xs: 1, sm: '0 0 128px' }, minWidth: 0 }}>
            <MenuItem value="diy">{t('nav_mine')}</MenuItem><MenuItem value="community">{t('community')}</MenuItem>
          </TextField>
          <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={!name.trim()} sx={{ flexShrink: 0, minHeight: 40 }}>{t('add')}</Button>
        </Box>

        {!folders.length && <Box sx={{ textAlign: 'center', p: 3 }}>
          <FolderOutlinedIcon color="disabled" sx={{ fontSize: 36, mb: 1 }} />
          <Typography variant="body2" color="text.secondary">{t('library_folder_empty_hint')}</Typography>
        </Box>}

        {(['diy', 'community'] as const).map(group => {
          const items = folders.filter(folder => (folder.section ?? 'diy') === group)
          if (!items.length) return null
          return <Box key={group} component="section" aria-label={sectionLabel(group)} sx={{ mt: 2.5 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>{sectionLabel(group)} · {items.length}</Typography>
            {items.map(folder => {
              const count = scripts.filter(script => script.folderId === folder.id).length
              const editing = rename?.id === folder.id
              return <Box key={folder.id} sx={{ display: 'flex', gap: 0.5, alignItems: 'center', minHeight: 48, borderBottom: '1px solid', borderColor: 'divider' }}>
                <FolderOutlinedIcon color="action" fontSize="small" sx={{ mx: 0.5, flexShrink: 0 }} />
                {editing ? <>
                  <TextField autoFocus size="small" value={rename.name} sx={{ flex: 1, minWidth: 0 }}
                    slotProps={{ htmlInput: { 'aria-label': t('nav_folder_name') } }}
                    onChange={event => setRename({ id: folder.id, name: event.target.value })}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); saveRename() }
                      if (event.key === 'Escape') { event.stopPropagation(); setRename(null) }
                    }} />
                  <IconButton aria-label={t('save')} color="success" disabled={!rename.name.trim()} onClick={saveRename}><CheckIcon fontSize="small" /></IconButton>
                  <IconButton aria-label={t('cancel')} onClick={() => setRename(null)}><CloseIcon fontSize="small" /></IconButton>
                </> : <>
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{folder.name}</Typography>
                  <Chip size="small" label={count} aria-label={`${count} ${t('scripts')}`} sx={{ flexShrink: 0 }} />
                  <Tooltip title={t('rename_folder')}><IconButton aria-label={`${t('rename_folder')}: ${folder.name}`} onClick={() => setRename({ id: folder.id, name: folder.name })}><DriveFileRenameOutlineIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title={t('delete_folder')}><IconButton color="error" aria-label={`${t('delete_folder')}: ${folder.name}`} onClick={() => setPendingDelete(folder)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                </>}
              </Box>
            })}
          </Box>
        })}
        {folders.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>{t('nav_delete_folder_hint')}</Typography>}
      </ResponsiveDialogContent>
      <ResponsiveDialogActions><Button onClick={onClose}>{t('close')}</Button></ResponsiveDialogActions>
    </ResponsiveDialog>
    <ResponsiveDialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} maxWidth="xs" mobile="compact">
      <DialogTitle>{t('delete_folder')} · {pendingDelete?.name}</DialogTitle>
      <ResponsiveDialogContent><Alert severity="info">{t('nav_delete_folder_hint')}</Alert></ResponsiveDialogContent>
      <ResponsiveDialogActions><Button onClick={() => setPendingDelete(null)}>{t('cancel')}</Button><Button variant="contained" color="error" onClick={() => {
        if (pendingDelete) deleteFolder(pendingDelete.id)
        setPendingDelete(null)
      }}>{t('delete_folder')}</Button></ResponsiveDialogActions>
    </ResponsiveDialog>
  </>
}
