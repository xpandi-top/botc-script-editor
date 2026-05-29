import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, Box, IconButton, Typography,
  Chip, TextField, Tooltip, ToggleButton, ToggleButtonGroup,
  Slider, Autocomplete,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import BrushIcon from '@mui/icons-material/Brush'
import ForumIcon from '@mui/icons-material/Forum'
import UndoIcon from '@mui/icons-material/Undo'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import type { Language } from '../../types'
import { getDisplayName, getIconForCharacter } from '../../catalog'
import { makeT, makeTpl } from '../../lib/t'
import {
  COMMUNICATION_PHRASES,
  joinCharacterNames,
  type CharacterPhraseTemplate,
  type MultiCharacterPhraseTemplate,
  type NumberPhraseTemplate,
  type PhraseTemplate,
} from './CommunicationBoardPhrases'

const DRAW_COLORS = ['#000000', '#1a1a2e', '#e63946', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#ffffff']

// ── Draw canvas ───────────────────────────────────────────────────

interface DrawState {
  color: string
  size: number
  tool: 'pen' | 'eraser'
}

function useCanvas(drawState: DrawState) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const history = useRef<ImageData[]>([])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * dpr, y: (t.clientY - rect.top) * dpr }
    }
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr,
    }
  }

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    history.current = [...history.current.slice(-19), ctx.getImageData(0, 0, canvas.width, canvas.height)]
  }, [])

  const undo = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || history.current.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const last = history.current.pop()!
    ctx.putImageData(last, 0, 0)
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    saveHistory()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [saveHistory])

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault()
    saveHistory()
    isDrawing.current = true
    lastPos.current = getPos(e)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveHistory, drawState])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault()
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    if (!pos || !lastPos.current) return
    const dpr = window.devicePixelRatio || 1
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = drawState.tool === 'eraser' ? '#ffffff' : drawState.color
    ctx.lineWidth   = drawState.size * dpr * (drawState.tool === 'eraser' ? 4 : 1)
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastPos.current = pos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawState])

  const endDraw = useCallback(() => {
    isDrawing.current = false
    lastPos.current = null
  }, [])

  return { canvasRef, initCanvas, clearCanvas, undo, startDraw, draw, endDraw }
}

// ── Main component ────────────────────────────────────────────────

interface CommunicationBoardProps {
  open: boolean
  onClose: () => void
  /** Character IDs from the active script */
  scriptCharacters: string[]
  language: Language
}

export function CommunicationBoard({ open, onClose, scriptCharacters, language }: CommunicationBoardProps) {
  const t = makeT(language)
  const tpl = makeTpl(language)

  // text board state
  const [tab, setTab] = useState<'text' | 'draw'>('text')
  const [boardText, setBoardText] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [pendingN, setPendingN] = useState<NumberPhraseTemplate | null>(null)
  const [pendingChar, setPendingChar] = useState<CharacterPhraseTemplate | null>(null)
  const [pendingMultiChar, setPendingMultiChar] = useState<MultiCharacterPhraseTemplate | null>(null)
  const [nValue, setNValue] = useState(1)
  const [selectedChar, setSelectedChar] = useState<string | null>(null)
  const [selectedChars, setSelectedChars] = useState<string[]>([])

  // draw state
  const [drawState, setDrawState] = useState<DrawState>({ color: '#000000', size: 4, tool: 'pen' })
  const { canvasRef, initCanvas, clearCanvas, undo, startDraw, draw, endDraw } = useCanvas(drawState)

  useEffect(() => {
    if (tab === 'draw' && open) {
      // Give time for dialog to render
      setTimeout(initCanvas, 50)
    }
  }, [tab, open, initCanvas])

  const appendText = (text: string) => {
    setBoardText(prev => prev ? `${prev}\n${text}` : text)
  }

  const handlePhrase = (phrase: PhraseTemplate) => {
    if (phrase.kind === 'plain') {
      appendText(t(phrase.labelKey))
    } else if (phrase.kind === 'number') {
      setPendingN(phrase)
      setPendingChar(null)
      setPendingMultiChar(null)
      setNValue(1)
    } else if (phrase.kind === 'character') {
      setPendingChar(phrase)
      setPendingN(null)
      setPendingMultiChar(null)
      setSelectedChar(null)
    } else if (phrase.kind === 'multi-character') {
      setPendingMultiChar(phrase)
      setPendingN(null)
      setPendingChar(null)
      setSelectedChars([])
    }
  }

  const applyNPhrase = () => {
    if (!pendingN) return
    appendText(tpl(pendingN.labelKey, nValue))
    setPendingN(null)
  }

  const applyCharPhrase = () => {
    if (!pendingChar || !selectedChar) return
    const charName = getDisplayName(selectedChar, language)
    appendText(tpl(pendingChar.labelKey, charName))
    setPendingChar(null)
    setSelectedChar(null)
  }

  const applyMultiCharPhrase = () => {
    if (!pendingMultiChar || selectedChars.length === 0) return
    const names = selectedChars.map(id => getDisplayName(id, language))
    const joined = joinCharacterNames(names, language)
    appendText(tpl(pendingMultiChar.labelKey, joined))
    setPendingMultiChar(null)
    setSelectedChars([])
  }

  const phrasePreview = (phrase: PhraseTemplate): string => {
    switch (phrase.kind) {
      case 'plain':
        return t(phrase.labelKey)
      case 'number':
        return tpl(phrase.labelKey, 'N')
      case 'character':
        return tpl(phrase.labelKey, t('character'))
      case 'multi-character':
        return tpl(phrase.labelKey, t('characters'))
    }
  }

  // auto font size based on text length
  const fontSize = boardText.length === 0 ? 48
    : boardText.length < 30 ? 56
    : boardText.length < 60 ? 42
    : boardText.length < 120 ? 32
    : 24

  const charOptions = scriptCharacters.map(id => ({
    id,
    label: getDisplayName(id, language),
    icon: getIconForCharacter(id),
  }))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      sx={{ zIndex: 1400 }}
    >
      {/* Header */}
      <DialogTitle sx={{ pb: 0, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <ForumIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" sx={{ flex: 1 }}>
          {t('communication_board')}
        </Typography>
        <ToggleButtonGroup value={tab} exclusive size="small"
          onChange={(_, v) => { if (v) setTab(v) }} sx={{ mr: 1 }}>
          <ToggleButton value="text" sx={{ px: 1.5 }}>
            <EditIcon sx={{ fontSize: 16, mr: 0.5 }} />
            {t('communication_text')}
          </ToggleButton>
          <ToggleButton value="draw" sx={{ px: 1.5 }}>
            <BrushIcon sx={{ fontSize: 16, mr: 0.5 }} />
            {t('communication_draw')}
          </ToggleButton>
        </ToggleButtonGroup>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, pt: 1.5, overflow: 'hidden', pb: 1.5 }}>

        {/* ── TEXT BOARD ── */}
        {tab === 'text' && (
          <>
            {/* ── White board — grows to fill space ── */}
            <Box
              sx={{
                flex: 1,
                minHeight: 120,
                bgcolor: '#ffffff',
                border: '2px solid',
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                position: 'relative',
                overflow: 'auto',
                boxShadow: 'inset 0 1px 8px rgba(0,0,0,0.06)',
              }}
            >
              {boardText ? (
                <Typography
                  sx={{
                    fontSize: `${fontSize}px`,
                    fontWeight: 700,
                    color: '#111111',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    letterSpacing: '0.01em',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    width: '100%',
                  }}
                >
                  {boardText}
                </Typography>
              ) : (
                <Typography sx={{ color: '#ccc', fontSize: 18, fontStyle: 'italic', textAlign: 'center' }}>
                  {t('communication_empty_hint')}
                </Typography>
              )}
              {boardText && (
                <IconButton
                  size="small"
                  onClick={() => setBoardText('')}
                  sx={{ position: 'absolute', top: 6, right: 6, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* ── Pending configs (appear between board and phrase bar) ── */}
            {pendingN && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1.5, flexShrink: 0, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 120 }}>
                  {tpl(pendingN.labelKey, nValue)}
                </Typography>
                <IconButton size="small" onClick={() => setNValue(v => Math.max(1, v - 1))}><RemoveIcon fontSize="small" /></IconButton>
                <Typography sx={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{nValue}</Typography>
                <IconButton size="small" onClick={() => setNValue(v => Math.min(20, v + 1))}><AddIcon fontSize="small" /></IconButton>
                <Chip label={t('add')} color="primary" size="small" onClick={applyNPhrase} />
                <Chip label={t('cancel')} size="small" onClick={() => setPendingN(null)} />
              </Box>
            )}

            {pendingChar && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1.5, flexShrink: 0, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ flexShrink: 0, mr: 0.5 }}>
                  {phrasePreview(pendingChar)}
                </Typography>
                <Autocomplete
                  options={charOptions}
                  getOptionLabel={(o) => o.label}
                  size="small"
                  sx={{ minWidth: 160, flex: 1 }}
                  slotProps={{ popper: { sx: { zIndex: 1500 } } }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {option.icon && <Box component="img" src={option.icon} sx={{ width: 20, height: 20, borderRadius: '50%' }} />}
                      <Typography variant="body2">{option.label}</Typography>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} label={t('communication_select_character')} />
                  )}
                  onChange={(_, val) => setSelectedChar(val?.id ?? null)}
                />
                <Chip label={t('add')} color="primary" size="small" disabled={!selectedChar} onClick={applyCharPhrase} />
                <Chip label={t('cancel')} size="small" onClick={() => setPendingChar(null)} />
              </Box>
            )}

            {pendingMultiChar && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, p: 1, bgcolor: 'action.hover', borderRadius: 1.5, flexShrink: 0 }}>
                <Autocomplete
                  multiple
                  options={charOptions}
                  getOptionLabel={(o) => o.label}
                  size="small"
                  value={charOptions.filter(o => selectedChars.includes(o.id))}
                  slotProps={{ popper: { sx: { zIndex: 1500 } } }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {option.icon && <Box component="img" src={option.icon} sx={{ width: 20, height: 20, borderRadius: '50%' }} />}
                      <Typography variant="body2">{option.label}</Typography>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} label={`${phrasePreview(pendingMultiChar)} - ${t('communication_multiselect_suffix')}`} />
                  )}
                  onChange={(_, vals) => setSelectedChars(vals.map(v => v.id))}
                />
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  <Chip label={t('add')} color="primary" size="small"
                    disabled={selectedChars.length === 0} onClick={applyMultiCharPhrase} />
                  <Chip label={t('cancel')} size="small" onClick={() => setPendingMultiChar(null)} />
                </Box>
              </Box>
            )}

            {/* ── Phrases + custom input — fixed at bottom ── */}
            <Box sx={{ flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 1 }}>
                {COMMUNICATION_PHRASES.map(phrase => {
                  const isActive = pendingN?.key === phrase.key || pendingChar?.key === phrase.key || pendingMultiChar?.key === phrase.key
                  const label = phrasePreview(phrase)
                  return (
                    <Tooltip key={phrase.key} title={label} placement="top" arrow>
                      <Chip
                        label={label}
                        onClick={() => handlePhrase(phrase)}
                        size="small"
                        variant={isActive ? 'filled' : 'outlined'}
                        color={isActive ? 'primary' : 'default'}
                        sx={{
                          fontWeight: phrase.kind !== 'plain' ? 600 : 400,
                          borderStyle: phrase.kind !== 'plain' ? 'dashed' : 'solid',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                        }}
                      />
                    </Tooltip>
                  )
                })}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth size="small"
                  label={t('communication_custom_text')}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customInput.trim()) {
                      appendText(customInput.trim())
                      setCustomInput('')
                    }
                  }}
                  placeholder={t('communication_add_hint')}
                />
                <Chip
                  label={t('add')}
                  color="primary"
                  disabled={!customInput.trim()}
                  onClick={() => {
                    if (customInput.trim()) { appendText(customInput.trim()); setCustomInput('') }
                  }}
                />
              </Box>
            </Box>
          </>
        )}

        {/* ── DRAW BOARD ── */}
        {tab === 'draw' && (
          <>
            {/* Draw toolbar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
              {/* Tool */}
              <ToggleButtonGroup value={drawState.tool} exclusive size="small"
                onChange={(_, v) => { if (v) setDrawState(s => ({ ...s, tool: v })) }}>
                <ToggleButton value="pen">
                  <Tooltip title={t('communication_pen')}><EditIcon fontSize="small" /></Tooltip>
                </ToggleButton>
                <ToggleButton value="eraser">
                  <Tooltip title={t('communication_eraser')}>
                    <Typography sx={{ fontSize: 16, lineHeight: 1 }}>⬜</Typography>
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>

              {/* Color swatches */}
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                {DRAW_COLORS.map(c => (
                  <Box
                    key={c}
                    onClick={() => setDrawState(s => ({ ...s, color: c, tool: 'pen' }))}
                    sx={{
                      width: 22, height: 22, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                      border: drawState.color === c && drawState.tool === 'pen'
                        ? '2.5px solid #2196f3'
                        : c === '#ffffff' ? '1.5px solid #aaa' : '1.5px solid transparent',
                      transition: 'transform 0.1s',
                      '&:hover': { transform: 'scale(1.2)' },
                    }}
                  />
                ))}
                {/* Custom color */}
                <input
                  type="color"
                  value={drawState.color}
                  onChange={e => setDrawState(s => ({ ...s, color: e.target.value, tool: 'pen' }))}
                  style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer' }}
                  title={t('communication_custom_color')}
                />
              </Box>

              {/* Stroke size */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 100 }}>
                <Typography variant="caption" color="text.secondary">{t('communication_stroke_size')}</Typography>
                <Slider
                  value={drawState.size}
                  min={1} max={20} step={1} size="small"
                  onChange={(_, v) => setDrawState(s => ({ ...s, size: v as number }))}
                  sx={{ minWidth: 60 }}
                />
                <Typography variant="caption">{drawState.size}</Typography>
              </Box>

              <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                <Tooltip title={t('undo')}>
                  <IconButton size="small" onClick={undo}><UndoIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title={t('communication_clear_board')}>
                  <IconButton size="small" onClick={clearCanvas} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Canvas */}
            <Box sx={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: 2, overflow: 'hidden', border: '2px solid', borderColor: 'divider' }}>
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  cursor: drawState.tool === 'eraser' ? 'cell' : 'crosshair',
                  touchAction: 'none',
                }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
