import React, { useEffect, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  clearNightOrderOverrides,
  getDisplayName,
  getEffectiveAllCharacters,
  getEffectiveNightOrderFromRegistry,
  getIconForCharacter,
  saveNightOrderOverrides,
} from '../catalog'
import type { Language } from '../types'
import { makeT } from '../lib/t'
import { useT } from '../context/I18nContext'

type Props = {
  open: boolean
  onClose: () => void
  language: Language
}

const SPECIAL_LABELS: Record<string, Record<Language, string>> = {
  MINION_INFO: { en: 'Minion Info', zh: '爪牙信息' },
  DEMON_INFO: { en: 'Demon Info', zh: '恶魔信息' },
  DUSK: { en: 'Dusk', zh: '黄昏' },
  DAWN: { en: 'Dawn', zh: '黎明' },
}

function getCharLabel(id: string, language: Language): string {
  if (SPECIAL_LABELS[id]) return SPECIAL_LABELS[id][language]
  return getDisplayName(id, language)
}

// ── Sortable row ──────────────────────────────────────────────────────────────
function SortableCharRow({
  id,
  index,
  language,
  onRemove,
  onInsertAfter,
  insertingAfter,
  insertOptions,
  onInsertConfirm,
  onInsertCancel,
}: {
  id: string
  index: number
  language: Language
  onRemove: () => void
  onInsertAfter: () => void
  insertingAfter: boolean
  insertOptions: string[]
  onInsertConfirm: (charId: string) => void
  onInsertCancel: () => void
}) {
  const { t } = useT()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `${id}__${index}` })
  const [insertValue, setInsertValue] = useState<string | null>(null)
  const [insertInput, setInsertInput] = useState('')

  const icon = getIconForCharacter(id)
  const allChars = getEffectiveAllCharacters()
  const isKnown = SPECIAL_LABELS[id] != null || allChars.some((c) => c.id === id)
  const isSpecial = SPECIAL_LABELS[id] != null
  const label = getCharLabel(id, language)

  // Reset inline input when closed
  useEffect(() => {
    if (!insertingAfter) { setInsertValue(null); setInsertInput('') }
  }, [insertingAfter])

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  }

  return (
    <Box ref={setNodeRef} style={style}>
      {/* Main row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1,
          py: '3px',
          borderRadius: 1,
          bgcolor: index % 2 === 0 ? 'action.hover' : 'transparent',
          opacity: isKnown ? 1 : 0.5,
          '&:hover .insert-btn': { opacity: 1 },
        }}
      >
        {/* Drag handle */}
        <Box
          {...attributes}
          {...listeners}
          sx={{ cursor: 'grab', color: 'text.disabled', display: 'flex', alignItems: 'center', flexShrink: 0, touchAction: 'none', '&:active': { cursor: 'grabbing' } }}
        >
          <DragIndicatorIcon sx={{ fontSize: '1rem' }} />
        </Box>

        {/* Position */}
        <Typography sx={{ minWidth: 22, fontSize: '0.68rem', color: 'text.disabled', textAlign: 'right', flexShrink: 0 }}>
          {index + 1}
        </Typography>

        {/* Character icon */}
        {!isSpecial && icon ? (
          <Box component="img" src={icon} alt="" sx={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'contain', bgcolor: 'background.default', flexShrink: 0 }} />
        ) : (
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: isSpecial ? 'primary.main' : 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: isSpecial ? 'primary.contrastText' : 'text.secondary' }}>
              {isSpecial ? '★' : id.slice(0, 2).toUpperCase()}
            </Typography>
          </Box>
        )}

        {/* Name */}
        <Typography variant="body2" sx={{ flex: 1, fontSize: '0.82rem', fontStyle: isKnown ? 'normal' : 'italic', color: isKnown ? 'text.primary' : 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
          {!isKnown && <Typography component="span" sx={{ fontSize: '0.68rem', ml: 0.5, color: 'text.disabled' }}>({id})</Typography>}
        </Typography>

        {/* Insert-after trigger */}
        <Tooltip title={t('insert_character_after_this')}>
          <IconButton
            className="insert-btn"
            size="small"
            onClick={onInsertAfter}
            sx={{ p: '2px', opacity: insertingAfter ? 1 : 0, transition: 'opacity 0.15s', color: 'primary.main' }}
          >
            <AddIcon sx={{ fontSize: '0.9rem' }} />
          </IconButton>
        </Tooltip>

        {/* Remove */}
        <Tooltip title={makeT(language)('remove')}>
          <IconButton size="small" onClick={onRemove} sx={{ p: '2px', color: 'error.main' }}>
            <CloseIcon sx={{ fontSize: '0.85rem' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Inline insert-after panel */}
      {insertingAfter && (
        <Box sx={{ mx: 1, mb: 0.5, mt: 0.25, p: 1, border: '1px dashed', borderColor: 'primary.main', borderRadius: 1, bgcolor: 'primary.50' }}>
          <Autocomplete
            autoFocus
            openOnFocus
            size="small"
            options={insertOptions}
            value={insertValue}
            inputValue={insertInput}
            onInputChange={(_, v) => setInsertInput(v)}
            onChange={(_, v) => {
              if (v) { onInsertConfirm(v); setInsertValue(null); setInsertInput('') }
            }}
            getOptionLabel={(optId) => getCharLabel(optId, language)}
            renderOption={(props, optId) => {
              const optIcon = getIconForCharacter(optId)
              return (
                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '3px !important' }}>
                  {optIcon ? (
                    <Box component="img" src={optIcon} alt="" sx={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography sx={{ fontSize: '0.5rem', fontWeight: 700 }}>{optId.slice(0, 2).toUpperCase()}</Typography>
                    </Box>
                  )}
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{getCharLabel(optId, language)}</Typography>
                </Box>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                size="small"
                placeholder={t('search_character')}
                onKeyDown={(e) => { if (e.key === 'Escape') onInsertCancel() }}
              />
            )}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
            <Button size="small" sx={{ fontSize: '0.7rem', textTransform: 'none' }} onClick={onInsertCancel}>
              {makeT(language)('cancel')}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function NightOrderManager({ open, onClose, language }: Props) {
  const { t, tpl } = useT()

  const [tab, setTab] = useState<'first' | 'other'>('first')
  const [firstNight, setFirstNight] = useState<string[]>([])
  const [otherNights, setOtherNights] = useState<string[]>([])
  const [addValue, setAddValue] = useState<string | null>(null)
  const [addInputValue, setAddInputValue] = useState('')
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    const order = getEffectiveNightOrderFromRegistry()
    setFirstNight(order.first_night ?? [])
    setOtherNights(order.other_nights ?? [])
    setTab('first')
    setAddValue(null)
    setAddInputValue('')
    setInsertAfterIndex(null)
  }, [open])

  const currentList = tab === 'first' ? firstNight : otherNights
  const setCurrentList = tab === 'first' ? setFirstNight : setOtherNights

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = currentList.findIndex((id, i) => `${id}__${i}` === active.id)
    const newIndex = currentList.findIndex((id, i) => `${id}__${i}` === over.id)
    if (oldIndex !== -1 && newIndex !== -1) setCurrentList(arrayMove(currentList, oldIndex, newIndex))
  }

  const remove = (index: number) => {
    setInsertAfterIndex(null)
    setCurrentList(currentList.filter((_, i) => i !== index))
  }

  const handleInsertAfter = (atIndex: number, charId: string) => {
    const next = [...currentList]
    next.splice(atIndex + 1, 0, charId)
    setCurrentList(next)
    setInsertAfterIndex(null)
  }

  const handleAddAtEnd = (_: React.SyntheticEvent, value: string | null) => {
    if (!value) return
    setCurrentList([...currentList, value])
    setAddValue(null)
    setAddInputValue('')
  }

  const handleSave = () => {
    saveNightOrderOverrides({ first_night: firstNight, other_nights: otherNights })
    onClose()
  }

  const handleReset = () => {
    clearNightOrderOverrides()
    const order = getEffectiveNightOrderFromRegistry()
    setFirstNight(order.first_night ?? [])
    setOtherNights(order.other_nights ?? [])
    setInsertAfterIndex(null)
  }

  const handleDownload = () => {
    const payload = { first_night: firstNight, other_nights: otherNights }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'botc_night_order.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const allChars = getEffectiveAllCharacters()
  const currentSet = new Set(currentList)
  const availableOptions = allChars.map((c) => c.id).filter((id) => !currentSet.has(id))

  // dnd-kit needs stable unique IDs per item
  const sortableIds = currentList.map((id, i) => `${id}__${i}`)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {t('night_order')}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v as 'first' | 'other'); setInsertAfterIndex(null) }}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab value="first" label={tpl('first_night_count', firstNight.length)} sx={{ textTransform: 'none', fontSize: '0.85rem' }} />
          <Tab value="other" label={tpl('other_nights_count', otherNights.length)} sx={{ textTransform: 'none', fontSize: '0.85rem' }} />
        </Tabs>

        {/* Drag hint */}
        <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
            {t('drag_reorder_hint')}
          </Typography>
        </Box>

        {/* Sortable list */}
        <Box sx={{ maxHeight: '50vh', overflowY: 'auto', px: 1, pb: 1 }}>
          {currentList.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              {t('list_is_empty')}
            </Typography>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              {currentList.map((id, index) => (
                <SortableCharRow
                  key={`${id}__${index}`}
                  id={id}
                  index={index}
                  language={language}
                  onRemove={() => remove(index)}
                  onInsertAfter={() => setInsertAfterIndex(insertAfterIndex === index ? null : index)}
                  insertingAfter={insertAfterIndex === index}
                  insertOptions={availableOptions}
                  onInsertConfirm={(charId) => handleInsertAfter(index, charId)}
                  onInsertCancel={() => setInsertAfterIndex(null)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </Box>

        {/* Add at end */}
        <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontSize: '0.72rem' }}>
            {t('append_to_end')}
          </Typography>
          <Autocomplete
            size="small"
            options={availableOptions}
            value={addValue}
            inputValue={addInputValue}
            onInputChange={(_, v) => setAddInputValue(v)}
            onChange={handleAddAtEnd}
            getOptionLabel={(id) => getCharLabel(id, language)}
            renderOption={(props, id) => {
              const icon = getIconForCharacter(id)
              return (
                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '3px !important' }}>
                  {icon ? (
                    <Box component="img" src={icon} alt="" sx={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography sx={{ fontSize: '0.5rem', fontWeight: 700 }}>{id.slice(0, 2).toUpperCase()}</Typography>
                    </Box>
                  )}
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{getCharLabel(id, language)}</Typography>
                </Box>
              )
            }}
            renderInput={(params) => (
              <TextField {...params} placeholder={t('search_and_add_char')} size="small" />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handleReset} sx={{ textTransform: 'none' }}>
            {t('reset_to_default')}
          </Button>
          <Tooltip title={t('download_as_json')}>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon fontSize="small" />} onClick={handleDownload} sx={{ textTransform: 'none' }}>
              {t('download_as_json')}
            </Button>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" onClick={onClose} sx={{ textTransform: 'none' }}>
            {t('cancel')}
          </Button>
          <Button variant="contained" size="small" onClick={handleSave} sx={{ textTransform: 'none' }}>
            {t('save')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
