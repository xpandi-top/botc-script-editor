import { memo, useMemo, useState } from 'react'
import {
  Box, Button, Checkbox, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell,
  TableHead, TableRow, TableSortLabel, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import PersonIcon from '@mui/icons-material/Person'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import TimerIcon from '@mui/icons-material/Timer'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { exportGameFile } from '../../../lib/exportGame'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import { StarRating } from '../../ui/StarRating'
import { MicroChip } from '../../ui'
import type { GameRecord } from '../../StorytellerSub/types'
import type { Language } from '../../../types'
import { useT } from '../../../context/I18nContext'
import { TYPE_SCALE, WEIGHT } from '../../../theme/tokens'

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

// ── Quick Edit panel ─────────────────────────────────────────────

const QuickEditPanel = memo(function QuickEditPanel({ record, onSave }: {
  record: GameRecord; language: Language; onSave: (updated: GameRecord) => void
}) {
  const { t } = useT()
  const [winner, setWinner] = useState<string>(record.winner ?? '')
  const [mvp, setMvp] = useState<number | 'storyteller' | ''>(
    record.mvp === 'storyteller' ? 'storyteller' : (record.mvp ?? '')
  )
  const [stName, setStName] = useState(record.stName ?? '')
  const [stCustomRules, setStCustomRules] = useState(record.stCustomRules ?? '')
  const [balanced, setBalanced] = useState<number | null>(record.balanced ?? null)
  const [funEvil, setFunEvil] = useState<number | null>(record.funEvil ?? null)
  const [funGood, setFunGood] = useState<number | null>(record.funGood ?? null)
  const [replay, setReplay] = useState<number | null>(record.replay ?? null)
  const [otherNote, setOtherNote] = useState(record.otherNote ?? '')
  const [dirty, setDirty] = useState(false)

  const mark = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true) }
  const markStr = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value); setDirty(true)
  }

  const seats = record.playerSummaries ?? []

  const handleSave = () => {
    onSave({
      ...record,
      winner: (winner || null) as GameRecord['winner'],
      mvp: mvp !== '' ? (mvp as number | 'storyteller') : null,
      stName: stName.trim() || undefined,
      stCustomRules: stCustomRules.trim() || undefined,
      balanced,
      funEvil,
      funGood,
      replay,
      otherNote: otherNote.trim() || undefined,
    })
    setDirty(false)
  }

  const inputSx = { '& .MuiInputBase-input': { fontSize: '0.78rem', py: '5px' }, '& .MuiInputLabel-root': { fontSize: '0.78rem' } }

  return (
    <Box sx={{ px: 2, py: 1.25, bgcolor: 'action.selected', borderTop: '1px dashed', borderColor: 'divider' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FlashOnIcon sx={{ fontSize: '0.8rem', color: 'warning.main' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main', fontSize: '0.72rem' }}>
            {t('quick_edit')}
          </Typography>
        </Box>
        <Button size="small" variant="contained" disabled={!dirty} onClick={handleSave}
          sx={{ fontSize: '0.72rem', py: '2px', px: 1.5, minWidth: 0 }}>
          {t('save')}
        </Button>
      </Box>

      {/* Body: 2 columns */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>

        {/* ── Left col: game outcome + ST ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

          {/* Result */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4, fontSize: '0.68rem' }}>
              {t('result')}
            </Typography>
            <ToggleButtonGroup value={winner} exclusive size="small"
              onChange={(_, v) => { if (v !== null) { setWinner(v); setDirty(true) } }}
              sx={{ '& .MuiToggleButton-root': { fontSize: '0.7rem', py: '2px', px: '8px' } }}>
              <ToggleButton value="evil" sx={{ color: 'error.main', '&.Mui-selected': { bgcolor: 'error.main', color: '#fff' } }}>
                {t('evil')}
              </ToggleButton>
              <ToggleButton value="good" sx={{ color: 'success.main', '&.Mui-selected': { bgcolor: 'success.main', color: '#fff' } }}>
                {t('good')}
              </ToggleButton>
              <ToggleButton value="storyteller" sx={{ color: 'info.main', '&.Mui-selected': { bgcolor: 'info.main', color: '#fff' } }}>
                ST
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* MVP */}
          <FormControl size="small" sx={inputSx}>
            <InputLabel>{t('mvp')}</InputLabel>
            <Select value={mvp} label="MVP"
              onChange={(e) => { setMvp(e.target.value as number | 'storyteller' | ''); setDirty(true) }}
              sx={{ fontSize: '0.78rem' }}>
              <MenuItem value=""><em>{t('none')}</em></MenuItem>
              <MenuItem value="storyteller" sx={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <PersonIcon sx={{ fontSize: '0.85rem', color: 'purple' }} />
                <Box component="span" sx={{ fontStyle: 'italic' }}>{t('storyteller')}</Box>
              </MenuItem>
              {seats.map((s) => (
                <MenuItem key={s.seat} value={s.seat} sx={{ fontSize: '0.78rem' }}>
                  {s.seat}. {s.name || `#${s.seat}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* ST Name */}
          <TextField size="small" label={t('storyteller')}
            value={stName} onChange={markStr(setStName)}
            placeholder={t('st_name')}
            sx={inputSx} />

          {/* ST Rules */}
          <TextField size="small" label={t('custom_rules')}
            value={stCustomRules} onChange={markStr(setStCustomRules)}
            multiline rows={2}
            placeholder={t('house_rules_variants')}
            sx={{ ...inputSx, '& .MuiInputBase-input': { fontSize: '0.78rem' } }} />
        </Box>

        {/* ── Right col: ratings + notes ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
            <StarRating label={t('balanced')} value={balanced} onChange={mark(setBalanced)} />
            <StarRating label={t('fun_evil')} value={funEvil} onChange={mark(setFunEvil)} />
            <StarRating label={t('fun_good')} value={funGood} onChange={mark(setFunGood)} />
            <StarRating label={t('replay')} value={replay} onChange={mark(setReplay)} />
          </Box>
          <TextField size="small" label={t('notes')}
            value={otherNote} onChange={markStr(setOtherNote)}
            multiline rows={3} fullWidth
            sx={{ ...inputSx, '& .MuiInputBase-input': { fontSize: '0.78rem' } }} />
        </Box>

      </Box>
    </Box>
  )
})

// ── Row detail (inline expand) ────────────────────────────────────

const RATING_KEYS: Record<string, 'balanced' | 'fun_evil' | 'fun_good' | 'replay'> = {
  balanced: 'balanced',
  funEvil: 'fun_evil',
  funGood: 'fun_good',
  replay: 'replay',
}

function StarDots({ value }: { value: number | null | undefined }) {
  if (value == null) return <Typography variant="caption" color="text.disabled">—</Typography>
  return (
    <Box sx={{ display: 'flex', gap: '1px' }}>
      {[1, 2, 3, 4, 5].map((i) =>
        i <= value
          ? <StarIcon key={i} sx={{ fontSize: '0.75rem', color: 'warning.main' }} />
          : <StarBorderIcon key={i} sx={{ fontSize: '0.75rem', color: 'action.disabled' }} />
      )}
    </Box>
  )
}

const RecordRowDetail = memo(function RecordRowDetail({ record, language }: { record: GameRecord; language: Language }) {
  const { t, tpl } = useT()
  const assignments = record.setup?.assignments ?? {}
  const hasRatings = record.balanced != null || record.funEvil != null || record.funGood != null || record.replay != null
  const mvpName = record.mvp === 'storyteller'
    ? (record.stName?.trim() || (t('storyteller')))
    : record.mvp != null
      ? (() => { const ps = record.playerSummaries?.find((p) => p.seat === record.mvp); return ps ? `${ps.seat}. ${ps.name}` : `#${record.mvp}` })()
      : null
  const mvpIsST = record.mvp === 'storyteller'
  const durationMin = record.durationMs ? Math.round(record.durationMs / 60000) : null

  return (
    <Box sx={{ px: 2, pb: 1.5, pt: 0.75, bgcolor: 'action.hover' }}>

      {/* ── ST + meta strip ── */}
      {(record.stName || durationMin || mvpName) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1, pb: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
          {record.stName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <PersonIcon sx={{ fontSize: '0.8rem', color: 'text.primary', opacity: 0.6 }} />
              <Typography variant="caption" color="text.primary" sx={{ opacity: 0.7 }}>{t('st')}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{record.stName}</Typography>
            </Box>
          )}
          {durationMin && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <TimerIcon sx={{ fontSize: '0.8rem', color: 'text.primary', opacity: 0.6 }} />
              <Typography variant="caption" color="text.primary" sx={{ opacity: 0.75 }}>{durationMin}{t('min')}</Typography>
            </Box>
          )}
          {mvpName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              {mvpIsST
                ? <PersonIcon sx={{ fontSize: '0.8rem', color: 'purple' }} />
                : <EmojiEventsIcon sx={{ fontSize: '0.8rem', color: 'warning.main' }} />}
              <Typography variant="caption" color="text.primary" sx={{ opacity: 0.7 }}>MVP: </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: mvpIsST ? 'purple' : 'warning.dark' }}>{mvpName}</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ── Players ── */}
      {record.playerSummaries && record.playerSummaries.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
          {record.playerSummaries.map((ps) => {
            const charId = assignments[ps.seat]
            const icon = charId ? getIconForCharacter(charId) : null
            const charName = charId ? getDisplayName(charId, language) : null
            const isMvp = record.mvp !== 'storyteller' && record.mvp === ps.seat
            return (
              <Chip
                key={ps.seat}
                size="small"
                avatar={
                  isMvp && !icon
                    ? <EmojiEventsIcon sx={{ fontSize: '0.75rem !important', color: 'warning.main !important' }} />
                    : icon
                      ? <Box component="img" src={icon as string} sx={{ width: 14, height: 14, borderRadius: '50%' }} />
                      : undefined
                }
                label={
                  isMvp && icon
                    ? <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <EmojiEventsIcon sx={{ fontSize: '0.7rem', color: 'warning.main', verticalAlign: 'middle' }} />
                        {`${ps.name}${charName ? ` (${charName})` : ''}`}
                      </Box>
                    : `${ps.name}${charName ? ` (${charName})` : ''}`
                }
                sx={{
                  fontSize: '0.68rem',
                  bgcolor: ps.team === 'evil' ? 'rgba(183,28,28,0.12)' : ps.team === 'good' ? 'rgba(21,101,192,0.12)' : undefined,
                  border: '1px solid',
                  borderColor: isMvp ? 'warning.main' : ps.team === 'evil' ? 'error.light' : ps.team === 'good' ? 'primary.light' : 'divider',
                  fontWeight: isMvp ? 700 : undefined,
                }}
              />
            )
          })}
        </Box>
      )}

      {/* ── Day stats ── */}
      {record.days && record.days.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: hasRatings || record.setup?.demonBluffs?.length ? 0.75 : 0 }}>
          {record.days.map((d) => (
            <Box key={d.day} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{tpl('day_compact', d.day)}</Typography>
              <Typography variant="caption" color="text.primary" sx={{ opacity: 0.75 }}>
                {d.votes}{t('vote_short')} {d.nominations}{t('n')} {d.skills}{t('s')}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* ── Bluffs ── */}
      {record.setup?.demonBluffs && record.setup.demonBluffs.length > 0 && (
        <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">{t('bluffs')}</Typography>
          {record.setup.demonBluffs.map((charId) => {
            const icon = getIconForCharacter(charId)
            return icon
              ? <Box key={charId} component="img" src={icon as string} sx={{ width: 18, height: 18, borderRadius: '50%' }} title={getDisplayName(charId, language)} />
              : <Typography key={charId} variant="caption">{charId}</Typography>
          })}
        </Box>
      )}

      {/* ── Ratings ── */}
      {hasRatings && (
        <Box sx={{ mt: 0.75, display: 'flex', gap: 2, flexWrap: 'wrap', pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
          {(['balanced', 'funEvil', 'funGood', 'replay'] as const).map((k) => {
            const v = record[k]
            if (v == null) return null
            return (
              <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.66rem', opacity: 0.75 }}>
                  {t(RATING_KEYS[k])}
                </Typography>
                <StarDots value={v} />
                <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.primary', opacity: 0.75 }}>{v}/5</Typography>
              </Box>
            )
          })}
        </Box>
      )}

      {/* ── ST custom rules ── */}
      {record.stCustomRules && (
        <Box sx={{ mt: 0.75, p: 0.75, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.04)', borderLeft: '3px solid', borderColor: 'info.light' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main', display: 'block', mb: 0.25, fontSize: '0.66rem' }}>
            {t('custom_rules')}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.72rem', whiteSpace: 'pre-wrap' }}>{record.stCustomRules}</Typography>
        </Box>
      )}

      {/* ── Other notes ── */}
      {record.otherNote && (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.68rem', fontStyle: 'italic', opacity: 0.8 }}>{record.otherNote}</Typography>
        </Box>
      )}
    </Box>
  )
})

// ── Main ──────────────────────────────────────────────────────────

export function RecordsSection({ records, filteredRecords, onRecordsChange, language, onCreateRecord, onEditRecord }: Props) {
  const { t, tpl } = useT()
  const zh = language === 'zh'
  const { isMobile } = useBreakpoint()
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  // Mobile: show record detail in a full-screen dialog instead of inline expand
  const [mobileDetail, setMobileDetail] = useState<GameRecord | null>(null)

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

  const thSx = { py: 0.75, px: 1, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.bold, whiteSpace: 'nowrap' }
  const tdSx = { py: 0.75, px: 1, fontSize: TYPE_SCALE.md }

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
          {tpl('records_n', filteredRecords.length)}
        </Typography>
        {selected.size > 0 && (
          <>
            <Typography variant="caption" color="text.secondary">{selected.size}{t('selected')}</Typography>
            <Tooltip title={t('export_selected')}>
              <IconButton size="small" onClick={exportBulk}><FileDownloadIcon sx={{ fontSize: '1rem' }} /></IconButton>
            </Tooltip>
            <Tooltip title={t('delete_selected')}>
              <IconButton size="small" color="error" onClick={() => setConfirmBulkDelete(true)}><DeleteIcon sx={{ fontSize: '1rem' }} /></IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title={t('new_record')}>
          <IconButton data-tutorial="an-add-record" size="small" onClick={onCreateRecord}><AddIcon sx={{ fontSize: '1rem' }} /></IconButton>
        </Tooltip>
      </Box>

      {sorted.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">{t('no_records_match_the_current_filter')}</Typography>
        </Box>
      ) : (
        <Paper data-tutorial="an-records-table" elevation={2} sx={{ overflow: 'hidden' }}>
          <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: { xs: 280, sm: 'unset' } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}>
                <TableCell padding="checkbox" sx={{ width: 36, py: 0.5 }}>
                  <Checkbox size="small" checked={allSelected} indeterminate={selected.size > 0 && !allSelected} onChange={toggleAll} />
                </TableCell>
                <TableCell sx={{ ...thSx, pl: 1.5 }}>
                  <TableSortLabel active={sortKey === 'script'} direction={sortKey === 'script' ? sortDir : 'desc'} onClick={() => handleSort('script')}>
                    {t('record')}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ ...thSx, width: 90 }} align="center">
                  <TableSortLabel active={sortKey === 'winner'} direction={sortKey === 'winner' ? sortDir : 'desc'} onClick={() => handleSort('winner')}>
                    {t('result')}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ ...thSx, width: 50, display: { xs: 'none', sm: 'table-cell' } }} align="center">
                  <TableSortLabel active={sortKey === 'days'} direction={sortKey === 'days' ? sortDir : 'desc'} onClick={() => handleSort('days')}>
                    {t('days')}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ ...thSx, width: 50, display: { xs: 'none', sm: 'table-cell' } }} align="center">
                  <TableSortLabel active={sortKey === 'players'} direction={sortKey === 'players' ? sortDir : 'desc'} onClick={() => handleSort('players')}>
                    {t('p')}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ ...thSx, width: 90, display: { xs: 'none', sm: 'table-cell' } }}>
                  <TableSortLabel active={sortKey === 'date'} direction={sortKey === 'date' ? sortDir : 'desc'} onClick={() => handleSort('date')}>
                    {t('date')}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ ...thSx, width: { xs: 36, sm: 80 } }} align="center" />
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
                    onClick={() => {
                      if (isMobile) setMobileDetail(r)
                      else setExpandedId(isExpanded ? null : r.id)
                    }}
                  >
                    <TableCell padding="checkbox" sx={{ py: 0.5 }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox size="small" checked={isSelected} onChange={() => toggleSelect(r.id)} />
                    </TableCell>
                    <TableCell sx={{ ...tdSx, fontWeight: 600, overflow: 'hidden', maxWidth: 0, pl: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.recordName || r.scriptTitle || '?'}
                      </Typography>
                      {r.scriptTitle && r.recordName && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.scriptTitle}
                        </Typography>
                      )}
                      {/* date embedded on xs when date column is hidden */}
                      <Typography variant="caption" color="text.disabled" sx={{ display: { xs: 'block', sm: 'none' }, fontSize: '0.65rem' }}>
                        {new Date(r.endedAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ ...tdSx, width: { xs: 60, sm: 90 } }} align="center">
                      {r.winner ? (
                        <Tooltip title={zh ? (WINNER_LABEL[r.winner]?.zh ?? r.winner) : (WINNER_LABEL[r.winner]?.en ?? r.winner)}>
                          <MicroChip
                            label={<>
                              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                                {zh ? (WINNER_LABEL[r.winner]?.zh ?? r.winner) : (WINNER_LABEL[r.winner]?.en ?? r.winner)}
                              </Box>
                              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                                {r.winner === 'evil' ? (t('evil_short')) : r.winner === 'good' ? (t('good_short')) : 'ST'}
                              </Box>
                            </>}
                            color={WINNER_COLOR[r.winner] ?? 'default'}
                          />
                        </Tooltip>
                      ) : (
                        <MicroChip label="?" />
                      )}
                    </TableCell>
                    <TableCell sx={{ ...tdSx, display: { xs: 'none', sm: 'table-cell' } }} align="center">{r.days?.length ?? '—'}</TableCell>
                    <TableCell sx={{ ...tdSx, display: { xs: 'none', sm: 'table-cell' } }} align="center">{r.playerSummaries?.length ?? '—'}</TableCell>
                    <TableCell sx={{ ...tdSx, color: 'text.secondary', fontSize: '0.72rem', display: { xs: 'none', sm: 'table-cell' } }}>
                      {new Date(r.endedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={{ ...tdSx, width: { xs: 36, sm: 80 } }} align="center" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0, justifyContent: 'center' }}>
                        {onEditRecord && (
                          <IconButton size="small" onClick={() => onEditRecord(r)} sx={{ p: 0.25, display: { xs: 'none', sm: 'inline-flex' } }}>
                            <EditIcon sx={{ fontSize: '0.9rem' }} />
                          </IconButton>
                        )}
                        <IconButton size="small" onClick={() => exportGameFile(JSON.stringify(r, null, 2), `record-${r.id.slice(0, 8)}.json`)} sx={{ p: 0.25, display: { xs: 'none', sm: 'inline-flex' } }}>
                          <FileDownloadIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => {
                          if (confirm(t('delete_this_record'))) deleteRecord(r.id)
                        }} sx={{ p: 0.25, display: { xs: 'none', sm: 'inline-flex' } }}>
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
                      <Collapse in={isExpanded} timeout={150} unmountOnExit>
                        <Box sx={{ maxHeight: { xs: '60vh', sm: 'none' }, overflowY: { xs: 'auto', sm: 'visible' } }}>
                          <RecordRowDetail record={r} language={language} />
                          <QuickEditPanel
                            record={r}
                            language={language}
                            onSave={(updated) => onRecordsChange(records.map((x) => x.id === updated.id ? updated : x))}
                          />
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>,
                ]
              })}
            </TableBody>
          </Table>
          </Box>
        </Paper>
      )}

      {/* ── Mobile record detail dialog ── */}
      <Dialog
        open={!!mobileDetail}
        onClose={() => setMobileDetail(null)}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { m: 1, maxHeight: '92vh', display: 'flex', flexDirection: 'column' } } }}
      >
        {mobileDetail && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>
                    {mobileDetail.recordName || mobileDetail.scriptTitle || '?'}
                  </Typography>
                  {mobileDetail.scriptTitle && mobileDetail.recordName && (
                    <Typography variant="caption" color="text.secondary">
                      {mobileDetail.scriptTitle}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.65rem' }}>
                    {new Date(mobileDetail.endedAt).toLocaleDateString()}
                  </Typography>
                </Box>
                {mobileDetail.winner && (
                  <MicroChip
                    label={zh ? (WINNER_LABEL[mobileDetail.winner]?.zh ?? mobileDetail.winner) : (WINNER_LABEL[mobileDetail.winner]?.en ?? mobileDetail.winner)}
                    color={WINNER_COLOR[mobileDetail.winner] ?? 'default'}
                    h={22}
                    sx={{ flexShrink: 0 }}
                  />
                )}
                <IconButton size="small" onClick={() => setMobileDetail(null)} sx={{ flexShrink: 0 }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0, overflowY: 'auto', flex: 1 }}>
              <RecordRowDetail record={mobileDetail} language={language} />
              <QuickEditPanel
                record={mobileDetail}
                language={language}
                onSave={(updated) => {
                  onRecordsChange(records.map((x) => x.id === updated.id ? updated : x))
                  setMobileDetail(updated)
                }}
              />
            </DialogContent>
            <DialogActions sx={{ gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <IconButton size="small"
                onClick={() => exportGameFile(JSON.stringify(mobileDetail, null, 2), `record-${mobileDetail.id.slice(0, 8)}.json`)}>
                <FileDownloadIcon fontSize="small" />
              </IconButton>
              {onEditRecord && (
                <IconButton size="small" onClick={() => { onEditRecord(mobileDetail); setMobileDetail(null) }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton size="small" color="error" onClick={() => {
                if (confirm(t('delete_this_record'))) {
                  deleteRecord(mobileDetail.id)
                  setMobileDetail(null)
                }
              }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
              <Button size="small" onClick={() => setMobileDetail(null)}>
                {t('close')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Bulk delete confirm */}
      <Dialog open={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)} maxWidth="xs">
        <DialogTitle>{t('confirm_delete')}</DialogTitle>
        <DialogContent>
          <Typography>{tpl('confirm_delete_n_records', selected.size)}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmBulkDelete(false)}>{t('cancel')}</Button>
          <Button color="error" variant="contained" onClick={deleteBulk}>{t('delete')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
