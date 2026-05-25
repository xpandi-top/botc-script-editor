import { useState } from 'react'
import { Box, Button, Checkbox, Chip, Dialog, DialogContent, DialogTitle, Divider, FormControlLabel, Grid, IconButton, Paper, TextField, Tooltip, Typography } from '@mui/material'
import { CompactButton, FieldLabel } from './ui'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import EditIcon from '@mui/icons-material/Edit'
import {
  characterFileById,
  getAbilityText,
  getCharacterReminders,
  getCharacterRemindersGlobal,
  getCharacterRevisionIds,
  getCharNightOverride,
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
  setCharacterRemindersOverride,
  setCharNightOverride,
  teamLabels,
} from '../catalog'
import { ReminderTokenEditor } from './ReminderTokenEditor'
import type { CharacterEntry, CharacterFileEntry, CustomCharacter, Language, RevisionOverrides } from '../types'
import { useT } from '../context/I18nContext'

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
  // Reminder token editing state (catalog chars only — custom chars use CustomCharDialog)
  const [remindersEdit, setRemindersEdit] = useState<string[] | null>(null)
  const [remindersGlobalEdit, setRemindersGlobalEdit] = useState<string[] | null>(null)
  // Night reminder editing state (catalog chars only)
  type NightReminderDraft = { firstEn: string; firstZh: string; otherEn: string; otherZh: string }
  const [nightReminderEdit, setNightReminderEdit] = useState<NightReminderDraft | null>(null)
  const { t, tpl } = useT()

  const openAdd = () => {
    if (!character) return
    setRevId(getNextRevisionId(character.id))
    setAbilityEn(getAbilityText(character.id, 'en'))
    setAbilityZh(getAbilityText(character.id, 'zh'))
    setNote('')
    setSetCurrent(true)
    setAddOpen(true)
  }

  // Catalog-only: initialize reminder edit state from stored overrides
  const openRemindersEdit = () => {
    if (!character) return
    setRemindersEdit(getCharacterReminders(character.id))
    setRemindersGlobalEdit(getCharacterRemindersGlobal(character.id))
  }

  const saveReminders = () => {
    if (!character) return
    setCharacterRemindersOverride(
      character.id,
      remindersEdit,
      remindersGlobalEdit,
    )
    forceUpdate((n) => n + 1)
    setRemindersEdit(null)
    setRemindersGlobalEdit(null)
  }

  const cancelReminders = () => {
    setRemindersEdit(null)
    setRemindersGlobalEdit(null)
  }

  const openNightReminderEdit = () => {
    if (!character) return
    const ov = getCharNightOverride(character.id)
    setNightReminderEdit({
      firstEn:  ov?.firstNightReminder  ?? character.firstNightReminder  ?? '',
      firstZh:  ov?.firstNightReminderZh ?? character.firstNightReminderZh ?? '',
      otherEn:  ov?.otherNightReminder  ?? character.otherNightReminder  ?? '',
      otherZh:  ov?.otherNightReminderZh ?? character.otherNightReminderZh ?? '',
    })
  }

  const saveNightReminders = () => {
    if (!character || !nightReminderEdit) return
    setCharNightOverride(character.id, {
      firstNightReminder:   nightReminderEdit.firstEn  || undefined,
      firstNightReminderZh: nightReminderEdit.firstZh  || undefined,
      otherNightReminder:   nightReminderEdit.otherEn  || undefined,
      otherNightReminderZh: nightReminderEdit.otherZh  || undefined,
    })
    forceUpdate((n) => n + 1)
    setNightReminderEdit(null)
  }

  const cancelNightReminders = () => setNightReminderEdit(null)

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
    const customChar = getCustomChar(character.id)
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
      // For custom characters, include all runtime fields missing from the base stub
      ...(customChar ? {
        reminders: customChar.reminders?.length ? customChar.reminders : undefined,
        remindersGlobal: customChar.remindersGlobal?.length ? customChar.remindersGlobal : undefined,
        firstNight: customChar.firstNight ?? undefined,
        otherNight: customChar.otherNight ?? undefined,
        firstNightReminder: customChar.firstNightReminder || undefined,
        otherNightReminder: customChar.otherNightReminder || undefined,
      } : {
        reminders: base.reminders?.length ? base.reminders : undefined,
        remindersGlobal: base.remindersGlobal?.length ? base.remindersGlobal : undefined,
      }),
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

  const customChar = getCustomChar(character.id)
  const isCustom = Boolean(customChar)
  const currentReminders = getCharacterReminders(character.id)
  const currentRemindersGlobal = getCharacterRemindersGlobal(character.id)
  const reminderEditOpen = remindersEdit !== null

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
            <CompactButton
              size="small" variant="outlined" startIcon={<EditIcon fontSize="small" />}
              onClick={() => onEditCustom(customChar)}
            >
              {t('edit')}
            </CompactButton>
          )}
          {onDeleteCustom && (
            <CompactButton
              size="small" variant="outlined" color="error" startIcon={<DeleteIcon fontSize="small" />}
              onClick={() => onDeleteCustom(character.id)}
            >
              {t('delete')}
            </CompactButton>
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
          <CompactButton size="small" startIcon={<AddIcon fontSize="small" />} onClick={openAdd}>
            {t('add_revision')}
          </CompactButton>
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

      {/* ── Reminder tokens ── */}
      <Box sx={{ mt: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">
            {t('reminder_tokens_2')}
          </Typography>
          {!isCustom && !reminderEditOpen && (
            <CompactButton size="small" startIcon={<EditIcon fontSize="small" />} onClick={openRemindersEdit}>
              {t('edit')}
            </CompactButton>
          )}
          {isCustom && onEditCustom && customChar && (
            <CompactButton size="small" startIcon={<EditIcon fontSize="small" />}
              onClick={() => onEditCustom(customChar)}>
              {t('edit')}
            </CompactButton>
          )}
        </Box>

        {/* View mode */}
        {!reminderEditOpen && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box>
              <FieldLabel>{t('otherseat_tokens')}</FieldLabel>
              {currentReminders.length > 0
                ? <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {currentReminders.map((r) => <Chip key={r} label={r} size="small" variant="outlined" />)}
                  </Box>
                : <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>—</Typography>
              }
            </Box>
            <Box>
              <FieldLabel>{t('global_tokens_all_seats')}</FieldLabel>
              {currentRemindersGlobal.length > 0
                ? <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {currentRemindersGlobal.map((r) => <Chip key={r} label={r} size="small" variant="outlined" color="secondary" />)}
                  </Box>
                : <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>—</Typography>
              }
            </Box>
          </Box>
        )}

        {/* Edit mode — catalog chars only */}
        {reminderEditOpen && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ReminderTokenEditor
              label={t('reminder_tokens')}
              hint={t('tokens_this_character_places_on_other_players')}
              tokens={remindersEdit ?? []}
              onChange={setRemindersEdit}
            />
            <ReminderTokenEditor
              label={t('reminder_tokens_global')}
              hint={t('tokens_all_seats_note')}
              tokens={remindersGlobalEdit ?? []}
              onChange={setRemindersGlobalEdit}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button size="small" variant="outlined" onClick={cancelReminders}>{t('cancel')}</Button>
              <Button size="small" variant="contained" onClick={saveReminders}>{t('save')}</Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Night Reminders ── */}
      {(() => {
        const isCustomChar = isCustom
        const ov = !isCustomChar ? getCharNightOverride(character.id) : undefined
        const firstEn  = ov?.firstNightReminder   ?? character.firstNightReminder
        const firstZh  = ov?.firstNightReminderZh ?? character.firstNightReminderZh
        const otherEn  = ov?.otherNightReminder   ?? character.otherNightReminder
        const otherZh  = ov?.otherNightReminderZh ?? character.otherNightReminderZh
        const hasAny = firstEn || firstZh || otherEn || otherZh
        const nightEditOpen = nightReminderEdit !== null
        const fileEntry = characterFileById[character.id]
        const setup = fileEntry?.setup
        const firstNightPos = customChar?.firstNight ?? fileEntry?.firstNight
        const otherNightPos = customChar?.otherNight ?? fileEntry?.otherNight
        return (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            {/* Night Reminders header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">
                {t('night_reminders')}
              </Typography>
              {!isCustomChar && !nightEditOpen && (
                <CompactButton size="small" startIcon={<EditIcon fontSize="small" />} onClick={openNightReminderEdit}>
                  {t('edit')}
                </CompactButton>
              )}
              {isCustomChar && onEditCustom && customChar && (
                <CompactButton size="small" startIcon={<EditIcon fontSize="small" />}
                  onClick={() => onEditCustom(customChar)}>
                  {t('edit')}
                </CompactButton>
              )}
            </Box>

            {/* View mode */}
            {!nightEditOpen && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* First Night */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                    {t('first_night_en')}
                    {firstNightPos != null && (
                      <Box component="span" sx={{ ml: 1, color: 'primary.main', fontWeight: 600 }}>
                        #{firstNightPos}
                      </Box>
                    )}
                  </Typography>
                  {firstEn
                    ? <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>{firstEn}</Typography>
                    : <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>—</Typography>
                  }
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                    {t('first_night_zh')}
                  </Typography>
                  {firstZh
                    ? <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>{firstZh}</Typography>
                    : <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>—</Typography>
                  }
                </Box>
                {/* Other Nights */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                    {t('other_nights_en')}
                    {otherNightPos != null && (
                      <Box component="span" sx={{ ml: 1, color: 'warning.main', fontWeight: 600 }}>
                        #{otherNightPos}
                      </Box>
                    )}
                  </Typography>
                  {otherEn
                    ? <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>{otherEn}</Typography>
                    : <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>—</Typography>
                  }
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                    {t('other_nights_zh')}
                  </Typography>
                  {otherZh
                    ? <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>{otherZh}</Typography>
                    : <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>—</Typography>
                  }
                </Box>
                {!hasAny && (
                  <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                    {t('no_night_reminders_for_this_character')}
                  </Typography>
                )}
              </Box>
            )}

            {/* Edit mode — catalog chars only */}
            {nightEditOpen && nightReminderEdit && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <TextField size="small" multiline minRows={2}
                  label={t('first_night_reminder_en')}
                  value={nightReminderEdit.firstEn}
                  onChange={(e) => setNightReminderEdit({ ...nightReminderEdit, firstEn: e.target.value })}
                />
                <TextField size="small" multiline minRows={2}
                  label={t('first_night_reminder_zh')}
                  value={nightReminderEdit.firstZh}
                  onChange={(e) => setNightReminderEdit({ ...nightReminderEdit, firstZh: e.target.value })}
                />
                <TextField size="small" multiline minRows={2}
                  label={t('other_nights_reminder_en')}
                  value={nightReminderEdit.otherEn}
                  onChange={(e) => setNightReminderEdit({ ...nightReminderEdit, otherEn: e.target.value })}
                />
                <TextField size="small" multiline minRows={2}
                  label={t('other_nights_reminder_zh')}
                  value={nightReminderEdit.otherZh}
                  onChange={(e) => setNightReminderEdit({ ...nightReminderEdit, otherZh: e.target.value })}
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button size="small" variant="outlined" onClick={cancelNightReminders}>{t('cancel')}</Button>
                  <Button size="small" variant="contained" onClick={saveNightReminders}>{t('save')}</Button>
                </Box>
              </Box>
            )}

            {/* ── Attributes (setup, night positions) ── */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('attributes')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                size="small"
                label={tpl('setup_label', setup ? t('yes_short') : t('no_short'))}
                color={setup ? 'warning' : 'default'}
                variant={setup ? 'filled' : 'outlined'}
              />
              {firstNightPos != null && (
                <Chip size="small" variant="outlined"
                  label={tpl('first_night_pos', firstNightPos)}
                  sx={{ color: 'primary.main', borderColor: 'primary.main' }}
                />
              )}
              {otherNightPos != null && (
                <Chip size="small" variant="outlined"
                  label={tpl('other_nights_pos', otherNightPos)}
                  sx={{ color: 'warning.main', borderColor: 'warning.main' }}
                />
              )}
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
