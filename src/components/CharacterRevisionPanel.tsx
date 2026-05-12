import { useState } from 'react'
import { Box, Button, Checkbox, Chip, Dialog, DialogContent, DialogTitle, FormControlLabel, Grid, IconButton, Paper, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import {
  getAbilityText,
  getCharacterRevisionIds,
  getCurrentRevision,
  getDisplayName,
  getIconForCharacter,
  getNextRevisionId,
  getRevisionNote,
  getRevisionText,
  REVISION_OVERRIDES_KEY,
  refreshRevisionOverrides,
} from '../catalog'
import type { CharacterEntry, Language, RevisionOverrides } from '../types'

type CharacterRevisionPanelProps = {
  character?: CharacterEntry
  language: Language
  title: string
  currentRevisionLabel: string
  revisionHistoryLabel: string
  englishTextLabel: string
  chineseTextLabel: string
  revisionNoteLabel: string
  currentLabel: string
  noCharacterSelectedLabel: string
}

export function CharacterRevisionPanel({
  character,
  language,
  title,
  currentRevisionLabel,
  revisionHistoryLabel,
  englishTextLabel,
  chineseTextLabel,
  revisionNoteLabel,
  currentLabel,
  noCharacterSelectedLabel,
}: CharacterRevisionPanelProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [revId, setRevId] = useState('')
  const [abilityEn, setAbilityEn] = useState('')
  const [abilityZh, setAbilityZh] = useState('')
  const [note, setNote] = useState('')
  const [setCurrent, setSetCurrent] = useState(true)
  const [, forceUpdate] = useState(0)
  const zh = language === 'zh'

  const openAdd = () => {
    if (!character) return
    setRevId(getNextRevisionId(character.id))
    setAbilityEn(getAbilityText(character.id, 'en'))
    setAbilityZh(getAbilityText(character.id, 'zh'))
    setNote('')
    setSetCurrent(true)
    setAddOpen(true)
  }

  const saveRevision = () => {
    if (!character || !revId.trim()) return
    const stored: RevisionOverrides = (() => {
      try { return JSON.parse(localStorage.getItem(REVISION_OVERRIDES_KEY) ?? '{}') } catch { return {} }
    })()
    const existing = stored[character.id] ?? {
      current_revision: getCurrentRevision(character.id) ?? revId,
      revisions: [],
      locale_en: {},
      locale_zh: {},
    }
    // Remove existing entry with same id (overwrite)
    const revisions = existing.revisions.filter((r) => r.id !== revId)
    revisions.push({ id: revId, note: note.trim() })
    stored[character.id] = {
      current_revision: setCurrent ? revId : existing.current_revision,
      revisions,
      locale_en: { ...existing.locale_en, [revId]: abilityEn },
      locale_zh: { ...existing.locale_zh, [revId]: abilityZh },
    }
    localStorage.setItem(REVISION_OVERRIDES_KEY, JSON.stringify(stored))
    refreshRevisionOverrides()
    forceUpdate((n) => n + 1) // re-render to show new revision
    setAddOpen(false)
  }

  if (!character) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <Typography color="text.secondary">{noCharacterSelectedLabel}</Typography>
      </Paper>
    )
  }

  const icon = getIconForCharacter(character.id)
  const revisionIds = getCharacterRevisionIds(character.id)
  const currentRevision = getCurrentRevision(character.id)
  const currentAbility = getAbilityText(character.id, language)

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {icon ? (
          <Box component="img" src={icon} alt="" sx={{ width: 48, height: 48 }} />
        ) : (
          <Box sx={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.200', borderRadius: 1 }}>
            <Typography variant="caption">{character.id.slice(0, 2).toUpperCase()}</Typography>
          </Box>
        )}
        <Box>
          <Typography variant="overline" color="text.secondary">{title}</Typography>
          <Typography variant="h6">{getDisplayName(character.id, language)}</Typography>
          <Typography variant="caption" color="text.secondary">{character.id}</Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle2">{currentRevisionLabel}</Typography>
          <Chip label={currentRevision} size="small" color="primary" />
        </Box>
        <Typography variant="body2">{currentAbility}</Typography>
      </Box>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">{revisionHistoryLabel}</Typography>
          <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={openAdd} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
            {zh ? '添加版本' : 'Add Revision'}
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {revisionIds.map((revision) => (
            <Paper key={revision} variant="outlined" sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2">{revision}</Typography>
                {revision === currentRevision && (
                  <Chip label={currentLabel} size="small" color="primary" />
                )}
              </Box>
              <Grid container spacing={1}>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">{revisionNoteLabel}</Typography>
                  <Typography variant="body2">{getRevisionNote(character.id, revision) || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">{englishTextLabel}</Typography>
                  <Typography variant="body2">{getRevisionText(character.id, 'en', revision)}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">{chineseTextLabel}</Typography>
                  <Typography variant="body2">{getRevisionText(character.id, 'zh', revision)}</Typography>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* ── Add Revision Dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {zh ? `添加版本 — ${getDisplayName(character.id, language)}` : `Add Revision — ${getDisplayName(character.id, language)}`}
          <IconButton size="small" onClick={() => setAddOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField
            size="small" label={zh ? '版本 ID' : 'Revision ID'}
            value={revId} onChange={(e) => setRevId(e.target.value)}
            helperText={zh ? '如 v2、errata-2025' : 'e.g. v2, errata-2025'}
          />
          <TextField
            size="small" multiline minRows={2}
            label={zh ? '技能文本（EN）' : 'Ability Text (EN)'}
            value={abilityEn} onChange={(e) => setAbilityEn(e.target.value)}
          />
          <TextField
            size="small" multiline minRows={2}
            label={zh ? '技能文本（ZH）' : 'Ability Text (ZH)'}
            value={abilityZh} onChange={(e) => setAbilityZh(e.target.value)}
          />
          <TextField
            size="small"
            label={zh ? '修订备注（可选）' : 'Change note (optional)'}
            value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={zh ? '如：第二版勘误，修正了死亡判定' : 'e.g. 2nd ed errata — clarified death trigger'}
          />
          <FormControlLabel
            control={<Checkbox checked={setCurrent} onChange={(e) => setSetCurrent(e.target.checked)} size="small" />}
            label={<Typography variant="body2">{zh ? '设为当前版本' : 'Set as current revision'}</Typography>}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="outlined" onClick={() => setAddOpen(false)}>{zh ? '取消' : 'Cancel'}</Button>
            <Button variant="contained" onClick={saveRevision} disabled={!revId.trim()}>{zh ? '保存' : 'Save'}</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Paper>
  )
}