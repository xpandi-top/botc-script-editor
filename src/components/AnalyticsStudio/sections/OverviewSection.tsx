import { Box, Paper, Tooltip, Typography } from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import BalanceIcon from '@mui/icons-material/Balance'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import StarIcon from '@mui/icons-material/Star'
import ReplayIcon from '@mui/icons-material/Replay'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import type { KpiSummary, ScriptStat, PlayerStat, CharStat, StorytellerStat } from '../useStats'
import type { GameRecord } from '../../StorytellerSub/types'
import type { Language } from '../../../types'
import { useT } from '../../../context/I18nContext'
import { makeT, makeTpl } from '../../../lib/t'
import { MicroChip } from '../../ui'

// ── Win Balance Meter ─────────────────────────────────────────────

function WinBalanceMeter({ kpi }: { kpi: KpiSummary }) {
  const { t, tpl } = useT()
  if (kpi.total === 0) return null
  return (
    <Box sx={{ mb: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
          {tpl('evil_pct_label', kpi.evilPct)}
        </Typography>
        {kpi.stWins > 0 && (
          <Typography variant="caption" color="info.main" sx={{ fontWeight: 700 }}>
            ST {kpi.stPct}%
          </Typography>
        )}
        <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
          {tpl('good_pct_label', kpi.goodPct)}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', height: 14, borderRadius: 2, overflow: 'hidden', gap: '2px' }}>
        {kpi.evilWins > 0 && (
          <Box sx={{ flex: kpi.evilWins, bgcolor: '#b91c1c', transition: 'flex 0.4s ease', borderRadius: '4px 0 0 4px' }} />
        )}
        {kpi.stWins > 0 && (
          <Box sx={{ flex: kpi.stWins, bgcolor: '#6a1b9a' }} />
        )}
        {kpi.goodWins > 0 && (
          <Box sx={{ flex: kpi.goodWins, bgcolor: '#2e7d32', transition: 'flex 0.4s ease', borderRadius: '0 4px 4px 0' }} />
        )}
        {kpi.total - kpi.evilWins - kpi.goodWins - kpi.stWins > 0 && (
          <Box sx={{ flex: kpi.total - kpi.evilWins - kpi.goodWins - kpi.stWins, bgcolor: 'grey.300' }} />
        )}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" color="text.disabled">{kpi.evilWins}{t('g')}</Typography>
        <Typography variant="caption" color="text.disabled">{kpi.goodWins}{t('g')}</Typography>
      </Box>
    </Box>
  )
}

// ── Dynamic insights ──────────────────────────────────────────────

type InsightSeverity = 'info' | 'good' | 'warning' | 'highlight'

type Insight = {
  id: string
  severity: InsightSeverity
  label: string       // short heading
  detail: string      // one-line context
  value?: string      // prominent metric badge
  valueIcon?: 'star'  // optional icon prefix in badge
}

const SEV_COLOR: Record<InsightSeverity, string> = {
  info:      'rgba(2,120,211,0.08)',
  good:      'rgba(46,125,50,0.08)',
  warning:   'rgba(237,108,2,0.08)',
  highlight: 'rgba(156,39,176,0.08)',
}
const SEV_BORDER: Record<InsightSeverity, string> = {
  info:      '#0278d3',
  good:      '#2e7d32',
  warning:   '#ed6c02',
  highlight: '#9c27b0',
}

function InsightIcon({ sev }: { sev: InsightSeverity }) {
  const sx = { fontSize: '1rem' }
  if (sev === 'good') return <CheckCircleOutlinedIcon sx={{ ...sx, color: '#2e7d32' }} />
  if (sev === 'warning') return <WarningAmberIcon sx={{ ...sx, color: '#ed6c02' }} />
  if (sev === 'highlight') return <EmojiEventsIcon sx={{ ...sx, color: '#9c27b0' }} />
  return <InfoOutlinedIcon sx={{ ...sx, color: '#0278d3' }} />
}

function buildInsights(
  kpi: KpiSummary,
  scriptStats: ScriptStat[],
  playerStats: PlayerStat[],
  charStats: CharStat[],
  storytellerStats: StorytellerStat[],
  records: GameRecord[],
  zh: boolean,
): Insight[] {
  const t = makeT(zh ? 'zh' : 'en')
  const tpl = makeTpl(zh ? 'zh' : 'en')
  const out: Insight[] = []
  if (kpi.total === 0) return out

  // ── Win balance ──
  const diff = Math.abs(kpi.evilPct - kpi.goodPct)
  if (kpi.total >= 5) {
    if (diff <= 8) {
      out.push({ id: 'balance-ok', severity: 'good',
        label: t('balanced_win_rates'),
        detail: tpl('evil_vs_good_pct', kpi.evilPct, kpi.goodPct),
        value: `±${diff}%` })
    } else if (kpi.evilPct > kpi.goodPct + 15) {
      out.push({ id: 'balance-evil', severity: 'warning',
        label: t('evildominant'),
        detail: t('consider_more_goodfavoured_scripts'),
        value: `${kpi.evilPct}% E` })
    } else if (kpi.goodPct > kpi.evilPct + 15) {
      out.push({ id: 'balance-good', severity: 'warning',
        label: t('gooddominant'),
        detail: t('consider_harder_evil_roles'),
        value: `${kpi.goodPct}% G` })
    }
  }

  // ── Current evil/good win streak ──
  const byDate = [...records].sort((a, b) => b.endedAt - a.endedAt)
  let streak = 0; let streakSide = ''
  for (const r of byDate) {
    if (!r.winner || r.winner === 'storyteller') break
    if (streak === 0) { streakSide = r.winner; streak = 1 }
    else if (r.winner === streakSide) streak++
    else break
  }
  if (streak >= 3) {
    const side = streakSide === 'evil' ? (t('evil')) : (t('good'))
    out.push({ id: 'streak', severity: streakSide === 'evil' ? 'warning' : 'good',
      label: tpl('streak_n_side', streak, side),
      detail: t('most_recent_consecutive_results'),
      value: `×${streak}` })
  }

  // ── Script dominance ──
  const qualified = scriptStats.filter((s) => s.total >= 3)
  if (qualified.length > 0) {
    const mostEvil = qualified.reduce((a, b) => (b.evil / b.total > a.evil / a.total ? b : a))
    const ePct = Math.round((mostEvil.evil / mostEvil.total) * 100)
    if (ePct >= 65) {
      out.push({ id: 'script-evil', severity: 'warning',
        label: tpl('evil_heavy_label', mostEvil.title),
        detail: tpl('evil_wins_pct_of_n', ePct, mostEvil.total),
        value: `${ePct}%` })
    }
    const mostGood = qualified.reduce((a, b) => (b.good / b.total > a.good / a.total ? b : a))
    const gPct = Math.round((mostGood.good / mostGood.total) * 100)
    if (gPct >= 65 && mostGood.key !== mostEvil.key) {
      out.push({ id: 'script-good', severity: 'info',
        label: tpl('good_friendly_label', mostGood.title),
        detail: tpl('good_wins_pct_of_n', gPct, mostGood.total),
        value: `${gPct}%` })
    }
    // Highest-rated script
    const rated = qualified.filter((s) => s.avgBalanced != null || s.avgReplay != null)
    if (rated.length > 0) {
      const topRated = rated.reduce((a, b) => {
        const aScore = ((a.avgBalanced ?? 0) + (a.avgReplay ?? 0)) / 2
        const bScore = ((b.avgBalanced ?? 0) + (b.avgReplay ?? 0)) / 2
        return bScore > aScore ? b : a
      })
      const score = (((topRated.avgBalanced ?? 0) + (topRated.avgReplay ?? 0)) / 2).toFixed(1)
      out.push({ id: 'script-toprated', severity: 'highlight',
        label: tpl('top_rated_label', topRated.title),
        detail: tpl('avg_balance_replay', score),
        value: score, valueIcon: 'star' as const })
    }
  }

  // ── Top player ──
  const qualPlayers = playerStats.filter((p) => p.total >= 5)
  if (qualPlayers.length > 0) {
    const best = qualPlayers.reduce((a, b) => b.winRate > a.winRate ? b : a)
    out.push({ id: 'player-top', severity: 'highlight',
      label: tpl('player_leads_winrate', best.name),
      detail: tpl('player_stats_detail', best.total, best.goodWinRate ?? '—', best.evilWinRate ?? '—'),
      value: `${best.winRate}%` })
    // Lowest (struggling) player with enough games
    const worst = qualPlayers.reduce((a, b) => b.winRate < a.winRate ? b : a)
    if (worst.name !== best.name && worst.winRate < 40) {
      out.push({ id: 'player-low', severity: 'info',
        label: tpl('player_low_winrate', worst.name),
        detail: tpl('player_check_roles', worst.total),
        value: `${worst.winRate}%` })
    }
  }

  // ── Most-played char ──
  if (charStats.length > 0) {
    const top = charStats[0]
    const charName = getDisplayName(top.charId, zh ? 'zh' : 'en')
    out.push({ id: 'char-top', severity: 'info',
      label: tpl('char_most_played_label', charName),
      detail: tpl('char_played_winrate', top.total, top.winRate),
      value: `${top.total}×` })
  }

  // ── MVP pattern ──
  const mvpPlayers = playerStats.filter((p) => p.mvpCount >= 2)
  if (mvpPlayers.length > 0) {
    const topMvp = mvpPlayers.reduce((a, b) => b.mvpCount > a.mvpCount ? b : a)
    out.push({ id: 'mvp-top', severity: 'highlight',
      label: tpl('player_top_mvp_label', topMvp.name),
      detail: tpl('player_mvp_count', topMvp.mvpCount),
      value: `×${topMvp.mvpCount}` })
  }

  // ── ST performance ──
  if (storytellerStats.length > 0) {
    const mostActive = storytellerStats[0]
    out.push({ id: 'st-active', severity: 'info',
      label: tpl('player_most_active_st', mostActive.name),
      detail: tpl('st_detail_n_games_scripts', mostActive.total, mostActive.scripts.size),
      value: `${mostActive.total}g` })
  }

  // ── Duration insight ──
  if (kpi.avgDurationMin != null) {
    const sev: InsightSeverity = kpi.avgDurationMin > 180 ? 'warning' : 'info'
    out.push({ id: 'duration', severity: sev,
      label: tpl('avg_duration_min', kpi.avgDurationMin),
      detail: kpi.avgDurationMin > 180
        ? (t('games_running_long'))
        : (t('healthy_game_pace')),
      value: `${kpi.avgDurationMin}m` })
  }

  // Prioritise: highlight > warning > good > info, max 6
  const order: InsightSeverity[] = ['highlight', 'warning', 'good', 'info']
  return out.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity)).slice(0, 6)
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.25,
      p: 1.25, borderRadius: 1.5,
      bgcolor: SEV_COLOR[insight.severity],
      borderLeft: '3px solid',
      borderColor: SEV_BORDER[insight.severity],
    }}>
      <InsightIcon sev={insight.severity} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{insight.label}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>{insight.detail}</Typography>
      </Box>
      {insight.value && (
        <MicroChip
          label={insight.value}
          icon={insight.valueIcon === 'star' ? <StarIcon sx={{ fontSize: '0.7rem !important', color: '#fff !important' }} /> : undefined}
          sx={{ fontWeight: 700, bgcolor: SEV_BORDER[insight.severity], color: '#fff', flexShrink: 0,
            '& .MuiChip-icon': { ml: '4px' } }}
        />
      )}
    </Box>
  )
}

// ── Timeline mini-sparkline ───────────────────────────────────────

function RecentStreak({ records }: { records: GameRecord[] }) {
  const { t } = useT()
  const recent = [...records].sort((a, b) => b.endedAt - a.endedAt).slice(0, 10).reverse()
  if (recent.length < 3) return null
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        {t('last_10_games')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {recent.map((r, i) => {
          const color = r.winner === 'evil' ? '#b91c1c' : r.winner === 'good' ? '#2e7d32' : r.winner === 'storyteller' ? '#6a1b9a' : '#9e9e9e'
          const label = r.winner === 'evil' ? 'E' : r.winner === 'good' ? 'G' : r.winner === 'storyteller' ? 'S' : '?'
          return (
            <Box key={i} title={r.recordName || r.scriptTitle || r.winner || '?'}
              sx={{
                width: 22, height: 22, borderRadius: '50%',
                bgcolor: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'default',
              }}>
              <Typography sx={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700, lineHeight: 1 }}>{label}</Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

// ── Rating mini bar ───────────────────────────────────────────────

function RatingBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'action.hover', overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: 'warning.main', borderRadius: 3, transition: 'width 0.4s ease' }} />
      </Box>
      <Typography variant="caption" sx={{ fontSize: '0.68rem', minWidth: 24, color: 'text.secondary' }}>{value}</Typography>
    </Box>
  )
}

// ── Main ──────────────────────────────────────────────────────────

interface Props {
  kpi: KpiSummary
  scriptStats: ScriptStat[]
  playerStats: PlayerStat[]
  charStats: CharStat[]
  storytellerStats: StorytellerStat[]
  language: Language
  records: GameRecord[]
}

export function OverviewSection({ kpi, scriptStats, playerStats, charStats, storytellerStats, language, records }: Props) {
  const { t } = useT()
  const zh = language === 'zh'
  const tpl = makeTpl(language)
  const insights = buildInsights(kpi, scriptStats, playerStats, charStats, storytellerStats, records, zh)

  if (kpi.total === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">
          {t('no_records_yet_complete_a_game_or_add_records_manually_to_se')}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

      {/* ── KPI Cards ── */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', minWidth: 90 }} elevation={2}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{kpi.total}</Typography>
          <Typography variant="caption" color="text.secondary">{t('total_games')}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', bgcolor: '#7a2e24', color: '#f5ede8', minWidth: 90 }} elevation={2}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#f5ede8' }}>{kpi.evilPct}%</Typography>
          <Typography variant="caption" sx={{ color: '#d4b0a8' }}>{tpl('evil_wins_n', kpi.evilWins)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', bgcolor: '#2e5e3a', color: '#e8f2eb', minWidth: 90 }} elevation={2}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#e8f2eb' }}>{kpi.goodPct}%</Typography>
          <Typography variant="caption" sx={{ color: '#a8ccb4' }}>{tpl('good_wins_n', kpi.goodWins)}</Typography>
        </Paper>
        {kpi.stWins > 0 && (
          <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', minWidth: 90 }} elevation={2}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{kpi.stPct}%</Typography>
            <Typography variant="caption" color="text.secondary">{tpl('st_wins_n', kpi.stWins)}</Typography>
          </Paper>
        )}
        {kpi.avgDays !== null && (
          <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', minWidth: 90 }} elevation={1}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{kpi.avgDays}</Typography>
            <Typography variant="caption" color="text.secondary">{t('avg_days')}</Typography>
          </Paper>
        )}
        {kpi.avgDurationMin !== null && (
          <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', minWidth: 90 }} elevation={1}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{kpi.avgDurationMin}</Typography>
            <Typography variant="caption" color="text.secondary">{t('avg_min')}</Typography>
          </Paper>
        )}
        {kpi.avgPlayers !== null && (
          <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', minWidth: 90 }} elevation={1}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{kpi.avgPlayers}</Typography>
            <Typography variant="caption" color="text.secondary">{t('avg_players')}</Typography>
          </Paper>
        )}
      </Box>

      {/* ── Rating KPIs ── */}
      {(kpi.avgBalanced != null || kpi.avgFunEvil != null || kpi.avgFunGood != null || kpi.avgReplay != null) && (
        <Paper sx={{ p: 2 }} elevation={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
            <BalanceIcon sx={{ fontSize: '1rem', color: 'warning.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('avg_ratings')}</Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {kpi.avgBalanced != null && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('balanced')}</Typography>
                <RatingBar value={kpi.avgBalanced} />
              </Box>
            )}
            {kpi.avgFunEvil != null && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('fun_evil')}</Typography>
                <RatingBar value={kpi.avgFunEvil} />
              </Box>
            )}
            {kpi.avgFunGood != null && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('fun_good')}</Typography>
                <RatingBar value={kpi.avgFunGood} />
              </Box>
            )}
            {kpi.avgReplay != null && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('replay')}</Typography>
                <RatingBar value={kpi.avgReplay} />
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* ── Win Balance Meter ── */}
      <Paper sx={{ p: 2 }} elevation={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{t('win_balance')}</Typography>
        <WinBalanceMeter kpi={kpi} />
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* ── Dynamic Insights ── */}
        {insights.length > 0 && (
          <Paper sx={{ p: 2, flex: '2 1 260px' }} elevation={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
              <TrendingUpIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('insights')}</Typography>
              <MicroChip label={insights.length} h={16} sx={{ ml: 'auto' }} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {insights.map((ins) => <InsightCard key={ins.id} insight={ins} />)}
            </Box>
          </Paper>
        )}

        {/* ── Recent streak ── */}
        <Paper sx={{ p: 2, flex: '1 1 200px' }} elevation={1}>
          <RecentStreak records={records} />
        </Paper>
      </Box>

      {/* ── Script mini-summary ── */}
      {scriptStats.length > 0 && (
        <Paper sx={{ p: 2 }} elevation={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{t('script_summary')}</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {scriptStats.slice(0, 5).map((s) => {
              const stWin = s.total - s.evil - s.good
              return (
                <Box key={s.key}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.total}{t('g')} · E:{s.evil} G:{s.good}{stWin > 0 ? ` ST:${stWin}` : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', height: 6, borderRadius: 1, overflow: 'hidden', gap: '1px' }}>
                    {s.evil > 0 && <Box sx={{ flex: s.evil, bgcolor: '#b91c1c' }} />}
                    {s.good > 0 && <Box sx={{ flex: s.good, bgcolor: '#2e7d32' }} />}
                    {stWin > 0 && <Box sx={{ flex: stWin, bgcolor: '#6a1b9a' }} />}
                  </Box>
                </Box>
              )
            })}
            {scriptStats.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                {tpl('more_n_scripts_tab', scriptStats.length - 5)}
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {/* ── Top players strip ── */}
      {playerStats.length > 0 && (
        <Paper sx={{ p: 2 }} elevation={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{t('top_5_players')}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {playerStats.slice(0, 5).map((p, idx) => (
              <Box key={p.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, p: 0.75, borderRadius: 1.5, bgcolor: 'action.hover', minWidth: 130 }}>
                <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8rem', width: 18, flexShrink: 0 }}>#{idx + 1}</Typography>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{p.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{p.winRate}%{t('win_short')} · {p.total}{t('g')}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* ── Storyteller leaderboard ── */}
      {storytellerStats.length > 0 && (
        <Paper sx={{ p: 2 }} elevation={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
            <PersonIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('storytellers')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {storytellerStats.slice(0, 5).map((st, idx) => {
              const evilPct = st.total ? Math.round((st.evil / st.total) * 100) : 0
              const goodPct = st.total ? Math.round((st.good / st.total) * 100) : 0
              return (
                <Box key={st.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', width: 18, flexShrink: 0 }}>#{idx + 1}</Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 1 }}>
                        {st.total}{t('g')} · {st.scripts.size}{t('scripts')}
                      </Typography>
                    </Box>
                    <Tooltip title={`E:${st.evil} G:${st.good}${st.st > 0 ? ` ST:${st.st}` : ''}`}>
                      <Box sx={{ display: 'flex', height: 5, borderRadius: 1, overflow: 'hidden', gap: '1px', cursor: 'default' }}>
                        {st.evil > 0 && <Box sx={{ flex: st.evil, bgcolor: '#b91c1c' }} />}
                        {st.good > 0 && <Box sx={{ flex: st.good, bgcolor: '#2e7d32' }} />}
                        {st.st > 0 && <Box sx={{ flex: st.st, bgcolor: '#6a1b9a' }} />}
                        {(st.total - st.evil - st.good - st.st) > 0 && <Box sx={{ flex: st.total - st.evil - st.good - st.st, bgcolor: 'grey.300' }} />}
                      </Box>
                    </Tooltip>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                        E:{evilPct}% G:{goodPct}%
                      </Typography>
                      {st.avgBalanced != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <BalanceIcon sx={{ fontSize: '0.6rem', color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>{st.avgBalanced}</Typography>
                        </Box>
                      )}
                      {st.avgReplay != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <ReplayIcon sx={{ fontSize: '0.6rem', color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>{st.avgReplay}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              )
            })}
            {storytellerStats.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                {tpl('more_n_storytellers', storytellerStats.length - 5)}
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {/* ── Top chars strip ── */}
      {charStats.length > 0 && (
        <Paper sx={{ p: 2 }} elevation={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{t('most_played_characters')}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {charStats.slice(0, 8).map((c) => {
              const icon = getIconForCharacter(c.charId)
              return (
                <Box key={c.charId} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: 56 }}>
                  {icon ? (
                    <Box component="img" src={icon as string} sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#f2ebdf' }} />
                  ) : (
                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{c.charId.slice(0, 2).toUpperCase()}</Typography>
                    </Box>
                  )}
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', textAlign: 'center', lineHeight: 1.2 }}>
                    {getDisplayName(c.charId, language)}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>{c.total}×</Typography>
                </Box>
              )
            })}
          </Box>
        </Paper>
      )}

    </Box>
  )
}
