/**
 * ChatTab — message list, fill cards, and input area.
 */

import { RefObject } from 'react'
import {
  Box, Button, CircularProgress, FormControlLabel, Paper,
  Switch, TextField, Typography, Chip, alpha,
} from '@mui/material'
import SendIcon   from '@mui/icons-material/Send'
import CheckIcon  from '@mui/icons-material/Check'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import type { AiMessage, AiChatCallbacks } from './types'
import type { AiContext, FillAction } from '../../lib/ai/types'
import type { Language } from '../../types'

type Props = {
  messages: AiMessage[]
  loading: boolean
  input: string
  setInput: (v: string) => void
  autoApply: boolean
  setAutoApply: (v: boolean) => void
  handleSend: (override?: string) => void
  doApplyFill: (msgId: string, fill: FillAction, oldValue: unknown) => void
  setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>
  context?: AiContext
  callbacks?: AiChatCallbacks
  apiKey?: string
  bottomRef: RefObject<HTMLDivElement | null>
  inputRef: RefObject<HTMLInputElement | null>
  language: Language
}

export function ChatTab({
  messages, loading, input, setInput, autoApply, setAutoApply,
  handleSend, doApplyFill, setMessages, context,
  apiKey, bottomRef, inputRef, language,
}: Props) {
  const zh = language === 'zh'

  return (
    <>
      {/* ── Messages ───────────────────────────────────────────────── */}
      <Box sx={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        p: 1.25, gap: 0.75,
      }}>
        {messages.length === 0 && (
          <Box sx={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            opacity: 0.38, gap: 1.5, py: 4,
          }}>
            <AutoAwesomeIcon sx={{ fontSize: 28 }} />
            <Typography variant="body2" align="center" sx={{ px: 2, fontSize: '0.8rem' }}>
              {context && context.type !== 'general'
                ? (zh ? `正在编辑 "${context.title}"` : `Context: "${context.title}"`)
                : (zh ? '通用 AI 助手' : 'General AI Assistant')}
            </Typography>
            <Typography variant="caption" align="center" sx={{ opacity: 0.8, px: 3 }}>
              {zh ? '使用上方技能按钮或直接输入' : 'Use skill chips above or type a message'}
            </Typography>
          </Box>
        )}

        {messages.map((m) => (
          <Box key={m.id}>
            <Box sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <Paper elevation={0} sx={{
                px: 1.25, py: 0.65, maxWidth: '90%',
                bgcolor:
                  m.role === 'user' ? 'primary.main'
                  : m.role === 'error' ? 'error.light'
                  : (t) => alpha(t.palette.action.selected, 0.6),
                color:
                  m.role === 'user' ? 'primary.contrastText'
                  : m.role === 'error' ? 'error.contrastText'
                  : 'text.primary',
                borderRadius: m.role === 'user' ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                whiteSpace: 'pre-wrap', fontSize: '0.8rem', lineHeight: 1.5,
              }}>
                {m.content}
              </Paper>
            </Box>

            {/* Fill cards */}
            {m.fills && m.fills.length > 0 && !autoApply && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, mt: 0.4, ml: 0.5 }}>
                {m.fills.map((fill) => {
                  const applied  = m.appliedFills?.includes(fill.field)
                  const ctxField = context?.fields.find((f) => f.key === fill.field)
                  return (
                    <Paper key={fill.field} variant="outlined" sx={{ p: 0.875, borderRadius: 1.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
                        <Chip size="small" label={fill.label ?? fill.field} sx={{ fontSize: '0.6rem', height: 16 }} />
                        {applied && <CheckIcon sx={{ fontSize: 12, color: 'success.main' }} />}
                      </Box>
                      <Typography variant="caption" sx={{
                        display: 'block', color: 'text.secondary', mb: 0.4,
                        wordBreak: 'break-word', lineHeight: 1.35,
                      }}>
                        {String(fill.value)}
                      </Typography>
                      {!applied && (
                        <Box sx={{ display: 'flex', gap: 0.4 }}>
                          <Button
                            size="small" variant="contained"
                            sx={{ py: 0, minHeight: 0, fontSize: '0.65rem', lineHeight: 1.5 }}
                            onClick={() => doApplyFill(m.id, fill, ctxField?.value)}
                          >
                            {zh ? '应用' : 'Apply'}
                          </Button>
                          <Button
                            size="small" variant="text"
                            sx={{ py: 0, minHeight: 0, fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1.5 }}
                            onClick={() => setMessages((msgs) =>
                              msgs.map((msg) =>
                                msg.id === m.id
                                  ? { ...msg, appliedFills: [...(msg.appliedFills ?? []), fill.field] }
                                  : msg,
                              ),
                            )}
                          >
                            {zh ? '跳过' : 'Skip'}
                          </Button>
                        </Box>
                      )}
                    </Paper>
                  )
                })}
              </Box>
            )}

            {/* Auto-applied chips */}
            {m.fills && m.fills.length > 0 && autoApply && (
              <Box sx={{ ml: 0.5, mt: 0.25, display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                {m.fills.map((fill) => (
                  <Chip
                    key={fill.field} size="small"
                    icon={<CheckIcon sx={{ fontSize: '11px !important' }} />}
                    label={fill.label ?? fill.field}
                    color="success" variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 17 }}
                  />
                ))}
              </Box>
            )}
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CircularProgress size={12} />
            <Typography variant="caption" color="text.secondary">
              {zh ? '思考中…' : 'Thinking…'}
            </Typography>
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>

      {/* ── Input area ─────────────────────────────────────────────── */}
      <Box sx={{ p: 0.875, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        <FormControlLabel
          control={
            <Switch
              size="small" checked={autoApply}
              onChange={(e) => setAutoApply(e.target.checked)}
            />
          }
          label={
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
              {zh ? '自动应用填充' : 'Auto-apply fills'}
            </Typography>
          }
          sx={{ m: 0 }}
        />
        <Box sx={{ display: 'flex', gap: 0.625, alignItems: 'flex-end' }}>
          <TextField
            inputRef={inputRef}
            size="small" fullWidth multiline maxRows={4}
            placeholder={zh ? '输入消息… (Enter 发送)' : 'Type a message… (Enter to send)'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            disabled={loading}
            sx={{ '& textarea': { fontSize: '0.8rem' } }}
          />
          <Button
            variant="contained" size="small"
            onClick={() => handleSend()}
            disabled={loading || !input.trim() || !apiKey?.trim()}
            sx={{ minWidth: 0, px: 1.1, py: 0.85, flexShrink: 0 }}
          >
            {loading
              ? <CircularProgress size={12} color="inherit" />
              : <SendIcon sx={{ fontSize: 15 }} />}
          </Button>
        </Box>
      </Box>
    </>
  )
}
