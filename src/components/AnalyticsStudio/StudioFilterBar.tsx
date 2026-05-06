import { Box, Chip, FormControl, InputLabel, MenuItem, OutlinedInput, Select, TextField, ToggleButton, ToggleButtonGroup, Tooltip, IconButton, Typography } from '@mui/material'
import FilterListIcon from '@mui/icons-material/FilterList'
import CloseIcon from '@mui/icons-material/Close'
import type { FilterState } from './useAnalyticsFilter'
import type { Language } from '../../types'

interface Props {
  filter: FilterState
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>
  resetFilter: () => void
  activeCount: number
  scriptOptions: Array<{ key: string; label: string }>
  language: Language
}

export function StudioFilterBar({ filter, setFilter, resetFilter, activeCount, scriptOptions, language }: Props) {
  const zh = language === 'zh'

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
      px: 1.5, py: 1,
      bgcolor: 'rgba(23,32,42,0.04)',
      border: '1px solid',
      borderColor: activeCount > 0 ? 'primary.main' : 'divider',
      borderRadius: 2,
      mb: 2,
    }}>
      <FilterListIcon sx={{ fontSize: '1rem', color: activeCount > 0 ? 'primary.main' : 'text.secondary', flexShrink: 0 }} />

      {/* Script filter */}
      {scriptOptions.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 140, maxWidth: 220 }}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>{zh ? '剧本' : 'Script'}</InputLabel>
          <Select
            multiple
            value={filter.scriptSlugs}
            onChange={(e) => setFilter((f) => ({ ...f, scriptSlugs: e.target.value as string[] }))}
            input={<OutlinedInput label={zh ? '剧本' : 'Script'} />}
            renderValue={(selected) =>
              selected.length === 0
                ? ''
                : selected.length === 1
                  ? (scriptOptions.find((s) => s.key === selected[0])?.label ?? selected[0])
                  : `${selected.length} ${zh ? '个剧本' : 'scripts'}`
            }
            sx={{ fontSize: '0.8rem', '& .MuiSelect-select': { py: '4px' } }}
          >
            {scriptOptions.map((s) => (
              <MenuItem key={s.key} value={s.key} sx={{ fontSize: '0.85rem' }}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Date range */}
      <TextField
        type="date"
        size="small"
        label={zh ? '从' : 'From'}
        value={filter.dateFrom}
        onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: 140, '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' } }}
      />
      <TextField
        type="date"
        size="small"
        label={zh ? '至' : 'To'}
        value={filter.dateTo}
        onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: 140, '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' } }}
      />

      {/* Winner filter */}
      <ToggleButtonGroup
        size="small"
        value={filter.winners}
        onChange={(_, v) => setFilter((f) => ({ ...f, winners: v }))}
        sx={{ '& .MuiToggleButton-root': { py: '3px', px: '8px', fontSize: '0.72rem' } }}
      >
        <ToggleButton value="evil" sx={{ color: 'error.main' }}>{zh ? '邪恶' : 'Evil'}</ToggleButton>
        <ToggleButton value="good" sx={{ color: 'success.main' }}>{zh ? '善良' : 'Good'}</ToggleButton>
        <ToggleButton value="storyteller" sx={{ color: 'info.main' }}>ST</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ flex: 1 }} />

      {/* Active filter chips */}
      {filter.scriptSlugs.length > 0 && (
        <Chip
          size="small"
          label={`${filter.scriptSlugs.length} ${zh ? '剧本' : 'script(s)'}`}
          onDelete={() => setFilter((f) => ({ ...f, scriptSlugs: [] }))}
          sx={{ fontSize: '0.7rem', height: 22 }}
        />
      )}
      {(filter.dateFrom || filter.dateTo) && (
        <Chip
          size="small"
          label={`${filter.dateFrom || '…'} → ${filter.dateTo || '…'}`}
          onDelete={() => setFilter((f) => ({ ...f, dateFrom: '', dateTo: '' }))}
          sx={{ fontSize: '0.7rem', height: 22 }}
        />
      )}
      {filter.winners.length > 0 && (
        <Chip
          size="small"
          label={filter.winners.join(' / ')}
          onDelete={() => setFilter((f) => ({ ...f, winners: [] }))}
          sx={{ fontSize: '0.7rem', height: 22 }}
        />
      )}

      {activeCount > 0 && (
        <Tooltip title={zh ? '重置筛选' : 'Reset filters'}>
          <IconButton size="small" onClick={resetFilter}>
            <CloseIcon sx={{ fontSize: '0.9rem' }} />
          </IconButton>
        </Tooltip>
      )}

      {activeCount > 0 && (
        <Typography variant="caption" color="primary" sx={{ fontWeight: 700, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
          {zh ? '已筛选' : 'Filtered'}
        </Typography>
      )}
    </Box>
  )
}
