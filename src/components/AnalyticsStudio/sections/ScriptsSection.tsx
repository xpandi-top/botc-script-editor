import { useState, useMemo } from 'react'
import { Box, Chip, Divider, MenuItem, Paper, Select, Typography } from '@mui/material'
import BalanceIcon from '@mui/icons-material/Balance'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt'
import ReplayIcon from '@mui/icons-material/Replay'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import type { ScriptStat } from '../useStats'
import type { GameRecord } from '../../StorytellerSub/types'
import type { Language } from '../../../types'
import { useT } from '../../../context/I18nContext'

// ── Day histogram bar ─────────────────────────────────────────────

function DayHistogram({ histogram }: { histogram: number[] }) {
  const { t } = useT()
  if (!histogram.length) return null
  const max = Math.max(...histogram, 1)
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {t('games_ended_on_day')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', height: 40 }}>
        {histogram.map((count, i) => (
          <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
            <Box sx={{
              width: 22, bgcolor: 'primary.light',
              height: `${Math.round((count / max) * 36)}px`,
              minHeight: count > 0 ? 4 : 0,
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.3s ease',
            }} />
            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>{i + 1}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// ── Per-day stat table ────────────────────────────────────────────

function PerDayStats({ records, scriptKey }: { records: GameRecord[]; scriptKey: string }) {
  const { t } = useT()
  const scriptRecs = useMemo(
    () => records.filter((r) => (r.scriptSlug || r.scriptTitle || 'unknown') === scriptKey),
    [records, scriptKey],
  )

  const dayData = useMemo(() => {
    const map = new Map<number, { votes: number; nominations: number; skills: number; votePassed: number; count: number }>()
    for (const r of scriptRecs) {
      for (const d of (r.days ?? [])) {
        const prev = map.get(d.day) ?? { votes: 0, nominations: 0, skills: 0, votePassed: 0, count: 0 }
        prev.votes += d.votes ?? 0
        prev.nominations += d.nominations ?? 0
        prev.skills += d.skills ?? 0
        prev.votePassed += d.votePassed ?? 0
        prev.count++
        map.set(d.day, prev)
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, v]) => ({
        day,
        avgVotes: v.count ? +(v.votes / v.count).toFixed(1) : 0,
        avgNominations: v.count ? +(v.nominations / v.count).toFixed(1) : 0,
        avgSkills: v.count ? +(v.skills / v.count).toFixed(1) : 0,
        execRate: v.nominations ? Math.round((v.votePassed / v.nominations) * 100) : null,
      }))
  }, [scriptRecs])

  if (!dayData.length) return null
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {t('perday_averages')}
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr', gap: '2px 8px', alignItems: 'center', minWidth: 220 }}>
          {[t('day'), t('votes'), t('noms'), t('abilities'), t('exec')].map((h, i) => (
            <Typography key={i} variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.68rem' }}>{h}</Typography>
          ))}
          {dayData.map((d) => [
            <Typography key={`d${d.day}`} variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.72rem' }}>{d.day}</Typography>,
            <Typography key={`v${d.day}`} variant="caption" sx={{ fontSize: '0.72rem' }}>{d.avgVotes}</Typography>,
            <Typography key={`n${d.day}`} variant="caption" sx={{ fontSize: '0.72rem' }}>{d.avgNominations}</Typography>,
            <Typography key={`s${d.day}`} variant="caption" sx={{ fontSize: '0.72rem' }}>{d.avgSkills}</Typography>,
            <Typography key={`e${d.day}`} variant="caption" sx={{ fontSize: '0.72rem' }}>{d.execRate !== null ? `${d.execRate}%` : '—'}</Typography>,
          ])}
        </Box>
      </Box>
    </Box>
  )
}

// ── Top characters for a script ───────────────────────────────────

function ScriptTopChars({ records, scriptKey, language }: { records: GameRecord[]; scriptKey: string; language: Language }) {
  const { t } = useT()
  const scriptRecs = useMemo(
    () => records.filter((r) => (r.scriptSlug || r.scriptTitle || 'unknown') === scriptKey),
    [records, scriptKey],
  )
  const charCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of scriptRecs) {
      if (!r.setup?.assignments) continue
      for (const charId of Object.values(r.setup.assignments)) {
        map.set(charId, (map.get(charId) ?? 0) + 1)
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [scriptRecs])

  if (!charCounts.length) return null
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        {t('common_characters')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {charCounts.map(([charId, count]) => {
          const icon = getIconForCharacter(charId)
          return (
            <Box key={charId} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, width: 48 }}>
              {icon ? <Box component="img" src={icon as string} sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#f2ebdf' }} />
                : <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: '0.6rem' }}>{charId.slice(0, 2)}</Typography>
                  </Box>}
              <Typography variant="caption" sx={{ fontSize: '0.6rem', textAlign: 'center', lineHeight: 1.2 }}>{getDisplayName(charId, language)}</Typography>
              <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.disabled' }}>{count}×</Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

// ── Top players for a script ──────────────────────────────────────

function ScriptTopPlayers({ records, scriptKey }: { records: GameRecord[]; scriptKey: string }) {
  const { t } = useT()
  const players = useMemo(() => {
    const map = new Map<string, { total: number; wins: number }>()
    const scriptRecs = records.filter((r) => (r.scriptSlug || r.scriptTitle || 'unknown') === scriptKey)
    for (const r of scriptRecs) {
      if (!r.playerSummaries) continue
      const seen = new Set<string>()
      for (const ps of r.playerSummaries) {
        if (!ps.name || seen.has(ps.name)) continue
        seen.add(ps.name)
        const e = map.get(ps.name) ?? { total: 0, wins: 0 }
        e.total++
        if ((ps.team === 'evil' && r.winner === 'evil') || (ps.team === 'good' && r.winner === 'good')) e.wins++
        map.set(ps.name, e)
      }
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v, wr: v.total ? Math.round((v.wins / v.total) * 100) : 0 }))
      .filter((p) => p.total >= 2)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [records, scriptKey])

  if (!players.length) return null
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {t('active_players')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {players.map((p) => (
          <Chip key={p.name} size="small"
            label={`${p.name} ${p.wr}%`}
            sx={{ fontSize: '0.7rem', height: 22 }} />
        ))}
      </Box>
    </Box>
  )
}

// ── Script detail card ────────────────────────────────────────────

function ScriptCard({ stat, records, language }: { stat: ScriptStat; records: GameRecord[]; language: Language }) {
  const { t, tpl } = useT()
  const stWin = stat.total - stat.evil - stat.good
  return (
    <Paper sx={{ p: 2, mb: 2 }} elevation={2}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{stat.title}</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip size="small" label={`${stat.total}${t('g')}`} />
          <Chip size="small" label={`E:${stat.evil}`} sx={{ bgcolor: 'rgba(185,28,28,0.12)', color: 'error.dark' }} />
          <Chip size="small" label={`G:${stat.good}`} sx={{ bgcolor: 'rgba(46,125,50,0.12)', color: 'success.dark' }} />
          {stWin > 0 && <Chip size="small" label={`ST:${stWin}`} sx={{ bgcolor: 'rgba(106,27,154,0.12)', color: 'purple' }} />}
        </Box>
      </Box>

      {/* Win bar */}
      <Box sx={{ display: 'flex', height: 10, borderRadius: 1.5, overflow: 'hidden', gap: '2px', mb: 1.5 }}>
        {stat.evil > 0 && <Box sx={{ flex: stat.evil, bgcolor: '#b91c1c' }} />}
        {stat.good > 0 && <Box sx={{ flex: stat.good, bgcolor: '#2e7d32' }} />}
        {stWin > 0 && <Box sx={{ flex: stWin, bgcolor: '#6a1b9a' }} />}
      </Box>

      {/* Stat pills */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">{tpl('avg_days_n', stat.avgDays)}</Typography>
        <Typography variant="caption" color="text.secondary">{tpl('avg_votes_n', stat.avgVotes)}</Typography>
        <Typography variant="caption" color="text.secondary">{tpl('avg_noms_n', stat.avgNominations)}</Typography>
        {stat.votePassRate !== null && <Typography variant="caption" color="text.secondary">{tpl('exec_rate_n', stat.votePassRate)}</Typography>}
        {stat.avgDurationMin !== null && <Typography variant="caption" color="text.secondary">{stat.avgDurationMin}min</Typography>}
      </Box>

      {/* Ratings row */}
      {stat.ratingCount > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5, alignItems: 'center' }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
            {tpl('ratings_n', stat.ratingCount)}
          </Typography>
          {stat.avgBalanced !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <BalanceIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>{stat.avgBalanced}</Typography>
            </Box>
          )}
          {stat.avgFunEvil !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <WhatshotIcon sx={{ fontSize: '0.9rem', color: 'error.light' }} />
              <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>{stat.avgFunEvil}</Typography>
            </Box>
          )}
          {stat.avgFunGood !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <SentimentSatisfiedAltIcon sx={{ fontSize: '0.9rem', color: 'success.main' }} />
              <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>{stat.avgFunGood}</Typography>
            </Box>
          )}
          {stat.avgReplay !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <ReplayIcon sx={{ fontSize: '0.9rem', color: 'primary.main' }} />
              <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>{stat.avgReplay}</Typography>
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 160px' }}>
          <DayHistogram histogram={stat.dayHistogram} />
        </Box>
        <Box sx={{ flex: '1 1 160px' }}>
          <PerDayStats records={records} scriptKey={stat.key} />
        </Box>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 160px' }}>
          <ScriptTopChars records={records} scriptKey={stat.key} language={language} />
        </Box>
        <Box sx={{ flex: '1 1 120px' }}>
          <ScriptTopPlayers records={records} scriptKey={stat.key} />
        </Box>
      </Box>
    </Paper>
  )
}

// ── Main ──────────────────────────────────────────────────────────

interface Props {
  scriptStats: ScriptStat[]
  language: Language
  records: GameRecord[]
}

export function ScriptsSection({ scriptStats, language, records }: Props) {
  const { t } = useT()
  const [selectedKey, setSelectedKey] = useState<string>('__all__')

  const shown = selectedKey === '__all__' ? scriptStats : scriptStats.filter((s) => s.key === selectedKey)

  if (scriptStats.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('no_script_data')}</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {/* Script picker */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Select
          size="small"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value as string)}
          sx={{ minWidth: { xs: 140, sm: 180 }, fontSize: '0.85rem' }}
        >
          <MenuItem value="__all__">{t('all_scripts')}</MenuItem>
          {scriptStats.map((s) => (
            <MenuItem key={s.key} value={s.key}>{s.title} ({s.total})</MenuItem>
          ))}
        </Select>
      </Box>

      {shown.map((s) => (
        <ScriptCard key={s.key} stat={s} records={records} language={language} />
      ))}
    </Box>
  )
}
