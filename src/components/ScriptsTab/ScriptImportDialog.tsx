import { useState } from 'react'
import { Alert, Box, Button, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import { ResponsiveDialog, ResponsiveDialogActions, ResponsiveDialogContent } from '../ui'
import { useT } from '../../context/I18nContext'
import { parseScriptFromData } from '../../catalog'
import type { EditableScript, ScriptFolder } from '../../types'

export function ScriptImportDialog({ open, onClose, folders, onImport }: {
  open: boolean; onClose: () => void; folders: ScriptFolder[]
  onImport: (scripts: EditableScript[], folderId?: string) => void
}) {
  const { t } = useT()
  const [rows, setRows] = useState<{ name: string; script?: EditableScript; error?: string }[]>([])
  const [folderId, setFolderId] = useState('__unfiled')
  const [busy, setBusy] = useState(false)
  async function preview(files: File[]) {
    setBusy(true)
    const result = await Promise.all(files.map(async file => {
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error(t('library_file_size'))
        const data: unknown = JSON.parse(await file.text())
        const items = Array.isArray(data) ? data : data && typeof data === 'object' && 'characters' in data ? data.characters : null
        if (!Array.isArray(items) || !items.every(item => typeof item === 'string' || (item && typeof item === 'object' && typeof item.id === 'string'))) throw new Error(t('library_invalid_script'))
        const script = parseScriptFromData(data, file.name)
        if (!script.characters.every(id => typeof id === 'string') || ![script.title, script.titleZh, script.author, script.edition].every(value => typeof value === 'string')) throw new Error(t('library_invalid_script'))
        return { name: file.name, script }
      } catch (error) { return { name: file.name, error: error instanceof SyntaxError ? t('library_invalid_script') : String(error instanceof Error ? error.message : error) } }
    }))
    setRows(result)
    setBusy(false)
  }
  const valid = rows.flatMap(row => row.script ? [row.script] : [])
  return <ResponsiveDialog open={open} onClose={busy ? undefined : onClose}>
    <DialogTitle>{t('library_import')}</DialogTitle>
    <ResponsiveDialogContent>
      <Typography sx={{ mb: 2 }}>{t('library_import_help')}</Typography>
      <Button component="label" variant="outlined" disabled={busy}>{t('library_choose_files')}
        <input hidden type="file" accept=".json,application/json" multiple onChange={e => { void preview(Array.from(e.target.files ?? [])); e.target.value = '' }} />
      </Button>
      <TextField select fullWidth label={t('library_destination')} value={folderId} onChange={e => setFolderId(e.target.value)} sx={{ my: 2 }}>
        <MenuItem value="__unfiled">{t('library_unfiled')}</MenuItem>
        {folders.filter(f => f.section !== 'community').map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
      </TextField>
      {busy && <Typography role="status">{t('library_reading')}</Typography>}
      <Box sx={{ display: 'grid', gap: 1 }}>
        {rows.map((row, index) => <Alert key={index} severity={row.error ? 'error' : 'success'}>
          <strong>{row.name}</strong><br />{row.error ?? `${row.script!.title} · ${row.script!.characters.length} ${t('library_roles')}`}
        </Alert>)}
      </Box>
      {!!rows.length && <Typography variant="body2" sx={{ mt: 2 }}>{t('library_import_duplicates')}</Typography>}
    </ResponsiveDialogContent>
    <ResponsiveDialogActions>
      <Button disabled={busy} onClick={onClose}>{t('cancel')}</Button>
      <Button variant="contained" disabled={busy || !valid.length} onClick={() => { onImport(valid, folders.some(f => f.id === folderId) ? folderId : undefined); onClose() }}>{t('library_confirm_import')} ({valid.length})</Button>
    </ResponsiveDialogActions>
  </ResponsiveDialog>
}
