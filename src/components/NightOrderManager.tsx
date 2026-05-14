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
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import DownloadIcon from '@mui/icons-material/Download'
import {
  clearNightOrderOverrides,
  getDisplayName,
  getEffectiveAllCharacters,
  getEffectiveNightOrderFromRegistry,
  getIconForCharacter,
  saveNightOrderOverrides,
} from '../catalog'
import type { Language } from '../types'

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

function CharRow({
  id,
  index,
  total,
  language,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  id: string
  index: number
  total: number
  language: Language
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const icon = getIconForCharacter(id)
  const allChars = getEffectiveAllCharacters()
  const isKnown = SPECIAL_LABELS[id] != null || allChars.some((c) => c.id === id)
  const label = getCharLabel(id, language)
  const isSpecial = SPECIAL_LABELS[id] != null

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.5,
        bgcolor: index % 2 === 0 ? 'action.hover' : 'transparent',
        borderRadius: 1,
        opacity: isKnown ? 1 : 0.5,
      }}
    >
      {/* Position badge */}
      <Typography
        sx={{
          minWidth: 24,
          fontSize: '0.7rem',
          color: 'text.secondary',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {index + 1}
      </Typography>

      {/* Icon */}
      {!isSpecial && icon ? (
        <Box
          component="img"
          src={icon}
          alt=""
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            objectFit: 'contain',
            bgcolor: 'background.default',
            flexShrink: 0,
          }}
        />
      ) : (
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            bgcolor: isSpecial ? 'primary.main' : 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: isSpecial ? 'primary.contrastText' : 'text.secondary' }}>
            {isSpecial ? '★' : id.slice(0, 2).toUpperCase()}
          </Typography>
        </Box>
      )}

      {/* Name */}
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          fontSize: '0.82rem',
          fontStyle: isKnown ? 'normal' : 'italic',
          color: isKnown ? 'text.primary' : 'text.disabled',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
        {!isKnown && (
          <Typography component="span" sx={{ fontSize: '0.7rem', ml: 0.5, color: 'text.disabled' }}>
            ({id})
          </Typography>
        )}
      </Typography>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
        <Tooltip title="Move up">
          <span>
            <IconButton size="small" onClick={onMoveUp} disabled={index === 0} sx={{ p: '2px' }}>
              <KeyboardArrowUpIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down">
          <span>
            <IconButton size="small" onClick={onMoveDown} disabled={index === total - 1} sx={{ p: '2px' }}>
              <KeyboardArrowDownIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={language === 'zh' ? '移除' : 'Remove'}>
          <IconButton size="small" onClick={onRemove} sx={{ p: '2px', color: 'error.main' }}>
            <CloseIcon sx={{ fontSize: '0.9rem' }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export function NightOrderManager({ open, onClose, language }: Props) {
  const zh = language === 'zh'

  const [tab, setTab] = useState<'first' | 'other'>('first')
  const [firstNight, setFirstNight] = useState<string[]>([])
  const [otherNights, setOtherNights] = useState<string[]>([])
  const [addValue, setAddValue] = useState<string | null>(null)
  const [addInputValue, setAddInputValue] = useState('')

  // Initialize when dialog opens
  useEffect(() => {
    if (!open) return
    const order = getEffectiveNightOrderFromRegistry()
    setFirstNight(order.first_night ?? [])
    setOtherNights(order.other_nights ?? [])
    setTab('first')
    setAddValue(null)
    setAddInputValue('')
  }, [open])

  const currentList = tab === 'first' ? firstNight : otherNights
  const setCurrentList = tab === 'first' ? setFirstNight : setOtherNights

  const moveUp = (index: number) => {
    if (index === 0) return
    const next = [...currentList]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setCurrentList(next)
  }

  const moveDown = (index: number) => {
    if (index === currentList.length - 1) return
    const next = [...currentList]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setCurrentList(next)
  }

  const remove = (index: number) => {
    setCurrentList(currentList.filter((_, i) => i !== index))
  }

  const handleAdd = (_: React.SyntheticEvent, value: string | null) => {
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

  // Autocomplete options: all known chars not already in current list
  const allChars = getEffectiveAllCharacters()
  const currentSet = new Set(currentList)
  const autocompleteOptions = allChars
    .map((c) => c.id)
    .filter((id) => !currentSet.has(id))

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {zh ? '夜晚顺序' : 'Night Order'}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as 'first' | 'other')}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab value="first" label={zh ? '首夜' : 'First Night'} sx={{ textTransform: 'none', fontSize: '0.85rem' }} />
          <Tab value="other" label={zh ? '其他夜' : 'Other Nights'} sx={{ textTransform: 'none', fontSize: '0.85rem' }} />
        </Tabs>

        {/* Scrollable list */}
        <Box sx={{ maxHeight: 440, overflowY: 'auto', px: 1, py: 1 }}>
          {currentList.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              {zh ? '列表为空' : 'List is empty'}
            </Typography>
          )}
          {currentList.map((id, index) => (
            <CharRow
              key={`${id}-${index}`}
              id={id}
              index={index}
              total={currentList.length}
              language={language}
              onMoveUp={() => moveUp(index)}
              onMoveDown={() => moveDown(index)}
              onRemove={() => remove(index)}
            />
          ))}
        </Box>

        {/* Add character */}
        <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Autocomplete
            size="small"
            options={autocompleteOptions}
            value={addValue}
            inputValue={addInputValue}
            onInputChange={(_, v) => setAddInputValue(v)}
            onChange={handleAdd}
            getOptionLabel={(id) => getCharLabel(id, language)}
            renderOption={(props, id) => {
              const icon = getIconForCharacter(id)
              return (
                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '4px !important' }}>
                  {icon ? (
                    <Box component="img" src={icon} alt="" sx={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography sx={{ fontSize: '0.5rem', fontWeight: 700 }}>{id.slice(0, 2).toUpperCase()}</Typography>
                    </Box>
                  )}
                  <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>{getCharLabel(id, language)}</Typography>
                </Box>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={zh ? '搜索并添加角色…' : 'Search and add character…'}
                size="small"
              />
            )}
            sx={{ mt: 0.5 }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handleReset} sx={{ textTransform: 'none' }}>
            {zh ? '恢复默认' : 'Reset to default'}
          </Button>
          <Tooltip title={zh ? '下载为 JSON' : 'Download as JSON'}>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon fontSize="small" />} onClick={handleDownload} sx={{ textTransform: 'none' }}>
              {zh ? '下载' : 'Download'}
            </Button>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" onClick={onClose} sx={{ textTransform: 'none' }}>
            {zh ? '取消' : 'Cancel'}
          </Button>
          <Button variant="contained" size="small" onClick={handleSave} sx={{ textTransform: 'none' }}>
            {zh ? '保存' : 'Save'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
