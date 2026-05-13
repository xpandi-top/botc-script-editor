/**
 * RecordFormDialog — create or edit a single GameRecord.
 * Extracted from AnalyticsTab to keep that file manageable.
 */

import { useMemo, useState } from 'react'
import {
  Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, IconButton, InputLabel, MenuItem,
  Select, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import PersonIcon from '@mui/icons-material/Person'
import RemoveIcon from '@mui/icons-material/Remove'
import { allCharacters, getDisplayName, getIconForCharacter, initialScripts } from '../../catalog'
import { storageSync } from '../../lib/storage'
import { USER_SCRIPTS_KEY } from '../StorytellerSub/constants'
import { StarRating } from '../ui/StarRating'
import type { GameRecord } from '../StorytellerSub/types'
import type { Language } from '../../types'

// ── Types ─────────────────────────────────────────────────────────

type PlayerRow = { name: string; charId: string; team: 'evil' | 'good' | '' }

const makeRows = (n: number): PlayerRow[] =>
  Array.from({ length: n }, () => ({ name: '', charId: '', team: '' }))

// ── Helpers ───────────────────────────────────────────────────────

const EVIL_TEAMS = new Set(['minion', 'demon'])
const GOOD_TEAMS = new Set(['townsfolk', 'outsider'])

function teamFromChar(charId: string): 'evil' | 'good' | '' {
  const c = allCharacters.find((x) => x.id === charId)
  if (!c) return ''
  if (EVIL_TEAMS.has(c.team)) return 'evil'
  if (GOOD_TEAMS.has(c.team)) return 'good'
  return ''
}

function getScriptLabel(s: { slug: string; title: string; titleZh?: string }, language: Language) {
  return (language === 'zh' && s.titleZh) ? s.titleZh : (s.title || s.slug)
}

function loadAllScripts(language: Language): Array<{ slug: string; label: string }> {
  const base = initialScripts.map((s) => ({ slug: s.slug, label: getScriptLabel(s, language) }))
  try {
    const user = JSON.parse(storageSync.getItem(USER_SCRIPTS_KEY) || '[]') as { slug?: string; title?: string }[]
    const userMapped = user.map((s) => ({ slug: s.slug ?? '', label: s.title || s.slug || '?' }))
    return [...base, ...userMapped]
  } catch {
    return base
  }
}

// ── Component ─────────────────────────────────────────────────────

export function RecordFormDialog({ existing, zh, language, onSave, onClose }: {
  existing?: GameRecord
  zh: boolean
  language: Language
  onSave: (r: GameRecord) => void
  onClose: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)

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

      <Tabs value={tab} onChange={(_, v) => setTab(v as number)}
        sx={{ px: 3, borderBottom: 1, borderColor: 'divider', minHeight: 40 }}
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
                <IconButton size="small" onClick={() => setDayCount((n) => Math.max(1, n - 1))}><RemoveIcon fontSize="small" /></IconButton>
                <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{dayCount}</Typography>
                <IconButton size="small" onClick={() => setDayCount((n) => n + 1)}><AddIcon fontSize="small" /></IconButton>
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                {zh ? '游戏结果' : 'Result'}
              </Typography>
              <ToggleButtonGroup value={winner} exclusive size="small"
                onChange={(_, v) => { if (v !== null) setWinner(v as string) }}>
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
              <IconButton size="small" onClick={() => setPlayerCount_(playerCount - 1)}><RemoveIcon fontSize="small" /></IconButton>
              <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{playerCount}</Typography>
              <IconButton size="small" onClick={() => setPlayerCount_(playerCount + 1)}><AddIcon fontSize="small" /></IconButton>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {zh ? '角色和阵营用于统计分析。名字为空时自动用座位编号。' : 'Character + team used in analytics. Blank names auto-use seat number.'}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '28px 1fr 72px', sm: '32px 1fr 1fr 80px' }, gap: 0.5, alignItems: 'center', px: 0.5 }}>
              <Typography variant="caption" color="text.secondary">#</Typography>
              <Typography variant="caption" color="text.secondary">{zh ? '玩家名' : 'Name'}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>{zh ? '角色' : 'Character'}</Typography>
              <Typography variant="caption" color="text.secondary">{zh ? '阵营' : 'Team'}</Typography>
            </Box>
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
                        updatePlayer(i, { charId, team: charId ? teamFromChar(charId) : '' })
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
                  <ToggleButtonGroup value={p.team} exclusive size="small"
                    onChange={(_, v) => { if (v !== null) updatePlayer(i, { team: v as 'evil' | 'good' | '' }) }}
                    sx={{ '& .MuiToggleButton-root': { py: '2px', px: '6px', fontSize: '0.7rem' } }}>
                    <ToggleButton value="evil" sx={{ color: 'error.main' }}>{zh ? '邪' : 'E'}</ToggleButton>
                    <ToggleButton value="good" sx={{ color: 'success.main' }}>{zh ? '善' : 'G'}</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* ── Tab 2: Survey & Storyteller ── */}
        {tab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {zh ? '游戏评分' : 'Game Survey'}
            </Typography>
            <FormControl size="small" fullWidth>
              <InputLabel>MVP</InputLabel>
              <Select value={mvp} label="MVP"
                onChange={(e) => setMvp(e.target.value as number | 'storyteller' | '')}>
                <MenuItem value=""><em>{zh ? '未选择' : 'None'}</em></MenuItem>
                <MenuItem value="storyteller" sx={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <PersonIcon sx={{ fontSize: '0.9rem', color: 'purple' }} />
                  <Box component="span" sx={{ fontStyle: 'italic' }}>{zh ? '说书人' : 'Storyteller'}</Box>
                </MenuItem>
                {players.map((p, i) => p.name ? (
                  <MenuItem key={i} value={i + 1} sx={{ fontSize: '0.85rem' }}>{i + 1}. {p.name}</MenuItem>
                ) : null)}
              </Select>
            </FormControl>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              <StarRating label={zh ? '平衡性' : 'Balanced'} value={balanced} onChange={setBalanced} />
              <StarRating label={zh ? 'Evil方乐趣' : 'Fun (Evil)'} value={funEvil} onChange={setFunEvil} />
              <StarRating label={zh ? '正义方乐趣' : 'Fun (Good)'} value={funGood} onChange={setFunGood} />
              <StarRating label={zh ? '重玩愿望' : 'Replay'} value={replay} onChange={setReplay} />
            </Box>
            <TextField
              size="small" multiline rows={2}
              label={zh ? '其他备注' : 'Other notes'}
              value={otherNote} onChange={(e) => setOtherNote(e.target.value)}
              fullWidth
            />
          </Box>
        )}

      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
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
