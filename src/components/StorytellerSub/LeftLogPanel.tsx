import type { StorytellerContext } from './useStoryteller'
import type { AggregatedLogEntry } from './types'
import { useMemo } from 'react'
import { Box, Typography, Paper, Button, Chip, Select, MenuItem, Drawer, IconButton } from '@mui/material'
import { LogDetailText } from './LogDetailText'
import CloseIcon from '@mui/icons-material/Close'
import { useT } from '../../context/I18nContext'

function phaseLabel(phase: string, text: StorytellerContext['text']): string {
  if (phase === 'night') return text.nightPhase
  if (phase === 'private') return text.privateChat
  if (phase === 'public') return text.publicChat
  if (phase === 'nomination') return text.nomination
  return phase
}

const ENTRY_COLORS: Record<AggregatedLogEntry['type'], 'primary' | 'secondary' | 'success'> = {
  vote: 'primary',
  skill: 'secondary',
  event: 'success',
}

export function LeftLogPanel({ ctx }: { ctx: StorytellerContext }) {
  const { t, tpl } = useT()
  const { text, days, logFilter, setLogFilter, aggregatedLog, toggleLogFilterType, showLogPanel, setShowLogPanel } = ctx

  const grouped = useMemo(() => {
    const map = new Map<number, AggregatedLogEntry[]>()
    for (const e of aggregatedLog) {
      const arr = map.get(e.day) ?? []
      arr.push(e)
      map.set(e.day, arr)
    }
    return Array.from(map.entries()).sort((a, b) => logFilter.sortAsc ? a[0] - b[0] : b[0] - a[0])
  }, [aggregatedLog, logFilter.sortAsc])

  return (
    <Drawer
      anchor="left"
      open={showLogPanel}
      onClose={() => setShowLogPanel(false)}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 360 }, p: 0 } }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{text.aggregatedLog}</Typography>
          <IconButton size="small" onClick={() => setShowLogPanel(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Chip
            label={text.filterVote}
            size="small"
            color={logFilter.types.has('vote') ? 'primary' : 'default'}
            variant={logFilter.types.has('vote') ? 'filled' : 'outlined'}
            onClick={() => toggleLogFilterType('vote')}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label={text.filterSkill}
            size="small"
            color={logFilter.types.has('skill') ? 'primary' : 'default'}
            variant={logFilter.types.has('skill') ? 'filled' : 'outlined'}
            onClick={() => toggleLogFilterType('skill')}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label={text.filterEvent}
            size="small"
            color={logFilter.types.has('event') ? 'primary' : 'default'}
            variant={logFilter.types.has('event') ? 'filled' : 'outlined'}
            onClick={() => toggleLogFilterType('event')}
            sx={{ cursor: 'pointer' }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Chip
            label={t('all')}
            size="small"
            color={logFilter.visibility === 'all' ? 'primary' : 'default'}
            variant={logFilter.visibility === 'all' ? 'filled' : 'outlined'}
            onClick={() => setLogFilter((previous) => ({ ...previous, visibility: 'all' }))}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label={t('public')}
            size="small"
            color={logFilter.visibility === 'public' ? 'primary' : 'default'}
            variant={logFilter.visibility === 'public' ? 'filled' : 'outlined'}
            onClick={() => setLogFilter((previous) => ({ ...previous, visibility: 'public' }))}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label={t('st')}
            size="small"
            color={logFilter.visibility === 'st-only' ? 'primary' : 'default'}
            variant={logFilter.visibility === 'st-only' ? 'filled' : 'outlined'}
            onClick={() => setLogFilter((previous) => ({ ...previous, visibility: 'st-only' }))}
            sx={{ cursor: 'pointer' }}
          />
          <Select
            size="small"
            value={logFilter.dayFilter}
            onChange={(e) => setLogFilter((previous) => ({ ...previous, dayFilter: e.target.value === 'all' ? 'all' : Number(e.target.value) }))}
            sx={{ minWidth: 100, fontSize: '0.8rem' }}
          >
            <MenuItem value="all">{text.allDays}</MenuItem>
            {days.map((day) => <MenuItem key={day.id} value={day.day}>{tpl('day_n', day.day)}</MenuItem>)}
          </Select>
          <Button size="small" variant="outlined" onClick={() => setLogFilter((previous) => ({ ...previous, sortAsc: !previous.sortAsc }))}>
            {logFilter.sortAsc ? '↑' : '↓'}
          </Button>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          {grouped.length === 0 ? (
            <Typography variant="body2" color="text.secondary">—</Typography>
          ) : (
            grouped.map(([day, entries]) => (
              <Box key={day} sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main', fontWeight: 600 }}>
                  {tpl('day_n', day)}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {entries.map((entry) => (
                    <Paper
                      key={entry.id}
                      sx={{
                        p: 1,
                        bgcolor: entry.visibility === 'st-only' ? 'warning.light' : 'background.paper',
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                        <Chip
                          label={entry.type === 'vote' ? text.filterVote : entry.type === 'skill' ? text.filterSkill : text.filterEvent}
                          size="small"
                          color={ENTRY_COLORS[entry.type]}
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                        {entry.visibility === 'st-only' && (
                          <Chip label={t('st')} size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem' }} />
                        )}
                        {entry.phase && (
                          <Chip label={phaseLabel(entry.phase, text)} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <LogDetailText detail={entry.detail} />
                    </Paper>
                  ))}
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Drawer>
  )
}
