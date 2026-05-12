import { useMemo, useState } from 'react'
import {
  Box, Button, Checkbox, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell,
  TableHead, TableRow, TableSortLabel, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { exportGameFile } from '../../../lib/exportGame'
import { StarRating } from '../../ui/StarRating'
import type { GameRecord } from '../../StorytellerSub/types'
import type { Language } from '../../../types'

// RecordFormDialog is imported from AnalyticsTab for reuse — but to keep
// the section self-contained we inline a lightweight version. The full form
// (with player/char editing) stays in AnalyticsTab.tsx proper and is passed
// via callback.

type SortKey = 'date' | 'script' | 'winner' | 'days' | 'players'

const WINNER_COLOR: Record<string, 'error' | 'success' | 'info' | 'default'> = {
  evil: 'error', good: 'success', storyteller: 'info',
}
const WINNER_LABEL: Record<string, { en: string; zh: string }> = {
  evil: { en: 'Evil Win', zh: '邪恶胜' },
  good: { en: 'Good Win', zh: '善良胜' },
  storyteller: { en: 'ST Win', zh: '说书人胜' },
}

interface Props {
  records: GameRecord[]         // all records (for edit/delete)
  filteredRecords: GameRecord[] // filtered subset (display)
  onRecordsChange: (next: GameRecord[]) => void
  language: Language
  onCreateRecord?: () => void
  onEditRecord?: (r: GameRecord) => void
}

// ── Quick Edit panel (survey ratings + winner + MVP) ─────────────

function QuickEditPanel({ record, zh, onSave }: {
  record: GameRecord; language: Language; zh: boolean; onSave: (updated: GameRecord) => void
}) {
  const [winner, setWinner] = useState<string>(record.winner ?? '')
  const [mvp, setMvp] = useState<number | 'storyteller' | ''>(
    record.mvp === 'storyteller' ? 'storyteller' : (record.mvp ?? '')
  )
  const [balanced, setBalanced] = useState<number | null>(record.balanced ?? null)
  const [funEvil, setFunEvil] = useState<number | null>(record.funEvil ?? null)
  const [funGood, setFunGood] = useState<number | null>(record.funGood ?? null)
  const [replay, setReplay] = useState<number | null>(record.replay ?? null)
  const [otherNote, setOtherNote] = useState<string>(record.otherNote ?? '')
  const [dirty, setDirty] = useState(false)

  const mark = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true) }

  const seats = record.playerSummaries ?? []

  const handleSave = () => {
    onSave({
      ...record,
      winner: (winner || null) as GameRecord['winner'],
      mvp: mvp !== '' ? (mvp as number | 'storyteller') : null,
      balanced,
      funEvil,
      funGood,
      replay,
      otherNote: otherNote || undefined,
    })
    setDirty(false)
  }

  return (
    <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(0,0,0,0.025)', borderTop: '1px dashed', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <FlashOnIcon sx={{ fontSize: '0.85rem', color: 'warning.main' }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.dark' }}>
          {zh ? '快速编辑' : 'Quick Edit'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* Winner + MVP */}
        <Box sx={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {zh ? '结果' : 'Result'}
            </Typography>
            <ToggleButtonGroup value={winner} exclusive size="small"
              onChange={(_, v) => { if (v !== null) { setWinner(v); setDirty(true) } }}>
              <ToggleButton value="evil" sx={{ fontSize: '0.7rem', py: '2px', px: '8px', color: 'error.main' }}>
                {zh ? '邪恶' : 'Evil'}
              </ToggleButton>
              <ToggleButton value="good" sx={{ fontSize: '0.7rem', py: '2px', px: '8px', color: 'success.main' }}>
                {zh ? '善良' : 'Good'}
              </ToggleButton>
              <ToggleButton value="storyteller" sx={{ fontSize: '0.7rem', py: '2px', px: '8px', color: 'info.main' }}>
                ST
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel sx={{ fontSize: '0.78rem' }}>{zh ? 'MVP' : 'MVP'}</InputLabel>
            <Select value={mvp} label="MVP"
              onChange={(e) => { setMvp(e.target.value as number | 'storyteller' | ''); setDirty(true) }}
              sx={{ fontSize: '0.8rem' }}>
              <MenuItem value=""><em>{zh ? '无' : 'None'}</em></MenuItem>
              <MenuItem value="storyteller" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                🎭 {zh ? '说书人' : 'Storyteller'}
              </MenuItem>
              {seats.map((s) => (
                <MenuItem key={s.seat} value={s.seat} sx={{ fontSize: '0.8rem' }}>
                  {s.seat}. {s.name || `#${s.seat}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Ratings */}
        <Box sx={{ flex: '2 1 280px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
          <StarRating label={zh ? '平衡性' : 'Balanced'} value={balanced} onChange={mark(setBalanced)} />
          <StarRating label={zh ? 'Evil方乐趣' : 'Fun (Evil)'} value={funEvil} onChange={mark(setFunEvil)} />
          <StarRating label={zh ? '正义方乐趣' : 'Fun (Good)'} value={funGood} onChange={mark(setFunGood)} />
          <StarRating label={zh ? '重玩愿望' : 'Replay'} value={replay} onChange={mark(setReplay)} />
        </Box>

        {/* Note */}
        <Box sx={{ flex: '2 1 200px' }}>
          <TextField
            size="small"
            multiline
            rows={3}
            fullWidth
            label={zh ? '其他备注' : 'Other notes'}
            value={otherNote}
            onChange={(e) => { setOtherNote(e.target.value); setDirty(true) }}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
          />
        </Box>
      </Box>

      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="small" variant="contained" disabled={!dirty} onClick={handleSave}>
          {zh ? '保存' : 'Save'}
        </Button>
      </Box>
    </Box>
  )
}

// ── Row detail (inline expand) ────────────────────────────────────

function RecordRowDetail({ record, language, zh }: { record: GameRecord; language: Language; zh: boolean }) {
  const assignments = record.setup?.assignments ?? {}

  return (
    <Box sx={{ px: 2, pb: 1.5, pt: 0.5, bgcolor: 'rgba(0,0,0,0.02)' }}>
      {record.playerSummaries && record.playerSummaries.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
          {record.playerSummaries.map((ps) => {
            const charId = assignments[ps.seat]
            const icon = charId ? getIconForCharacter(charId) : null
            const charName = charId ? getDisplayName(charId, language) : null
            return (
              <Chip
                key={ps.seat}
                size="small"
                avatar={icon ? <Box component="img" src={icon as string} sx={{ width: 14, height: 14, borderRadius: '50%' }} /> : undefined}
                label={`${ps.name}${charName ? ` (${charName})` : ''}`}
                sx={{
                  fontSize: '0.68rem',
                  bgcolor: ps.team === 'evil' ? 'rgba(183,28,28,0.12)' : ps.team === 'good' ? 'rgba(21,101,192,0.12)' : undefined,
                  border: '1px solid',
                  borderColor: ps.team === 'evil' ? 'error.light' : ps.team === 'good' ? 'primary.light' : 'divider',
                }}
              />
            )
          })}
        </Box>
      )}
      {record.days && record.days.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {record.days.map((d) => (
            <Box key={d.day} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>{zh ? `第${d.day}天` : `D${d.day}`}</Typography>
              <Typography variant="caption" color="text.secondary">
                {d.votes}{zh ? '票' : 'v'} {d.nominations}{zh ? '提' : 'n'} {d.skills}{zh ? '技' : 's'}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      {record.setup?.demonBluffs && record.setup.demonBluffs.length > 0 && (
        <Box sx={{ mt: 0.75, display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">{zh ? '恶魔虚张声势：' : 'Bluffs: '}</Typography>
          {record.setup.demonBluffs.map((charId) => {
            const icon = getIconForCharacter(charId)
            return icon
              ? <Box key={charId} component="img" src={icon as string} sx={{ width: 18, height: 18, borderRadius: '50%' }} title={getDisplayName(charId, language)} />
              : <Typography key={charId} variant="caption">{charId}</Typography>
          })}
        </Box>
      )}
    </Box>
  )
}

// ── Main ──────────────────────────────────────────────────────────

export function RecordsSection({ records, filteredRecords, onRecordsChange, language, onCreateRecord, onEditRecord }: Props) {
  const zh = language === 'zh'
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0
      if (sortKey === 'date') { av = a.endedAt; bv = b.endedAt }
      else if (sortKey === 'script') { av = a.scriptTitle || ''; bv = b.scriptTitle || '' }
      else if (sortKey === 'winner') { av = a.winner || ''; bv = b.winner || '' }
      else if (sortKey === 'days') { av = a.days?.length ?? 0; bv = b.days?.length ?? 0 }
      else if (sortKey === 'players') { av = a.playerSummaries?.length ?? 0; bv = b.playerSummaries?.length ?? 0 }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredRecords, sortKey, sortDir])

  const deleteRecord = (id: string) => {
    onRecordsChange(records.filter((r) => r.id !== id))
    setSelected((s) => { const n = new Set(s); n.delete(id); return n })
  }

  const deleteBulk = () => {
    onRecordsChange(records.filter((r) => !selected.has(r.id)))
    setSelected(new Set())
    setConfirmBulkDelete(false)
  }

  const exportBulk = () => {
    const toExport = records.filter((r) => selected.has(r.id))
    exportGameFile(JSON.stringify(toExport, null, 2), `botc-records-selected-${new Date().toISOString().slice(0, 10)}.json`)
  }

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const allSelected = sorted.length > 0 && sorted.every((r) => selected.has(r.id))
  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(sorted.map((r) => r.id)))
  }

  const thSx = { py: 0.75, px: 1, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }
  const tdSx = { py: 0.5, px: 1, fontSize: '0.8rem' }

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
          {zh ? `游戏记录 (${filteredRecords.length})` : `Records (${filteredRecords.length})`}
        </Typography>
        {selected.size > 0 && (
          <>
            <Typography variant="caption" color="text.secondary">{selected.size}{zh ? ' 已选' : ' selected'}</Typography>
            <Tooltip title={zh ? '导出所选' : 'Export selected'}>
              <IconButton size="small" onClick={exportBulk}><FileDownloadIcon sx={{ fontSize: '1rem' }} /></IconButton>
            </Tooltip>
            <Tooltip title={zh ? '删除所选' : 'Delete selected'}>
              <IconButton size="small" color="error" onClick={() => setConfirmBulkDelete(true)}><DeleteIcon sx={{ fontSize: '1rem' }} /></IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title={zh ? '新建记录' : 'New Record'}>
          <IconButton size="small" onClick={onCreateRecord}><AddIcon sx={{ fontSize: '1rem' }} /></IconButton>
        </Tooltip>
      </Box>

      {sorted.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">{zh ? '无匹配记录' : 'No records match the current filter'}</Typography>
        </Box>
      ) : (
        <Paper elevation={2} sx={{ overflow: 'hidden' }}>
          <Table size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}>
                <TableCell padding="checkbox" sx={{ width: 36, py: 0.5 }}>
                  <Checkbox size="small" checked={allSelected} indeterminate={selected.size > 0 && !allSelected} onChange={toggleAll} />
                </TableCell>
                <TableCell sx={thSx}>
                  <TableSortLabel active={sortKey === 'script'} direction={sortKey === 'script' ? sortDir : 'desc'} onClick={() => handleSort('script')}>
                    {zh ? '记录' : 'Record'}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ ...thSx, width: 90 }} align="center">
                  <TableSortLabel active={sortKey === 'winner'} direction={sortKey === 'winner' ? sortDir : 'desc'} onClick={() => handleSort('winner')}>
                    {zh ? '结果' : 'Result'}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ ...thSx, width: 50, display: { xs: 'none', sm: 'table-cell' } }} align="center">
                  <TableSortLabel active={sortKey === 'days'} direction={sortKey === 'days' ? sortDir : 'desc'} onClick={() => handleSort('days')}>
                    {zh ? '天' : 'Days'}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ ...thSx, width: 50, display: { xs: 'none', sm: 'table-cell' } }} align="center">
                  <TableSortLabel active={sortKey === 'players'} direction={sortKey === 'players' ? sortDir : 'desc'} onClick={() => handleSort('players')}>
                    {zh ? '人' : 'P'}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ ...thSx, width: 90 }}>
                  <TableSortLabel active={sortKey === 'date'} direction={sortKey === 'date' ? sortDir : 'desc'} onClick={() => handleSort('date')}>
                    {zh ? '日期' : 'Date'}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ ...thSx, width: 80 }} align="center">{zh ? '操作' : 'Actions'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((r) => {
                const isExpanded = expandedId === r.id
                const isSelected = selected.has(r.id)
                return [
                  <TableRow
                    key={r.id}
                    selected={isSelected}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    <TableCell padding="checkbox" sx={{ py: 0.5 }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox size="small" checked={isSelected} onChange={() => toggleSelect(r.id)} />
                    </TableCell>
                    <TableCell sx={{ ...tdSx, fontWeight: 600 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.recordName || r.scriptTitle || '?'}
                      </Typography>
                      {r.scriptTitle && r.recordName && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.scriptTitle}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={tdSx} align="center">
                      {r.winner ? (
                        <Chip size="small"
                          label={zh ? (WINNER_LABEL[r.winner]?.zh ?? r.winner) : (WINNER_LABEL[r.winner]?.en ?? r.winner)}
                          color={WINNER_COLOR[r.winner] ?? 'default'}
                          sx={{ fontSize: '0.62rem', height: 20 }} />
                      ) : (
                        <Chip size="small" label={zh ? '未记录' : '?'} sx={{ fontSize: '0.62rem', height: 20 }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ ...tdSx, display: { xs: 'none', sm: 'table-cell' } }} align="center">{r.days?.length ?? '—'}</TableCell>
                    <TableCell sx={{ ...tdSx, display: { xs: 'none', sm: 'table-cell' } }} align="center">{r.playerSummaries?.length ?? '—'}</TableCell>
                    <TableCell sx={{ ...tdSx, color: 'text.secondary', fontSize: '0.72rem' }}>{new Date(r.endedAt).toLocaleDateString()}</TableCell>
                    <TableCell sx={tdSx} align="center" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0, justifyContent: 'center' }}>
                        {onEditRecord && (
                          <IconButton size="small" onClick={() => onEditRecord(r)} sx={{ p: 0.25 }}>
                            <EditIcon sx={{ fontSize: '0.9rem' }} />
                          </IconButton>
                        )}
                        <IconButton size="small" onClick={() => exportGameFile(JSON.stringify(r, null, 2), `record-${r.id.slice(0, 8)}.json`)} sx={{ p: 0.25 }}>
                          <FileDownloadIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => {
                          if (confirm(zh ? '确定删除此记录？' : 'Delete this record?')) deleteRecord(r.id)
                        }} sx={{ p: 0.25 }}>
                          <DeleteIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                        <IconButton size="small" sx={{ p: 0.25 }}>
                          {isExpanded ? <ExpandLessIcon sx={{ fontSize: '0.9rem' }} /> : <ExpandMoreIcon sx={{ fontSize: '0.9rem' }} />}
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>,
                  <TableRow key={`${r.id}-detail`} sx={{ '& td': { p: 0 } }}>
                    <TableCell colSpan={7} sx={{ p: 0, border: isExpanded ? undefined : 'none' }}>
                      <Collapse in={isExpanded}>
                        <RecordRowDetail record={r} language={language} zh={zh} />
                        <QuickEditPanel
                          record={r}
                          language={language}
                          zh={zh}
                          onSave={(updated) => onRecordsChange(records.map((x) => x.id === updated.id ? updated : x))}
                        />
                      </Collapse>
                    </TableCell>
                  </TableRow>,
                ]
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Bulk delete confirm */}
      <Dialog open={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)} maxWidth="xs">
        <DialogTitle>{zh ? '确认删除' : 'Confirm delete'}</DialogTitle>
        <DialogContent>
          <Typography>{zh ? `确定删除所选的 ${selected.size} 条记录？此操作不可撤销。` : `Delete ${selected.size} selected record(s)? This cannot be undone.`}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmBulkDelete(false)}>{zh ? '取消' : 'Cancel'}</Button>
          <Button color="error" variant="contained" onClick={deleteBulk}>{zh ? '删除' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
