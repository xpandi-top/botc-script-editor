// @ts-nocheck
import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Accordion, AccordionDetails, AccordionSummary,
  Box, Button, Chip, Dialog, DialogContent, DialogTitle,
  IconButton, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'

const ENTRY_COLORS: Record<string, 'primary' | 'secondary' | 'success' | 'error' | 'warning'> = {
  vote: 'primary',
  skill: 'secondary',
  event: 'success',
}

const PHASE_ORDER: Record<string, number> = { night: 0, private: 1, public: 2, nomination: 3 }

function phaseLabel(phase: string, text: any): string {
  return { night: text.nightPhase, private: text.privateChat, public: text.publicChat, nomination: text.nomination }[phase] ?? phase
}

function buildEntries(days: any[]) {
  const all: any[] = []
  for (const day of days) {
    for (const v of day.voteHistory) {
      const voterList = v.voters.length > 0 ? ` [${v.voters.map((n: number) => `#${n}`).join(', ')}]` : ''
      const base = `#${v.actor} → #${v.target}: ${v.passed ? 'PASS' : 'FAIL'} (${v.voteCount}/${v.requiredVotes})${voterList}`
      const detail = v.note ? `${base} · ${v.note}` : base
      all.push({ id: `v-${day.day}-${v.id}`, day: day.day, phase: 'nomination', timestamp: Number(v.id), type: 'vote', visibility: 'public', detail })
    }
    for (const s of day.skillHistory) {
      const targetStr = (s.targets || []).length > 0 ? ` → [${(s.targets as number[]).map((t) => `#${t}`).join(', ')}]` : ''
      const detail = `#${s.actor} ${s.roleId || '?'}${targetStr}${s.statement ? ` "${s.statement}"` : ''}${s.result ? ` [${s.result}]` : ''}`
      all.push({ id: `s-${day.day}-${s.id}`, day: day.day, phase: s.activatedDuringPhase, timestamp: Number(s.id), type: 'skill', visibility: 'st-only', detail })
    }
    for (const e of day.eventLog) {
      if (e.kind === 'vote' || e.kind === 'skill') continue
      const vis: 'public' | 'st-only' = (e.kind === 'stateChange' || e.kind === 'phaseTransition') ? 'public' : 'st-only'
      all.push({ id: `e-${day.day}-${e.id}`, day: day.day, phase: e.phase, timestamp: e.timestamp, type: 'event', visibility: vis, detail: e.detail })
    }
  }
  return all
}

export function AggregatedLogModal({ ctx }: { ctx: any }) {
  const {
    language, text, days, showAggLogModal, setShowAggLogModal,
    editLogEntry, removeLogEntry, addQuickEvent, swapLogEntries, currentDay,
  } = ctx

  const isNight = currentDay.phase === 'night'

  const [visFilter, setVisFilter] = useState<'all' | 'public' | 'st-only'>('all')
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set(['vote', 'skill', 'event']))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [quickText, setQuickText] = useState('')
  const [quickVis, setQuickVis] = useState<'public' | 'st-only'>('public')
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set())

  const effectiveVisFilter = isNight ? visFilter : (visFilter === 'all' ? 'public' : visFilter)

  // All entries (unfiltered) sorted ascending — used to assign global sequence numbers
  const allAsc = useMemo(() => {
    const all = buildEntries(days)
    all.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day
      const pA = PHASE_ORDER[a.phase] ?? 99; const pB = PHASE_ORDER[b.phase] ?? 99
      if (pA !== pB) return pA - pB
      return a.timestamp - b.timestamp
    })
    return all
  }, [days])

  // Global seq number map: id → sequence number (1 = oldest)
  const seqMap = useMemo(() => {
    const m: Record<string, number> = {}
    allAsc.forEach((e, i) => { m[e.id] = i + 1 })
    return m
  }, [allAsc])

  // Filtered + sorted descending for display
  const entries = useMemo(() => {
    let filtered = allAsc.filter((e) => typeFilters.has(e.type))
    if (effectiveVisFilter !== 'all') filtered = filtered.filter((e) => e.visibility === effectiveVisFilter)
    return [...filtered].reverse()
  }, [allAsc, typeFilters, effectiveVisFilter])

  const grouped = useMemo(() => {
    const map = new Map<number, typeof entries>()
    for (const e of entries) {
      const arr = map.get(e.day) ?? []; arr.push(e); map.set(e.day, arr)
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0])
  }, [entries])

  const handleStartEdit = (entry: any) => {
    const prefix = entry.id.split('-')[0]
    if (prefix === 'v') { const idx = entry.detail.lastIndexOf(' · '); setEditValue(idx >= 0 ? entry.detail.slice(idx + 3) : '') }
    else if (prefix === 's') setEditValue(entry.detail.match(/"(.*)"/)?.[1] ?? '')
    else setEditValue(entry.detail)
    setEditingId(entry.id)
  }

  const handleSaveEdit = (entryId: string) => { editLogEntry(entryId, editValue); setEditingId(null) }

  const handleAddQuick = () => {
    if (!quickText.trim()) return
    addQuickEvent(quickText.trim(), quickVis)
    setQuickText('')
  }

  const toggleType = (t: string) => {
    setTypeFilters((prev) => { const next = new Set(prev); if (next.has(t)) { if (next.size > 1) next.delete(t) } else next.add(t); return next })
  }

  // Get neighbor IDs for reorder (within displayed list, same day)
  const getNeighbor = (entryId: string, direction: 'up' | 'down'): string | null => {
    const idx = entries.findIndex((e) => e.id === entryId)
    if (idx < 0) return null
    const entry = entries[idx]
    // Search same day, in direction
    let ni = direction === 'up' ? idx - 1 : idx + 1
    while (ni >= 0 && ni < entries.length) {
      if (entries[ni].day === entry.day) return entries[ni].id
      ni += direction === 'up' ? -1 : 1
    }
    return null
  }

  const handleReorder = (entryId: string, direction: 'up' | 'down') => {
    const neighbor = getNeighbor(entryId, direction)
    if (neighbor) swapLogEntries(entryId, neighbor)
  }

  if (!showAggLogModal) return null

  const modal = (
    <Dialog open={showAggLogModal} onClose={() => setShowAggLogModal(false)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { height: '82vh', display: 'flex', flexDirection: 'column' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
        <Typography fontWeight={700}>{language === 'zh' ? '游戏日志' : 'Game Log'}</Typography>
        <IconButton size="small" onClick={() => setShowAggLogModal(false)}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, pt: 1.5, pb: 0.5, display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
        {/* Quick add */}
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          <TextField size="small" fullWidth
            placeholder={language === 'zh' ? '快速添加日志…' : 'Quick add log…'}
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddQuick() } }}
          />
          <ToggleButtonGroup size="small" value={quickVis} exclusive onChange={(_, v) => v && setQuickVis(v)}>
            <ToggleButton value="public" sx={{ fontSize: '0.7rem', px: 1 }}>{language === 'zh' ? '公开' : 'Pub'}</ToggleButton>
            <ToggleButton value="st-only" sx={{ fontSize: '0.7rem', px: 1 }}>ST</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" size="small" onClick={handleAddQuick} sx={{ minWidth: 40, px: 1 }}>+</Button>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['vote', 'skill', 'event'] as const).map((t) => (
            <Chip key={t} size="small" clickable
              label={t === 'vote' ? text.filterVote : t === 'skill' ? text.filterSkill : text.filterEvent}
              color={typeFilters.has(t) ? ENTRY_COLORS[t] : 'default'}
              variant={typeFilters.has(t) ? 'filled' : 'outlined'}
              onClick={() => toggleType(t)} />
          ))}
          <Box sx={{ flex: 1 }} />
          <ToggleButtonGroup size="small" value={isNight ? visFilter : effectiveVisFilter} exclusive
            onChange={(_, v) => v && setVisFilter(v)}>
            <ToggleButton value="all" sx={{ fontSize: '0.7rem', px: 1 }}>{language === 'zh' ? '全部' : 'All'}</ToggleButton>
            <ToggleButton value="public" sx={{ fontSize: '0.7rem', px: 1 }}>{language === 'zh' ? '公开' : 'Public'}</ToggleButton>
            {isNight && <ToggleButton value="st-only" sx={{ fontSize: '0.7rem', px: 1 }}>ST</ToggleButton>}
          </ToggleButtonGroup>
        </Box>
      </Box>

      <DialogContent sx={{ pt: 1, flex: 1, overflow: 'auto' }}>
        {grouped.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>—</Typography>
        ) : grouped.map(([day, dayEntries]) => {
          const isOpen = !collapsedDays.has(day)
          const toggleDay = () => setCollapsedDays((prev) => { const next = new Set(prev); if (next.has(day)) next.delete(day); else next.add(day); return next })
          return (
          <Accordion key={day} expanded={isOpen} onChange={toggleDay} disableGutters elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1, '&:before': { display: 'none' }, '&.Mui-expanded': { mb: 1 } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36, px: 1.5, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="subtitle2" fontWeight={700} color="primary.main">Day {day}</Typography>
                <Typography variant="caption" color="text.secondary">({dayEntries.length})</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 1, pt: 0 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {dayEntries.map((entry: any, i: number) => {
                const seq = seqMap[entry.id]
                const canUp = getNeighbor(entry.id, 'up') !== null
                const canDown = getNeighbor(entry.id, 'down') !== null
                return (
                  <Box key={entry.id} sx={{
                    display: 'flex', gap: 0.5, alignItems: 'flex-start',
                  }}>
                    {/* Seq number + reorder */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, minWidth: 28 }}>
                      <IconButton size="small" disabled={!canUp} onClick={() => handleReorder(entry.id, 'up')}
                        sx={{ p: 0.1, opacity: canUp ? 1 : 0.25 }}>
                        <KeyboardArrowUpIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem', lineHeight: 1 }}>
                        #{seq}
                      </Typography>
                      <IconButton size="small" disabled={!canDown} onClick={() => handleReorder(entry.id, 'down')}
                        sx={{ p: 0.1, opacity: canDown ? 1 : 0.25 }}>
                        <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>

                    {/* Entry card */}
                    <Box sx={{
                      flex: 1, p: 0.75, borderRadius: 1,
                      bgcolor: entry.visibility === 'st-only' ? 'warning.light' : 'background.paper',
                      border: '1px solid', borderColor: 'divider',
                    }}>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', mb: 0.25 }}>
                        <Chip size="small" sx={{ height: 18, fontSize: '0.62rem' }}
                          label={entry.type === 'vote' ? text.filterVote : entry.type === 'skill' ? text.filterSkill : text.filterEvent}
                          color={ENTRY_COLORS[entry.type] || 'default'} />
                        {entry.visibility === 'st-only' && (
                          <Chip label="ST" size="small" color="warning" sx={{ height: 18, fontSize: '0.62rem' }} />
                        )}
                        <Chip label={phaseLabel(entry.phase, text)} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
                        <Box sx={{ flex: 1 }} />
                        <IconButton size="small" sx={{ p: 0.25 }} onClick={() => handleStartEdit(entry)}>
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" sx={{ p: 0.25 }} color="error" onClick={() => removeLogEntry(entry.id)}>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>

                      {editingId === entry.id ? (
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                          <TextField size="small" fullWidth autoFocus value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(entry.id) } }} />
                          <IconButton size="small" color="primary" onClick={() => handleSaveEdit(entry.id)}>
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setEditingId(null)}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{entry.detail}</Typography>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
            </AccordionDetails>
          </Accordion>
          )
        })}
      </DialogContent>
    </Dialog>
  )

  return createPortal(modal, document.body)
}
