import React, { useState } from 'react'
import { Box, Chip, Collapse, FormControl, InputLabel, MenuItem, OutlinedInput, Select, TextField, ToggleButton, ToggleButtonGroup, Tooltip, IconButton, Typography, Badge } from '@mui/material'
import FilterListIcon from '@mui/icons-material/FilterList'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import type { FilterState } from './useAnalyticsFilter'
import type { Language } from '../../types'
import { useT } from '../../context/I18nContext'
import { useBreakpoint } from '../../hooks/useBreakpoint'

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

  // Shared filter controls — rendered either inline (desktop) or inside Collapse (mobile)
  const filterControls = (
    <>
      {/* Script filter */}
      {scriptOptions.length > 0 && (
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 }, maxWidth: { xs: '100%', sm: 220 } }}>
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
      <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
        <TextField
          type="date"
          size="small"
          label={t('from')}
          value={filter.dateFrom}
          onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: { xs: 1, sm: 'none' }, width: { xs: 'auto', sm: 140 }, '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' } }}
        />
        <TextField
          type="date"
          size="small"
          label={t('to')}
          value={filter.dateTo}
          onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: { xs: 1, sm: 'none' }, width: { xs: 'auto', sm: 140 }, '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' } }}
        />
      </Box>

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
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 }, maxWidth: { xs: '100%', sm: 200 } }}>
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
    </>
  )

  // ── Active filter chips (shared between mobile + desktop) ──────────────────
  const activeChips = (
    <>
      {filter.scriptSlugs.length > 0 && (
        <Chip size="small" label={`${filter.scriptSlugs.length} ${t('scripts')}`}
          onDelete={() => setFilter((f) => ({ ...f, scriptSlugs: [] }))}
          sx={{ fontSize: '0.7rem', height: 22 }} />
      )}
      {(filter.dateFrom || filter.dateTo) && (
        <Chip size="small"
          label={`${filter.dateFrom || '…'} → ${filter.dateTo || '…'}`}
          onDelete={() => setFilter((f) => ({ ...f, dateFrom: '', dateTo: '' }))}
          sx={{ fontSize: '0.7rem', height: 22 }} />
      )}
      {filter.winners.length > 0 && (
        <Chip size="small" label={filter.winners.join(' / ')}
          onDelete={() => setFilter((f) => ({ ...f, winners: [] }))}
          sx={{ fontSize: '0.7rem', height: 22 }} />
      )}
      {filter.playerNames.length > 0 && (
        <Chip size="small"
          label={filter.playerNames.length === 1 ? filter.playerNames[0] : `${filter.playerNames.length} ${t('players')}`}
          onDelete={() => setFilter((f) => ({ ...f, playerNames: [] }))}
          sx={{ fontSize: '0.7rem', height: 22 }} />
      )}
    </>
  )

  // ── Mobile layout: compact toggle row + collapsible panel ─────────────────
  if (isMobile) {
    return (
      <Box sx={{
        bgcolor: 'rgba(23,32,42,0.04)',
        border: '1px solid',
        borderColor: activeCount > 0 ? 'primary.main' : 'divider',
        borderRadius: 2,
        mb: 2,
        overflow: 'hidden',
      }}>
        {/* Toggle row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75 }}>
          <Badge badgeContent={activeCount} color="primary" invisible={activeCount === 0}
            sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16, padding: '0 4px' } }}>
            <IconButton size="small" onClick={() => setMobileOpen((v) => !v)}
              sx={{ color: activeCount > 0 ? 'primary.main' : 'text.secondary', p: 0.5 }}>
              <FilterListIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Badge>
          <Typography
            variant="caption"
            onClick={() => setMobileOpen((v) => !v)}
            sx={{ fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
              color: activeCount > 0 ? 'primary.main' : 'text.secondary' }}>
            {t('filter')}
            {activeCount > 0 ? ` (${activeCount})` : ''}
          </Typography>

          {/* Active chips summary — visible when panel is closed */}
          {!mobileOpen && (
            <Box sx={{ display: 'flex', gap: 0.5, flex: 1, flexWrap: 'nowrap', overflow: 'hidden', minWidth: 0 }}>
              {activeChips}
            </Box>
          )}

          <Box sx={{ flex: 1 }} />

          {activeCount > 0 && (
            <Tooltip title={t('reset_filters')}>
              <IconButton size="small" onClick={resetFilter} sx={{ p: 0.5 }}>
                <CloseIcon sx={{ fontSize: '0.85rem' }} />
              </IconButton>
            </Tooltip>
          )}

          <IconButton size="small" onClick={() => setMobileOpen((v) => !v)} sx={{ p: 0.5, color: 'text.secondary' }}>
            {mobileOpen
              ? <ExpandLessIcon sx={{ fontSize: '1rem' }} />
              : <ExpandMoreIcon sx={{ fontSize: '1rem' }} />}
          </IconButton>
        </Box>

        {/* Collapsible filter controls */}
        <Collapse in={mobileOpen}>
          <Box sx={{
            display: 'flex', flexDirection: 'column', gap: 1.5,
            px: 1.5, pb: 1.5,
            borderTop: '1px solid', borderColor: 'divider',
            pt: 1.25,
          }}>
            {filterControls}

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
      bgcolor: 'rgba(23,32,42,0.04)',
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
