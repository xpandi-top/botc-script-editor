import { useState } from 'react'
import { Box, Button, Checkbox, Chip, Dialog, DialogContent, DialogTitle, FormControlLabel, Grid, IconButton, Paper, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  getAbilityText,
  getCharacterRevisionIds,
  getCurrentRevision,
  getCustomChar,
  getDisplayName,
  getIconForCharacter,
  getNextRevisionId,
  getRevisionNote,
  getRevisionText,
  REVISION_OVERRIDES_KEY,
  refreshRevisionOverrides,
  teamLabels,
} from '../catalog'
import type { CharacterEntry, CustomCharacter, Language, RevisionOverrides } from '../types'

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
  /** Called when user clicks Edit on a custom character */
  onEditCustom?: (c: CustomCharacter) => void
  /** Called when user clicks Delete on a custom character */
  onDeleteCustom?: (id: string) => void
  /** All custom chars (used to look up full CustomCharacter object) */
  customChars?: CustomCharacter[]
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
  onEditCustom,
  onDeleteCustom,
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
    forceUpdate((n) => n + 1)
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

  const isCustom = character.id.startsWith('custom_')
  const customChar = isCustom ? getCustomChar(character.id) : undefined

  const icon = getIconForCharacter(character.id)
  const revisionIds = getCharacterRevisionIds(character.id)
  const currentRevision = getCurrentRevision(character.id)
  const currentAbility = getAbilityText(character.id, language)

  return (
    <Paper sx={{ p: 2 }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {icon ? (
          <Box component="img" src={icon} alt="" sx={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'contain' }} />
        ) : (
          <Box sx={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.200', borderRadius: 1 }}>
            <Typography variant="caption">{character.id.slice(0, 2).toUpperCase()}</Typography>
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">{title}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ flex: 1, minWidth: 0 }}>{getDisplayName(character.id, language)}</Typography>
            {isCustom && (
              <Chip label={zh ? '自定义' : 'Custom'} size="small" color="secondary" sx={{ fontSize: '0.65rem' }} />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">{character.id}</Typography>
          {customChar && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {zh ? '作者：' : 'Author: '}{customChar.author}
              {' · '}
              {teamLabels[language]?.[customChar.team] ?? customChar.team}
              {' · '}
              {customChar.edition}
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Custom char actions ── */}
      {isCustom && (onEditCustom || onDeleteCustom) && customChar && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {onEditCustom && (
            <Button
              size="small" variant="outlined" startIcon={<EditIcon fontSize="small" />}
              onClick={() => onEditCustom(customChar)}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              {zh ? '编辑' : 'Edit'}
            </Button>
          )}
          {onDeleteCustom && (
            <Button
              size="small" variant="outlined" color="error" startIcon={<DeleteIcon fontSize="small" />}
              onClick={() => onDeleteCustom(character.id)}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              {zh ? '删除' : 'Delete'}
            </Button>
          )}
        </Box>
      )}

      {/* ── Current revision ── */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle2">{currentRevisionLabel}</Typography>
          <Chip label={currentRevision} size="small" color="primary" />
        </Box>
        <Typography variant="body2">{currentAbility}</Typography>
      </Box>

      {/* ── Revision history ── */}
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
