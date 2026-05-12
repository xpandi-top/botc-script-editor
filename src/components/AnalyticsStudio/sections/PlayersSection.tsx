import { useState } from 'react'
import { Box, Chip, Collapse, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, Tooltip, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import type { PlayerStat } from '../useStats'
import type { GameRecord } from '../../StorytellerSub/types'
import type { Language } from '../../../types'

type SortKey = 'name' | 'total' | 'winRate' | 'goodWinRate' | 'evilWinRate'

// ── Inline player detail ──────────────────────────────────────────

function PlayerDetail({ player, language, zh }: { player: PlayerStat; language: Language; records: GameRecord[]; zh: boolean }) {
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
            {zh ? '阵营分析' : 'Team breakdown'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {player.goodGames > 0 && (
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(46,125,50,0.1)', minWidth: 70, textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 700, color: 'success.dark' }}>{player.goodWinRate ?? '—'}%</Typography>
                <Typography variant="caption" color="text.secondary">{zh ? `善良(${player.goodGames}局)` : `Good (${player.goodGames}g)`}</Typography>
              </Box>
            )}
            {player.evilGames > 0 && (
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(185,28,28,0.1)', minWidth: 70, textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 700, color: 'error.dark' }}>{player.evilWinRate ?? '—'}%</Typography>
                <Typography variant="caption" color="text.secondary">{zh ? `邪恶(${player.evilGames}局)` : `Evil (${player.evilGames}g)`}</Typography>
              </Box>
            )}
            {player.mvpCount > 0 && (
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(237,180,13,0.12)', minWidth: 60, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <EmojiEventsIcon sx={{ fontSize: '1rem', color: 'warning.dark' }} />
                  <Typography sx={{ fontWeight: 700, color: 'warning.dark' }}>{player.mvpCount}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">{zh ? 'MVP次数' : 'MVP'}</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Characters played */}
        {charEntries.length > 0 && (
          <Box sx={{ flex: '2 1 220px' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
              {zh ? '扮演角色' : 'Characters played'}
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
              {zh ? '常见队友' : 'Frequent teammates'}
            </Typography>

            {/* Good teammates */}
            {(() => {
              const goodTm = [...player.teammatesGood.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
              if (goodTm.length === 0) return null
              return (
                <Box sx={{ mb: 0.75 }}>
                  <Typography variant="caption" color="success.dark" sx={{ fontSize: '0.62rem', fontWeight: 700, display: 'block', mb: 0.25 }}>
                    🟦 {zh ? '善良' : 'Good'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {goodTm.map(([name, count]) => (
                      <Chip key={name} size="small" label={`${name} ×${count}`}
                        sx={{ fontSize: '0.65rem', height: 18, bgcolor: 'rgba(21,101,192,0.1)', borderColor: 'primary.light', border: '1px solid' }} />
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
                  <Typography variant="caption" color="error.dark" sx={{ fontSize: '0.62rem', fontWeight: 700, display: 'block', mb: 0.25 }}>
                    🔴 {zh ? '邪恶' : 'Evil'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {evilTm.map(([name, count]) => (
                      <Chip key={name} size="small" label={`${name} ×${count}`}
                        sx={{ fontSize: '0.65rem', height: 18, bgcolor: 'rgba(183,28,28,0.1)', borderColor: 'error.light', border: '1px solid' }} />
                    ))}
                  </Box>
                </Box>
              )
            })()}

            {/* Fallback: total if no alignment data */}
            {player.teammatesGood.size === 0 && player.teammatesEvil.size === 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {teammates.map(([name, count]) => (
                  <Chip key={name} size="small" label={`${name} ×${count}`} sx={{ fontSize: '0.68rem', height: 20 }} />
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

function ComparePanel({ a, b, zh }: { a: PlayerStat; b: PlayerStat; language: Language; zh: boolean }) {
  const rows = [
    { label: zh ? '总局数' : 'Games', aVal: a.total, bVal: b.total },
    { label: zh ? '胜率' : 'Win Rate', aVal: `${a.winRate}%`, bVal: `${b.winRate}%` },
    { label: zh ? '善良胜率' : 'Good W%', aVal: a.goodWinRate !== null ? `${a.goodWinRate}%` : '—', bVal: b.goodWinRate !== null ? `${b.goodWinRate}%` : '—' },
    { label: zh ? '邪恶胜率' : 'Evil W%', aVal: a.evilWinRate !== null ? `${a.evilWinRate}%` : '—', bVal: b.evilWinRate !== null ? `${b.evilWinRate}%` : '—' },
    { label: zh ? '角色数' : 'Unique Chars', aVal: a.charSet.size, bVal: b.charSet.size },
    { label: zh ? 'MVP' : 'MVP', aVal: a.mvpCount || '—', bVal: b.mvpCount || '—' },
  ]

  return (
    <Paper sx={{ p: 2, mb: 2 }} elevation={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <CompareArrowsIcon sx={{ fontSize: '1rem' }} />
        {zh ? '玩家对比' : 'Player Comparison'}
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
  const zh = language === 'zh'
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedName, setExpandedName] = useState<string | null>(null)
  const [compareNames, setCompareNames] = useState<[string, string] | null>(null)

  const sorted = [...playerStats].sort((a, b) => {
    const av = sortKey === 'name' ? a.name : sortKey === 'total' ? a.total : sortKey === 'winRate' ? a.winRate : sortKey === 'goodWinRate' ? (a.goodWinRate ?? -1) : (a.evilWinRate ?? -1)
    const bv = sortKey === 'name' ? b.name : sortKey === 'total' ? b.total : sortKey === 'winRate' ? b.winRate : sortKey === 'goodWinRate' ? (b.goodWinRate ?? -1) : (b.evilWinRate ?? -1)
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
        <Typography color="text.secondary">{zh ? '无玩家数据' : 'No player data — add player names to game records'}</Typography>
      </Box>
    )
  }

  const [compA, compB] = compareNames ?? ['', '']
  const pA = playerStats.find((p) => p.name === compA)
  const pB = playerStats.find((p) => p.name === compB)

  const thSx = { py: 0.75, px: 1, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }
  const tdSx = { py: 0.5, px: 1, fontSize: '0.8rem' }

  return (
    <Box>
      {pA && pB && <ComparePanel a={pA} b={pB} language={language} zh={zh} />}

      {compareNames && !pB && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'action.selected' }} elevation={0}>
          <Typography variant="caption" color="primary">
            {zh ? `已选择 "${compA}"，点击另一玩家行末的对比按钮进行对比` : `"${compA}" selected — click ⇄ on another player to compare`}
          </Typography>
        </Paper>
      )}

      <Paper elevation={2} sx={{ overflow: 'hidden' }}>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}>
              <TableCell sx={{ ...thSx, width: 24 }}>#</TableCell>
              <TableCell sx={thSx}>
                <TableSortLabel active={sortKey === 'name'} direction={sortKey === 'name' ? sortDir : 'desc'} onClick={() => handleSort('name')}>
                  {zh ? '玩家' : 'Player'}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...thSx, width: 60 }} align="center">
                <TableSortLabel active={sortKey === 'total'} direction={sortKey === 'total' ? sortDir : 'desc'} onClick={() => handleSort('total')}>
                  {zh ? '局' : 'G'}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...thSx, width: 70 }} align="center">
                <TableSortLabel active={sortKey === 'winRate'} direction={sortKey === 'winRate' ? sortDir : 'desc'} onClick={() => handleSort('winRate')}>
                  {zh ? '胜%' : 'W%'}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...thSx, width: 70, display: { xs: 'none', sm: 'table-cell' } }} align="center">
                <TableSortLabel active={sortKey === 'goodWinRate'} direction={sortKey === 'goodWinRate' ? sortDir : 'desc'} onClick={() => handleSort('goodWinRate')}>
                  {zh ? '善%' : 'G%'}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...thSx, width: 70, display: { xs: 'none', sm: 'table-cell' } }} align="center">
                <TableSortLabel active={sortKey === 'evilWinRate'} direction={sortKey === 'evilWinRate' ? sortDir : 'desc'} onClick={() => handleSort('evilWinRate')}>
                  {zh ? '邪%' : 'E%'}
                </TableSortLabel>
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
                  <TableCell sx={{ ...tdSx, fontWeight: 600 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {p.mostPlayedChar && (() => {
                        const icon = getIconForCharacter(p.mostPlayedChar)
                        return icon ? <Box component="img" src={icon as string} sx={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0 }} /> : null
                      })()}
                      {p.name}
                      {p.mvpCount > 0 && (
                        <Tooltip title={`MVP ×${p.mvpCount}`}>
                          <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.25 }}>
                            <EmojiEventsIcon sx={{ fontSize: '0.85rem', color: 'warning.main' }} />
                            {p.mvpCount > 1 && <Typography component="span" sx={{ fontSize: '0.68rem', color: 'warning.main', lineHeight: 1 }}>×{p.mvpCount}</Typography>}
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={tdSx} align="center">{p.total}</TableCell>
                  <TableCell sx={{ ...tdSx, fontWeight: 700, color: p.winRate >= 60 ? 'success.dark' : p.winRate <= 35 ? 'error.dark' : 'text.primary' }} align="center">
                    {p.winRate}%
                  </TableCell>
                  <TableCell sx={{ ...tdSx, display: { xs: 'none', sm: 'table-cell' }, color: 'success.dark' }} align="center">
                    {p.goodWinRate !== null ? `${p.goodWinRate}%` : '—'}
                  </TableCell>
                  <TableCell sx={{ ...tdSx, display: { xs: 'none', sm: 'table-cell' }, color: 'error.dark' }} align="center">
                    {p.evilWinRate !== null ? `${p.evilWinRate}%` : '—'}
                  </TableCell>
                  <TableCell sx={tdSx} align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <Tooltip title={zh ? '对比' : 'Compare'}>
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
                  <TableCell colSpan={7} sx={{ p: 0, border: isExpanded ? undefined : 'none' }}>
                    <Collapse in={isExpanded}>
                      <PlayerDetail player={p} language={language} records={records} zh={zh} />
                    </Collapse>
                  </TableCell>
                </TableRow>,
              ]
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
