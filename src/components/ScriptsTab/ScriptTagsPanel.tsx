import { useState, type ReactNode } from 'react'
import { Box, Button, Chip, Divider, IconButton, InputAdornment, MenuItem, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import { useT } from '../../context/I18nContext'
import { SCRIPT_TAG_META, SCRIPT_TAGS } from '../tabs/ScriptsTab.constants'
import { ScriptFolderManager } from './ScriptFolderManager'
import type { EditableScript, Language, ScriptFolder } from '../../types'

const UNFILED = '__unfiled'

/**
 * "Organize" panel for the open script: folder, tags and a private note in one
 * compact block. Every change is saved straight away, like the rest of the editor.
 */
export function ScriptTagsPanel({ script, language, updateScript, folders, canMove, section, moveScriptToFolder, createFolder, renameFolder, deleteFolder, scripts }: {
  script: EditableScript
  language: Language
  updateScript: (updater: (script: EditableScript) => EditableScript) => void
  folders: ScriptFolder[]
  /** Official scripts stay out of folders. */
  canMove: boolean
  section: 'community' | 'diy'
  moveScriptToFolder: (slug: string, folderId: string | undefined) => void
  createFolder: (name: string, section?: 'community' | 'diy') => ScriptFolder
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  scripts: EditableScript[]
}) {
  const { t } = useT()
  const [draft, setDraft] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const tags = script.tags ?? []
  const tagName = draft.trim()
  const duplicate = !!tagName && tags.includes(tagName)
  const label = (tag: string) => SCRIPT_TAG_META[tag]?.[language === 'zh' ? 'zh' : 'en'] ?? tag
  const addTag = (tag: string) => updateScript(current => ({
    ...current,
    tags: current.tags?.includes(tag) ? current.tags : [...(current.tags ?? []), tag],
  }))
  const removeTag = (tag: string) => updateScript(current => ({ ...current, tags: (current.tags ?? []).filter(value => value !== tag) }))
  const addCustomTag = () => {
    if (!tagName || duplicate) return
    addTag(tagName)
    setDraft('')
  }
  const sectionFolders = folders.filter(folder => (folder.section ?? 'diy') === section)
  const customTags = tags.filter(tag => !(SCRIPT_TAGS as readonly string[]).includes(tag))

  const row = (title: string, id: string, content: ReactNode) => <>
    <Typography id={id} variant="body2" color="text.secondary" sx={{ pt: { sm: 1 }, fontWeight: 600 }}>{title}</Typography>
    <Box role="group" aria-labelledby={id} sx={{ minWidth: 0 }}>{content}</Box>
  </>

  return <Box sx={{
    mb: 2, p: { xs: 1.5, sm: 2 }, border: '1px solid', borderColor: 'divider', borderRadius: 2,
    display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'max-content minmax(0, 1fr)' }, columnGap: 2, rowGap: { xs: 0.75, sm: 1.5 }, alignItems: 'start',
  }}>
    {canMove && row(t('library_folder_short'), `organize-folder-${script.slug}`, sectionFolders.length
      ? <TextField select size="small" value={script.folderId ?? UNFILED} sx={{ minWidth: 200, maxWidth: '100%' }}
          slotProps={{ htmlInput: { 'aria-label': t('library_folder') } }}
          onChange={event => {
            if (event.target.value === '__manage') { setManageOpen(true); return }
            moveScriptToFolder(script.slug, event.target.value === UNFILED ? undefined : event.target.value)
          }}>
          <MenuItem value={UNFILED}>{t('library_unfiled')}</MenuItem>
          {sectionFolders.map(folder => <MenuItem key={folder.id} value={folder.id} sx={{ overflowWrap: 'anywhere' }}>{folder.name}</MenuItem>)}
          <Divider />
          <MenuItem value="__manage"><FolderOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />{t('nav_folders')}…</MenuItem>
        </TextField>
      : <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 40 }}>
          <Typography variant="body2">{t('library_unfiled')}</Typography>
          <Button size="small" startIcon={<FolderOutlinedIcon />} onClick={() => setManageOpen(true)}>{t('nav_new_folder')}</Button>
        </Box>)}

    {row(t('library_tags'), `organize-tags-${script.slug}`, <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
      {SCRIPT_TAGS.map(tag => {
        const Icon = SCRIPT_TAG_META[tag]?.Icon
        const selected = tags.includes(tag)
        return <Chip key={tag} label={label(tag)} icon={Icon ? <Icon /> : undefined}
          variant={selected ? 'filled' : 'outlined'} color={selected ? 'primary' : 'default'} aria-pressed={selected}
          onClick={() => selected ? removeTag(tag) : addTag(tag)} sx={{ '& .MuiChip-icon': { fontSize: '1rem' } }} />
      })}
      {customTags.map(tag => <Chip key={tag} label={tag} color="primary" onDelete={() => removeTag(tag)} sx={{ maxWidth: '100%' }} />)}
      <Box component="form" onSubmit={event => { event.preventDefault(); addCustomTag() }} sx={{ display: 'flex' }}>
        <TextField size="small" placeholder={t('custom_tag')} value={draft} error={duplicate}
          helperText={duplicate ? t('library_tag_exists') : undefined}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault()
            if (event.key === 'Escape') setDraft('')
          }}
          sx={{ width: 180, '& .MuiInputBase-root': { borderRadius: 999, height: 32 } }}
          slotProps={{
            htmlInput: { 'aria-label': t('custom_tag') },
            input: { endAdornment: <InputAdornment position="end">
              <IconButton type="submit" size="small" edge="end" aria-label={t('add_tag')} disabled={!tagName || duplicate}><AddIcon fontSize="small" /></IconButton>
            </InputAdornment> },
          }} />
      </Box>
    </Box>)}

    {row(t('notes'), `organize-notes-${script.slug}`, <TextField fullWidth multiline minRows={1} maxRows={8} size="small"
      placeholder={t('script_notes_for_your_own_reference')} value={script.notes ?? ''}
      slotProps={{ htmlInput: { 'aria-label': t('script_notes') } }}
      onChange={event => updateScript(current => ({ ...current, notes: event.target.value }))} />)}

    <ScriptFolderManager open={manageOpen} onClose={() => setManageOpen(false)} scripts={scripts} folders={folders}
      createFolder={createFolder} renameFolder={renameFolder} deleteFolder={deleteFolder} />
  </Box>
}
