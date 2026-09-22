import { useMemo, useState } from 'react'
import { Alert, Autocomplete, Box, Collapse, MenuItem, TextField, Typography } from '@mui/material'
import { getEffectiveAllCharacters } from '../catalog'
import { useT } from '../context/I18nContext'
import type { EditableScript, ScriptFolder } from '../types'

export function ScriptFilterPicker({ expanded, scripts, folders, selected, onChange, isBuiltIn, title }: {
  expanded: boolean; scripts: EditableScript[]; folders: ScriptFolder[]; selected: string[]
  onChange: (slugs: string[]) => void; isBuiltIn: (slug: string) => boolean
  title: (script: EditableScript) => string
}) {
  const { t } = useT()
  const [scope, setScope] = useState('all')
  const [folder, setFolder] = useState('all')
  const index = useMemo(() => new Map(scripts.map(s => [s.slug, [s.title, s.titleZh, s.slug, s.author, ...(s.tags ?? []), folders.find(f => f.id === s.folderId)?.name ?? ''].join(' ').toLocaleLowerCase()])), [scripts, folders])
  const options = scripts.filter(s => (scope === 'all' || (scope === 'builtin' ? isBuiltIn(s.slug) : !isBuiltIn(s.slug))) && (folder === 'all' || (folder === 'unfiled' ? !s.folderId : s.folderId === folder)))
  const knownIds = new Set(getEffectiveAllCharacters().map(c => c.id))
  const missing = new Set(scripts.filter(s => selected.includes(s.slug)).flatMap(s => s.characters).filter(id => !knownIds.has(id)))
  return <Box sx={{ my: 1.5 }}>
    <Autocomplete multiple disableCloseOnSelect options={options} value={scripts.filter(s => selected.includes(s.slug))}
      getOptionLabel={title} isOptionEqualToValue={(a, b) => a.slug === b.slug}
      getOptionKey={s => s.slug}
      onChange={(_, values) => onChange(values.map(s => s.slug))}
      filterOptions={(items, { inputValue }) => { const tokens = inputValue.toLocaleLowerCase().trim().split(/\s+/); return items.filter(s => tokens.every(token => index.get(s.slug)?.includes(token))).slice(0, 50) }}
      renderOption={(props, s) => { const { key, ...rest } = props; return <li key={key} {...rest}><Box><Typography>{title(s)}</Typography><Typography variant="caption" color="text.secondary">{s.author ? `${s.author} · ` : ''}{s.slug} · {s.characters.length} {t('library_roles')}</Typography></Box></li> }}
      noOptionsText={t('library_no_scripts')}
      renderInput={params => <TextField {...params} size="small" label={t('library_filter_scripts')} helperText={scope === 'all' && folder === 'all' ? t('library_filter_short') : `${t('library_narrow_scripts')}: ${scope === 'all' ? t('library_all_sources') : scope === 'builtin' ? t('library_builtin') : t('library_mine')} · ${folder === 'all' ? t('library_all_folders') : folder === 'unfiled' ? t('library_unfiled') : folders.find(f => f.id === folder)?.name ?? ''}`} />} />
    <Collapse in={expanded}>
    <Typography variant="caption" color="text.secondary">{t('library_narrow_scripts')}</Typography>
    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
      <TextField select size="small" label={t('library_source')} value={scope} onChange={e => setScope(e.target.value)} sx={{ flex: 1 }}>
        <MenuItem value="all">{t('library_all_sources')}</MenuItem><MenuItem value="builtin">{t('library_builtin')}</MenuItem><MenuItem value="mine">{t('library_mine')}</MenuItem>
      </TextField>
      <Autocomplete size="small" sx={{ flex: 1 }} options={['all', 'unfiled', ...folders.map(f => f.id)]} value={folder} disableClearable
        getOptionLabel={id => id === 'all' ? t('library_all_folders') : id === 'unfiled' ? t('library_unfiled') : folders.find(f => f.id === id)?.name ?? id}
        onChange={(_, id) => setFolder(id)} renderInput={params => <TextField {...params} label={t('library_folder')} />} />
    </Box>
    <Typography variant="caption" color="text.secondary">{t('library_filter_help')}</Typography>
    </Collapse>
    {!!missing.size && <Alert severity="info" sx={{ mt: 1 }}>{missing.size} {t('library_missing_roles')}</Alert>}
  </Box>
}
