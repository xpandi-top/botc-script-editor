import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Autocomplete,
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, IconButton, InputLabel, LinearProgress, Menu, MenuItem, Paper, Select,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import RefreshIcon from '@mui/icons-material/Refresh'
import RemoveIcon from '@mui/icons-material/Remove'
import ShareIcon from '@mui/icons-material/Share'
import { allCharacters, getDisplayName, getIconForCharacter, initialScripts } from '../../catalog'
import { STORAGE_KEY, RECORDS_CHANGED_EVENT } from '../StorytellerSub/constants'
import { storageSync } from '../../lib/storage'
import { exportGameFile } from '../../lib/exportGame'
import { isNativePlatform } from '../../lib/nativePrint'
import type { GameRecord } from '../StorytellerSub/types'
import type { Language } from '../../types'

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

// ── Types ─────────────────────────────────────────────────────────

type PlayerRow = { name: string; charId: string; team: 'evil' | 'good' | '' }

const makeRows = (n: number): PlayerRow[] =>
  Array.from({ length: n }, () => ({ name: '', charId: '', team: '' }))

// ── Character helpers ─────────────────────────────────────────────

const EVIL_TEAMS = new Set(['minion', 'demon'])
const GOOD_TEAMS = new Set(['townsfolk', 'outsider'])

function teamFromChar(charId: string): 'evil' | 'good' | '' {
  const c = allCharacters.find((x) => x.id === charId)
  if (!c) return ''
  if (EVIL_TEAMS.has(c.team)) return 'evil'
  if (GOOD_TEAMS.has(c.team)) return 'good'
  return '' // traveler → let user pick
}

// ── Script title helper ───────────────────────────────────────────

function getScriptLabel(s: { slug: string; title: string; titleZh?: string }, language: Language) {
  return (language === 'zh' && s.titleZh) ? s.titleZh : (s.title || s.slug)
}

function loadAllScripts(language: Language): Array<{ slug: string; label: string }> {
  const base = initialScripts.map((s) => ({ slug: s.slug, label: getScriptLabel(s, language) }))
  try {
    const user = JSON.parse(storageSync.getItem('BOTC_USER_SCRIPTS') || '[]') as any[]
    const userMapped = user.map((s) => ({ slug: s.slug ?? '', label: s.title || s.slug || '?' }))
    return [...base, ...userMapped]
  } catch {
    return base
  }
}

// ── Shared Record Form dialog (create + edit) ─────────────────────

function RecordFormDialog({ existing, zh, language, onSave, onClose }: {
  existing?: GameRecord   // undefined = create mode
  zh: boolean; language: Language
  onSave: (r: GameRecord) => void; onClose: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)

  // Pre-populate from existing record when editing
  const initPlayers = (): PlayerRow[] => {
    if (!existing?.playerSummaries) return makeRows(5)
    return existing.playerSummaries.map((ps) => ({
      name: ps.name ?? '',
      charId: existing.setup?.assignments?.[ps.seat] ?? '',
      team: (ps.team ?? '') as 'evil' | 'good' | '',
    }))
  }

  const [name, setName] = useState(existing?.recordName ?? '')
  const [scriptInput, setScriptInput] = useState(existing?.scriptTitle ?? existing?.scriptSlug ?? '')
  const [scriptSlug, setScriptSlug] = useState(existing?.scriptSlug ?? '')
  const [date, setDate] = useState(
    existing ? new Date(existing.endedAt).toISOString().slice(0, 10) : today
  )
  const [winner, setWinner] = useState(existing?.winner ?? '')
  const [dayCount, setDayCount] = useState(existing?.days?.length ?? 1)
  const [players, setPlayers] = useState<PlayerRow[]>(initPlayers)
  const [playerCount, setPlayerCount] = useState(players.length)

  const scriptOptions = useMemo(() => loadAllScripts(language), [language])

  const charOptions = useMemo(() =>
    allCharacters
      .filter((c) => !['fabled', 'loric'].includes(c.team))
      .map((c) => ({
        id: c.id,
        label: getDisplayName(c.id, language),
        team: c.team,
        icon: getIconForCharacter(c.id) as string | null,
      }))
      .sort((a, b) => {
        const order = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler']
        const ai = order.indexOf(a.team), bi = order.indexOf(b.team)
        return ai !== bi ? ai - bi : a.label.localeCompare(b.label)
      }),
  [language])

  const groupLabel = (team: string) => {
    if (zh) {
      const m: Record<string, string> = { townsfolk: '镇民', outsider: '外来者', minion: '爪牙', demon: '恶魔', traveler: '旅行者' }
      return m[team] ?? team
    }
    return team.charAt(0).toUpperCase() + team.slice(1)
  }

  const setPlayerCount_ = (n: number) => {
    const clamped = Math.max(1, Math.min(20, n))
    setPlayerCount(clamped)
    setPlayers((prev) => {
      if (clamped > prev.length) return [...prev, ...makeRows(clamped - prev.length)]
      return prev.slice(0, clamped)
    })
  }

  const updatePlayer = (i: number, patch: Partial<PlayerRow>) => {
    setPlayers((prev) => prev.map((p, idx) => idx === i ? { ...p, ...patch } : p))
  }

  const handleSave = () => {
    const endedAt = new Date(date + 'T12:00:00').getTime() || Date.now()

    const activePlayers = players.filter((p) => p.name || p.charId)
    const playerSummaries = activePlayers.map((p, idx) => ({
      seat: idx + 1,
      name: p.name || `#${idx + 1}`,
      team: (p.team || null) as 'evil' | 'good' | null,
    }))

    const assignments: Record<number, string> = {}
    players.forEach((p, idx) => { if (p.charId) assignments[idx + 1] = p.charId })
    const hasSetup = Object.keys(assignments).length > 0

    const updatedRecord: GameRecord = {
      // preserve all existing fields (savedDays, eventLog, etc.) when editing
      ...(existing ?? {}),
      id: existing?.id ?? `manual-${Date.now()}`,
      endedAt,
      recordName: name || (scriptInput ? `${scriptInput} ${new Date(date).toLocaleDateString()}` : undefined),
      scriptTitle: scriptInput || undefined,
      scriptSlug: scriptSlug || undefined,
      winner: (winner || null) as GameRecord['winner'],
      playerSummaries: playerSummaries.length > 0 ? playerSummaries : undefined,
      days: Array.from({ length: Math.max(1, dayCount) }, (_, i) => ({
        day: i + 1,
        // preserve existing vote/skill counts per day when editing
        votes: existing?.days?.[i]?.votes ?? 0,
        skills: existing?.days?.[i]?.skills ?? 0,
      })),
      setup: hasSetup ? {
        playerCount: players.length,
        travelerCount: existing?.setup?.travelerCount ?? 0,
        seatNames: Object.fromEntries(players.map((p, i) => [i + 1, p.name])),
        assignments,
        userAssignments: existing?.setup?.userAssignments ?? {},
        seatNotes: existing?.setup?.seatNotes ?? {},
        specialNote: existing?.setup?.specialNote ?? '',
        demonBluffs: existing?.setup?.demonBluffs ?? [],
      } : existing?.setup,
    }
    onSave(updatedRecord)
    onClose()
  }

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { maxHeight: '90vh' } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        {existing ? (zh ? '编辑游戏记录' : 'Edit Game Record') : (zh ? '新建游戏记录' : 'New Game Record')}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* ── Basic info ── */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            label={zh ? '记录名称（可选）' : 'Record name (optional)'}
            value={name} onChange={(e) => setName(e.target.value)}
            size="small" sx={{ flex: '2 1 180px' }}
          />
          <Autocomplete
            freeSolo
            options={scriptOptions}
            getOptionLabel={(o) => typeof o === 'string' ? o : o.label}
            inputValue={scriptInput}
            onInputChange={(_, v) => {
              setScriptInput(v)
              // clear slug if free-typing
              const match = scriptOptions.find((s) => s.label === v)
              setScriptSlug(match?.slug ?? '')
            }}
            onChange={(_, v) => {
              if (v && typeof v !== 'string') {
                setScriptInput(v.label)
                setScriptSlug(v.slug)
              }
            }}
            renderInput={(params) => (
              <TextField {...params} label={zh ? '剧本' : 'Script'} size="small" />
            )}
            sx={{ flex: '2 1 180px' }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            type="date"
            label={zh ? '日期' : 'Date'}
            value={date} onChange={(e) => setDate(e.target.value)}
            size="small" slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: '1 1 130px' }}
          />
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {zh ? '结果' : 'Result'}
            </Typography>
            <ToggleButtonGroup value={winner} exclusive size="small"
              onChange={(_, v) => { if (v !== null) setWinner(v) }}>
              <ToggleButton value="evil" sx={{ fontSize: '0.75rem', color: 'error.main' }}>
                {zh ? '邪恶胜' : 'Evil Win'}
              </ToggleButton>
              <ToggleButton value="good" sx={{ fontSize: '0.75rem', color: 'success.main' }}>
                {zh ? '善良胜' : 'Good Win'}
              </ToggleButton>
              <ToggleButton value="storyteller" sx={{ fontSize: '0.75rem', color: 'info.main' }}>
                {zh ? '说书人胜' : 'ST Win'}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
            <Typography variant="caption" color="text.secondary">{zh ? '天数' : 'Days'}</Typography>
            <IconButton size="small" onClick={() => setDayCount((n) => Math.max(1, n - 1))}>
              <RemoveIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>{dayCount}</Typography>
            <IconButton size="small" onClick={() => setDayCount((n) => n + 1)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Divider />

        {/* ── Players ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
            {zh ? '玩家' : 'Players'}
          </Typography>
          <IconButton size="small" onClick={() => setPlayerCount_(playerCount - 1)}>
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>{playerCount}</Typography>
          <IconButton size="small" onClick={() => setPlayerCount_(playerCount + 1)}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="caption" color="text.secondary">
          {zh ? '角色和阵营用于统计分析。名字为空时自动用座位编号。' : 'Character + team power analytics. Blank names use seat number.'}
        </Typography>

        {/* Header row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 80px', gap: 0.5, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">#</Typography>
          <Typography variant="caption" color="text.secondary">{zh ? '玩家名' : 'Name'}</Typography>
          <Typography variant="caption" color="text.secondary">{zh ? '角色' : 'Character'}</Typography>
          <Typography variant="caption" color="text.secondary">{zh ? '阵营' : 'Team'}</Typography>
        </Box>

        {/* Player rows */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
          {players.map((p, i) => (
            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 80px', gap: 0.5, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>{i + 1}</Typography>
              <TextField
                size="small"
                placeholder={`${zh ? '玩家' : 'Player'} ${i + 1}`}
                value={p.name}
                onChange={(e) => updatePlayer(i, { name: e.target.value })}
                sx={{ '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' } }}
              />
              <Autocomplete
                options={charOptions}
                groupBy={(o) => groupLabel(o.team)}
                getOptionLabel={(o) => o.label}
                value={charOptions.find((c) => c.id === p.charId) ?? null}
                onChange={(_, v) => {
                  const charId = v?.id ?? ''
                  const autoTeam = charId ? teamFromChar(charId) : ''
                  updatePlayer(i, { charId, team: autoTeam })
                }}
                renderOption={(props, o) => (
                  <Box component="li" {...props} sx={{ gap: 0.75, py: '2px !important' }}>
                    {o.icon && <Box component="img" src={o.icon} sx={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0 }} />}
                    <Typography variant="caption">{o.label}</Typography>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField {...params} size="small" placeholder={zh ? '选择角色' : 'Character'}
                    sx={{ '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' } }} />
                )}
                slotProps={{ popper: { style: { zIndex: 1400 } } }}
                clearOnEscape
                sx={{ flex: 1 }}
              />
              <ToggleButtonGroup
                value={p.team}
                exclusive
                size="small"
                onChange={(_, v) => { if (v !== null) updatePlayer(i, { team: v }) }}
                sx={{ '& .MuiToggleButton-root': { py: '2px', px: '6px', fontSize: '0.7rem' } }}
              >
                <ToggleButton value="evil" sx={{ color: 'error.main' }}>
                  {zh ? '邪' : 'E'}
                </ToggleButton>
                <ToggleButton value="good" sx={{ color: 'success.main' }}>
                  {zh ? '善' : 'G'}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          ))}
        </Box>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{zh ? '取消' : 'Cancel'}</Button>
        <Button variant="contained" onClick={handleSave}>
          {zh ? '创建记录' : 'Create Record'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────

export function AnalyticsTab({ language, onLanguageChange }: { language: Language; onLanguageChange?: (lang: Language) => void }) {
  const zh = language === 'zh'

  const [records, setRecords] = useState<GameRecord[]>(() => readStorage().records)
  const [editingRecord, setEditingRecord] = useState<GameRecord | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [importError, setImportError] = useState('')
  const [sharing, setSharing] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null)
  const [shareMenuAnchor, setShareMenuAnchor] = useState<null | HTMLElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(() => setRecords(readStorage().records), [])

  const saveAndSet = useCallback((next: GameRecord[]) => {
    writeRecords(next)
    setRecords(next)
  }, [])

  const deleteRecord = (id: string) => saveAndSet(records.filter((r) => r.id !== id))
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
      // Deduplicate player names within a game (same name on two seats = one game count)
      const seenNames = new Set<string>()
      for (const ps of r.playerSummaries) {
        if (!ps.name || seenNames.has(ps.name)) continue
        seenNames.add(ps.name)
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
      // Deduplicate: count each character once per game regardless of how many
      // players hold that character (duplicate-char games). If a char appears on
      // both teams in the same game (shouldn't happen but defensive), evil wins.
      const perGame = new Map<string, 'evil' | 'good' | null>()
      for (const ps of r.playerSummaries) {
        const charId = r.setup.assignments[ps.seat]
        if (!charId) continue
        const prev = perGame.get(charId)
        if (prev === undefined) perGame.set(charId, ps.team)
        else if (ps.team === 'evil' && prev !== 'evil') perGame.set(charId, 'evil')
      }
      for (const [charId, team] of perGame) {
        const entry = map.get(charId) ?? { charId, total: 0, wins: 0, evilGames: 0 }
        entry.total++
        if (team === 'evil') entry.evilGames++
        if ((team === 'evil' && r.winner === 'evil') || (team === 'good' && r.winner === 'good')) entry.wins++
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
        <Tooltip title={zh ? '刷新数据' : 'Refresh'}>
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
        <Button size="small" startIcon={<FileDownloadIcon />} endIcon={<ArrowDropDownIcon />}
          disabled={total === 0}
          onClick={(e) => setExportMenuAnchor(e.currentTarget)}>
          {zh ? '导出' : 'Export'}
        </Button>
        <Menu anchorEl={exportMenuAnchor} open={Boolean(exportMenuAnchor)} onClose={() => setExportMenuAnchor(null)}>
          <MenuItem onClick={() => { exportRecords(); setExportMenuAnchor(null) }}>
            {zh ? '导出记录 (JSON)' : 'Export Records (JSON)'}
          </MenuItem>
          <MenuItem onClick={() => { exportAnalysis(); setExportMenuAnchor(null) }}>
            {zh ? '导出分析 (JSON)' : 'Export Analysis (JSON)'}
          </MenuItem>
        </Menu>

        {/* Share dropdown */}
        <Button size="small"
          startIcon={sharing ? <CircularProgress size={14} color="inherit" /> : <ShareIcon />}
          endIcon={<ArrowDropDownIcon />}
          disabled={total === 0 || sharing}
          onClick={(e) => setShareMenuAnchor(e.currentTarget)}>
          {zh ? '分享' : 'Share'}
        </Button>
        <Menu anchorEl={shareMenuAnchor} open={Boolean(shareMenuAnchor)} onClose={() => setShareMenuAnchor(null)}>
          <MenuItem onClick={() => { shareAnalysisImage('png'); setShareMenuAnchor(null) }}>
            {zh ? '分享为 PNG 图片' : 'Share as PNG'}
          </MenuItem>
          <MenuItem onClick={() => { shareAnalysisImage('pdf'); setShareMenuAnchor(null) }}>
            {zh ? '分享为 PDF' : 'Share as PDF'}
          </MenuItem>
        </Menu>

        {/* Import */}
        <Button size="small" variant="outlined" startIcon={<FileOpenIcon />} component="label">
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 150 }}>
          <Typography color="text.secondary">{zh ? '暂无游戏记录' : 'No game records yet'}</Typography>
        </Box>
      ) : (
        <Box ref={statsRef}>
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
                <Typography variant="caption" color="text.secondary">{zh ? `说书人胜利 (${total - evilWins - goodWins})` : `ST Win (${total - evilWins - goodWins})`}</Typography>
              </Paper>
            )}
          </Box>

          {/* ── By Script (scrollable) ── */}
          {scriptStats.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <SectionTitle label={zh ? '剧本统计' : 'By Script'} />
              <Box sx={{ pr: 0.5 }}>
                {scriptStats.map((s) => {
                  const stWin = s.total - s.evil - s.good
                  return (
                    <Box key={s.title} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.total}{zh ? '局' : 'g'} · {zh ? `邪${s.evil} 善${s.good}${stWin > 0 ? ` 主持${stWin}` : ''}` : `E:${s.evil} G:${s.good}${stWin > 0 ? ` ST:${stWin}` : ''}`}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', height: 8, borderRadius: 1, overflow: 'hidden', gap: 0.25 }}>
                        {s.evil > 0 && <Box sx={{ flex: s.evil, bgcolor: 'error.main' }} />}
                        {s.good > 0 && <Box sx={{ flex: s.good, bgcolor: 'success.main' }} />}
                        {stWin > 0 && <Box sx={{ flex: stWin, bgcolor: 'grey.400' }} />}
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          )}

          {playerStats.length > 0 && <Divider sx={{ mb: 3 }} />}

          {/* ── By Player (clickable cards, scrollable) ── */}
          {playerStats.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <SectionTitle label={zh ? '玩家统计' : 'By Player'} />
              <Box sx={{ pr: 0.5 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {playerStats.map((p) => {
                    const winPct = p.total ? Math.round((p.wins / p.total) * 100) : 0
                    return (
                      <Paper key={p.name} onClick={() => setSelectedPlayer(p.name)}
                        sx={{ p: 1.5, flex: '1 1 140px', minWidth: 140, cursor: 'pointer',
                          '&:hover': { bgcolor: 'rgba(133,63,34,0.06)' } }} elevation={1}>
                        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>{p.name}</Typography>
                        <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">
                          {p.total}{zh ? '局' : 'g'} · {p.wins}{zh ? '胜' : 'W'} ({winPct}%)
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.5 }}>
                          {Array.from(p.chars).slice(0, 8).map((c) => {
                            const icon = getIconForCharacter(c)
                            return icon ? (
                              <Box key={c} component="img" src={icon as string} sx={{ width: 18, height: 18, borderRadius: '50%' }}
                                title={getDisplayName(c, language)} />
                            ) : null
                          })}
                        </Box>
                      </Paper>
                    )
                  })}
                </Box>
              </Box>
            </Box>
          )}

          {charStats.length > 0 && <Divider sx={{ mb: 3 }} />}

          {/* ── By Character (card grid, clickable, scrollable) ── */}
          {charStats.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <SectionTitle label={zh ? '角色统计' : 'By Character'} />
              <Box sx={{ pr: 0.5 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {charStats.map((c) => {
                    const icon = getIconForCharacter(c.charId)
                    const winPct = c.total ? Math.round((c.wins / c.total) * 100) : 0
                    const goodGames = c.total - c.evilGames
                    return (
                      <Paper key={c.charId} onClick={() => setSelectedCharId(c.charId)}
                        sx={{ p: 1.5, flex: '1 1 140px', minWidth: 140, cursor: 'pointer',
                          '&:hover': { bgcolor: 'rgba(133,63,34,0.06)' } }} elevation={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {icon ? (
                            <Box component="img" src={icon as string} sx={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                          ) : (
                            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'grey.200', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography variant="caption">{c.charId.slice(0, 2).toUpperCase()}</Typography>
                            </Box>
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getDisplayName(c.charId, language)}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">
                          {c.total}{zh ? '局' : 'g'} · {winPct}%{zh ? '胜' : 'W'}
                        </Typography>
                        {goodGames > 0 && (
                          <Typography variant="caption" color="success.dark" sx={{ display: 'block' }}>
                            {zh ? `善${goodGames}` : `G:${goodGames}`}
                          </Typography>
                        )}
                        {c.evilGames > 0 && (
                          <Typography variant="caption" color="error.dark" sx={{ display: 'block' }}>
                            {zh ? `邪${c.evilGames}` : `E:${c.evilGames}`}
                          </Typography>
                        )}
                      </Paper>
                    )
                  })}
                </Box>
              </Box>
            </Box>
          )}

          <Divider sx={{ mb: 3 }} />
        </Box>
      )}

      {/* ── Player detail popup ── */}
      {selectedPlayer && (() => {
        const p = playerStats.find(p => p.name === selectedPlayer)
        if (!p) return null
        const winPct = p.total ? Math.round((p.wins / p.total) * 100) : 0
        return (
          <Dialog open onClose={() => setSelectedPlayer(null)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>{p.name}</Typography>
              <IconButton onClick={() => setSelectedPlayer(null)}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center' }} elevation={1}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{p.total}</Typography>
                  <Typography variant="caption" color="text.secondary">{zh ? '总局' : 'Games'}</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', bgcolor: 'action.hover' }} elevation={1}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{p.wins}</Typography>
                  <Typography variant="caption" color="text.secondary">{zh ? `胜 (${winPct}%)` : `Wins (${winPct}%)`}</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', bgcolor: 'success.light' }} elevation={1}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{p.goodGames}</Typography>
                  <Typography variant="caption">{zh ? '善良局' : 'Good'}</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: '1 1 100px', textAlign: 'center', bgcolor: 'error.light' }} elevation={1}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{p.evilGames}</Typography>
                  <Typography variant="caption">{zh ? '邪恶局' : 'Evil'}</Typography>
                </Paper>
              </Box>
              {p.chars.size > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>{zh ? '扮演过的角色' : 'Characters Played'}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    {Array.from(p.chars).map((c) => {
                      const icon = getIconForCharacter(c)
                      return (
                        <Box key={c} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: 64 }}>
                          {icon ? (
                            <Box component="img" src={icon as string} sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: '#f2ebdf' }} />
                          ) : (
                            <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography variant="caption">{c.slice(0, 2).toUpperCase()}</Typography>
                            </Box>
                          )}
                          <Typography variant="caption" sx={{ textAlign: 'center', wordBreak: 'break-word', fontSize: '0.65rem' }}>
                            {getDisplayName(c, language)}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Box>
                </>
              )}
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* ── Character detail popup ── */}
      {selectedCharId && (() => {
        const c = charStats.find(c => c.charId === selectedCharId)
        if (!c) return null
        const icon = getIconForCharacter(c.charId)
        const winPct = c.total ? Math.round((c.wins / c.total) * 100) : 0
        const goodGames = c.total - c.evilGames
        const charEvilWins = c.evilGames > 0 ? Math.round((c.wins / c.total) * c.evilGames) : 0
        const charGoodWins = c.wins - charEvilWins
        const goodWinPct = goodGames > 0 ? Math.round((charGoodWins / goodGames) * 100) : 0
        const evilWinPct = c.evilGames > 0 ? Math.round((charEvilWins / c.evilGames) * 100) : 0
        // games where this character appeared
        const charRecords = records.filter(r => r.setup?.assignments && Object.values(r.setup.assignments).includes(c.charId))
        return (
          <Dialog open onClose={() => setSelectedCharId(null)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {icon ? (
                <Box component="img" src={icon as string} sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: '#f2ebdf', flexShrink: 0 }} />
              ) : (
                <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'grey.200', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography>{c.charId.slice(0, 2).toUpperCase()}</Typography>
                </Box>
              )}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{getDisplayName(c.charId, language)}</Typography>
                <Typography variant="caption" color="text.secondary">{c.charId}</Typography>
              </Box>
              <IconButton onClick={() => setSelectedCharId(null)}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                <Paper sx={{ p: 2, flex: '1 1 80px', textAlign: 'center' }} elevation={1}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{c.total}</Typography>
                  <Typography variant="caption" color="text.secondary">{zh ? '总局' : 'Played'}</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: '1 1 80px', textAlign: 'center' }} elevation={1}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{winPct}%</Typography>
                  <Typography variant="caption" color="text.secondary">{zh ? '胜率' : 'Win Rate'}</Typography>
                </Paper>
                {goodGames > 0 && (
                  <Paper sx={{ p: 2, flex: '1 1 80px', textAlign: 'center', bgcolor: 'success.light' }} elevation={1}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{goodGames}</Typography>
                    <Typography variant="caption">{zh ? `善良 ${goodWinPct}%胜` : `Good ${goodWinPct}%W`}</Typography>
                  </Paper>
                )}
                {c.evilGames > 0 && (
                  <Paper sx={{ p: 2, flex: '1 1 80px', textAlign: 'center', bgcolor: 'error.light' }} elevation={1}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{c.evilGames}</Typography>
                    <Typography variant="caption">{zh ? `邪恶 ${evilWinPct}%胜` : `Evil ${evilWinPct}%W`}</Typography>
                  </Paper>
                )}
              </Box>
              <LinearProgress variant="determinate" value={winPct}
                sx={{ height: 6, borderRadius: 3, mb: 2, bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': { bgcolor: c.evilGames > goodGames ? 'error.main' : 'success.main' } }} />
              {charRecords.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{zh ? '出现记录' : 'Game History'}</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {charRecords.map(r => (
                      <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, borderRadius: 1, bgcolor: 'action.hover' }}>
                        <Typography variant="caption" sx={{ flex: 1 }}>{r.recordName || r.scriptTitle || '?'}</Typography>
                        <Chip size="small"
                          label={r.winner === 'evil' ? (zh ? '邪恶胜' : 'Evil') : r.winner === 'good' ? (zh ? '善良胜' : 'Good') : r.winner === 'storyteller' ? (zh ? '说书人' : 'ST') : '?'}
                          color={r.winner === 'evil' ? 'error' : r.winner === 'good' ? 'success' : r.winner === 'storyteller' ? 'info' : 'default'}
                          sx={{ fontSize: '0.6rem', height: 18 }} />
                        <Typography variant="caption" color="text.secondary">{new Date(r.endedAt).toLocaleDateString()}</Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* ── Records list ── */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
            {zh ? '游戏记录' : 'Game Records'} ({records.length})
          </Typography>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>
            {zh ? '新建记录' : 'New Record'}
          </Button>
          <Tooltip title={zh ? '导入 JSON' : 'Import JSON'}>
            <IconButton size="small" component="label">
              <FileOpenIcon fontSize="small" />
              <input type="file" accept=".json" hidden onChange={handleImport} />
            </IconButton>
          </Tooltip>
        </Box>

        {records.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            {zh ? '暂无记录。完成游戏后自动保存，或点击"新建记录"手动添加。' : 'No records. Games save automatically on end, or click "New Record" to add manually.'}
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
                  label={r.winner === 'evil' ? (zh ? '邪恶胜' : 'Evil Win') : r.winner === 'good' ? (zh ? '善良胜' : 'Good Win') : r.winner === 'storyteller' ? (zh ? '说书人胜' : 'ST Win') : r.winner}
                  color={r.winner === 'evil' ? 'error' : r.winner === 'good' ? 'success' : r.winner === 'storyteller' ? 'info' : 'default'} />
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
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title={zh ? '编辑' : 'Edit'}>
                  <IconButton size="small" onClick={() => setEditingRecord(r)}>
                    <EditIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={zh ? '下载此记录' : 'Download'}>
                  <IconButton size="small" onClick={() => {
                    exportGameFile(JSON.stringify(r, null, 2), `record-${r.id.slice(0, 8)}.json`)
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

      {/* ── Dialogs ── */}
      {editingRecord && (
        <RecordFormDialog existing={editingRecord} zh={zh} language={language} onSave={updateRecord} onClose={() => setEditingRecord(null)} />
      )}
      {showCreate && (
        <RecordFormDialog zh={zh} language={language} onSave={addRecord} onClose={() => setShowCreate(false)} />
      )}
    </Box>
  )
}
