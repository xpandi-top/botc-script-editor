import { useState } from 'react'
import { Box, Button, Checkbox, Chip, Dialog, DialogContent, DialogTitle, FormControlLabel, Grid, IconButton, Paper, TextField, Tooltip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import EditIcon from '@mui/icons-material/Edit'
import {
  characterFileById,
  getAbilityText,
  getCharacterRevisionIds,
  getCurrentRevision,
  getCustomChar,
  getDisplayName,
  getIconForCharacter,
  getNextRevisionId,
  getRevisionNote,
  getRevisionText,
  getJinxReason,
  jinxes as jinxDb,
  REVISION_OVERRIDES_KEY,
  refreshRevisionOverrides,
  teamLabels,
} from '../catalog'
import type { CharacterEntry, CharacterFileEntry, CustomCharacter, Language, RevisionOverrides } from '../types'
import { makeT, makeTpl } from '../lib/t'

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
  const t = makeT(language)
  const tpl = makeTpl(language)

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

  const downloadCharacter = () => {
    if (!character) return
    // Build export from file entry, augmented with latest ability texts from catalog
    const base: CharacterFileEntry = characterFileById[character.id] ?? {
      id: character.id,
      team: character.team,
      edition: character.edition,
      current_revision: character.current_revision,
      revisions: character.revisions,
    }
    const revIds = getCharacterRevisionIds(character.id)
    const enRevisions: Record<string, string> = {}
    const zhRevisions: Record<string, string> = {}
    for (const rev of revIds) {
      const en = getRevisionText(character.id, 'en', rev)
      const zh = getRevisionText(character.id, 'zh', rev)
      if (en) enRevisions[rev] = en
      if (zh) zhRevisions[rev] = zh
    }
    const exportEntry: CharacterFileEntry = {
      ...base,
      en: { name: getDisplayName(character.id, 'en'), ability: getAbilityText(character.id, 'en'), revisions: enRevisions },
      zh: { name: getDisplayName(character.id, 'zh'), ability: getAbilityText(character.id, 'zh'), revisions: Object.keys(zhRevisions).length ? zhRevisions : undefined },
    }
    const blob = new Blob([JSON.stringify(exportEntry, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${character.id}.json`
    a.click()
    URL.revokeObjectURL(url)
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
              <Chip label={t('custom')} size="small" color="secondary" sx={{ fontSize: '0.65rem' }} />
            )}
            <Tooltip title={t('download_character_json')}>
              <IconButton size="small" onClick={downloadCharacter} sx={{ color: 'text.secondary' }}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="caption" color="text.secondary">{character.id}</Typography>
          {customChar && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {t('author_label')}{customChar.author}
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
              {t('edit')}
            </Button>
          )}
          {onDeleteCustom && (
            <Button
              size="small" variant="outlined" color="error" startIcon={<DeleteIcon fontSize="small" />}
              onClick={() => onDeleteCustom(character.id)}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              {t('delete')}
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
            {t('add_revision')}
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

      {/* ── Jinx partners ── */}
      {(() => {
        const charJinxes = Object.values(jinxDb).filter(
          (j) => j.status === 'active' && j.characters.includes(character.id)
        )
        if (charJinxes.length === 0) return null
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {tpl('jinxes_n', charJinxes.length)}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {charJinxes.map((j) => {
                const partnerId = j.characters[0] === character.id ? j.characters[1] : j.characters[0]
                const partnerIcon = getIconForCharacter(partnerId)
                const reason = getJinxReason(j.id, language) || getJinxReason(j.id, 'en')
                return (
                  <Box key={j.id} sx={{ display: 'flex', gap: 1, p: 1, borderRadius: 1, border: '1px solid', borderColor: 'warning.light', bgcolor: 'warning.lighter', alignItems: 'flex-start' }}>
                    {partnerIcon ? (
                      <Box component="img" src={partnerIcon} alt="" sx={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'contain', flexShrink: 0, mt: 0.25 }} />
                    ) : (
                      <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'action.disabledBackground', flexShrink: 0, mt: 0.25, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ fontSize: '0.45rem', fontWeight: 700 }}>{partnerId.slice(0, 2).toUpperCase()}</Typography>
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                        {getDisplayName(partnerId, language)}
                      </Typography>
                      {reason && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4, mt: 0.25 }}>
                          {reason}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )
      })()}

      {/* ── Add Revision Dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {tpl('add_revision_for', getDisplayName(character.id, language))}
          <IconButton size="small" onClick={() => setAddOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField
            size="small" label={t('revision_id')}
            value={revId} onChange={(e) => setRevId(e.target.value)}
            helperText={t('revision_id_hint')}
          />
          <TextField
            size="small" multiline minRows={2}
            label={t('ability_text_en')}
            value={abilityEn} onChange={(e) => setAbilityEn(e.target.value)}
          />
          <TextField
            size="small" multiline minRows={2}
            label={t('ability_text_zh')}
            value={abilityZh} onChange={(e) => setAbilityZh(e.target.value)}
          />
          <TextField
            size="small"
            label={t('change_note_optional')}
            value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={t('change_note_placeholder')}
          />
          <FormControlLabel
            control={<Checkbox checked={setCurrent} onChange={(e) => setSetCurrent(e.target.checked)} size="small" />}
            label={<Typography variant="body2">{t('set_as_current_revision')}</Typography>}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="outlined" onClick={() => setAddOpen(false)}>{t('cancel')}</Button>
            <Button variant="contained" onClick={saveRevision} disabled={!revId.trim()}>{t('save')}</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Paper>
  )
}
