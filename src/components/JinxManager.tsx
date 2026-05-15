import React, { useRef, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import EditIcon from '@mui/icons-material/Edit'
import SearchIcon from '@mui/icons-material/Search'
import UploadIcon from '@mui/icons-material/Upload'
import {
  exportJinxesJson,
  getAllJinxIds,
  getDisplayName,
  getEffectiveAllCharacters,
  getIconForCharacter,
  getJinxReason,
  getJinxStatus,
  importJinxesJson,
  JINX_OVERRIDES_KEY,
  jinxes,
  refreshJinxOverrides,
  setJinxOverride,
} from '../catalog'
import type { Language } from '../types'
import { makeT, makeTpl } from '../lib/t'

type JinxManagerProps = {
  open: boolean
  onClose: () => void
  language: Language
}

type EditingJinx = {
  id: string | null        // null = new jinx being created
  reasonEn: string
  reasonZh: string
  char0: string
  char1: string
}

function CharChip({ charId, language }: { charId: string; language: Language }) {
  const icon = getIconForCharacter(charId)
  const name = getDisplayName(charId, language)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
      {icon ? (
        <Box
          component="img"
          src={icon}
          alt=""
          sx={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'contain' }}
        />
      ) : (
        <Box
          sx={{
            width: 22, height: 22, borderRadius: '50%', bgcolor: 'action.disabledBackground',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontSize: '0.45rem', fontWeight: 700 }}>
            {charId.slice(0, 2).toUpperCase()}
          </Typography>
        </Box>
      )}
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
        {name}
      </Typography>
    </Box>
  )
}

export function JinxManager({ open, onClose, language }: JinxManagerProps) {
  const t = makeT(language)
  const tpl = makeTpl(language)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)   // jinx pair id being edited
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState<EditingJinx>({ id: null, reasonEn: '', reasonZh: '', char0: '', char1: '' })
  const [, forceUpdate] = useState(0)
  const importRef = useRef<HTMLInputElement>(null)

  const refresh = () => forceUpdate((n) => n + 1)

  const allCharIds = React.useMemo(
    () => getEffectiveAllCharacters().map((c) => c.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  )

  const allJinxIds = getAllJinxIds()

  // Filter jinxes by search
  const filteredIds = allJinxIds.filter((id) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const [a, b] = id.split('::')
    return (
      getDisplayName(a, language).toLowerCase().includes(q) ||
      getDisplayName(b, language).toLowerCase().includes(q) ||
      a.includes(q) || b.includes(q)
    )
  })

  const startEdit = (id: string) => {
    setEditingId(id)
    setDraft({
      id,
      reasonEn: getJinxReason(id, 'en'),
      reasonZh: getJinxReason(id, 'zh'),
      char0: id.split('::')[0] ?? '',
      char1: id.split('::')[1] ?? '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setAddOpen(false)
  }

  const saveEdit = () => {
    if (!editingId) return
    const sourceEn = jinxes[editingId]
      ? ((() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (jinxes[editingId] as any)._reason_en ?? ''
          } catch { return '' }
        })())
      : ''
    void sourceEn
    setJinxOverride(editingId, {
      reason_en: draft.reasonEn,
      reason_zh: draft.reasonZh,
    })
    setEditingId(null)
    refresh()
  }

  const saveNew = () => {
    if (!draft.char0 || !draft.char1 || draft.char0 === draft.char1) return
    const sorted = [draft.char0, draft.char1].sort()
    const id = sorted.join('::')
    setJinxOverride(id, {
      status: 'active',
      reason_en: draft.reasonEn,
      reason_zh: draft.reasonZh,
    })
    setAddOpen(false)
    setDraft({ id: null, reasonEn: '', reasonZh: '', char0: '', char1: '' })
    refresh()
  }

  const toggleStatus = (id: string) => {
    const current = getJinxStatus(id)
    setJinxOverride(id, { status: current === 'active' ? 'inactive' : 'active' })
    refresh()
  }

  const deleteOverride = (id: string) => {
    const stored: Record<string, unknown> = (() => {
      try { return JSON.parse(localStorage.getItem(JINX_OVERRIDES_KEY) ?? '{}') } catch { return {} }
    })()
    delete stored[id]
    localStorage.setItem(JINX_OVERRIDES_KEY, JSON.stringify(stored))
    refreshJinxOverrides()
    refresh()
  }

  const handleDownload = () => {
    const json = exportJinxesJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jinxes.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        importJinxesJson(e.target?.result as string)
        refresh()
      } catch {
        alert(t('invalid_file_format'))
      }
    }
    reader.readAsText(file)
  }

  const openAdd = () => {
    setDraft({ id: null, reasonEn: '', reasonZh: '', char0: '', char1: '' })
    setAddOpen(true)
    setEditingId(null)
  }

  const isOverridden = (id: string) => {
    const stored: Record<string, unknown> = (() => {
      try { return JSON.parse(localStorage.getItem(JINX_OVERRIDES_KEY) ?? '{}') } catch { return {} }
    })()
    return !!stored[id]
  }

  const isNewJinx = (id: string) => !jinxes[id]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">{t('jinx_manager')}</Typography>
          <Chip label={allJinxIds.length} size="small" color="primary" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title={t('import_jinxes_json')}>
            <IconButton size="small" onClick={() => importRef.current?.click()} sx={{ color: 'text.secondary' }}>
              <UploadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('export_jinxes_json')}>
            <IconButton size="small" onClick={handleDownload} sx={{ color: 'text.secondary' }}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImport(f)
              e.target.value = ''
            }}
          />
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '75vh' }}>
        {/* Toolbar */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          <TextField
            size="small"
            placeholder={t('search_characters')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={openAdd}
            sx={{ textTransform: 'none', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
          >
            {t('add_jinx')}
          </Button>
        </Box>

        {/* Add new jinx form */}
        {addOpen && (
          <Paper
            variant="outlined"
            sx={{ mx: 2, mt: 1.5, p: 1.5, flexShrink: 0, border: '1px dashed', borderColor: 'primary.main', bgcolor: 'action.hover' }}
          >
            <Typography variant="caption" color="primary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
              {t('new_jinx_pair')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Autocomplete
                size="small"
                options={allCharIds}
                value={draft.char0 || null}
                onChange={(_, v) => setDraft((d) => ({ ...d, char0: v ?? '' }))}
                getOptionLabel={(id) => getDisplayName(id, language)}
                renderInput={(params) => (
                  <TextField {...params} label={t('character_a')} sx={{ width: 180 }} />
                )}
              />
              <Autocomplete
                size="small"
                options={allCharIds}
                value={draft.char1 || null}
                onChange={(_, v) => setDraft((d) => ({ ...d, char1: v ?? '' }))}
                getOptionLabel={(id) => getDisplayName(id, language)}
                renderInput={(params) => (
                  <TextField {...params} label={t('character_b')} sx={{ width: 180 }} />
                )}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column', mb: 1 }}>
              <TextField
                size="small" fullWidth multiline minRows={1}
                label={t('rule_en')}
                value={draft.reasonEn}
                onChange={(e) => setDraft((d) => ({ ...d, reasonEn: e.target.value }))}
              />
              <TextField
                size="small" fullWidth multiline minRows={1}
                label={t('rule_zh')}
                value={draft.reasonZh}
                onChange={(e) => setDraft((d) => ({ ...d, reasonZh: e.target.value }))}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button size="small" onClick={cancelEdit} sx={{ textTransform: 'none' }}>
                {t('cancel')}
              </Button>
              <Button
                size="small" variant="contained" onClick={saveNew}
                disabled={!draft.char0 || !draft.char1 || draft.char0 === draft.char1}
                sx={{ textTransform: 'none' }}
              >
                {t('add')}
              </Button>
            </Box>
          </Paper>
        )}

        {/* Jinx list */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {tpl('showing_n_of_m', filteredIds.length, allJinxIds.length)}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {filteredIds.map((id) => {
              const [charA, charB] = id.split('::')
              const status = getJinxStatus(id)
              const reasonEn = getJinxReason(id, 'en')
              const reasonZh = getJinxReason(id, 'zh')
              const overridden = isOverridden(id)
              const isNew = isNewJinx(id)
              const isEditing = editingId === id

              return (
                <Paper
                  key={id}
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    borderColor: isNew ? 'secondary.main' : overridden ? 'warning.main' : 'divider',
                    opacity: status === 'inactive' ? 0.6 : 1,
                  }}
                >
                  {/* Row header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: isEditing ? 1 : 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                      <CharChip charId={charA} language={language} />
                      <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700 }}>×</Typography>
                      <CharChip charId={charB} language={language} />
                      {isNew && (
                        <Chip label={t('custom')} size="small" color="secondary" sx={{ fontSize: '0.6rem', height: 18 }} />
                      )}
                      {overridden && !isNew && (
                        <Chip label={t('modified')} size="small" color="warning" sx={{ fontSize: '0.6rem', height: 18 }} />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title={status === 'active' ? t('set_inactive') : t('set_active')}>
                        <Chip
                          label={status === 'active' ? t('active') : t('inactive')}
                          size="small"
                          color={status === 'active' ? 'success' : 'default'}
                          onClick={() => toggleStatus(id)}
                          sx={{ fontSize: '0.65rem', cursor: 'pointer', height: 20 }}
                        />
                      </Tooltip>
                      {!isEditing && (
                        <Tooltip title={t('edit')}>
                          <IconButton size="small" onClick={() => startEdit(id)} sx={{ p: 0.25 }}>
                            <EditIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {overridden && (
                        <Tooltip title={t('clear_overrides')}>
                          <IconButton size="small" onClick={() => deleteOverride(id)} sx={{ p: 0.25, color: 'error.main' }}>
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  {/* Editing mode */}
                  {isEditing ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <TextField
                        size="small" fullWidth multiline minRows={1}
                        label={t('rule_en')}
                        value={draft.reasonEn}
                        onChange={(e) => setDraft((d) => ({ ...d, reasonEn: e.target.value }))}
                      />
                      <TextField
                        size="small" fullWidth multiline minRows={1}
                        label={t('rule_zh')}
                        value={draft.reasonZh}
                        onChange={(e) => setDraft((d) => ({ ...d, reasonZh: e.target.value }))}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button size="small" onClick={cancelEdit} sx={{ textTransform: 'none' }}>
                          {t('cancel')}
                        </Button>
                        <Button
                          size="small" variant="contained" onClick={saveEdit}
                          startIcon={<CheckIcon fontSize="small" />}
                          sx={{ textTransform: 'none' }}
                        >
                          {t('save')}
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    /* Display mode — reason text */
                    <Box sx={{ mt: 0.5 }}>
                      {reasonEn && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4 }}>
                          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary', mr: 0.5 }}>EN</Box>
                          {reasonEn}
                        </Typography>
                      )}
                      {reasonZh && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4, mt: 0.25 }}>
                          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary', mr: 0.5 }}>ZH</Box>
                          {reasonZh}
                        </Typography>
                      )}
                      {!reasonEn && !reasonZh && (
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                          {t('no_rule_text')}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Paper>
              )
            })}
          </Box>
        </Box>

        <Divider />
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary">
            {t('jinx_export_hint')}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon fontSize="small" />}
            onClick={handleDownload}
            sx={{ textTransform: 'none', fontSize: '0.75rem', whiteSpace: 'nowrap', ml: 2 }}
          >
            {t('export_jinxes_json')}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
