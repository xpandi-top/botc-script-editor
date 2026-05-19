import { useState, useEffect, useRef } from 'react'
import {
  Autocomplete, Box, Button, Dialog, DialogContent, DialogTitle, Divider,
  FormControl, FormControlLabel, IconButton, InputLabel, MenuItem,
  Radio, RadioGroup, Select, TextField, Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { editionLabels, slugify, teamLabels, teamOrder, toTitleCase } from '../catalog'
import { processIconFile } from '../lib/iconResize'
import { buildCharacterContext } from '../lib/agentContext'
import { NightOrderPicker } from './NightOrderPicker'
import { ReminderTokenEditor } from './ReminderTokenEditor'
import type { CustomCharacter, Language, Team } from '../types'
import { makeT, makeTpl } from '../lib/t'

type Draft = Omit<CustomCharacter, 'id' | 'createdAt' | 'updatedAt'>

const BLANK: Draft = {
  author: '',
  team: 'townsfolk',
  nameEn: '',
  nameZh: '',
  abilityEn: '',
  abilityZh: '',
  icon: undefined,
  edition: 'custom',
  firstNight: undefined,
  otherNight: undefined,
  firstNightReminder: '',
  otherNightReminder: '',
  reminders: [],
  remindersGlobal: [],
}

export type CharDialogAgentContext = ReturnType<typeof buildCharacterContext>

type Props = {
  open: boolean
  onClose: () => void
  editingChar: CustomCharacter | null
  uiLanguage: Language
  onSave: (draft: Draft, customId?: string) => void
  initialId?: string | null
  /** Called whenever context changes so parent can pass it to AiChatDialog */
  onContextChange?: (ctx: CharDialogAgentContext) => void
  /** Parent passes a setter here; dialog stores fillField fn into it so parent can call fills */
  fillRef?: React.MutableRefObject<((field: string, value: unknown) => void) | null>
}

export function CustomCharDialog({ open, onClose, editingChar, uiLanguage, onSave, initialId, onContextChange, fillRef }: Props) {
  const [draft, setDraft] = useState<Draft>(BLANK)
  const [draftId, setDraftId] = useState('')
  const idManuallyEdited = useRef(false)
  const [iconError, setIconError] = useState('')
  const [iconMode, setIconMode] = useState<'url' | 'upload'>('url')
  const t = makeT(uiLanguage)
  const tpl = makeTpl(uiLanguage)

  // Populate draft when dialog opens
  useEffect(() => {
    if (!open) return
    if (editingChar) {
      setDraft({
        author: editingChar.author,
        team: editingChar.team,
        nameEn: editingChar.nameEn,
        nameZh: editingChar.nameZh ?? '',
        abilityEn: editingChar.abilityEn,
        abilityZh: editingChar.abilityZh ?? '',
        icon: editingChar.icon,
        edition: editingChar.edition,
        firstNight: editingChar.firstNight,
        otherNight: editingChar.otherNight,
        firstNightReminder: editingChar.firstNightReminder ?? '',
        otherNightReminder: editingChar.otherNightReminder ?? '',
        reminders: editingChar.reminders ?? [],
        remindersGlobal: editingChar.remindersGlobal ?? [],
      })
      setIconMode(editingChar.icon?.startsWith('data:') ? 'upload' : 'url')
    } else {
      const baseEn = initialId ?? ''
      setDraft(baseEn ? { ...BLANK, nameEn: baseEn } : BLANK)
      setDraftId(baseEn ? slugify(baseEn) : '')
      idManuallyEdited.current = false
      setIconMode('url')
    }
    setIconError('')
  }, [open, editingChar])

  // Emit context whenever draft or draftId changes
  useEffect(() => {
    if (!open || !onContextChange) return
    onContextChange(buildCharacterContext({
      id: draftId || undefined,
      nameEn: draft.nameEn,
      nameZh: draft.nameZh,
      team: draft.team,
      edition: draft.edition,
      author: draft.author,
      abilityEn: draft.abilityEn,
      abilityZh: draft.abilityZh,
      firstNightReminder: draft.firstNightReminder,
      otherNightReminder: draft.otherNightReminder,
      firstNight: draft.firstNight,
      otherNight: draft.otherNight,
    }, uiLanguage, !editingChar))
  }, [open, draft, draftId, uiLanguage, editingChar, onContextChange])

  // Register fill function with parent via fillRef
  useEffect(() => {
    if (!fillRef) return
    fillRef.current = (field: string, value: unknown) => {
      if (field === 'id') { idManuallyEdited.current = true; setDraftId(String(value)); return }
      setDraft((d) => ({ ...d, [field]: value }))
    }
    return () => { if (fillRef) fillRef.current = null }
  })

  const handleIconUpload = async (file: File) => {
    setIconError('')
    try {
      const dataUrl = await processIconFile(file)
      setDraft((d) => ({ ...d, icon: dataUrl }))
    } catch (e) {
      setIconError(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  const canSave = draft.nameEn.trim() && draft.abilityEn.trim()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {editingChar
          ? tpl('edit_char_title', draft.nameEn)
          : t('new_custom_char')}
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {/* Basic identity */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <TextField size="small" required label={t('name_en')}
            value={draft.nameEn}
            onChange={(e) => {
              const v = e.target.value
              setDraft((d) => ({ ...d, nameEn: v }))
              // Auto-suggest ID from name only if user hasn't manually edited ID
              if (!idManuallyEdited.current && !editingChar) {
                setDraftId(v.trim() ? slugify(v) : '')
              }
            }} />
          <TextField size="small" fullWidth label={t('name_zh_optional')}
            value={draft.nameZh ?? ''} onChange={(e) => setDraft((d) => ({ ...d, nameZh: e.target.value }))} />
        </Box>
        {/* ID field — new chars only */}
        {!editingChar && (
          <TextField size="small" fullWidth
            label={uiLanguage === 'zh' ? '角色 ID（唯一标识）' : 'Character ID'}
            value={draftId}
            onChange={(e) => { idManuallyEdited.current = true; setDraftId(e.target.value) }}
            error={Boolean(draftId) && !/^[a-z0-9_-]+$/.test(draftId)}
            helperText={(() => {
              if (!draftId) return uiLanguage === 'zh' ? '留空则自动生成' : 'Leave blank to auto-generate'
              if (!/^[a-z0-9_-]+$/.test(draftId)) return uiLanguage === 'zh' ? '只允许小写字母、数字、-、_' : 'Only lowercase letters, digits, - _'
              return ''
            })()}
          />
        )}
        <TextField size="small" required label={t('author')}
          value={draft.author} onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <Autocomplete
            freeSolo size="small"
            options={Object.keys(editionLabels[uiLanguage]).filter((k) => k !== 'night-order')}
            getOptionLabel={(option) => editionLabels[uiLanguage][option] ?? toTitleCase(option)}
            value={draft.edition}
            onChange={(_, v) => setDraft((d) => ({ ...d, edition: (v as string) ?? '' }))}
            onInputChange={(_, v, reason) => { if (reason === 'input') setDraft((d) => ({ ...d, edition: v })) }}
            renderInput={(params) => <TextField {...params} label={t('edition_label')} />}
          />
          <FormControl size="small">
            <InputLabel>{t('team_label')}</InputLabel>
            <Select value={draft.team} label={t('team_label')}
              onChange={(e) => setDraft((d) => ({ ...d, team: e.target.value as Team }))}>
              {teamOrder.map((tid) => (
                <MenuItem key={tid} value={tid}>{teamLabels[uiLanguage][tid] ?? tid}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Ability text */}
        <TextField size="small" required multiline minRows={2}
          label={t('ability_text_en')}
          value={draft.abilityEn} onChange={(e) => setDraft((d) => ({ ...d, abilityEn: e.target.value }))} />
        <TextField size="small" multiline minRows={2}
          label={t('ability_text_zh_optional')}
          value={draft.abilityZh ?? ''} onChange={(e) => setDraft((d) => ({ ...d, abilityZh: e.target.value }))} />

        {/* Icon */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            {t('icon_optional')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <RadioGroup row value={iconMode} onChange={(e) => setIconMode(e.target.value as 'url' | 'upload')}>
              <FormControlLabel value="url" control={<Radio size="small" />} label={<Typography variant="body2">URL</Typography>} />
              <FormControlLabel value="upload" control={<Radio size="small" />} label={<Typography variant="body2">{t('upload')}</Typography>} />
            </RadioGroup>
            {draft.icon && (
              <Box component="img" src={draft.icon}
                sx={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid', borderColor: 'divider', flexShrink: 0 }} />
            )}
          </Box>
          {iconMode === 'url' ? (
            <TextField size="small" fullWidth placeholder="https://..."
              value={(!draft.icon?.startsWith('data:') ? draft.icon : '') ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value || undefined }))} />
          ) : (
            <Button size="small" variant="outlined" component="label">
              {t('choose_image')}
              <input type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIconUpload(f); e.target.value = '' }} />
            </Button>
          )}
          {iconError && <Typography variant="caption" color="error">{iconError}</Typography>}
        </Box>

        {/* Night order */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {t('first_night_wake_pos')}
          </Typography>
          <NightOrderPicker value={draft.firstNight}
            onChange={(pos) => setDraft((d) => ({ ...d, firstNight: pos }))}
            nightType="first" language={uiLanguage} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {t('other_nights_wake_pos')}
          </Typography>
          <NightOrderPicker value={draft.otherNight}
            onChange={(pos) => setDraft((d) => ({ ...d, otherNight: pos }))}
            nightType="other" language={uiLanguage} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <TextField size="small" label={t('first_night_reminder')}
            value={draft.firstNightReminder ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, firstNightReminder: e.target.value }))} />
          <TextField size="small" label={t('other_night_reminder')}
            value={draft.otherNightReminder ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, otherNightReminder: e.target.value }))} />
        </Box>

        <Divider />

        <ReminderTokenEditor
          label={t('reminder_tokens')}
          hint={t('reminder_tokens_hint')}
          tokens={draft.reminders ?? []}
          onChange={(v) => setDraft((d) => ({ ...d, reminders: v }))}
        />
        <ReminderTokenEditor
          label={t('reminder_tokens_global')}
          hint={t('reminder_tokens_global_hint')}
          tokens={draft.remindersGlobal ?? []}
          onChange={(v) => setDraft((d) => ({ ...d, remindersGlobal: v }))}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button variant="outlined" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="contained" onClick={() => onSave(draft, editingChar ? undefined : (draftId.trim() || undefined))} disabled={!canSave}>
            {t('save')}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
