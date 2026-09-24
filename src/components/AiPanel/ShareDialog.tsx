/**
 * "Share conversation": send the chat, with the model information behind
 * each answer, to the developers' feedback form ("Chat History"), with an
 * optional comment ("Additional Comment"). Shows exactly what is sent; can
 * also open the form prefilled in a new tab, or copy the text.
 */
import { useMemo, useState } from 'react'
import { Box, Button, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { chatHistoryText, prefilledFormUrl, type FeedbackItem } from '../../lib/ai/feedback'

type Props = {
  open: boolean
  onClose: () => void
  zh: boolean
  /** The conversation as a feedback item, with the given comment. */
  item: (comment?: string) => FeedbackItem
  onSend: (comment?: string) => void
}

export function ShareDialog({ open, onClose, zh, item, onSend }: Props) {
  const [comment, setComment] = useState('')
  const [preview, setPreview] = useState(false)
  const [copied, setCopied] = useState(false)
  // Only while open: building the text walks the whole conversation.
  const text = useMemo(() => (open ? chatHistoryText(item(comment)) : ''), [open, item, comment])

  const close = () => { setComment(''); setPreview(false); setCopied(false); onClose() }
  const copy = () => navigator.clipboard?.writeText(text).then(() => setCopied(true), () => {})
  const openForm = () => {
    const { url, truncated } = prefilledFormUrl(item(comment))
    // A cut conversation: the full text goes to the clipboard to paste over it.
    if (truncated) void copy()
    window.open(url, '_blank', 'noopener')
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontSize: '1rem', pb: 1 }}>{zh ? '发送对话反馈' : 'Send conversation feedback'}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 1.25 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
          {zh
            ? '把这段对话和每条回答的模型信息（模式、模型、用到的资料、校验、耗时）发送到开发者的 Google 反馈表单，用于改进回答。不含 API Key、页面内容和玩家名。'
            : 'Sends this conversation and the model information behind each answer (mode, model, passages used, checks, timing) to the developers\' Google feedback form, to improve answers. No API keys, page text or player names.'}
        </Typography>
        <TextField
          label={zh ? '补充说明（可选）' : 'Comment (optional)'}
          placeholder={zh ? '哪里答得不好？正确答案是什么？' : 'What went wrong? What is the right answer?'}
          value={comment} onChange={(e) => setComment(e.target.value)}
          multiline minRows={2} maxRows={6} size="small" fullWidth
          slotProps={{ htmlInput: { maxLength: 2000 } }}
        />
        <Box>
          <Button size="small" onClick={() => setPreview((v) => !v)} sx={{ px: 0, fontSize: '0.75rem' }}>
            {preview ? (zh ? '收起发送内容' : 'Hide what is sent') : (zh ? `查看发送内容（${text.length} 字）` : `Show what is sent (${text.length} characters)`)}
          </Button>
          <Collapse in={preview}>
            <Box component="pre" sx={{ m: 0, mt: 0.5, p: 1, maxHeight: 240, overflow: 'auto', fontSize: '0.68rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', bgcolor: 'action.hover', borderRadius: 1 }}>
              {text}
            </Box>
          </Collapse>
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5 }}>
        <Button size="small" onClick={() => void copy()}>{copied ? (zh ? '已复制' : 'Copied') : (zh ? '复制' : 'Copy')}</Button>
        <Button size="small" onClick={openForm}>{zh ? '在 Google 表单中打开' : 'Open in Google Forms'}</Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={close}>{zh ? '取消' : 'Cancel'}</Button>
        <Button size="small" variant="contained" onClick={() => { onSend(comment); close() }}>{zh ? '发送' : 'Send'}</Button>
      </DialogActions>
    </Dialog>
  )
}
