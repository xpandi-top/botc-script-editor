/**
 * NightOrderPicker — visual night-order insertion picker.
 *
 * Shows the full effective night order as a scrollable list.
 * "Insert here" dividers between every adjacent pair let the user
 * pick where their custom character wakes up.
 * Returns a 1-based position number (lower = earlier).
 */

import { useState } from 'react'
import {
  Box, Button, DialogTitle,
  IconButton, InputAdornment, TextField, Tooltip, Typography,
} from '@mui/material'
import AddAlarmIcon from '@mui/icons-material/AddAlarm'
import ClearIcon from '@mui/icons-material/Clear'
import CloseIcon from '@mui/icons-material/Close'
import {
  getDisplayName,
  getEffectiveNightOrderFromRegistry,
  getIconForCharacter,
} from '../catalog'
import type { Language } from '../types'
import { useT } from '../context/I18nContext'
import { makeTpl } from '../lib/t'
import { ResponsiveDialog, ResponsiveDialogContent } from './ui'

type Props = {
  /** Current 1-based position, or undefined = not in night order */
  value: number | undefined
  onChange: (pos: number | undefined) => void
  nightType: 'first' | 'other'
  language: Language
}

function CharRow({ id, language }: { id: string; language: Language }) {
  const icon = getIconForCharacter(id)
  const name = getDisplayName(id, language)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 1 }}>
      {icon ? (
        <Box component="img" src={icon} sx={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'contain', bgcolor: 'background.default', flexShrink: 0 }} />
      ) : (
        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'text.secondary' }}>{id.slice(0, 2).toUpperCase()}</Typography>
        </Box>
      )}
      <Typography variant="body2">{name}</Typography>
    </Box>
  )
}

function InsertDivider({ pos, label, onInsert }: { pos: number; label: string; onInsert: (pos: number) => void }) {
  const [hover, setHover] = useState(false)
  return (
    <Box
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onInsert(pos)}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
        py: '2px', px: 1, borderRadius: 1, mx: 0.5,
        bgcolor: hover ? 'primary.main' : 'transparent',
        transition: 'background-color 0.1s',
      }}
    >
      <Box sx={{ flex: 1, height: '1px', bgcolor: hover ? 'primary.contrastText' : 'divider' }} />
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.65rem', whiteSpace: 'nowrap', userSelect: 'none',
          color: hover ? 'primary.contrastText' : 'text.disabled',
        }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: hover ? 'primary.contrastText' : 'divider' }} />
    </Box>
  )
}

export function NightOrderPicker({ value, onChange, nightType, language }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { t } = useT()
  const tpl = makeTpl(language)

  const nightOrder = getEffectiveNightOrderFromRegistry()
  const rawList = nightType === 'first' ? (nightOrder.first_night ?? []) : (nightOrder.other_nights ?? [])

  // Current display label.
  // pos=1 → before rawList[0] (wake first); pos=N → after rawList[N-2]
  let buttonLabel: string
  if (value == null) {
    buttonLabel = t('no_wakeup')
  } else if (value === 1) {
    buttonLabel = t('1_wake_first')
  } else {
    const charBefore = rawList[value - 2]
    const nameBefore = charBefore ? getDisplayName(charBefore, language) : `#${value - 1}`
    buttonLabel = tpl('pos_after', value, nameBefore)
  }

  const handleInsert = (pos: number) => {
    onChange(pos)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
  }

  // Build visible list — filter by search but keep positions accurate
  const sq = search.trim().toLowerCase()

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddAlarmIcon fontSize="small" />}
          onClick={() => setOpen(true)}
          sx={{ textTransform: 'none', fontSize: '0.75rem', flex: 1, justifyContent: 'flex-start' }}
        >
          {buttonLabel}
        </Button>
        {value != null && (
          <Tooltip title={t('clear')}>
            <IconButton size="small" onClick={handleClear}><ClearIcon fontSize="small" /></IconButton>
          </Tooltip>
        )}
      </Box>

      <ResponsiveDialog open={open} onClose={() => { setOpen(false); setSearch('') }} maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {nightType === 'first' ? t('first_night_pick_position') : t('other_nights_pick_position')}
          </Typography>
          <IconButton size="small" onClick={() => { setOpen(false); setSearch('') }}><CloseIcon /></IconButton>
        </DialogTitle>
        <Box sx={{ px: 2, pb: 1 }}>
          <TextField
            size="small" fullWidth autoFocus
            placeholder={t('search_characters_2')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
        </Box>
        <ResponsiveDialogContent sx={{ p: 0, overflowY: 'auto' }}>
          {/* Insert at beginning */}
          {!sq && (
            <InsertDivider
              pos={1}
              label={t('wake_first')}
              onInsert={handleInsert}
            />
          )}

          {rawList.map((charId, idx) => {
            const name = getDisplayName(charId, language).toLowerCase()
            const matchesSearch = !sq || name.includes(sq) || charId.toLowerCase().includes(sq)
            const insertPos = idx + 2 // insert AFTER this char = position idx+2

            return (
              <Box key={charId}>
                {matchesSearch && <CharRow id={charId} language={language} />}
                {/* Show insert divider only when not filtering, or when this char matches */}
                {(!sq || matchesSearch) && (
                  <InsertDivider
                    pos={insertPos}
                    label={tpl('insert_after', insertPos)}
                    onInsert={handleInsert}
                  />
                )}
              </Box>
            )
          })}

          {/* No wake option */}
          <Box sx={{ p: 1, pt: 2 }}>
            <Button
              fullWidth variant="text" size="small"
              sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
              onClick={() => { onChange(undefined); setOpen(false); setSearch('') }}
            >
              {t('no_night_wakeup')}
            </Button>
          </Box>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}
