import React, { useEffect, useId, useState } from 'react'
import { Box, Button, Checkbox, Chip, Collapse, FormControl, InputLabel, MenuItem, OutlinedInput, Select, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import FilterListIcon from '@mui/icons-material/FilterList'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import type { FilterState } from './useAnalyticsFilter'
import type { Language } from '../../types'
import { useT } from '../../context/I18nContext'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useDebounce } from '../../hooks/useDebounce'

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
  const { isMobile } = useBreakpoint()
  const [mobileOpen, setMobileOpen] = useState(false)
  const filterId = useId()
  const winnerLabel = (winner: string) => winner === 'evil' ? t('evil') : winner === 'good' ? t('good') : t('term_storyteller')

  // Local state for date fields — debounced 300ms before committing to filter
  // Prevents expensive re-filter on every keystroke when typing dates
  const [localDateFrom, setLocalDateFrom] = useState(filter.dateFrom)
  const [localDateTo, setLocalDateTo] = useState(filter.dateTo)
  const debouncedDateFrom = useDebounce(localDateFrom, 300)
  const debouncedDateTo = useDebounce(localDateTo, 300)

  // Sync debounced date values into filter state
  useEffect(() => {
    setFilter((f) => f.dateFrom !== debouncedDateFrom ? { ...f, dateFrom: debouncedDateFrom } : f)
  }, [debouncedDateFrom, setFilter])
  useEffect(() => {
    setFilter((f) => f.dateTo !== debouncedDateTo ? { ...f, dateTo: debouncedDateTo } : f)
  }, [debouncedDateTo, setFilter])

  // Keep local date in sync if external reset clears filter
  useEffect(() => {
    if (filter.dateFrom !== localDateFrom && filter.dateFrom === '') setLocalDateFrom('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.dateFrom])
  useEffect(() => {
    if (filter.dateTo !== localDateTo && filter.dateTo === '') setLocalDateTo('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.dateTo])

  // Shared filter controls — rendered either inline (desktop) or inside Collapse (mobile)
  const filterControls = (
    <>
      {/* Script filter */}
      {scriptOptions.length > 0 && (
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 }, maxWidth: { xs: '100%', sm: 220 } }}>
          <InputLabel id={`${filterId}-script`}>{t('script')}</InputLabel>
          <Select
            multiple
            labelId={`${filterId}-script`}
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
          >
            {scriptOptions.map((s) => (
              <MenuItem key={s.key} value={s.key} sx={{ fontSize: '0.85rem' }}>
                <Checkbox checked={filter.scriptSlugs.includes(s.key)} size="small" tabIndex={-1} disableRipple sx={{ p: 0, mr: 1 }} />
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Date range */}
      <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
        <TextField
          type="date"
          size="small"
          label={t('from')}
          value={localDateFrom}
          onChange={(e) => setLocalDateFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: { xs: 1, sm: 'none' }, minWidth: 0, width: { xs: 0, sm: 160 }, '& .MuiInputBase-input': { minWidth: 0 } }}
        />
        <TextField
          type="date"
          size="small"
          label={t('to')}
          value={localDateTo}
          onChange={(e) => setLocalDateTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: { xs: 1, sm: 'none' }, minWidth: 0, width: { xs: 0, sm: 160 }, '& .MuiInputBase-input': { minWidth: 0 } }}
        />
      </Box>

      {/* Winner filter */}
      <ToggleButtonGroup
        aria-label={t('result')}
        size="small"
        value={filter.winners}
        onChange={(_, v) => setFilter((f) => ({ ...f, winners: v }))}
        sx={{ '& .MuiToggleButton-root': { px: 1.5 } }}
      >
        <ToggleButton value="evil" sx={{ color: 'error.main' }}>{t('evil')}</ToggleButton>
        <ToggleButton value="good" sx={{ color: 'success.main' }}>{t('good')}</ToggleButton>
        <ToggleButton value="storyteller" sx={{ color: 'info.main' }}>{t('term_storyteller')}</ToggleButton>
      </ToggleButtonGroup>

      {/* Player filter */}
      {playerOptions.length > 0 && (
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 }, maxWidth: { xs: '100%', sm: 200 } }}>
          <InputLabel id={`${filterId}-player`}>{t('player_section')}</InputLabel>
          <Select
            multiple
            labelId={`${filterId}-player`}
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
          >
            {playerOptions.map((name) => (
              <MenuItem key={name} value={name} sx={{ fontSize: '0.85rem' }}>
                <Checkbox checked={filter.playerNames.includes(name)} size="small" tabIndex={-1} disableRipple sx={{ p: 0, mr: 1 }} />
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </>
  )

  // ── Active filter chips (shared between mobile + desktop) ──────────────────
  const activeChips = (
    <>
      {filter.scriptSlugs.length > 0 && (
        <Chip size="small" label={filter.scriptSlugs.length === 1 ? scriptOptions.find((script) => script.key === filter.scriptSlugs[0])?.label ?? filter.scriptSlugs[0] : `${filter.scriptSlugs.length} ${t('scripts')}`}
          onDelete={() => setFilter((f) => ({ ...f, scriptSlugs: [] }))}
          sx={{ maxWidth: '100%', fontSize: '0.75rem' }} />
      )}
      {(filter.dateFrom || filter.dateTo) && (
        <Chip size="small"
          label={`${filter.dateFrom || '…'} → ${filter.dateTo || '…'}`}
          onDelete={() => setFilter((f) => ({ ...f, dateFrom: '', dateTo: '' }))}
          sx={{ maxWidth: '100%', fontSize: '0.75rem' }} />
      )}
      {filter.winners.length > 0 && (
        <Chip size="small" label={filter.winners.map(winnerLabel).join(' / ')}
          onDelete={() => setFilter((f) => ({ ...f, winners: [] }))}
          sx={{ maxWidth: '100%', fontSize: '0.75rem' }} />
      )}
      {filter.playerNames.length > 0 && (
        <Chip size="small"
          label={filter.playerNames.length === 1 ? filter.playerNames[0] : `${filter.playerNames.length} ${t('players')}`}
          onDelete={() => setFilter((f) => ({ ...f, playerNames: [] }))}
          sx={{ maxWidth: '100%', fontSize: '0.75rem' }} />
      )}
    </>
  )

  // ── Mobile layout: compact toggle row + collapsible panel ─────────────────
  if (isMobile) {
    return (
      <Box sx={{
        bgcolor: 'action.hover',
        border: '1px solid',
        borderColor: activeCount > 0 ? 'primary.main' : 'divider',
        borderRadius: 2,
        mb: 2,
        overflow: 'hidden',
      }}>
        {/* Toggle row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.5 }}>
          <Button
            startIcon={<FilterListIcon />}
            endIcon={mobileOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            aria-expanded={mobileOpen}
            aria-controls={`${filterId}-controls`}
            data-testid="filter-expand-btn"
            onClick={() => setMobileOpen((v) => !v)}
            sx={{ minHeight: 44, justifyContent: 'flex-start', mr: 'auto' }}>
            {t('filter')}
            {activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>
          {activeCount > 0 && (
            <Button size="small" onClick={resetFilter} sx={{ minHeight: 44 }}>{t('reset_filters')}</Button>
          )}
        </Box>
        {!mobileOpen && activeCount > 0 && (
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', px: 1.5, pb: 1.5 }}>{activeChips}</Box>
        )}

        {/* Collapsible filter controls */}
        <Collapse in={mobileOpen} id={`${filterId}-controls`} data-testid="filter-collapse">
          <Box sx={{
            display: 'flex', flexDirection: 'column', gap: 1.5,
            px: 1.5, pb: 1.5,
            borderTop: '1px solid', borderColor: 'divider',
            pt: 1.25,
          }}>
            {filterControls}
            <Typography variant="caption" color="text.secondary">
              {t('analytics_filter_multi_hint')}
            </Typography>

            {/* Active chips inside panel */}
            {activeCount > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {activeChips}
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>
    )
  }

  // ── Desktop layout: always-visible row ────────────────────────────────────
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
      px: 1.5, py: 1,
      bgcolor: 'action.hover',
      border: '1px solid',
      borderColor: activeCount > 0 ? 'primary.main' : 'divider',
      borderRadius: 2,
      mb: 2,
    }}>
      <FilterListIcon sx={{ fontSize: '1rem', color: activeCount > 0 ? 'primary.main' : 'text.secondary', flexShrink: 0 }} />

      {filterControls}

      <Box sx={{ flex: 1 }} />

      {activeChips}

      {activeCount > 0 && (
        <Button size="small" onClick={resetFilter}>{t('reset_filters')}</Button>
      )}

      {activeCount > 0 && (
        <Typography variant="caption" color="primary" sx={{ fontWeight: 700, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
          {t('filtered')}
        </Typography>
      )}
    </Box>
  )
}
