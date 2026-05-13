import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, IconButton, InputLabel, Menu, MenuItem, Select, Snackbar,
  TextField, Tooltip, Typography,
} from '@mui/material'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import LinkIcon from '@mui/icons-material/Link'
import RefreshIcon from '@mui/icons-material/Refresh'
import ShareIcon from '@mui/icons-material/Share'
import { encodeShareParam, buildShareUrl } from '../../lib/shareUrl'
import { getDisplayName } from '../../catalog'
import { STORAGE_KEY, RECORDS_CHANGED_EVENT } from '../StorytellerSub/constants'
import { storageSync } from '../../lib/storage'
import { exportGameFile } from '../../lib/exportGame'
import { isNativePlatform } from '../../lib/nativePrint'
import type { GameRecord } from '../StorytellerSub/types'
import type { Language } from '../../types'
import { StudioShell } from '../AnalyticsStudio/StudioShell'
import { RecordFormDialog } from '../AnalyticsStudio/RecordFormDialog'
import { makeT } from '../../lib/t'

// ── Storage helpers ───────────────────────────────────────────────

function readStorage(): { raw: any; records: GameRecord[] } {
  try {
    const stored = storageSync.getItem(STORAGE_KEY)
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
    storageSync.setItem(STORAGE_KEY, JSON.stringify(next))
    // Notify ST helper (different React tree) so its in-memory state stays in sync
    window.dispatchEvent(new CustomEvent(RECORDS_CHANGED_EVENT, { detail: { records } }))
  } catch {}
}

// ── RecordFormDialog extracted to src/components/AnalyticsStudio/RecordFormDialog.tsx ───

export function AnalyticsTab({ language, onLanguageChange, sharedRecords: sharedRecordsProp, shareDecodeError, onClearSharedRecords }: {
  language: Language
  onLanguageChange?: (lang: Language) => void
  sharedRecords?: GameRecord[] | null
  shareDecodeError?: string | null
  onClearSharedRecords?: () => void
}) {
  const zh = language === 'zh'
  const t = makeT(language)

  const [records, setRecords] = useState<GameRecord[]>(() => readStorage().records)
  const [editingRecord, setEditingRecord] = useState<GameRecord | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [importError, setImportError] = useState('')
  const [sharing, setSharing] = useState(false)
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null)
  const [shareMenuAnchor, setShareMenuAnchor] = useState<null | HTMLElement>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [precomputedShareUrl, setPrecomputedShareUrl] = useState<string>('')
  const [shareUrlDialogOpen, setShareUrlDialogOpen] = useState(false)
  const [shareUrlError, setShareUrlError] = useState<string>('')
  const [shareUrlLoading, setShareUrlLoading] = useState(false)
  // Shared-view: records passed from App (decoded from ?ar= URL param)
  const sharedRecords = sharedRecordsProp ?? null
  const statsRef = useRef<HTMLDivElement>(null)

  // Records used for display: shared view overrides local
  const activeRecords = sharedRecords ?? records

  const refresh = useCallback(() => setRecords(readStorage().records), [])

  const saveAndSet = useCallback((next: GameRecord[]) => {
    writeRecords(next)
    setRecords(next)
  }, [])

  const updateRecord = (updated: GameRecord) => saveAndSet(records.map((r) => r.id === updated.id ? updated : r))
  const addRecord = (r: GameRecord) => saveAndSet([r, ...records])

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
          incoming = parsed.gameRecords
        } else if (parsed.id && parsed.days) {
          incoming = [parsed]
        } else {
          throw new Error('unrecognized format')
        }
        const existingIds = new Set(records.map((r) => r.id))
        const newOnes = incoming.filter((r) => r.id && !existingIds.has(r.id))
        saveAndSet([...newOnes, ...records])
        if (newOnes.length === 0) setImportError(t('no_new_records'))
      } catch (err: any) {
        setImportError(String(err?.message ?? err))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Export ──
  const exportRecords = () => {
    exportGameFile(JSON.stringify(records, null, 2), `botc-records-${new Date().toISOString().slice(0, 10)}.json`)
  }

  const exportAnalysis = () => {
    const analysis = {
      exportedAt: new Date().toISOString(),
      summary: { total: records.length, evilWins: records.filter((r) => r.winner === 'evil').length, goodWins: records.filter((r) => r.winner === 'good').length },
      byScript: scriptStats,
      byPlayer: playerStats.map((p) => ({ ...p, chars: Array.from(p.chars) })),
      byCharacter: charStats,
    }
    exportGameFile(JSON.stringify(analysis, null, 2), `botc-analysis-${new Date().toISOString().slice(0, 10)}.json`)
  }

  const exportCsv = () => {
    const esc = (v: string | number | null | undefined) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows: string[][] = [
      ['section', 'name', 'total', 'evilWins', 'goodWins', 'winRate%', 'avgDays', 'avgVotes', 'votePassRate%', 'avgDurationMin', 'evilWinRate%', 'goodWinRate%', 'topPlayer'],
    ]
    for (const s of scriptStats) {
      rows.push(['script', s.title, s.total, s.evil, s.good, s.total ? Math.round((s.good / s.total) * 100) : 0, s.avgDays, s.avgVotes, s.votePassRate ?? '', s.avgDurationMin ?? '', '', '', ''].map(String))
    }
    for (const p of playerStats) {
      rows.push(['player', p.name, p.total, p.evilGames, p.goodGames, p.winRate, '', '', '', '', p.evilWinRate ?? '', p.goodWinRate ?? '', p.mostPlayedChar ?? ''].map(String))
    }
    for (const c of charStats) {
      rows.push(['character', getDisplayName(c.charId, language), c.total, c.evilGames, c.goodGames, c.winRate, '', '', '', '', '', '', c.topPlayer ?? ''].map(String))
    }
    const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
    exportGameFile(csv, `botc-stats-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const copyShareLink = () => {
    setShareUrlError('')
    setShareUrlDialogOpen(true)
    if (precomputedShareUrl) return
    setShareUrlLoading(true)
    // Strip savedDays (full game state) — not used by analytics view, but inflates URL
    const shareRecords = activeRecords.map(({ savedDays: _sd, ...r }) => r)
    encodeShareParam(shareRecords)
      .then((encoded) => {
        setPrecomputedShareUrl(buildShareUrl('ar', encoded))
        setShareUrlLoading(false)
      })
      .catch((e: unknown) => {
        setShareUrlError(e instanceof Error ? e.message : String(e))
        setShareUrlLoading(false)
      })
  }

  const shareAnalysisImage = async (format: 'pdf' | 'png') => {
    if (!statsRef.current) return
    setSharing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(statsRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: statsRef.current.scrollWidth,
        height: statsRef.current.scrollHeight,
      })
      const date = new Date().toISOString().slice(0, 10)

      if (format === 'png') {
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'))
        const filename = `botc-analysis-${date}.png`
        if (isNativePlatform) {
          const { Filesystem, Directory } = await import('@capacitor/filesystem')
          const { Share } = await import('@capacitor/share')
          const reader = new FileReader()
          const base64: string = await new Promise((res) => { reader.onload = () => res((reader.result as string).split(',')[1]); reader.readAsDataURL(blob) })
          const saved = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache })
          await Share.share({ title: 'Analytics', url: saved.uri, dialogTitle: 'Share analysis image' })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
        }
      } else {
        const { jsPDF } = await import('jspdf')
        const imgData = canvas.toDataURL('image/jpeg', 0.92)
        const pdfW = 595.28
        const pdfH = (canvas.height / canvas.width) * pdfW
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [pdfW, pdfH] })
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH)
        const filename = `botc-analysis-${date}.pdf`
        const pdfBase64 = pdf.output('datauristring').split(',')[1]
        if (isNativePlatform) {
          const { Filesystem, Directory } = await import('@capacitor/filesystem')
          const { Share } = await import('@capacitor/share')
          const saved = await Filesystem.writeFile({ path: filename, data: pdfBase64, directory: Directory.Cache })
          await Share.share({ title: 'Analytics PDF', url: saved.uri, dialogTitle: 'Share analysis PDF' })
        } else {
          const blob = new Blob([pdf.output('blob')], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
        }
      }
    } finally {
      setSharing(false)
    }
  }

  // ── Legacy stats (kept for export functions) ──
  const total = records.length

  const scriptStats = useMemo(() => {
    const map = new Map<string, { title: string; total: number; evil: number; good: number; totalDays: number; totalVotes: number; totalVotePassed: number; totalDurationMs: number; durationCount: number }>()
    for (const r of activeRecords) {
      const key = r.scriptSlug || r.scriptTitle || 'unknown'
      const entry = map.get(key) ?? { title: r.scriptTitle || r.scriptSlug || '?', total: 0, evil: 0, good: 0, totalDays: 0, totalVotes: 0, totalVotePassed: 0, totalDurationMs: 0, durationCount: 0 }
      entry.total++
      if (r.winner === 'evil') entry.evil++
      if (r.winner === 'good') entry.good++
      entry.totalDays += r.days?.length ?? 0
      entry.totalVotes += r.days?.reduce((s, d) => s + (d.votes ?? 0), 0) ?? 0
      entry.totalVotePassed += r.days?.reduce((s, d) => s + (d.votePassed ?? 0), 0) ?? 0
      if (r.durationMs) { entry.totalDurationMs += r.durationMs; entry.durationCount++ }
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).map((s) => ({
      ...s,
      avgDays: s.total ? +(s.totalDays / s.total).toFixed(1) : 0,
      avgVotes: s.total ? +(s.totalVotes / s.total).toFixed(1) : 0,
      votePassRate: s.totalVotes ? Math.round((s.totalVotePassed / s.totalVotes) * 100) : null,
      avgDurationMin: s.durationCount ? Math.round(s.totalDurationMs / s.durationCount / 60000) : null,
    }))
  }, [activeRecords])

  const playerStats = useMemo(() => {
    const map = new Map<string, { name: string; total: number; evilGames: number; goodGames: number; wins: number; evilWins: number; goodWins: number; chars: Map<string, number> }>()
    for (const r of activeRecords) {
      if (!r.playerSummaries) continue
      const seenNames = new Set<string>()
      for (const ps of r.playerSummaries) {
        if (!ps.name || seenNames.has(ps.name)) continue
        seenNames.add(ps.name)
        const entry = map.get(ps.name) ?? { name: ps.name, total: 0, evilGames: 0, goodGames: 0, wins: 0, evilWins: 0, goodWins: 0, chars: new Map() }
        entry.total++
        if (ps.team === 'evil') { entry.evilGames++; if (r.winner === 'evil') { entry.wins++; entry.evilWins++ } }
        if (ps.team === 'good') { entry.goodGames++; if (r.winner === 'good') { entry.wins++; entry.goodWins++ } }
        const charId = r.setup?.assignments?.[ps.seat]
        if (charId) entry.chars.set(charId, (entry.chars.get(charId) ?? 0) + 1)
        map.set(ps.name, entry)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).map((p) => {
      const mostPlayedChar = p.chars.size ? [...p.chars.entries()].sort((a, b) => b[1] - a[1])[0][0] : null
      return {
        ...p,
        chars: new Set(p.chars.keys()),
        mostPlayedChar,
        winRate: p.total ? Math.round((p.wins / p.total) * 100) : 0,
        evilWinRate: p.evilGames ? Math.round((p.evilWins / p.evilGames) * 100) : null,
        goodWinRate: p.goodGames ? Math.round((p.goodWins / p.goodGames) * 100) : null,
      }
    })
  }, [activeRecords])

  const charStats = useMemo(() => {
    const map = new Map<string, { charId: string; total: number; wins: number; evilGames: number; goodGames: number; players: Map<string, number> }>()
    for (const r of activeRecords) {
      if (!r.setup?.assignments || !r.playerSummaries) continue
      const perGame = new Map<string, { team: 'evil' | 'good' | null; playerName: string }>()
      for (const ps of r.playerSummaries) {
        const charId = r.setup.assignments[ps.seat]
        if (!charId) continue
        const prev = perGame.get(charId)
        if (prev === undefined) perGame.set(charId, { team: ps.team, playerName: ps.name })
        else if (ps.team === 'evil' && prev.team !== 'evil') perGame.set(charId, { team: 'evil', playerName: ps.name })
      }
      for (const [charId, { team, playerName }] of perGame) {
        const entry = map.get(charId) ?? { charId, total: 0, wins: 0, evilGames: 0, goodGames: 0, players: new Map() }
        entry.total++
        if (team === 'evil') entry.evilGames++
        else if (team === 'good') entry.goodGames++
        if ((team === 'evil' && r.winner === 'evil') || (team === 'good' && r.winner === 'good')) entry.wins++
        if (playerName) entry.players.set(playerName, (entry.players.get(playerName) ?? 0) + 1)
        map.set(charId, entry)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).map((c) => {
      const topPlayer = c.players.size ? [...c.players.entries()].sort((a, b) => b[1] - a[1])[0][0] : null
      return {
        ...c,
        winRate: c.total ? Math.round((c.wins / c.total) * 100) : 0,
        goodWinRate: c.goodGames ? Math.round(((c.wins - (c.evilGames > 0 && c.total - c.goodGames > 0 ? c.wins - c.goodGames : 0)) / c.goodGames) * 100) : null,
        topPlayer,
      }
    })
  }, [activeRecords])

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1100, mx: 'auto' }}>
      <Snackbar
        open={linkCopied}
        autoHideDuration={3000}
        onClose={() => setLinkCopied(false)}
        message={t('link_copied')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* ── Toolbar ── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
          {t('analytics_title')}
        </Typography>
        <Tooltip title={t('refresh')}>
          <IconButton size="small" onClick={refresh}><RefreshIcon fontSize="small" /></IconButton>
        </Tooltip>
        {onLanguageChange && (
          <FormControl size="small" sx={{ minWidth: 72, '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
            <InputLabel>{zh ? '语言' : 'Lang'}</InputLabel>
            <Select value={language} label={zh ? '语言' : 'Lang'} onChange={(e) => onLanguageChange(e.target.value as Language)}>
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="zh">中文</MenuItem>
            </Select>
          </FormControl>
        )}
        {/* Export dropdown */}
        <Tooltip title={t('export')}>
          <IconButton size="small" disabled={total === 0}
            onClick={(e) => setExportMenuAnchor(e.currentTarget)}>
            <FileDownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small" disabled={total === 0}
          onClick={(e) => setExportMenuAnchor(e.currentTarget)}
          sx={{ ml: -0.5 }}>
          <ArrowDropDownIcon fontSize="small" />
        </IconButton>
        <Menu anchorEl={exportMenuAnchor} open={Boolean(exportMenuAnchor)} onClose={() => setExportMenuAnchor(null)}>
          <MenuItem onClick={() => { exportRecords(); setExportMenuAnchor(null) }}>
            {zh ? '导出记录 (JSON)' : 'Export Records (JSON)'}
          </MenuItem>
          <MenuItem onClick={() => { exportAnalysis(); setExportMenuAnchor(null) }}>
            {zh ? '导出分析 (JSON)' : 'Export Analysis (JSON)'}
          </MenuItem>
          <MenuItem onClick={() => { exportCsv(); setExportMenuAnchor(null) }}>
            {zh ? '导出统计 (CSV)' : 'Export Stats (CSV)'}
          </MenuItem>
        </Menu>

        {/* Share dropdown */}
        <Tooltip title={zh ? '分享' : 'Share'}>
          <IconButton size="small"
            disabled={total === 0 || sharing}
            onClick={(e) => setShareMenuAnchor(e.currentTarget)}>
            {sharing ? <CircularProgress size={16} color="inherit" /> : <ShareIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <IconButton size="small" disabled={total === 0 || sharing}
          onClick={(e) => setShareMenuAnchor(e.currentTarget)}>
          <ArrowDropDownIcon fontSize="small" />
        </IconButton>
        <Menu anchorEl={shareMenuAnchor} open={Boolean(shareMenuAnchor)} onClose={() => setShareMenuAnchor(null)}>
          <MenuItem onClick={() => { void copyShareLink(); setShareMenuAnchor(null) }}>
            <LinkIcon fontSize="small" sx={{ mr: 1 }} />
            {zh ? '复制分享链接（互动查看）' : 'Copy share link (interactive)'}
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { shareAnalysisImage('png'); setShareMenuAnchor(null) }}>
            {zh ? '分享为 PNG 图片' : 'Share as PNG'}
          </MenuItem>
          <MenuItem onClick={() => { shareAnalysisImage('pdf'); setShareMenuAnchor(null) }}>
            {zh ? '分享为 PDF' : 'Share as PDF'}
          </MenuItem>
        </Menu>

        {/* Import */}
        <Tooltip title={zh ? '导入JSON' : 'Import JSON'}>
          <IconButton size="small" component="label">
            <FileOpenIcon fontSize="small" />
            <input type="file" accept=".json" hidden onChange={handleImport} />
          </IconButton>
        </Tooltip>
      </Box>
      {importError && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
          {zh ? '导入失败: ' : 'Import error: '}{importError}
        </Typography>
      )}

      {/* ── Share decode error ── */}
      {shareDecodeError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => onClearSharedRecords?.()}>
          {shareDecodeError}
        </Alert>
      )}

      {/* ── Shared-view banner ── */}
      {sharedRecords && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button size="small" color="inherit" variant="outlined"
                onClick={() => {
                  const existingIds = new Set(records.map((r) => r.id))
                  const newOnes = sharedRecords!.filter((r) => !existingIds.has(r.id))
                  saveAndSet([...newOnes, ...records])
                  onClearSharedRecords?.()
                }}>
                {t('import_to_my_records')}
              </Button>
              <Button size="small" color="inherit" onClick={() => onClearSharedRecords?.()}>
                {t('exit')}
              </Button>
            </Box>
          }
        >
          {zh
            ? `正在查看分享的数据（${sharedRecords.length} 场游戏）。此为只读视图，不影响你的本地记录。`
            : `Viewing ${sharedRecords.length} shared game record${sharedRecords.length !== 1 ? 's' : ''}. Read-only — your own records are unaffected.`}
        </Alert>
      )}

      {/* ── Studio Shell ── */}
      <Box ref={statsRef}>
        <StudioShell
          records={activeRecords}
          onRecordsChange={sharedRecords ? () => {} : saveAndSet}
          language={language}
          onCreateRecord={() => setShowCreate(true)}
          onEditRecord={(r) => setEditingRecord(r)}
        />
      </Box>

      {/* ── Dialogs ── */}
      {editingRecord && (
        <RecordFormDialog existing={editingRecord} zh={zh} language={language} onSave={updateRecord} onClose={() => setEditingRecord(null)} />
      )}
      {showCreate && (
        <RecordFormDialog zh={zh} language={language} onSave={addRecord} onClose={() => setShowCreate(false)} />
      )}

      {/* Share URL Dialog */}
      <Dialog open={shareUrlDialogOpen} onClose={() => setShareUrlDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('share_link')}</DialogTitle>
        <DialogContent>
          {shareUrlLoading && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}><CircularProgress size={20} /><Typography variant="body2">{t('generating')}</Typography></Box>}
          {shareUrlError && <Alert severity="error" sx={{ mb: 1 }}>{shareUrlError}</Alert>}
          {!shareUrlLoading && !shareUrlError && precomputedShareUrl && (
            <TextField
              fullWidth
              value={precomputedShareUrl}
              slotProps={{ input: { readOnly: true } }}
              onFocus={(e) => e.target.select()}
              size="small"
              sx={{ mt: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          {precomputedShareUrl && !shareUrlLoading && (
            <Button onClick={() => {
              navigator.clipboard.writeText(precomputedShareUrl)
                .then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 3000); setShareUrlDialogOpen(false) })
                .catch(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 3000); setShareUrlDialogOpen(false) })
            }}>
              {t('copy')}
            </Button>
          )}
          <Button onClick={() => setShareUrlDialogOpen(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
