import { useState, useMemo } from 'react'
import { Box, Chip, Collapse, MenuItem, Paper, Select, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useTheme } from '@mui/material'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import { allCharacters, getDisplayName, getIconForCharacter } from '../../../catalog'
import type { CharStat } from '../useStats'
import type { GameRecord } from '../../StorytellerSub/types'
import type { Language } from '../../../types'
import { useT } from '../../../context/I18nContext'

type TeamFilter = 'all' | 'townsfolk' | 'outsider' | 'minion' | 'demon'
type SortMode = 'played' | 'winRate' | 'alpha'

const EVIL_TEAMS = new Set(['minion', 'demon'])
const TEAM_COLORS: Record<string, string> = {
  townsfolk: '#1565c0',
  outsider: '#6a1b9a',
  minion: '#c45c2e',
  demon: '#b91c1c',
}
const TEAM_BG: Record<string, string> = {
  townsfolk: 'rgba(21,101,192,0.07)',
  outsider: 'rgba(106,27,154,0.07)',
  minion: 'rgba(196,92,46,0.07)',
  demon: 'rgba(185,28,28,0.07)',
}

function getCharTeam(charId: string) {
  return allCharacters.find((c) => c.id === charId)?.team ?? null
}

// ── Character detail ──────────────────────────────────────────────

function CharDetail({ stat, records }: { stat: CharStat; records: GameRecord[]; language?: Language; zh?: boolean }) {
  const { t } = useT()
  // Per-player breakdown
  const playerEntries = [...stat.players.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Scripts it appeared in
  const scriptLabels = [...stat.scripts].map((key) => {
    const r = records.find((r) => (r.scriptSlug || r.scriptTitle || 'unknown') === key)
    return r?.scriptTitle || r?.scriptSlug || key
  })

  // Game history
  const charRecords = records
    .filter((r) => r.setup?.assignments && Object.values(r.setup.assignments).includes(stat.charId))
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, 5)

  return (
    <Box sx={{ px: 2, pb: 2, pt: 1, bgcolor: 'rgba(0,0,0,0.02)', borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>

        {/* Players */}
        {playerEntries.length > 0 && (
          <Box sx={{ flex: '1 1 140px' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
              {t('players_who_played_this')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {playerEntries.map(([name, count]) => (
                <Chip key={name} size="small" label={`${name} ×${count}`} sx={{ fontSize: '0.68rem', height: 20 }} />
              ))}
            </Box>
          </Box>
        )}

        {/* Scripts */}
        {scriptLabels.length > 0 && (
          <Box sx={{ flex: '1 1 140px' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
              {t('in_scripts')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {scriptLabels.map((s) => (
                <Chip key={s} size="small" variant="outlined" label={s} sx={{ fontSize: '0.68rem', height: 20 }} />
              ))}
            </Box>
          </Box>
        )}

        {/* Bluff info */}
        {stat.bluffCount > 0 && (
          <Box sx={{ flex: '0 0 auto' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
              {t('used_as_demon_bluff')}
            </Typography>
            <Chip size="small" icon={<FlashOnIcon sx={{ fontSize: '0.75rem !important' }} />} label={`×${stat.bluffCount}`} color="warning" sx={{ fontSize: '0.7rem', height: 22 }} />
          </Box>
        )}
      </Box>

      {/* Recent games */}
      {charRecords.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
            {t('recent_appearances')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {charRecords.map((r) => {
              // Find the player who played this char
              const seat = Object.entries(r.setup?.assignments ?? {}).find(([, cid]) => cid === stat.charId)?.[0]
              const playerName = seat ? r.setup?.seatNames?.[+seat] || r.playerSummaries?.find((ps) => ps.seat === +seat)?.name : null
              return (
                <Box key={r.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 0.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" sx={{ flex: 1 }}>{r.recordName || r.scriptTitle || '?'}</Typography>
                  {playerName && <Typography variant="caption" color="text.secondary">{playerName}</Typography>}
                  <Chip size="small"
                    label={r.winner === 'evil' ? (t('e')) : r.winner === 'good' ? (t('g')) : r.winner === 'storyteller' ? 'ST' : '?'}
                    color={r.winner === 'evil' ? 'error' : r.winner === 'good' ? 'success' : r.winner === 'storyteller' ? 'info' : 'default'}
                    sx={{ fontSize: '0.6rem', height: 18 }} />
                  <Typography variant="caption" color="text.disabled">{new Date(r.endedAt).toLocaleDateString()}</Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ── Character card ────────────────────────────────────────────────

function CharCard({ stat, language, records, zh }: { stat: CharStat; language: Language; records: GameRecord[]; zh: boolean }) {
  const { t } = useT()
  const [expanded, setExpanded] = useState(false)
  const muiTheme = useTheme()
  const isDark = muiTheme.palette.mode === 'dark'
  const icon = getIconForCharacter(stat.charId)
  const team = getCharTeam(stat.charId)
  const isEvil = team ? EVIL_TEAMS.has(team) : false
  const teamColor = team ? TEAM_COLORS[team] : undefined
  const teamBg = team ? TEAM_BG[team] : undefined

  // Win bar: for evil chars → evil win% matters; for good chars → good win%
  const winBarColor = isEvil ? '#b91c1c' : '#2e7d32'

  return (
    <Paper
      elevation={1}
      sx={{
        overflow: 'hidden',
        bgcolor: teamBg,
        border: '1px solid',
        borderColor: expanded ? (teamColor ?? 'primary.main') : 'divider',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Card header — click to expand */}
      <Box
        onClick={() => setExpanded((v) => !v)}
        sx={{ p: 1.5, cursor: 'pointer', display: 'flex', gap: 1, alignItems: 'flex-start', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}
      >
        {/* Icon */}
        {icon ? (
          <Box component="img" src={icon as string} sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#f2ebdf', flexShrink: 0 }} />
        ) : (
          <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'grey.200', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: '0.6rem' }}>{stat.charId.slice(0, 2).toUpperCase()}</Typography>
          </Box>
        )}

        {/* Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: teamColor }}>
              {getDisplayName(stat.charId, language)}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {stat.total}{t('g')} · {stat.winRate}%{t('win_short')}
            {isEvil ? (stat.evilGames > 0 ? ` · E:${stat.evilGames}` : '') : (stat.goodGames > 0 ? ` · G:${stat.goodGames}` : '')}
          </Typography>
          {/* Win bar */}
          <Box sx={{ mt: 0.5, height: 4, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${stat.winRate}%`, bgcolor: winBarColor, borderRadius: 1, transition: 'width 0.4s ease' }} />
          </Box>
        </Box>

        {stat.bluffCount > 0 && (
          <Tooltip title={t('times_used_as_demon_bluff')}>
            <Chip size="small"
              icon={<FlashOnIcon sx={{ fontSize: '0.7rem !important' }} />}
              label={`×${stat.bluffCount}`}
              sx={{ fontSize: '0.6rem', height: 18, flexShrink: 0 }} />
          </Tooltip>
        )}
      </Box>

      {/* Expanded detail */}
      <Collapse in={expanded}>
        <CharDetail stat={stat} records={records} language={language} zh={zh} />
      </Collapse>
    </Paper>
  )
}

// ── Main ──────────────────────────────────────────────────────────

interface Props {
  charStats: CharStat[]
  language: Language
  records: GameRecord[]
}

export function CharactersSection({ charStats, language, records }: Props) {
  const { t } = useT()
  const zh = language === 'zh'
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('played')

  const teamLabels: Record<TeamFilter, string> = {
    all: t('all'),
    townsfolk: t('townsfolk'),
    outsider: t('outsider_2'),
    minion: t('minion_2'),
    demon: t('demon_2'),
  }

  const filtered = useMemo(() => {
    let list = charStats
    if (teamFilter !== 'all') {
      list = list.filter((c) => getCharTeam(c.charId) === teamFilter)
    }
    return [...list].sort((a, b) => {
      if (sortMode === 'played') return b.total - a.total
      if (sortMode === 'winRate') return b.winRate - a.winRate
      return getDisplayName(a.charId, language).localeCompare(getDisplayName(b.charId, language))
    })
  }, [charStats, teamFilter, sortMode, language])

  if (charStats.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('no_character_data_add_character_assignments_to_records')}</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          size="small"
          value={teamFilter}
          exclusive
          onChange={(_, v) => { if (v) setTeamFilter(v) }}
          sx={{ '& .MuiToggleButton-root': { py: '3px', px: '8px', fontSize: '0.72rem' } }}
        >
          {(['all', 'townsfolk', 'outsider', 'minion', 'demon'] as TeamFilter[]).map((t) => (
            <ToggleButton key={t} value={t}
              sx={{ color: t === 'all' ? undefined : TEAM_COLORS[t] }}>
              {teamLabels[t]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Box sx={{ flex: 1 }} />

        <Select
          size="small"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          sx={{ fontSize: '0.8rem', '& .MuiSelect-select': { py: '4px' }, minWidth: 120 }}
        >
          <MenuItem value="played">{t('most_played')}</MenuItem>
          <MenuItem value="winRate">{t('win_rate')}</MenuItem>
          <MenuItem value="alpha">{t('alphabetical')}</MenuItem>
        </Select>
      </Box>

      {/* Count badge */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {filtered.length}{t('characters')}
      </Typography>

      {/* Card grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
        {filtered.map((c) => (
          <CharCard key={c.charId} stat={c} language={language} records={records} zh={zh} />
        ))}
      </Box>
    </Box>
  )
}
