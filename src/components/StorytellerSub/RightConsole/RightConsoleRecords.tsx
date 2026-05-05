// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React, { useState, useMemo } from 'react'
import { Box, Button, Typography, Paper, Chip, IconButton, TextField, ToggleButtonGroup, ToggleButton, Collapse } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DeleteIcon from '@mui/icons-material/Delete'
import HowToVoteIcon from '@mui/icons-material/HowToVote'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import SaveAsIcon from '@mui/icons-material/SaveAs'
import DownloadIcon from '@mui/icons-material/Download'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import { getDisplayName, getIconForCharacter } from '../../../catalog'

const WINNER_COLOR: Record<string, string> = { good: '#1565c0', evil: '#b71c1c', storyteller: '#6a1b9a' }
const WINNER_LABEL: Record<string, { en: string; zh: string }> = {
  good: { en: 'Good', zh: '好人' },
  evil: { en: 'Evil', zh: '邪恶' },
  storyteller: { en: 'ST', zh: '说书人' },
}

function fmtDuration(ms?: number) {
  if (!ms) return null
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function RightConsoleRecords({ ctx, toggleConsoleSection }: { ctx: StorytellerContext, toggleConsoleSection: any }) {
  const { language, text, gameRecords = [], setGameRecords, activeConsoleSections, loadGameRecord, exportRecordJson, saveGame } = ctx
  const isOpen = activeConsoleSections?.has('records')
  const zh = language === 'zh'

  const [search, setSearch] = useState('')
  const [winnerFilter, setWinnerFilter] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = gameRecords
    if (winnerFilter) list = list.filter((r: any) => r.winner === winnerFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((r: any) =>
        (r.recordName ?? '').toLowerCase().includes(q) ||
        (r.scriptTitle ?? '').toLowerCase().includes(q) ||
        (r.playerSummaries ?? []).some((p: any) => p.name?.toLowerCase().includes(q))
      )
    }
    return list
  }, [gameRecords, search, winnerFilter])

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Button fullWidth onClick={() => toggleConsoleSection('records')} sx={{ justifyContent: 'space-between', textTransform: 'none' }}>
        <Typography variant="body2">
          {zh ? '历史记录' : 'Game Records'} ({gameRecords.length})
        </Typography>
        {isOpen ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      </Button>

      {isOpen && (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Search */}
          <TextField
            size="small" fullWidth
            placeholder={zh ? '搜索名称/剧本/玩家…' : 'Search name / script / player…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Winner filter */}
          <ToggleButtonGroup
            size="small" exclusive
            value={winnerFilter}
            onChange={(_, v) => setWinnerFilter(v)}
            sx={{ flexWrap: 'wrap' }}
          >
            {(['good', 'evil', 'storyteller'] as const).map((w) => (
              <ToggleButton key={w} value={w} sx={{ fontSize: '0.7rem', px: 1, py: 0.25, color: WINNER_COLOR[w] }}>
                {zh ? WINNER_LABEL[w].zh : WINNER_LABEL[w].en}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {filtered.length === 0 ? (
            <Typography variant="body2" color="text.secondary">{text.noCompletedGames}</Typography>
          ) : (
            filtered.map((rec: any) => {
              const date = new Date(rec.endedAt).toLocaleDateString()
              const totalVotes = rec.days?.reduce((s: number, d: any) => s + (d.votes ?? 0), 0) ?? 0
              const totalSkills = rec.days?.reduce((s: number, d: any) => s + (d.skills ?? 0), 0) ?? 0
              const isExpanded = expandedId === rec.id
              const duration = fmtDuration(rec.durationMs)
              const winnerColor = rec.winner ? WINNER_COLOR[rec.winner] : undefined

              return (
                <Paper key={rec.id} variant="outlined" sx={{ p: 1, borderColor: winnerColor ? `${winnerColor}55` : 'divider' }}>
                  {/* Header row */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word', lineHeight: 1.3 }}>
                        {rec.recordName ?? (rec.scriptTitle ? `${rec.scriptTitle} - ${date}` : date)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{date}{duration ? ` · ${duration}` : ''}</Typography>
                    </Box>
                    {rec.winner && (
                      <Chip size="small" label={zh ? WINNER_LABEL[rec.winner]?.zh : WINNER_LABEL[rec.winner]?.en}
                        sx={{ bgcolor: winnerColor, color: '#fff', fontSize: '0.65rem', height: 20, flexShrink: 0 }} />
                    )}
                  </Box>

                  {/* Stats chips */}
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip size="small" icon={<WbSunnyIcon sx={{ fontSize: '0.8rem' }} />} label={`${rec.days?.length ?? 1}${zh ? '天' : 'd'}`} />
                    <Chip size="small" icon={<HowToVoteIcon sx={{ fontSize: '0.8rem' }} />} label={`${totalVotes}${zh ? '票' : 'v'}`} />
                    <Chip size="small" icon={<AutoFixHighIcon sx={{ fontSize: '0.8rem' }} />} label={`${totalSkills}${zh ? '技' : 's'}`} />
                    {rec.scriptTitle && <Chip size="small" icon={<AutoStoriesIcon sx={{ fontSize: '0.8rem' }} />} label={rec.scriptTitle} sx={{ maxWidth: 120, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />}
                  </Box>

                  {/* Player summary (expand) */}
                  {rec.playerSummaries?.length > 0 && (
                    <>
                      <Button size="small" onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                        sx={{ mt: 0.5, py: 0, px: 0.5, fontSize: '0.7rem', textTransform: 'none', minWidth: 0 }}>
                        {isExpanded ? '▲' : '▼'} {zh ? '玩家' : 'Players'}
                      </Button>
                      <Collapse in={isExpanded}>
                        <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {rec.playerSummaries.map((p: any) => {
                            const charId = rec.setup?.assignments?.[p.seat]
                            const icon = charId ? getIconForCharacter(charId) : null
                            const charName = charId ? getDisplayName(charId, language) : null
                            return (
                              <Chip
                                key={p.seat}
                                size="small"
                                avatar={icon ? <Box component="img" src={icon} sx={{ width: 14, height: 14, borderRadius: '50%' }} /> : undefined}
                                label={`${p.name}${charName ? ` (${charName})` : ''}`}
                                sx={{
                                  fontSize: '0.68rem',
                                  bgcolor: p.team === 'evil' ? 'rgba(183,28,28,0.12)' : p.team === 'good' ? 'rgba(21,101,192,0.12)' : undefined,
                                  border: '1px solid',
                                  borderColor: p.team === 'evil' ? 'error.light' : p.team === 'good' ? 'primary.light' : 'divider',
                                }}
                              />
                            )
                          })}
                        </Box>
                      </Collapse>
                    </>
                  )}

                  {/* Action icons */}
                  <Box sx={{ display: 'flex', gap: 0.25, mt: 0.5 }}>
                    {rec.savedDays && (
                      <IconButton size="small" onClick={() => loadGameRecord(rec)} title={zh ? '加载' : 'Load'}>
                        <FolderOpenIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    )}
                    <IconButton size="small" onClick={() => {
                      const name = window.prompt(zh ? '输入新文件名：' : 'Enter new file name:', rec.recordName)
                      if (name) saveGame(name)
                    }} title={zh ? '另存' : 'Save As'}>
                      <SaveAsIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => exportRecordJson(rec)} title={zh ? '导出' : 'Export'}>
                      <DownloadIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setGameRecords((cur: any[]) => cur.filter((r) => r.id !== rec.id))} title={zh ? '删除' : 'Delete'}>
                      <DeleteIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Box>
                </Paper>
              )
            })
          )}
        </Box>
      )}
    </Paper>
  )
}
