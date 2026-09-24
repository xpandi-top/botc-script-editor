/**
 * Under each answer: rate it (👍 / 👎 with reasons), copy it, and see how it
 * was produced. Ratings go to the developers with the question, the answer
 * and its trace (src/lib/ai/feedback.ts) to tune prompts, retrieval and models.
 */
import { useState } from 'react'
import { Box, Button, Chip, IconButton, TextField, Tooltip, Typography } from '@mui/material'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { FEEDBACK_REASONS, REASON_LABELS, traceLine, type FeedbackRating, type FeedbackReason } from '../../lib/ai/feedback'
import type { AiMessage } from './types'

type Props = {
  message: AiMessage
  zh: boolean
  onRate: (msgId: string, rating: FeedbackRating, reasons?: FeedbackReason[], comment?: string) => void
}

const icon = { fontSize: 13 }

export function AnswerFeedback({ message, zh, onRate }: Props) {
  const [asking, setAsking] = useState(false)
  const [reasons, setReasons] = useState<FeedbackReason[]>([])
  const [comment, setComment] = useState('')
  const [details, setDetails] = useState(false)
  const [copied, setCopied] = useState(false)
  const rated = message.feedback?.rating

  const copy = () => {
    void navigator.clipboard?.writeText(message.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }, () => {})
  }
  const submitDown = () => {
    onRate(message.id, 'down', reasons, comment)
    setAsking(false)
  }
  const state = message.feedback?.state
  const thanks = state === 'sent' ? (zh ? '已提交，谢谢' : 'Sent, thanks')
    : state === 'queued' ? (zh ? '已保存，联网后提交' : 'Saved; sent when online')
    : state === 'local' ? (zh ? '已记录（未配置服务器）' : 'Noted (no server configured)') : ''

  return (
    <Box sx={{ ml: 0.5, mt: 0.2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <Tooltip title={zh ? '回答准确' : 'Accurate'}>
          <span>
            <IconButton size="small" aria-label={zh ? '回答准确' : 'Accurate'} disabled={Boolean(rated)} sx={{ p: 0.3 }}
              onClick={() => onRate(message.id, 'up')}>
              {rated === 'up' ? <ThumbUpIcon sx={icon} color="primary" /> : <ThumbUpOutlinedIcon sx={icon} />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={zh ? '回答有问题' : 'Something is wrong'}>
          <span>
            <IconButton size="small" aria-label={zh ? '回答有问题' : 'Something is wrong'} disabled={Boolean(rated)} sx={{ p: 0.3 }}
              onClick={() => setAsking((v) => !v)}>
              {rated === 'down' ? <ThumbDownIcon sx={icon} color="error" /> : <ThumbDownOutlinedIcon sx={icon} />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={copied ? (zh ? '已复制' : 'Copied') : (zh ? '复制回答' : 'Copy answer')}>
          <IconButton size="small" aria-label={zh ? '复制回答' : 'Copy answer'} sx={{ p: 0.3 }} onClick={copy}>
            <ContentCopyIcon sx={icon} />
          </IconButton>
        </Tooltip>
        {message.trace && (
          <Tooltip title={zh ? '回答是怎么来的' : 'How this answer was made'}>
            <IconButton size="small" aria-label={zh ? '诊断信息' : 'Diagnostics'} sx={{ p: 0.3 }} onClick={() => setDetails((v) => !v)}>
              <InfoOutlinedIcon sx={icon} color={details ? 'primary' : undefined} />
            </IconButton>
          </Tooltip>
        )}
        {thanks && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', ml: 0.5 }}>{thanks}</Typography>}
      </Box>

      {details && message.trace && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem', lineHeight: 1.4, mt: 0.25, overflowWrap: 'anywhere' }}>
          {traceLine(message.trace, zh)}
        </Typography>
      )}

      {asking && !rated && (
        <Box sx={{ mt: 0.5, p: 0.75, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'grid', gap: 0.6 }}>
          <Typography variant="caption" sx={{ fontSize: '0.68rem' }}>{zh ? '哪里有问题？（可多选）' : 'What is wrong? (pick any)'}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {FEEDBACK_REASONS.map((reason) => {
              const on = reasons.includes(reason)
              return (
                <Chip key={reason} size="small" label={REASON_LABELS[reason][zh ? 0 : 1]}
                  color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'}
                  onClick={() => setReasons((list) => on ? list.filter((r) => r !== reason) : [...list, reason])}
                  sx={{ fontSize: '0.62rem', height: 20 }} />
              )
            })}
          </Box>
          <TextField size="small" multiline minRows={1} maxRows={4} value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder={zh ? '正确答案或说明（可选）' : 'The right answer, or a note (optional)'}
            slotProps={{ htmlInput: { maxLength: 2000, style: { fontSize: '0.72rem' } } }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
            {zh ? '提交会发送这段问答及诊断信息（模型、检索到的资料、耗时），不含 API Key、页面内容和玩家名，用于改进回答。' : 'Sends this question and answer with diagnostics (model, passages used, timing) — no API keys, page text or player names — to improve answers.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button size="small" variant="contained" disabled={!reasons.length && !comment.trim()} onClick={submitDown} sx={{ fontSize: '0.68rem', py: 0.2 }}>
              {zh ? '提交' : 'Send'}
            </Button>
            <Button size="small" onClick={() => setAsking(false)} sx={{ fontSize: '0.68rem', py: 0.2 }}>{zh ? '取消' : 'Cancel'}</Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}
