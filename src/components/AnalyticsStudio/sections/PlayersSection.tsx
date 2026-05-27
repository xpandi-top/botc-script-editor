import { useState } from 'react'
import { Box, Collapse, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, Tooltip, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import PersonIcon from '@mui/icons-material/Person'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { MicroChip } from '../../ui'
import type { PlayerStat } from '../useStats'
import type { GameRecord } from '../../StorytellerSub/types'
import type { Language } from '../../../types'
import { useT } from '../../../context/I18nContext'
import { TYPE_SCALE, WEIGHT } from '../../../theme/tokens'

type SortKey = 'name' | 'total' | 'winRate' | 'goodWinRate' | 'evilWinRate' | 'evilRate' | 'mvpCount' | 'stGameCount'

// ── Inline player detail ──────────────────────────────────────────

function PlayerDetail({ player, language }: { player: PlayerStat; language: Language; records: GameRecord[] }) {
  const { t, tpl } = useT()
  // Per-character stats for this player
  const charEntries = [...player.charMap.entries()]
    .map(([charId, e]) => ({
      charId,
      total: e.total,
      wins: e.wins,
      wr: e.total ? Math.round((e.wins / e.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // Top teammates
  const teammates = [...player.teammates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <Box sx={{ px: 2, pb: 2, pt: 1, bgcolor: 'rgba(0,0,0,0.02)', borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>

        {/* Stat breakdown */}
        <Box sx={{ flex: '1 1 160px' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
            {t('team_breakdown')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {player.goodGames > 0 && (
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(46,125,50,0.1)', minWidth: 70, textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 700, color: 'success.dark' }}>{player.goodWinRate ?? '—'}%</Typography>
                <Typography variant="caption" color="text.secondary">{tpl('good_n_games', player.goodGames)}</Typography>
              </Box>
            )}
            {player.evilGames > 0 && (
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(185,28,28,0.1)', minWidth: 70, textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 700, color: 'error.dark' }}>{player.evilWinRate ?? '—'}%</Typography>
                <Typography variant="caption" color="text.secondary">{tpl('evil_n_games', player.evilGames)}</Typography>
              </Box>
            )}
            {player.mvpCount > 0 && (
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(237,180,13,0.12)', minWidth: 60, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <EmojiEventsIcon sx={{ fontSize: '1rem', color: 'warning.dark' }} />
                  <Typography sx={{ fontWeight: 700, color: 'warning.dark' }}>{player.mvpCount}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">{t('mvp')}</Typography>
              </Box>
            )}
            {player.stGameCount > 0 && (
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(106,27,154,0.1)', minWidth: 60, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <PersonIcon sx={{ fontSize: '1rem', color: 'purple' }} />
                  <Typography sx={{ fontWeight: 700, color: 'purple' }}>{player.stGameCount}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">{t('st_games')}</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Characters played */}
        {charEntries.length > 0 && (
          <Box sx={{ flex: '2 1 220px' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
              {t('characters_played')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {charEntries.slice(0, 8).map((e) => {
                const icon = getIconForCharacter(e.charId)
                return (
                  <Box key={e.charId} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, width: 52 }}>
                    {icon
                      ? <Box component="img" src={icon as string} sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: '#f2ebdf' }} />
                      : <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography sx={{ fontSize: '0.6rem' }}>{e.charId.slice(0, 2)}</Typography>
                        </Box>
                    }
                    <Typography variant="caption" sx={{ fontSize: '0.62rem', textAlign: 'center', lineHeight: 1.2 }}>
                      {getDisplayName(e.charId, language)}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: e.wr >= 60 ? 'success.dark' : e.wr <= 30 ? 'error.dark' : 'text.disabled' }}>
                      {e.total}× {e.wr}%
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}

        {/* Teammates — split by alignment */}
        {teammates.length > 0 && (
          <Box sx={{ flex: '1 1 140px' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
              {t('frequent_teammates')}
            </Typography>

            {/* Good teammates */}
            {(() => {
              const goodTm = [...player.teammatesGood.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
              if (goodTm.length === 0) return null
              return (
                <Box sx={{ mb: 0.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 0.25 }}>
                    <FiberManualRecordIcon sx={{ fontSize: '0.6rem', color: 'primary.main' }} />
                    <Typography variant="caption" color="primary.main" sx={{ fontSize: '0.62rem', fontWeight: 700 }}>
                      {t('good')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {goodTm.map(([name, count]) => (
                      <MicroChip key={name} label={`${name} ×${count}`} h={18}
                        sx={{ bgcolor: 'rgba(21,101,192,0.1)', borderColor: 'primary.light', border: '1px solid' }} />
                    ))}
                  </Box>
                </Box>
              )
            })()}

            {/* Evil teammates */}
            {(() => {
              const evilTm = [...player.teammatesEvil.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
              if (evilTm.length === 0) return null
              return (
                <Box sx={{ mb: 0.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 0.25 }}>
                    <FiberManualRecordIcon sx={{ fontSize: '0.6rem', color: 'error.main' }} />
                    <Typography variant="caption" color="error.dark" sx={{ fontSize: '0.62rem', fontWeight: 700 }}>
                      {t('evil')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {evilTm.map(([name, count]) => (
                      <MicroChip key={name} label={`${name} ×${count}`} h={18}
                        sx={{ bgcolor: 'rgba(183,28,28,0.1)', borderColor: 'error.light', border: '1px solid' }} />
                    ))}
                  </Box>
                </Box>
              )
            })()}

            {/* Fallback: total if no alignment data */}
            {player.teammatesGood.size === 0 && player.teammatesEvil.size === 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {teammates.map(([name, count]) => (
                  <MicroChip key={name} label={`${name} ×${count}`} />
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

// ── Compare panel ─────────────────────────────────────────────────

function ComparePanel({ a, b }: { a: PlayerStat; b: PlayerStat; language: Language }) {
  const { t } = useT()
  const fmt = (n: number | null, suffix = '%') => n != null ? `${n}${suffix}` : '—'
  const rows = [
    { label: t('games'),        aVal: a.total,                            bVal: b.total },
    { label: t('win_rate'),       aVal: `${a.winRate}%`,                    bVal: `${b.winRate}%` },
    { label: t('good_games'),   aVal: a.goodGames || '—',                 bVal: b.goodGames || '—' },
    { label: t('good_w'),    aVal: fmt(a.goodWinRate),                 bVal: fmt(b.goodWinRate) },
    { label: t('evil_games'),   aVal: a.evilGames || '—',                 bVal: b.evilGames || '—' },
    { label: t('evil_w'),    aVal: fmt(a.evilWinRate),                 bVal: fmt(b.evilWinRate) },
    { label: t('evil_rate'),    aVal: fmt(a.evilRate),                    bVal: fmt(b.evilRate) },
    { label: t('unique_chars'), aVal: a.charSet.size,                     bVal: b.charSet.size },
    { label: t('mvp'),             aVal: a.mvpCount || '—',                  bVal: b.mvpCount || '—' },
    { label: t('st_games'),     aVal: a.stGameCount || '—',               bVal: b.stGameCount || '—' },
  ]

  return (
    <Paper sx={{ p: 2, mb: 2 }} elevation={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <CompareArrowsIcon sx={{ fontSize: '1rem' }} />
        {t('player_comparison')}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{a.name}</Typography>
        <Typography variant="caption" color="text.secondary" />
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{b.name}</Typography>
        {rows.map(({ label, aVal, bVal }) => [
          <Typography key={`a-${label}`} variant="body2" sx={{ fontWeight: 700 }}>{aVal}</Typography>,
          <Typography key={`l-${label}`} variant="caption" color="text.secondary">{label}</Typography>,
          <Typography key={`b-${label}`} variant="body2" sx={{ fontWeight: 700 }}>{bVal}</Typography>,
        ])}
      </Box>
    </Paper>
  )
}

// ── Main ──────────────────────────────────────────────────────────

interface Props {
  playerStats: PlayerStat[]
  language: Language
  records: GameRecord[]
}

export function PlayersSection({ playerStats, language, records }: Props) {
  const { t, tpl } = useT()
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedName, setExpandedName] = useState<string | null>(null)
  const [compareNames, setCompareNames] = useState<[string, string] | null>(null)

  const getVal = (p: PlayerStat) => {
    if (sortKey === 'name') return p.name
    if (sortKey === 'total') return p.total
    if (sortKey === 'winRate') return p.winRate
    if (sortKey === 'goodWinRate') return p.goodWinRate ?? -1
    if (sortKey === 'evilWinRate') return p.evilWinRate ?? -1
    if (sortKey === 'evilRate') return p.evilRate ?? -1
    if (sortKey === 'mvpCount') return p.mvpCount
    if (sortKey === 'stGameCount') return p.stGameCount
    return p.total
  }
  const sorted = [...playerStats].sort((a, b) => {
    const av = getVal(a), bv = getVal(b)
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const toggleCompare = (name: string) => {
    if (compareNames) {
      if (compareNames.includes(name)) setCompareNames(null)
      else setCompareNames([compareNames[0], name])
    } else {
      setCompareNames([name, ''])
    }
  }

  if (playerStats.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('no_player_data_add_player_names_to_game_records')}</Typography>
      </Box>
    )
  }

  const [compA, compB] = compareNames ?? ['', '']
  const pA = playerStats.find((p) => p.name === compA)
  const pB = playerStats.find((p) => p.name === compB)

  const thSx = { py: 0.75, px: 1, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.bold, whiteSpace: 'nowrap' }
  const tdSx = { py: 0.75, px: 1, fontSize: TYPE_SCALE.md }

  return (
    <Box>
      {pA && pB && <ComparePanel a={pA} b={pB} language={language} />}

      {compareNames && !pB && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'action.selected' }} elevation={0}>
          <Typography variant="caption" color="primary">
            {tpl('player_selected_compare', compA)}
          </Typography>
        </Paper>
      )}

      <Paper elevation={2} sx={{ overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}>
              <TableCell sx={{ ...thSx, width: 24 }}>#</TableCell>
              <TableCell sx={thSx}>
                <TableSortLabel active={sortKey === 'name'} direction={sortKey === 'name' ? sortDir : 'desc'} onClick={() => handleSort('name')}>
                  {t('player_section')}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...thSx, width: 60, display: { xs: 'none', sm: 'table-cell' } }} align="center">
                <TableSortLabel active={sortKey === 'total'} direction={sortKey === 'total' ? sortDir : 'desc'} onClick={() => handleSort('total')}>
                  {t('g')}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...thSx, width: 70 }} align="center">
                <TableSortLabel active={sortKey === 'winRate'} direction={sortKey === 'winRate' ? sortDir : 'desc'} onClick={() => handleSort('winRate')}>
                  {t('w')}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...thSx, width: 70, display: { xs: 'none', sm: 'table-cell' } }} align="center">
                <TableSortLabel active={sortKey === 'goodWinRate'} direction={sortKey === 'goodWinRate' ? sortDir : 'desc'} onClick={() => handleSort('goodWinRate')}>
                  {t('g')}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...thSx, width: 70, display: { xs: 'none', sm: 'table-cell' } }} align="center">
                <TableSortLabel active={sortKey === 'evilWinRate'} direction={sortKey === 'evilWinRate' ? sortDir : 'desc'} onClick={() => handleSort('evilWinRate')}>
                  {t('e')}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...thSx, width: 70, display: { xs: 'none', sm: 'table-cell' } }} align="center">
                <Tooltip title={t('evil_rate_of_games_played_as_evil')}>
                  <TableSortLabel active={sortKey === 'evilRate'} direction={sortKey === 'evilRate' ? sortDir : 'desc'} onClick={() => handleSort('evilRate')}>
                    {t('evil_2')}
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ ...thSx, width: 44, display: { xs: 'none', md: 'table-cell' } }} align="center">
                <Tooltip title={t('mvp_count')}>
                  <TableSortLabel active={sortKey === 'mvpCount'} direction={sortKey === 'mvpCount' ? sortDir : 'desc'} onClick={() => handleSort('mvpCount')}>
                    MVP
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ ...thSx, width: 40, display: { xs: 'none', md: 'table-cell' } }} align="center">
                <Tooltip title={t('st_games_run')}>
                  <TableSortLabel active={sortKey === 'stGameCount'} direction={sortKey === 'stGameCount' ? sortDir : 'desc'} onClick={() => handleSort('stGameCount')}>
                    ST
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ ...thSx, width: 36 }} align="center" />
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((p, idx) => {
              const isExpanded = expandedName === p.name
              const isCompareSelected = compareNames?.includes(p.name)
              return [
                <TableRow
                  key={p.name}
                  onClick={() => setExpandedName(isExpanded ? null : p.name)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: isCompareSelected ? 'rgba(133,63,34,0.08)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                  }}
                >
                  <TableCell sx={{ ...tdSx, color: 'text.secondary' }}>{idx + 1}</TableCell>
                  <TableCell sx={{ ...tdSx, fontWeight: 600, overflow: 'hidden', maxWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                      {p.mostPlayedChar && (() => {
                        const icon = getIconForCharacter(p.mostPlayedChar)
                        return icon ? (
                          <Box component="img" src={icon as string}
                            sx={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'block' }} />
                        ) : null
                      })()}
                      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                            {p.name}
                          </Typography>
                          {/* game count embedded on xs when 局 column is hidden */}
                          <Typography component="span" sx={{ display: { xs: 'inline', sm: 'none' }, fontSize: '0.7rem', color: 'text.secondary', flexShrink: 0 }}>
                            {p.total}{t('g')}
                          </Typography>
                          {p.mvpCount > 0 && (
                            <Tooltip title={`MVP ×${p.mvpCount}`}>
                              <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                <EmojiEventsIcon sx={{ fontSize: '0.85rem', color: 'warning.main' }} />
                                {p.mvpCount > 1 && <Typography component="span" sx={{ fontSize: '0.68rem', color: 'warning.main', lineHeight: 1 }}>×{p.mvpCount}</Typography>}
                              </Box>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ ...tdSx, display: { xs: 'none', sm: 'table-cell' } }} align="center">{p.total}</TableCell>
                  <TableCell sx={{ ...tdSx, fontWeight: 700, color: p.winRate >= 60 ? 'success.dark' : p.winRate <= 35 ? 'error.dark' : 'text.primary' }} align="center">
                    {p.winRate}%
                  </TableCell>
                  <TableCell sx={{ ...tdSx, display: { xs: 'none', sm: 'table-cell' }, color: 'success.dark' }} align="center">
                    {p.goodWinRate !== null ? `${p.goodWinRate}%` : '—'}
                  </TableCell>
                  <TableCell sx={{ ...tdSx, display: { xs: 'none', sm: 'table-cell' }, color: 'error.dark' }} align="center">
                    {p.evilWinRate !== null ? `${p.evilWinRate}%` : '—'}
                  </TableCell>
                  <TableCell sx={{ ...tdSx, display: { xs: 'none', sm: 'table-cell' }, color: p.evilRate != null && p.evilRate > 50 ? 'error.main' : 'text.secondary' }} align="center">
                    {p.evilRate !== null ? `${p.evilRate}%` : '—'}
                  </TableCell>
                  <TableCell sx={{ ...tdSx, display: { xs: 'none', md: 'table-cell' }, color: 'warning.dark', fontWeight: p.mvpCount > 0 ? 700 : 400 }} align="center">
                    {p.mvpCount > 0 ? p.mvpCount : '—'}
                  </TableCell>
                  <TableCell sx={{ ...tdSx, display: { xs: 'none', md: 'table-cell' }, color: 'purple', fontWeight: p.stGameCount > 0 ? 700 : 400 }} align="center">
                    {p.stGameCount > 0 ? p.stGameCount : '—'}
                  </TableCell>
                  <TableCell sx={tdSx} align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <Tooltip title={t('compare')}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleCompare(p.name) }}
                          sx={{ p: 0.25, color: isCompareSelected ? 'primary.main' : 'text.disabled' }}>
                          <CompareArrowsIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                      </Tooltip>
                      <IconButton size="small" sx={{ p: 0.25 }}>
                        {isExpanded ? <ExpandLessIcon sx={{ fontSize: '0.9rem' }} /> : <ExpandMoreIcon sx={{ fontSize: '0.9rem' }} />}
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>,
                <TableRow key={`${p.name}-detail`} sx={{ '& td': { p: 0 } }}>
                  <TableCell colSpan={9} sx={{ p: 0, border: isExpanded ? undefined : 'none' }}>
                    <Collapse in={isExpanded}>
                      <PlayerDetail player={p} language={language} records={records} />
                    </Collapse>
                  </TableCell>
                </TableRow>,
              ]
            })}
          </TableBody>
        </Table>
        </Box>
      </Paper>
    </Box>
  )
}
