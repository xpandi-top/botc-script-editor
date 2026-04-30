import { useMemo } from 'react'
import { Box, Chip, Divider, Paper, Typography } from '@mui/material'
import { getDisplayName, getIconForCharacter } from '../../catalog'
import type { GameRecord } from '../StorytellerSub/types'
import type { Language } from '../../types'

function loadRecords(): GameRecord[] {
  try {
    const stored = localStorage.getItem('BOTC_ST_STORAGE')
    if (!stored) return []
    return JSON.parse(stored).gameRecords ?? []
  } catch {
    return []
  }
}

export function AnalyticsTab({ language }: { language: Language }) {
  const zh = language === 'zh'
  const records = useMemo(loadRecords, [])

  const total = records.length
  const evilWins = records.filter((r) => r.winner === 'evil').length
  const goodWins = records.filter((r) => r.winner === 'good').length
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

  const scriptStats = useMemo(() => {
    const map = new Map<string, { title: string; total: number; evil: number; good: number }>()
    for (const r of records) {
      const key = r.scriptSlug || r.scriptTitle || 'unknown'
      const entry = map.get(key) ?? { title: r.scriptTitle || r.scriptSlug || '?', total: 0, evil: 0, good: 0 }
      entry.total++
      if (r.winner === 'evil') entry.evil++
      if (r.winner === 'good') entry.good++
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [records])

  const playerStats = useMemo(() => {
    const map = new Map<string, { name: string; total: number; evilGames: number; goodGames: number; wins: number; chars: Set<string> }>()
    for (const r of records) {
      if (!r.playerSummaries) continue
      for (const ps of r.playerSummaries) {
        if (!ps.name) continue
        const entry = map.get(ps.name) ?? { name: ps.name, total: 0, evilGames: 0, goodGames: 0, wins: 0, chars: new Set() }
        entry.total++
        if (ps.team === 'evil') entry.evilGames++
        if (ps.team === 'good') entry.goodGames++
        if ((ps.team === 'evil' && r.winner === 'evil') || (ps.team === 'good' && r.winner === 'good')) entry.wins++
        const charId = (r.setup as any)?.assignments?.[ps.seat]
        if (charId) entry.chars.add(charId)
        map.set(ps.name, entry)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [records])

  const charStats = useMemo(() => {
    const map = new Map<string, { charId: string; total: number; wins: number; evilGames: number }>()
    for (const r of records) {
      if (!(r.setup as any)?.assignments || !r.playerSummaries) continue
      for (const ps of r.playerSummaries) {
        const charId = (r.setup as any).assignments[ps.seat]
        if (!charId) continue
        const entry = map.get(charId) ?? { charId, total: 0, wins: 0, evilGames: 0 }
        entry.total++
        if (ps.team === 'evil') entry.evilGames++
        if ((ps.team === 'evil' && r.winner === 'evil') || (ps.team === 'good' && r.winner === 'good')) entry.wins++
        map.set(charId, entry)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [records])

  if (total === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <Typography color="text.secondary">{zh ? '暂无游戏记录' : 'No game records yet'}</Typography>
      </Box>
    )
  }

  const SectionTitle = ({ label }: { label: string }) => (
    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>{label}</Typography>
  )

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 900, mx: 'auto' }}>
      {/* ── Summary cards ── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, flex: '1 1 120px', textAlign: 'center' }} elevation={2}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{total}</Typography>
          <Typography variant="caption" color="text.secondary">{zh ? '总局数' : 'Total Games'}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: '1 1 120px', textAlign: 'center', bgcolor: 'error.light' }} elevation={2}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{pct(evilWins)}%</Typography>
          <Typography variant="caption">{zh ? `邪恶胜 (${evilWins})` : `Evil Wins (${evilWins})`}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: '1 1 120px', textAlign: 'center', bgcolor: 'success.light' }} elevation={2}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{pct(goodWins)}%</Typography>
          <Typography variant="caption">{zh ? `善良胜 (${goodWins})` : `Good Wins (${goodWins})`}</Typography>
        </Paper>
        {total - evilWins - goodWins > 0 && (
          <Paper sx={{ p: 2, flex: '1 1 120px', textAlign: 'center' }} elevation={2}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{pct(total - evilWins - goodWins)}%</Typography>
            <Typography variant="caption" color="text.secondary">{zh ? `其他 (${total - evilWins - goodWins})` : `Other (${total - evilWins - goodWins})`}</Typography>
          </Paper>
        )}
      </Box>

      {/* ── By Script ── */}
      {scriptStats.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <SectionTitle label={zh ? '剧本统计' : 'By Script'} />
          {scriptStats.map((s) => {
            const other = s.total - s.evil - s.good
            return (
              <Box key={s.title} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.total}{zh ? '局' : 'g'} · {zh ? `邪${s.evil} 善${s.good}` : `E:${s.evil} G:${s.good}`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', height: 8, borderRadius: 1, overflow: 'hidden', gap: 0.25 }}>
                  {s.evil > 0 && <Box sx={{ flex: s.evil, bgcolor: 'error.main' }} />}
                  {s.good > 0 && <Box sx={{ flex: s.good, bgcolor: 'success.main' }} />}
                  {other > 0 && <Box sx={{ flex: other, bgcolor: 'grey.400' }} />}
                </Box>
              </Box>
            )
          })}
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* ── By Player ── */}
      {playerStats.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <SectionTitle label={zh ? '玩家统计' : 'By Player'} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {playerStats.map((p) => {
              const winPct = p.total ? Math.round((p.wins / p.total) * 100) : 0
              return (
                <Paper key={p.name} sx={{ p: 1.5, flex: '1 1 150px', minWidth: 150 }} elevation={1}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{p.name}</Typography>
                  <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">
                    {p.total}{zh ? '局' : 'g'} · {p.wins}{zh ? '胜' : 'W'} ({winPct}%)
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">
                    {zh ? `邪恶${p.evilGames} 善良${p.goodGames}` : `E:${p.evilGames} G:${p.goodGames}`}
                  </Typography>
                  {p.chars.size > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.5 }}>
                      {Array.from(p.chars).map((c) => {
                        const icon = getIconForCharacter(c)
                        return icon ? (
                          <Box key={c} component="img" src={icon as string} sx={{ width: 20, height: 20, borderRadius: '50%' }}
                            title={getDisplayName(c, language)} />
                        ) : null
                      })}
                    </Box>
                  )}
                </Paper>
              )
            })}
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* ── By Character ── */}
      {charStats.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <SectionTitle label={zh ? '角色统计' : 'By Character'} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {charStats.map((c) => {
              const icon = getIconForCharacter(c.charId)
              const winPct = c.total ? Math.round((c.wins / c.total) * 100) : 0
              return (
                <Paper key={c.charId} sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, flex: '1 1 130px', minWidth: 130 }} elevation={1}>
                  {icon && <Box component="img" src={icon as string} sx={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayName(c.charId, language)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.total}{zh ? '局' : 'g'} · {winPct}%{zh ? '胜' : 'W'}
                    </Typography>
                  </Box>
                </Paper>
              )
            })}
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* ── Recent Records ── */}
      <Box>
        <SectionTitle label={zh ? '近期记录' : 'Recent Records'} />
        {[...records]
          .sort((a, b) => b.endedAt - a.endedAt)
          .slice(0, 20)
          .map((r) => (
            <Paper key={r.id} sx={{ p: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }} elevation={1}>
              <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 100 }}>
                {r.recordName || r.scriptTitle || '?'}
              </Typography>
              {r.winner && (
                <Chip size="small"
                  label={r.winner === 'evil' ? (zh ? '邪恶胜' : 'Evil Win') : r.winner === 'good' ? (zh ? '善良胜' : 'Good Win') : r.winner}
                  color={r.winner === 'evil' ? 'error' : r.winner === 'good' ? 'success' : 'default'} />
              )}
              <Typography variant="caption" color="text.secondary">
                {r.days.length}{zh ? '天' : 'd'}
              </Typography>
              {r.playerSummaries && (
                <Typography variant="caption" color="text.secondary">
                  {r.playerSummaries.length}{zh ? '人' : 'p'}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {new Date(r.endedAt).toLocaleDateString()}
              </Typography>
            </Paper>
          ))}
      </Box>
    </Box>
  )
}
