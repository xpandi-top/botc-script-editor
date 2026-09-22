/**
 * DealMessagePanel — floating chat button + drawer for ST <-> seat messaging.
 * Guest-side (a claimed seat's own thread + broadcasts). The ST-side
 * equivalent is AssignmentCenter's MessagesTab, which needs a seat picker
 * and per-seat unread badges instead of a single fixed thread.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Box, Drawer, IconButton, Paper, Tooltip, TextField, Typography } from '@mui/material'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import CampaignIcon from '@mui/icons-material/Campaign'
import { subscribeSeatMessages, sendMessage, markMessageRead, type DealMessage } from '../lib/DealSession'
import { useT } from '../context/I18nContext'

interface Props {
  sessionId: string
  seatNumber: number
}

export function DealMessagePanel({ sessionId, seatNumber }: Props) {
  const [messages, setMessages] = useState<DealMessage[]>([])
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const { t } = useT()

  useEffect(() => subscribeSeatMessages(sessionId, seatNumber, setMessages), [sessionId, seatNumber])

  const unreadCount = useMemo(
    () => messages.filter((m) => m.from === 'st' && !m.read).length,
    [messages],
  )

  useEffect(() => {
    if (!open) return
    messages.filter((m) => m.from === 'st' && !m.read).forEach((m) => {
      markMessageRead(sessionId, m.id).catch(() => {})
    })
  }, [open, messages, sessionId])

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [open, messages.length])

  const handleSend = async () => {
    if (!draft.trim() || sending) return
    setSending(true)
    try {
      await sendMessage(sessionId, { seatNumber, from: 'seat', text: draft })
      setDraft('')
    } catch (e) {
      console.error('Failed to send message', e)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Tooltip title={t('messages_tab')}>
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed', bottom: 16, right: 16, zIndex: 1200,
            bgcolor: 'primary.main', color: 'primary.contrastText',
            width: 52, height: 52, boxShadow: 4,
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <ChatIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Drawer anchor="bottom" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '70dvh', maxHeight: 560 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('messages_tab')}</Typography>
            <IconButton size="small" onClick={() => setOpen(false)}><CloseIcon /></IconButton>
          </Box>

          <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {messages.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2, fontStyle: 'italic' }}>
                {t('no_messages_yet')}
              </Typography>
            )}
            {messages.map((m) => {
              const mine = m.from === 'seat'
              const broadcast = m.seatNumber === null
              return (
                <Box key={m.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                    {broadcast && <CampaignIcon sx={{ fontSize: 12 }} />}
                    {mine ? t('you_label') : t('storyteller_label')}
                  </Typography>
                  <Paper
                    variant={mine ? 'elevation' : 'outlined'}
                    elevation={mine ? 2 : 0}
                    sx={{
                      px: 1.5, py: 0.75, borderRadius: 2, maxWidth: '80%',
                      bgcolor: mine ? 'primary.main' : 'background.paper',
                      color: mine ? 'primary.contrastText' : 'text.primary',
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</Typography>
                  </Paper>
                </Box>
              )
            })}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('type_a_message_enter_to_send')}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              disabled={sending}
            />
            <IconButton color="primary" onClick={handleSend} disabled={sending || !draft.trim()}>
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Drawer>
    </>
  )
}
