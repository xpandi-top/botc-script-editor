import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Autocomplete,
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, IconButton, InputLabel, Menu, MenuItem, Select, Tab, Tabs,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import PersonIcon from '@mui/icons-material/Person'
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
import { StudioShell } from '../AnalyticsStudio/StudioShell'
import { StarRating } from '../ui/StarRating'

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

  const [tab, setTab] = useState(0)

  // Tab 0 — Info
  const [name, setName] = useState(existing?.recordName ?? '')
  const [scriptInput, setScriptInput] = useState(existing?.scriptTitle ?? existing?.scriptSlug ?? '')
  const [scriptSlug, setScriptSlug] = useState(existing?.scriptSlug ?? '')
  const [date, setDate] = useState(
    existing ? new Date(existing.endedAt).toISOString().slice(0, 10) : today
  )
  const [winner, setWinner] = useState(existing?.winner ?? '')
  const [dayCount, setDayCount] = useState(existing?.days?.length ?? 1)

  // Tab 1 — Players
  const [players, setPlayers] = useState<PlayerRow[]>(initPlayers)
  const [playerCount, setPlayerCount] = useState(players.length)

  // Tab 2 — Survey & Storyteller
  const [stName, setStName] = useState(existing?.stName ?? '')
  const [stCustomRules, setStCustomRules] = useState(existing?.stCustomRules ?? '')
  const [mvp, setMvp] = useState<number | 'storyteller' | ''>(
    existing?.mvp === 'storyteller' ? 'storyteller' : (existing?.mvp ?? '')
  )
  const [balanced, setBalanced] = useState<number | null>(existing?.balanced ?? null)
  const [funEvil, setFunEvil] = useState<number | null>(existing?.funEvil ?? null)
  const [funGood, setFunGood] = useState<number | null>(existing?.funGood ?? null)
  const [replay, setReplay] = useState<number | null>(existing?.replay ?? null)
  const [otherNote, setOtherNote] = useState(existing?.otherNote ?? '')

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

  // Compute summary chips for tab headers
  const hasPlayers = players.some((p) => p.name || p.charId)
  const hasSurvey = balanced != null || funEvil != null || funGood != null || replay != null || mvp !== '' || stName || stCustomRules

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
      mvp: mvp !== '' ? (mvp as number | 'storyteller') : null,
      balanced,
      funEvil,
      funGood,
      replay,
      otherNote: otherNote || undefined,
      stName: stName || undefined,
      stCustomRules: stCustomRules || undefined,
      playerSummaries: playerSummaries.length > 0 ? playerSummaries : undefined,
      days: Array.from({ length: Math.max(1, dayCount) }, (_, i) => ({
        day: i + 1,
        votes: existing?.days?.[i]?.votes ?? 0,
        votePassed: existing?.days?.[i]?.votePassed ?? 0,
        skills: existing?.days?.[i]?.skills ?? 0,
        nominations: existing?.days?.[i]?.nominations ?? 0,
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
      slotProps={{ paper: { sx: { maxHeight: '90vh', display: 'flex', flexDirection: 'column' } } }}>
      <DialogTitle sx={{ pb: 0 }}>
        {existing ? (zh ? '编辑游戏记录' : 'Edit Game Record') : (zh ? '新建游戏记录' : 'New Game Record')}
      </DialogTitle>

      {/* Tab bar */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider', minHeight: 40 }}
        slotProps={{ indicator: { style: { height: 2 } } }}>
        <Tab label={zh ? '基本信息' : 'Info'} sx={{ minHeight: 40, fontSize: '0.8rem', textTransform: 'none', py: 0 }} />
        <Tab label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {zh ? '玩家' : 'Players'}
            {hasPlayers && <Chip label={players.filter((p) => p.name || p.charId).length} size="small" sx={{ height: 16, fontSize: '0.65rem', '& .MuiChip-label': { px: '4px' } }} />}
          </Box>
        } sx={{ minHeight: 40, fontSize: '0.8rem', textTransform: 'none', py: 0 }} />
        <Tab label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {zh ? '调查 & 说书人' : 'Survey & ST'}
            {hasSurvey && <Chip color="primary" label="●" size="small" sx={{ height: 14, fontSize: '0.55rem', '& .MuiChip-label': { px: '4px' } }} />}
          </Box>
        } sx={{ minHeight: 40, fontSize: '0.8rem', textTransform: 'none', py: 0 }} />
      </Tabs>

      <DialogContent sx={{ flex: 1, overflowY: 'auto', pt: 2, pb: 1 }}>

        {/* ── Tab 0: Info ── */}
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={zh ? '记录名称（可选）' : 'Record name (optional)'}
              value={name} onChange={(e) => setName(e.target.value)}
              size="small" fullWidth
              helperText={zh ? '留空则自动使用剧本名+日期' : 'Auto-generated from script + date if blank'}
            />

            <Autocomplete
              freeSolo
              options={scriptOptions}
              getOptionLabel={(o) => typeof o === 'string' ? o : o.label}
              inputValue={scriptInput}
              onInputChange={(_, v) => {
                setScriptInput(v)
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
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <TextField
                type="date"
                label={zh ? '游戏日期' : 'Date'}
                value={date} onChange={(e) => setDate(e.target.value)}
                size="small" slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: '1 1 140px' }}
              />

              <Box sx={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 0.5, pt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{zh ? '天数' : 'Days'}</Typography>
                <IconButton size="small" onClick={() => setDayCount((n) => Math.max(1, n - 1))}>
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{dayCount}</Typography>
                <IconButton size="small" onClick={() => setDayCount((n) => n + 1)}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                {zh ? '游戏结果' : 'Result'}
              </Typography>
              <ToggleButtonGroup value={winner} exclusive size="small"
                onChange={(_, v) => { if (v !== null) setWinner(v) }}>
                <ToggleButton value="evil" sx={{ px: 2, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.main', color: 'white' } }}>
                  {zh ? '邪恶胜' : 'Evil Win'}
                </ToggleButton>
                <ToggleButton value="good" sx={{ px: 2, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.main', color: 'white' } }}>
                  {zh ? '善良胜' : 'Good Win'}
                </ToggleButton>
                <ToggleButton value="storyteller" sx={{ px: 2, color: 'info.main', '&.Mui-selected': { bgcolor: 'info.main', color: 'white' } }}>
                  {zh ? '说书人胜' : 'ST Win'}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        )}

        {/* ── Tab 1: Players ── */}
        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
                {zh ? '玩家列表' : 'Player List'}
              </Typography>
              <IconButton size="small" onClick={() => setPlayerCount_(playerCount - 1)}>
                <RemoveIcon fontSize="small" />
              </IconButton>
              <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{playerCount}</Typography>
              <IconButton size="small" onClick={() => setPlayerCount_(playerCount + 1)}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>

            <Typography variant="caption" color="text.secondary">
              {zh ? '角色和阵营用于统计分析。名字为空时自动用座位编号。' : 'Character + team used in analytics. Blank names auto-use seat number.'}
            </Typography>

            {/* Header */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '28px 1fr 72px', sm: '32px 1fr 1fr 80px' }, gap: 0.5, alignItems: 'center', px: 0.5 }}>
              <Typography variant="caption" color="text.secondary">#</Typography>
              <Typography variant="caption" color="text.secondary">{zh ? '玩家名' : 'Name'}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>{zh ? '角色' : 'Character'}</Typography>
              <Typography variant="caption" color="text.secondary">{zh ? '阵营' : 'Team'}</Typography>
            </Box>

            {/* Player rows */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
              {players.map((p, i) => (
                <Box key={i} sx={{ display: 'grid', gridTemplateColumns: { xs: '28px 1fr 72px', sm: '32px 1fr 1fr 80px' }, gap: 0.5, alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>{i + 1}</Typography>
                  <TextField
                    size="small"
                    placeholder={`${zh ? '玩家' : 'Player'} ${i + 1}`}
                    value={p.name}
                    onChange={(e) => updatePlayer(i, { name: e.target.value })}
                    sx={{ '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' } }}
                  />
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
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
                  </Box>
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
          </Box>
        )}

        {/* ── Tab 2: Survey & Storyteller ── */}
        {tab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* ST section */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {zh ? '说书人' : 'Storyteller'}
            </Typography>
            <TextField
              label={zh ? '说书人名称' : 'Storyteller name'}
              value={stName} onChange={(e) => setStName(e.target.value)}
              size="small" fullWidth
              placeholder={zh ? '游戏说书人的名字' : 'Who ran this game?'}
            />
            <TextField
              label={zh ? '自定义规则 / 设置备注' : 'Custom rules / settings'}
              value={stCustomRules} onChange={(e) => setStCustomRules(e.target.value)}
              size="small" fullWidth multiline rows={3}
              placeholder={zh ? '例：使用了哪些自定义规则或剧本变体' : 'e.g. custom rules, script variants, house rules'}
            />

            <Divider />

            {/* Survey section */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {zh ? '游戏评分' : 'Game Survey'}
            </Typography>

            {/* MVP */}
            <FormControl size="small" fullWidth>
              <InputLabel>{zh ? 'MVP' : 'MVP'}</InputLabel>
              <Select value={mvp} label="MVP"
                onChange={(e) => setMvp(e.target.value as number | 'storyteller' | '')}>
                <MenuItem value=""><em>{zh ? '未选择' : 'None'}</em></MenuItem>
                <MenuItem value="storyteller" sx={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <PersonIcon sx={{ fontSize: '0.9rem', color: 'purple' }} />
                  <Box component="span" sx={{ fontStyle: 'italic' }}>{zh ? '说书人' : 'Storyteller'}</Box>
                </MenuItem>
                {players.map((p, i) => p.name ? (
                  <MenuItem key={i} value={i + 1} sx={{ fontSize: '0.85rem' }}>
                    {i + 1}. {p.name}
                  </MenuItem>
                ) : null)}
              </Select>
            </FormControl>

            {/* Star ratings 2×2 */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              <StarRating label={zh ? '平衡性' : 'Balanced'} value={balanced} onChange={setBalanced} />
              <StarRating label={zh ? 'Evil方乐趣' : 'Fun (Evil)'} value={funEvil} onChange={setFunEvil} />
              <StarRating label={zh ? '正义方乐趣' : 'Fun (Good)'} value={funGood} onChange={setFunGood} />
              <StarRating label={zh ? '重玩愿望' : 'Replay'} value={replay} onChange={setReplay} />
            </Box>

            {/* Notes */}
            <TextField
              size="small"
              multiline
              rows={2}
              label={zh ? '其他备注' : 'Other notes'}
              value={otherNote}
              onChange={(e) => setOtherNote(e.target.value)}
              fullWidth
            />
          </Box>
        )}

      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        {/* Tab navigation hints */}
        <Box sx={{ flex: 1, display: 'flex', gap: 0.5 }}>
          {tab > 0 && (
            <Button size="small" onClick={() => setTab((t) => t - 1)} sx={{ fontSize: '0.75rem' }}>
              ← {zh ? '上一步' : 'Back'}
            </Button>
          )}
          {tab < 2 && (
            <Button size="small" onClick={() => setTab((t) => t + 1)} sx={{ fontSize: '0.75rem' }}>
              {zh ? '下一步' : 'Next'} →
            </Button>
          )}
        </Box>
        <Button onClick={onClose}>{zh ? '取消' : 'Cancel'}</Button>
        <Button variant="contained" onClick={handleSave}>
          {existing ? (zh ? '保存' : 'Save') : (zh ? '创建记录' : 'Create Record')}
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
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null)
  const [shareMenuAnchor, setShareMenuAnchor] = useState<null | HTMLElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

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
    for (const r of records) {
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
  }, [records])

  const playerStats = useMemo(() => {
    const map = new Map<string, { name: string; total: number; evilGames: number; goodGames: number; wins: number; evilWins: number; goodWins: number; chars: Map<string, number> }>()
    for (const r of records) {
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
  }, [records])

  const charStats = useMemo(() => {
    const map = new Map<string, { charId: string; total: number; wins: number; evilGames: number; goodGames: number; players: Map<string, number> }>()
    for (const r of records) {
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
  }, [records])

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1100, mx: 'auto' }}>

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
        <Tooltip title={zh ? '导出' : 'Export'}>
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

      {/* ── Studio Shell ── */}
      <Box ref={statsRef}>
        <StudioShell
          records={records}
          onRecordsChange={saveAndSet}
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
    </Box>
  )
}
