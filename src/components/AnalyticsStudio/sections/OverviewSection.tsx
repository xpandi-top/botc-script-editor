import { Box, Paper, Tooltip, Typography } from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import BalanceIcon from '@mui/icons-material/Balance'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import type { KpiSummary, ScriptStat, PlayerStat, CharStat, StorytiellerStat } from '../useStats'
import type { GameRecord } from '../../StorytellerSub/types'
import type { Language } from '../../../types'

// ── Win Balance Meter ─────────────────────────────────────────────

function WinBalanceMeter({ kpi, zh }: { kpi: KpiSummary; zh: boolean }) {
  if (kpi.total === 0) return null
  return (
    <Box sx={{ mb: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
          {zh ? `邪恶 ${kpi.evilPct}%` : `Evil ${kpi.evilPct}%`}
        </Typography>
        {kpi.stWins > 0 && (
          <Typography variant="caption" color="info.main" sx={{ fontWeight: 700 }}>
            ST {kpi.stPct}%
          </Typography>
        )}
        <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
          {zh ? `善良 ${kpi.goodPct}%` : `Good ${kpi.goodPct}%`}
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
        <Typography variant="caption" color="text.disabled">{kpi.evilWins}{zh ? '场' : 'g'}</Typography>
        <Typography variant="caption" color="text.disabled">{kpi.goodWins}{zh ? '场' : 'g'}</Typography>
      </Box>
    </Box>
  )
}

// ── Auto insights ─────────────────────────────────────────────────

function buildInsights(kpi: KpiSummary, scriptStats: ScriptStat[], playerStats: PlayerStat[], charStats: CharStat[], zh: boolean): string[] {
  const out: string[] = []
  if (kpi.total === 0) return out

  // Most evil-dominant script
  const withResult = scriptStats.filter((s) => s.total >= 3)
  if (withResult.length > 0) {
    const mostEvil = withResult.reduce((a, b) => (b.evil / b.total > a.evil / a.total ? b : a))
    const evilPct = Math.round((mostEvil.evil / mostEvil.total) * 100)
    if (evilPct > 60) {
      out.push(zh
        ? `《${mostEvil.title}》邪恶胜率最高 (${evilPct}%)`
        : `"${mostEvil.title}" most evil-dominant (${evilPct}% evil wins)`)
    }
    const mostGood = withResult.reduce((a, b) => (b.good / b.total > a.good / a.total ? b : a))
    const goodPct = Math.round((mostGood.good / mostGood.total) * 100)
    if (goodPct > 60) {
      out.push(zh
        ? `《${mostGood.title}》善良胜率最高 (${goodPct}%)`
        : `"${mostGood.title}" most good-dominant (${goodPct}% good wins)`)
    }
  }

  // Most consistent player
  const qualified = playerStats.filter((p) => p.total >= 5)
  if (qualified.length > 0) {
    const best = qualified.reduce((a, b) => b.winRate > a.winRate ? b : a)
    out.push(zh
      ? `${best.name} 胜率最高: ${best.winRate}% (${best.total}局)`
      : `${best.name} highest win rate: ${best.winRate}% (${best.total} games)`)
  }

  // Most-played character
  if (charStats.length > 0) {
    const top = charStats[0]
    const name = getDisplayName(top.charId, zh ? 'zh' : 'en')
    out.push(zh ? `${name} 出场最多 (${top.total}次)` : `${name} most played (${top.total}×)`)
  }

  // Avg game duration insight
  if (kpi.avgDurationMin) {
    out.push(zh ? `平均游戏时长 ${kpi.avgDurationMin} 分钟` : `Avg game duration ${kpi.avgDurationMin} min`)
  }

  // Balance check
  const diff = Math.abs(kpi.evilPct - kpi.goodPct)
  if (kpi.total >= 5 && diff <= 10) {
    out.push(zh ? '✓ 邪恶与善良胜率均衡' : '✓ Evil/Good win rates are balanced')
  } else if (kpi.total >= 5 && kpi.evilPct > kpi.goodPct + 20) {
    out.push(zh ? '⚠ 邪恶优势明显，可考虑调整剧本' : '⚠ Evil winning significantly more — consider script balance')
  } else if (kpi.total >= 5 && kpi.goodPct > kpi.evilPct + 20) {
    out.push(zh ? '⚠ 善良优势明显，增加邪恶角色难度' : '⚠ Good winning significantly more — consider harder evil roles')
  }

  return out.slice(0, 4)
}

// ── Timeline mini-sparkline ───────────────────────────────────────

function RecentStreak({ records, zh }: { records: GameRecord[]; zh: boolean }) {
  const recent = [...records].sort((a, b) => b.endedAt - a.endedAt).slice(0, 10).reverse()
  if (recent.length < 3) return null
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        {zh ? '最近10场结果' : 'Last 10 games'}
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
  storytellerStats: StorytiellerStat[]
  language: Language
  records: GameRecord[]
}

export function OverviewSection({ kpi, scriptStats, playerStats, charStats, storytellerStats, language, records }: Props) {
  const zh = language === 'zh'
  const insights = buildInsights(kpi, scriptStats, playerStats, charStats, zh)

  if (kpi.total === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">
          {zh ? '暂无记录。完成游戏或手动添加记录后，数据将显示在此。' : 'No records yet. Complete a game or add records manually to see analytics.'}
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
          <Typography variant="caption" color="text.secondary">{zh ? '总局数' : 'Total Games'}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', bgcolor: '#7a2e24', color: '#f5ede8', minWidth: 90 }} elevation={2}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#f5ede8' }}>{kpi.evilPct}%</Typography>
          <Typography variant="caption" sx={{ color: '#d4b0a8' }}>{zh ? `邪恶胜 (${kpi.evilWins})` : `Evil Wins (${kpi.evilWins})`}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', bgcolor: '#2e5e3a', color: '#e8f2eb', minWidth: 90 }} elevation={2}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#e8f2eb' }}>{kpi.goodPct}%</Typography>
          <Typography variant="caption" sx={{ color: '#a8ccb4' }}>{zh ? `善良胜 (${kpi.goodWins})` : `Good Wins (${kpi.goodWins})`}</Typography>
        </Paper>
        {kpi.stWins > 0 && (
          <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', minWidth: 90 }} elevation={2}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{kpi.stPct}%</Typography>
            <Typography variant="caption" color="text.secondary">{zh ? `说书人胜 (${kpi.stWins})` : `ST Win (${kpi.stWins})`}</Typography>
          </Paper>
        )}
        {kpi.avgDays !== null && (
          <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', minWidth: 90 }} elevation={1}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{kpi.avgDays}</Typography>
            <Typography variant="caption" color="text.secondary">{zh ? '平均天数' : 'Avg Days'}</Typography>
          </Paper>
        )}
        {kpi.avgDurationMin !== null && (
          <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', minWidth: 90 }} elevation={1}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{kpi.avgDurationMin}</Typography>
            <Typography variant="caption" color="text.secondary">{zh ? '平均分钟' : 'Avg Min'}</Typography>
          </Paper>
        )}
        {kpi.avgPlayers !== null && (
          <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', minWidth: 90 }} elevation={1}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{kpi.avgPlayers}</Typography>
            <Typography variant="caption" color="text.secondary">{zh ? '平均人数' : 'Avg Players'}</Typography>
          </Paper>
        )}
      </Box>

      {/* ── Rating KPIs ── */}
      {(kpi.avgBalanced != null || kpi.avgFunEvil != null || kpi.avgFunGood != null || kpi.avgReplay != null) && (
        <Paper sx={{ p: 2 }} elevation={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
            <BalanceIcon sx={{ fontSize: '1rem', color: 'warning.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{zh ? '平均评分' : 'Avg Ratings'}</Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {kpi.avgBalanced != null && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{zh ? '平衡性' : 'Balanced'}</Typography>
                <RatingBar value={kpi.avgBalanced} />
              </Box>
            )}
            {kpi.avgFunEvil != null && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{zh ? 'Evil乐趣' : 'Fun (Evil)'}</Typography>
                <RatingBar value={kpi.avgFunEvil} />
              </Box>
            )}
            {kpi.avgFunGood != null && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{zh ? '善良乐趣' : 'Fun (Good)'}</Typography>
                <RatingBar value={kpi.avgFunGood} />
              </Box>
            )}
            {kpi.avgReplay != null && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{zh ? '重玩意愿' : 'Replay'}</Typography>
                <RatingBar value={kpi.avgReplay} />
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* ── Win Balance Meter ── */}
      <Paper sx={{ p: 2 }} elevation={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{zh ? '胜负天平' : 'Win Balance'}</Typography>
        <WinBalanceMeter kpi={kpi} zh={zh} />
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* ── Auto Insights ── */}
        {insights.length > 0 && (
          <Paper sx={{ p: 2, flex: '2 1 260px' }} elevation={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{zh ? '数据洞察' : 'Insights'}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {insights.map((s, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Typography sx={{ color: 'primary.main', fontWeight: 700, flexShrink: 0, lineHeight: 1.5 }}>•</Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{s}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* ── Recent streak ── */}
        <Paper sx={{ p: 2, flex: '1 1 200px' }} elevation={1}>
          <RecentStreak records={records} zh={zh} />
        </Paper>
      </Box>

      {/* ── Script mini-summary ── */}
      {scriptStats.length > 0 && (
        <Paper sx={{ p: 2 }} elevation={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{zh ? '各剧本概览' : 'Script Summary'}</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {scriptStats.slice(0, 5).map((s) => {
              const stWin = s.total - s.evil - s.good
              return (
                <Box key={s.key}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.total}{zh ? '局' : 'g'} · E:{s.evil} G:{s.good}{stWin > 0 ? ` ST:${stWin}` : ''}
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
                {zh ? `+${scriptStats.length - 5} 个剧本（在剧本栏查看全部）` : `+${scriptStats.length - 5} more in Scripts tab`}
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {/* ── Top players strip ── */}
      {playerStats.length > 0 && (
        <Paper sx={{ p: 2 }} elevation={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{zh ? '玩家排名 Top 5' : 'Top 5 Players'}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {playerStats.slice(0, 5).map((p, idx) => (
              <Box key={p.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, p: 0.75, borderRadius: 1.5, bgcolor: 'action.hover', minWidth: 130 }}>
                <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8rem', width: 18, flexShrink: 0 }}>#{idx + 1}</Typography>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{p.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{p.winRate}%{zh ? '胜' : 'W'} · {p.total}{zh ? '局' : 'g'}</Typography>
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
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{zh ? '说书人排行' : 'Storytellers'}</Typography>
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
                        {st.total}{zh ? '局' : 'g'} · {st.scripts.size}{zh ? '剧本' : 'scripts'}
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
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                      E:{evilPct}% G:{goodPct}%
                      {st.avgBalanced != null ? ` · ⚖${st.avgBalanced}` : ''}
                      {st.avgReplay != null ? ` · 🔁${st.avgReplay}` : ''}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
            {storytellerStats.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                {zh ? `+${storytellerStats.length - 5} 位说书人` : `+${storytellerStats.length - 5} more storytellers`}
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {/* ── Top chars strip ── */}
      {charStats.length > 0 && (
        <Paper sx={{ p: 2 }} elevation={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{zh ? '出场最多角色' : 'Most Played Characters'}</Typography>
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
