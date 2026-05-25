import { Box, Chip, FormControl, InputLabel, MenuItem, OutlinedInput, Select, TextField, ToggleButton, ToggleButtonGroup, Tooltip, IconButton, Typography } from '@mui/material'
import FilterListIcon from '@mui/icons-material/FilterList'
import CloseIcon from '@mui/icons-material/Close'
import type { FilterState } from './useAnalyticsFilter'
import type { Language } from '../../types'
import { useT } from '../../context/I18nContext'

interface Props {
  filter: FilterState
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>
  resetFilter: () => void
  activeCount: number
  scriptOptions: Array<{ key: string; label: string }>
  playerOptions: string[]
  language: Language
}

export function StudioFilterBar({ filter, setFilter, resetFilter, activeCount, scriptOptions, playerOptions }: Props) {

const { t } = useT()

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
          <InputLabel sx={{ fontSize: '0.8rem' }}>{t('script')}</InputLabel>
          <Select
            multiple
            value={filter.scriptSlugs}
            onChange={(e) => setFilter((f) => ({ ...f, scriptSlugs: e.target.value as string[] }))}
            input={<OutlinedInput label={t('script')} />}
            renderValue={(selected) =>
              selected.length === 0
                ? ''
                : selected.length === 1
                  ? (scriptOptions.find((s) => s.key === selected[0])?.label ?? selected[0])
                  : `${selected.length} ${t('scripts')}`
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
        label={t('from')}
        value={filter.dateFrom}
        onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: 140, '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' } }}
      />
      <TextField
        type="date"
        size="small"
        label={t('to')}
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
        <ToggleButton value="evil" sx={{ color: 'error.main' }}>{t('evil')}</ToggleButton>
        <ToggleButton value="good" sx={{ color: 'success.main' }}>{t('good')}</ToggleButton>
        <ToggleButton value="storyteller" sx={{ color: 'info.main' }}>ST</ToggleButton>
      </ToggleButtonGroup>

      {/* Player filter */}
      {playerOptions.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 120, maxWidth: 200 }}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>{t('player_section')}</InputLabel>
          <Select
            multiple
            value={filter.playerNames}
            onChange={(e) => setFilter((f) => ({ ...f, playerNames: e.target.value as string[] }))}
            input={<OutlinedInput label={t('player_section')} />}
            renderValue={(selected) =>
              selected.length === 0
                ? ''
                : selected.length === 1
                  ? selected[0]
                  : `${selected.length} ${t('players')}`
            }
            sx={{ fontSize: '0.8rem', '& .MuiSelect-select': { py: '4px' } }}
          >
            {playerOptions.map((name) => (
              <MenuItem key={name} value={name} sx={{ fontSize: '0.85rem' }}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Box sx={{ flex: 1 }} />

      {/* Active filter chips */}
      {filter.scriptSlugs.length > 0 && (
        <Chip
          size="small"
          label={`${filter.scriptSlugs.length} ${t('scripts')}`}
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
      {filter.playerNames.length > 0 && (
        <Chip
          size="small"
          label={filter.playerNames.length === 1 ? filter.playerNames[0] : `${filter.playerNames.length} ${t('players')}`}
          onDelete={() => setFilter((f) => ({ ...f, playerNames: [] }))}
          sx={{ fontSize: '0.7rem', height: 22 }}
        />
      )}

      {activeCount > 0 && (
        <Tooltip title={t('reset_filters')}>
          <IconButton size="small" onClick={resetFilter}>
            <CloseIcon sx={{ fontSize: '0.9rem' }} />
          </IconButton>
        </Tooltip>
      )}

      {activeCount > 0 && (
        <Typography variant="caption" color="primary" sx={{ fontWeight: 700, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
          {t('filtered')}
        </Typography>
      )}
    </Box>
  )
}
