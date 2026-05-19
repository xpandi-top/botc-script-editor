import { useState, useRef, useEffect } from 'react'
import {
  Box, Dialog, DialogTitle, DialogContent, IconButton, TextField,
  Button, MenuItem, Select, Tabs, Tab, Typography, Chip,
  CircularProgress, Divider, Tooltip, Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import SettingsIcon from '@mui/icons-material/Settings'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import {
  loadAiSettings, saveAiSettings, PROVIDER_MODELS, getDefaultModel,
  type AiProvider, type AiSettings,
} from '../lib/aiSettings'
import { geminiGenerate, GeminiError } from '../lib/gemini'

type Message = {
  role: 'user' | 'assistant' | 'error'
  content: string
}

const PROVIDER_LABELS: Record<AiProvider, string> = {
  groq:       'Groq',
  openrouter: 'OpenRouter',
  gemini:     'Gemini',
}

type Props = {
  open: boolean
  onClose: () => void
  /** Pre-fill first message */
  initialPrompt?: string
  language?: 'en' | 'zh'
}

export function AiChatDialog({ open, onClose, initialPrompt, language = 'en' }: Props) {
  const zh = language === 'zh'
  const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings())
  const [showSettings, setShowSettings] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState(initialPrompt ?? '')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Re-read settings when dialog opens
  useEffect(() => {
    if (open) {
      setSettings(loadAiSettings())
      setInput(initialPrompt ?? '')
    }
  }, [open])

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

  const handleProviderChange = (p: AiProvider) => {
    patchSettings({ provider: p, model: getDefaultModel(p) })
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)

    // Build conversation history (skip error messages)
    const history = [...messages, userMsg]
      .filter((m) => m.role !== 'error')
      .map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }],
      }))

    try {
      const res = await geminiGenerate({
        contents: history,
        temperature: 0.7,
      })
      setMessages((m) => [...m, { role: 'assistant', content: res.text }])
    } catch (e) {
      const msg = e instanceof GeminiError ? e.message : String(e)
      setMessages((m) => [...m, { role: 'error', content: msg }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const currentModel = settings.model
  const models = PROVIDER_MODELS[settings.provider]
  const apiKey = settings.keys[settings.provider]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { height: '80vh', display: 'flex', flexDirection: 'column' } } }}>
      <DialogTitle sx={{ pb: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Box sx={{ flex: 1 }}>{zh ? 'AI 助手' : 'AI Assistant'}</Box>
        <Tooltip title={zh ? '设置' : 'Settings'}>
          <IconButton size="small" onClick={() => setShowSettings((v) => !v)}
            sx={{ color: showSettings ? 'primary.main' : 'text.secondary' }}>
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

      {/* Settings panel */}
      {showSettings && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          {/* Provider tabs */}
          <Tabs value={settings.provider} onChange={(_: unknown, v: unknown) => handleProviderChange(v as AiProvider)}
            variant="fullWidth" sx={{ mb: 1, minHeight: 32, '& .MuiTabs-indicator': { height: 2 } }}>
            {(['groq', 'openrouter', 'gemini'] as AiProvider[]).map((p) => (
              <Tab key={p} value={p} label={PROVIDER_LABELS[p]}
                sx={{ minHeight: 32, py: 0, fontSize: '0.75rem', textTransform: 'none' }} />
            ))}
          </Tabs>

          {/* Model selector */}
          <Select size="small" fullWidth value={currentModel}
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

          {/* API key field */}
          <TextField size="small" fullWidth
            label={`${PROVIDER_LABELS[settings.provider]} API Key`}
            type="password"
            value={apiKey ?? ''}
            onChange={(e) => patchSettings({ keys: { [settings.provider]: e.target.value } as AiSettings['keys'] })}
            placeholder="Paste key here — stored in localStorage only"
            sx={{ '& input': { fontSize: '0.8rem' } }}
          />
        </Box>
      )}

      <Divider />

      {/* Messages */}
      <DialogContent sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {messages.length === 0 && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, gap: 1 }}>
            <AutoAwesomeIcon sx={{ fontSize: 40 }} />
            <Typography variant="body2">
              {zh ? `使用 ${PROVIDER_LABELS[settings.provider]} · ${currentModel}` : `Using ${PROVIDER_LABELS[settings.provider]} · ${currentModel}`}
            </Typography>
          </Box>
        )}
        {messages.map((m, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <Paper elevation={0} sx={{
              px: 1.5, py: 0.75,
              maxWidth: '85%',
              bgcolor: m.role === 'user'
                ? 'primary.main'
                : m.role === 'error'
                  ? 'error.light'
                  : 'action.selected',
              color: m.role === 'user' ? 'primary.contrastText' : m.role === 'error' ? 'error.contrastText' : 'text.primary',
              borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              whiteSpace: 'pre-wrap',
              fontSize: '0.85rem',
              lineHeight: 1.55,
            }}>
              {m.content}
            </Paper>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">{zh ? '思考中…' : 'Thinking…'}</Typography>
          </Box>
        )}
        <div ref={bottomRef} />
      </DialogContent>

      <Divider />

      {/* Input */}
      <Box sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          inputRef={inputRef}
          size="small" fullWidth multiline maxRows={4}
          placeholder={zh ? '输入消息…' : 'Type a message…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          disabled={loading}
        />
        <Button variant="contained" size="small"
          onClick={handleSend}
          disabled={loading || !input.trim() || !apiKey?.trim()}
          sx={{ minWidth: 0, px: 1.5, py: 0.85, flexShrink: 0 }}>
          {loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon fontSize="small" />}
        </Button>
      </Box>
    </Dialog>
  )
}
