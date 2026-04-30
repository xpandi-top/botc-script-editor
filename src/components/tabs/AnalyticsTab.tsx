import { useCallback, useMemo, useState } from 'react'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, MenuItem, Paper, Select, TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import RefreshIcon from '@mui/icons-material/Refresh'
import { getDisplayName, getIconForCharacter } from '../../catalog'
import { STORAGE_KEY } from '../StorytellerSub/constants'
import type { GameRecord } from '../StorytellerSub/types'
import type { Language } from '../../types'

// ── Storage helpers ───────────────────────────────────────────────

function readStorage(): { raw: any; records: GameRecord[] } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { raw: null, records: [] }
    const raw = JSON.parse(stored)
    return { raw, records: raw.gameRecords ?? [] }
  } catch {
    return { raw: null, records: [] }
  }
}

function writeRecords(records: GameRecord[]) {
  try {
    const { raw } = readStorage()
    const next = { ...(raw ?? {}), gameRecords: records }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {}
}

// ── Edit dialog ───────────────────────────────────────────────────

type EditDialogProps = {
  record: GameRecord
  zh: boolean
  onSave: (r: GameRecord) => void
  onClose: () => void
}
function EditRecordDialog({ record, zh, onSave, onClose }: EditDialogProps) {
  const [name, setName] = useState(record.recordName || record.scriptTitle || '')
  const [winner, setWinner] = useState<string>(record.winner ?? '')
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{zh ? '编辑记录' : 'Edit Record'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label={zh ? '记录名称' : 'Record name'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          fullWidth
        />
        <Select
          value={winner}
          onChange={(e) => setWinner(e.target.value)}
          size="small"
          displayEmpty
        >
          <MenuItem value="">{zh ? '未记录' : 'No result'}</MenuItem>
          <MenuItem value="evil">{zh ? '邪恶胜' : 'Evil Win'}</MenuItem>
          <MenuItem value="good">{zh ? '善良胜' : 'Good Win'}</MenuItem>
          <MenuItem value="storyteller">{zh ? 'ST胜' : 'ST Win'}</MenuItem>
        </Select>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{zh ? '取消' : 'Cancel'}</Button>
        <Button variant="contained" onClick={() => {
          onSave({ ...record, recordName: name || undefined, winner: (winner || null) as GameRecord['winner'] })
          onClose()
        }}>{zh ? '保存' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────

export function AnalyticsTab({ language }: { language: Language }) {
  const zh = language === 'zh'

  const [records, setRecords] = useState<GameRecord[]>(() => readStorage().records)
  const [editingRecord, setEditingRecord] = useState<GameRecord | null>(null)
  const [importError, setImportError] = useState('')

  const refresh = useCallback(() => setRecords(readStorage().records), [])

  const saveAndSet = useCallback((next: GameRecord[]) => {
    writeRecords(next)
    setRecords(next)
  }, [])

  const deleteRecord = (id: string) => saveAndSet(records.filter((r) => r.id !== id))
  const updateRecord = (updated: GameRecord) => saveAndSet(records.map((r) => r.id === updated.id ? updated : r))

  // ── Import ──
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('')
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        let incoming: GameRecord[] = []
        if (Array.isArray(parsed)) {
          incoming = parsed
        } else if (parsed.gameRecords && Array.isArray(parsed.gameRecords)) {
          // full ST storage export
          incoming = parsed.gameRecords
        } else if (parsed.id && parsed.days) {
          // single record
          incoming = [parsed]
        } else {
          throw new Error('unrecognized format')
        }
        // merge: skip duplicates by id
        const existingIds = new Set(records.map((r) => r.id))
        const newOnes = incoming.filter((r) => r.id && !existingIds.has(r.id))
        saveAndSet([...records, ...newOnes])
        if (newOnes.length === 0) setImportError(zh ? '无新记录（ID重复）' : 'No new records (duplicate IDs)')
      } catch (err: any) {
        setImportError(String(err?.message ?? err))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Export ──
  const exportRecords = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `botc-records-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAnalysis = () => {
    const analysis = {
      exportedAt: new Date().toISOString(),
      summary: {
        total: records.length,
        evilWins: records.filter((r) => r.winner === 'evil').length,
        goodWins: records.filter((r) => r.winner === 'good').length,
      },
      byScript: scriptStats,
      byPlayer: playerStats.map((p) => ({ ...p, chars: Array.from(p.chars) })),
      byCharacter: charStats,
    }
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `botc-analysis-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Stats ──
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
        const charId = r.setup?.assignments?.[ps.seat]
        if (charId) entry.chars.add(charId)
        map.set(ps.name, entry)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [records])

  const charStats = useMemo(() => {
    const map = new Map<string, { charId: string; total: number; wins: number; evilGames: number }>()
    for (const r of records) {
      if (!r.setup?.assignments || !r.playerSummaries) continue
      for (const ps of r.playerSummaries) {
        const charId = r.setup.assignments[ps.seat]
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

  const SectionTitle = ({ label }: { label: string }) => (
    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>{label}</Typography>
  )

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 900, mx: 'auto' }}>

      {/* ── Toolbar ── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
          {zh ? '数据统计' : 'Analytics'}
        </Typography>
        <Tooltip title={zh ? '刷新数据' : 'Refresh data'}>
          <IconButton size="small" onClick={refresh}><RefreshIcon fontSize="small" /></IconButton>
        </Tooltip>
        <Button
          size="small"
          startIcon={<FileDownloadIcon />}
          onClick={exportRecords}
          disabled={total === 0}
        >
          {zh ? '导出记录' : 'Export Records'}
        </Button>
        <Button
          size="small"
          startIcon={<FileDownloadIcon />}
          onClick={exportAnalysis}
          disabled={total === 0}
        >
          {zh ? '导出分析' : 'Export Analysis'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FileUploadIcon />}
          component="label"
        >
          {zh ? '导入JSON' : 'Import JSON'}
          <input type="file" accept=".json" hidden onChange={handleImport} />
        </Button>
      </Box>
      {importError && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
          {zh ? '导入失败: ' : 'Import error: '}{importError}
        </Typography>
      )}

      {total === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <Typography color="text.secondary">{zh ? '暂无游戏记录' : 'No game records yet'}</Typography>
        </Box>
      ) : (
        <>
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

          {charStats.length > 0 && <Divider sx={{ mb: 3 }} />}

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
        </>
      )}

      {/* ── Records list (always shown) ── */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
            {zh ? '游戏记录' : 'Game Records'} ({records.length})
          </Typography>
          <Tooltip title={zh ? '导入新记录 (JSON)' : 'Import records (JSON)'}>
            <IconButton size="small" component="label">
              <AddIcon fontSize="small" />
              <input type="file" accept=".json" hidden onChange={handleImport} />
            </IconButton>
          </Tooltip>
        </Box>

        {records.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            {zh ? '暂无记录。完成游戏后记录将自动保存。' : 'No records yet. Records save automatically when a game ends.'}
          </Typography>
        )}

        {[...records]
          .sort((a, b) => b.endedAt - a.endedAt)
          .map((r) => (
            <Paper key={r.id} sx={{ p: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }} elevation={1}>
              <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 80 }}>
                {r.recordName || r.scriptTitle || '?'}
              </Typography>
              {r.winner ? (
                <Chip size="small"
                  label={r.winner === 'evil' ? (zh ? '邪恶胜' : 'Evil Win') : r.winner === 'good' ? (zh ? '善良胜' : 'Good Win') : r.winner}
                  color={r.winner === 'evil' ? 'error' : r.winner === 'good' ? 'success' : 'default'} />
              ) : (
                <Chip size="small" label={zh ? '未记录' : 'No result'} />
              )}
              <Typography variant="caption" color="text.secondary">
                {r.days.length}{zh ? '天' : 'd'}
              </Typography>
              {r.playerSummaries && (
                <Typography variant="caption" color="text.secondary">
                  {r.playerSummaries.length}{zh ? '人' : 'p'}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>
                {new Date(r.endedAt).toLocaleDateString()}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                <Tooltip title={zh ? '编辑' : 'Edit'}>
                  <IconButton size="small" onClick={() => setEditingRecord(r)}>
                    <EditIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={zh ? '下载此记录' : 'Download record'}>
                  <IconButton size="small" onClick={() => {
                    const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `record-${r.id.slice(0, 8)}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}>
                    <FileDownloadIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={zh ? '删除' : 'Delete'}>
                  <IconButton size="small" color="error" onClick={() => {
                    if (confirm(zh ? '确定删除此记录？' : 'Delete this record?')) deleteRecord(r.id)
                  }}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          ))}
      </Box>

      {/* ── Edit dialog ── */}
      {editingRecord && (
        <EditRecordDialog
          record={editingRecord}
          zh={zh}
          onSave={updateRecord}
          onClose={() => setEditingRecord(null)}
        />
      )}
    </Box>
  )
}
