import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Box, Dialog, DialogTitle, DialogContent, IconButton, TextField,
  Button, MenuItem, Select, Tabs, Tab, Typography, Chip,
  CircularProgress, Divider, Tooltip, Paper, Collapse,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import SettingsIcon from '@mui/icons-material/Settings'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import DownloadIcon from '@mui/icons-material/Download'
import UndoIcon from '@mui/icons-material/Undo'
import CheckIcon from '@mui/icons-material/Check'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {
  loadAiSettings, saveAiSettings, PROVIDER_MODELS, getDefaultModel,
  type AiProvider, type AiSettings,
} from '../lib/aiSettings'
import { geminiGenerate, GeminiError } from '../lib/gemini'
import { buildGlossaryPrompt } from '../lib/botcGlossary'
import {
  serializeContextForPrompt, type AgentContext, type FillAction, type AgentResponse,
} from '../lib/agentContext'
import {
  appendFillLog, getFillLogForForm, markUndone, exportFillLogMd,
  type FillLogEntry,
} from '../lib/fillLog'

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  fills?: FillAction[]      // proposed fills from this message
  appliedFills?: string[]   // field keys already applied
}

const PROVIDER_LABELS: Record<AiProvider, string> = {
  groq:       'Groq',
  openrouter: 'OpenRouter',
  gemini:     'Gemini',
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx?: AgentContext): string {
  const glossary = buildGlossaryPrompt('zh')
  const ctxSection = ctx ? `\n\n${serializeContextForPrompt(ctx)}` : ''
  return `\
You are an AI assistant for Blood on the Clocktower (BotC) custom character authoring.
Help the user create, translate, and refine characters and scripts.

${glossary}
${ctxSection}

When the user asks you to fill, translate, suggest, or generate content for a specific field,
respond with JSON in this exact format (no markdown fences, no extra text):
{
  "message": "<explanation shown in chat>",
  "fills": [
    { "field": "<fieldKey>", "value": "<value>", "label": "<human label>" }
  ],
  "warning": "<optional warning string>"
}

If no fields to fill, omit "fills". Always include "message".
Field keys available: ${ctx?.fields.map((f) => f.key).join(', ') ?? 'none (no form open)'}.
Only fill fields the user explicitly asks about.`
}

// ── Parse agent response ──────────────────────────────────────────────────────

function parseResponse(raw: string): AgentResponse {
  const trimmed = raw.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()
  try {
    return JSON.parse(trimmed) as AgentResponse
  } catch {
    return { message: raw }
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

export type AiChatCallbacks = {
  onFill: (field: string, value: unknown) => void
  onUndo: (field: string, oldValue: unknown) => void
}

type Props = {
  open: boolean
  onClose: () => void
  context?: AgentContext
  callbacks?: AiChatCallbacks
  language?: 'en' | 'zh'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AiChatDialog({ open, onClose, context, callbacks, language = 'en' }: Props) {
  const zh = language === 'zh'
  const [settings, setSettings]     = useState<AiSettings>(() => loadAiSettings())
  const [showSettings, setShowSettings] = useState(false)
  const [showLog, setShowLog]        = useState(false)
  const [showCtx, setShowCtx]        = useState(false)
  const [messages, setMessages]      = useState<Message[]>([])
  const [input, setInput]            = useState('')
  const [loading, setLoading]        = useState(false)
  const [fillLog, setFillLog]        = useState<FillLogEntry[]>([])
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  const formKey = context
    ? `${context.form}:${context.title}`
    : 'none'

  useEffect(() => {
    if (open) {
      setSettings(loadAiSettings())
      setFillLog(getFillLogForForm(formKey))
    }
  }, [open, formKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const patchSettings = (patch: Partial<AiSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch, keys: { ...prev.keys, ...(patch.keys ?? {}) } }
      saveAiSettings(next)
      return next
    })
  }

  const applyFill = useCallback((msgId: string, fill: FillAction, oldValue: unknown) => {
    callbacks?.onFill(fill.field, fill.value)
    const entry = appendFillLog({
      timestamp: Date.now(),
      form: formKey,
      field: fill.field,
      fieldLabel: fill.label ?? fill.field,
      oldValue,
      newValue: fill.value,
      source: 'ai',
      model: settings.model,
    })
    setFillLog((prev) => [entry, ...prev])
    setMessages((msgs) => msgs.map((m) =>
      m.id === msgId
        ? { ...m, appliedFills: [...(m.appliedFills ?? []), fill.field] }
        : m,
    ))
  }, [callbacks, formKey, settings.model])

  const undoFill = useCallback((entry: FillLogEntry) => {
    callbacks?.onUndo(entry.field, entry.oldValue)
    markUndone(entry.id)
    setFillLog((prev) => prev.map((e) => e.id === entry.id ? { ...e, undone: true } : e))
  }, [callbacks])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)

    const history = [...messages, userMsg]
      .filter((m) => m.role !== 'error')
      .map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }],
      }))

    try {
      const res = await geminiGenerate({
        systemInstruction: buildSystemPrompt(context),
        contents: history,
        temperature: 0.6,
      })
      const parsed = parseResponse(res.text)
      setMessages((m) => [...m, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: parsed.message,
        fills: parsed.fills,
        appliedFills: [],
      }])
    } catch (e) {
      const msg = e instanceof GeminiError ? e.message : String(e)
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'error', content: msg }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const downloadLog = () => {
    const md = exportFillLogMd(fillLog)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `botc-ai-log-${Date.now()}.md`; a.click()
    URL.revokeObjectURL(url)
  }

  const apiKey = settings.keys[settings.provider]
  const models = PROVIDER_MODELS[settings.provider]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { height: '82vh', display: 'flex', flexDirection: 'column' } } }}>

      {/* Title bar */}
      <DialogTitle sx={{ pb: 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 18 }} />
        <Box sx={{ flex: 1, fontSize: '1rem', fontWeight: 600 }}>
          {zh ? 'AI 助手' : 'AI Assistant'}
        </Box>
        <Tooltip title={zh ? '设置' : 'Settings'}>
          <IconButton size="small" onClick={() => setShowSettings((v) => !v)}
            color={showSettings ? 'primary' : 'default'}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={zh ? '清除对话' : 'Clear chat'}>
          <IconButton size="small" onClick={() => setMessages([])} disabled={messages.length === 0}>
            <DeleteForeverIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      {/* Context chip */}
      {context && context.form !== 'none' && (
        <Box sx={{ px: 2, pt: 0.5, pb: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip
            size="small"
            icon={<InfoOutlinedIcon sx={{ fontSize: '14px !important' }} />}
            label={`${context.form}: ${context.title}`}
            onClick={() => setShowCtx((v) => !v)}
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 22 }}
          />
          {showCtx && (
            <IconButton size="small" onClick={() => setShowCtx(false)}>
              <CloseIcon sx={{ fontSize: 12 }} />
            </IconButton>
          )}
        </Box>
      )}

      {/* Context field list */}
      <Collapse in={showCtx}>
        <Box sx={{ px: 2, py: 0.5, bgcolor: 'action.hover', fontSize: '0.72rem', fontFamily: 'monospace' }}>
          {context?.fields.map((f) => (
            <Box key={f.key} sx={{ display: 'flex', gap: 1 }}>
              <Box sx={{ color: 'text.secondary', minWidth: 120 }}>{f.key}</Box>
              <Box sx={{ color: 'text.primary', wordBreak: 'break-all' }}>
                {String(f.value || '(empty)')}
              </Box>
            </Box>
          ))}
        </Box>
      </Collapse>

      {/* Settings panel */}
      <Collapse in={showSettings}>
        <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs value={settings.provider}
            onChange={(_: unknown, v: unknown) => {
              const p = v as AiProvider
              patchSettings({ provider: p, model: getDefaultModel(p) })
            }}
            variant="fullWidth" sx={{ mb: 1, minHeight: 32, '& .MuiTabs-indicator': { height: 2 } }}>
            {(['groq', 'openrouter', 'gemini'] as AiProvider[]).map((p) => (
              <Tab key={p} value={p} label={PROVIDER_LABELS[p]}
                sx={{ minHeight: 32, py: 0, fontSize: '0.72rem', textTransform: 'none' }} />
            ))}
          </Tabs>
          <Select size="small" fullWidth value={settings.model}
            onChange={(e) => patchSettings({ model: e.target.value })}
            sx={{ mb: 1, fontSize: '0.8rem' }}>
            {models.map((m) => (
              <MenuItem key={m.id} value={m.id} sx={{ fontSize: '0.8rem' }}>
                {m.label}
                {m.free && <Chip label="free" size="small" color="success"
                  sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} />}
              </MenuItem>
            ))}
          </Select>
          <TextField size="small" fullWidth label={`${PROVIDER_LABELS[settings.provider]} API Key`}
            type="password" value={apiKey ?? ''}
            onChange={(e) => patchSettings({ keys: { [settings.provider]: e.target.value } as AiSettings['keys'] })}
            placeholder="Paste key — stored in localStorage only"
            sx={{ '& input': { fontSize: '0.8rem' } }} />
        </Box>
      </Collapse>

      <Divider />

      {/* Messages */}
      <DialogContent sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {messages.length === 0 && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, gap: 1 }}>
            <AutoAwesomeIcon sx={{ fontSize: 36 }} />
            <Typography variant="body2" align="center">
              {context?.form !== 'none'
                ? (zh ? `正在编辑 "${context?.title}"` : `Editing "${context?.title}"`)
                : (zh ? '未打开任何表单' : 'No form open')}
            </Typography>
            <Typography variant="caption" align="center" sx={{ opacity: 0.7 }}>
              {zh
                ? '说"翻译能力文本"或"建议中文名"等'
                : 'Try "translate ability" or "suggest Chinese name"'}
            </Typography>
          </Box>
        )}

        {messages.map((m) => (
          <Box key={m.id}>
            {/* Bubble */}
            <Box sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <Paper elevation={0} sx={{
                px: 1.5, py: 0.75, maxWidth: '88%',
                bgcolor: m.role === 'user' ? 'primary.main' : m.role === 'error' ? 'error.light' : 'action.selected',
                color: m.role === 'user' ? 'primary.contrastText' : m.role === 'error' ? 'error.contrastText' : 'text.primary',
                borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: 1.55,
              }}>
                {m.content}
              </Paper>
            </Box>

            {/* Fill cards */}
            {m.fills && m.fills.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5, ml: 1 }}>
                {m.fills.map((fill) => {
                  const applied = m.appliedFills?.includes(fill.field)
                  const ctxField = context?.fields.find((f) => f.key === fill.field)
                  return (
                    <Paper key={fill.field} variant="outlined" sx={{ p: 1, borderRadius: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                        <Chip size="small" label={fill.label ?? fill.field}
                          sx={{ fontSize: '0.65rem', height: 18 }} />
                        {applied && <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />}
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.5, wordBreak: 'break-word' }}>
                        {String(fill.value)}
                      </Typography>
                      {!applied && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button size="small" variant="contained" sx={{ py: 0, minHeight: 0, fontSize: '0.7rem' }}
                            onClick={() => applyFill(m.id, fill, ctxField?.value)}>
                            {zh ? '应用' : 'Apply'}
                          </Button>
                          <Button size="small" variant="text" sx={{ py: 0, minHeight: 0, fontSize: '0.7rem', color: 'text.secondary' }}
                            onClick={() => setMessages((msgs) => msgs.map((msg) =>
                              msg.id === m.id
                                ? { ...msg, appliedFills: [...(msg.appliedFills ?? []), fill.field] }
                                : msg,
                            ))}>
                            {zh ? '跳过' : 'Skip'}
                          </Button>
                        </Box>
                      )}
                    </Paper>
                  )
                })}
              </Box>
            )}
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">{zh ? '思考中…' : 'Thinking…'}</Typography>
          </Box>
        )}
        <div ref={bottomRef} />
      </DialogContent>

      <Divider />

      {/* Fill log */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
          onClick={() => setShowLog((v) => !v)}>
          <Typography variant="caption" sx={{ flex: 1, color: 'text.secondary', fontWeight: 600 }}>
            {zh ? `填充记录 (${fillLog.length})` : `Fill Log (${fillLog.length})`}
          </Typography>
          {fillLog.length > 0 && (
            <Tooltip title={zh ? '导出为 Markdown' : 'Export as Markdown'}>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); downloadLog() }}>
                <DownloadIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
          {showLog ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
        </Box>
        <Collapse in={showLog}>
          <Box sx={{ maxHeight: 160, overflowY: 'auto', px: 1.5, pb: 0.75 }}>
            {fillLog.length === 0 && (
              <Typography variant="caption" color="text.secondary">{zh ? '暂无记录' : 'No entries yet'}</Typography>
            )}
            {fillLog.map((entry) => (
              <Box key={entry.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25,
                opacity: entry.undone ? 0.45 : 1, textDecoration: entry.undone ? 'line-through' : 'none' }}>
                <Chip size="small" label={entry.fieldLabel} sx={{ fontSize: '0.6rem', height: 16, flexShrink: 0 }} />
                <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.secondary' }}>
                  {String(entry.newValue)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0, fontSize: '0.6rem' }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </Typography>
                {!entry.undone && (
                  <Tooltip title={zh ? '撤销' : 'Undo'}>
                    <IconButton size="small" onClick={() => undoFill(entry)} sx={{ p: 0.1 }}>
                      <UndoIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ))}
          </Box>
        </Collapse>
      </Box>

      {/* Input */}
      <Box sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField inputRef={inputRef} size="small" fullWidth multiline maxRows={4}
          placeholder={zh ? '输入消息… (Enter 发送)' : 'Type a message… (Enter to send)'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          disabled={loading} />
        <Button variant="contained" size="small"
          onClick={handleSend}
          disabled={loading || !input.trim() || !apiKey?.trim()}
          sx={{ minWidth: 0, px: 1.5, py: 0.85, flexShrink: 0 }}>
          {loading ? <CircularProgress size={14} color="inherit" /> : <SendIcon fontSize="small" />}
        </Button>
      </Box>
    </Dialog>
  )
}
