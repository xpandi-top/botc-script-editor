import { useEffect, useState } from 'react'
import { Alert, Box, Typography } from '@mui/material'
import { useT } from '../../context/I18nContext'
import { getHostedStatus, type HostedStatus } from '../../lib/ai/runtime/hosted'

/** The BOTC hosted AI: what it sends where, its limits, and whether the server offers it. */
export function HostedAiSettings() {
  const { language } = useT()
  const zh = language === 'zh'
  const [status, setStatus] = useState<HostedStatus | null>(null)
  useEffect(() => {
    let live = true
    void getHostedStatus().then((s) => { if (live) setStatus(s) })
    return () => { live = false }
  }, [])
  const limits = status?.dailyLimits
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Typography variant="caption">
        {zh
          ? '免费，无需 API Key。问题、最近的对话和当前页面的相关资料会发送到 BOTC 服务器，由 Cloudflare Workers AI 回答；AI 可以查询角色、规则并校验剧本。需要完全离线请选 WebLLM。'
          : 'Free, no API key. Your question, recent messages and relevant page data are sent to the BOTC server and answered by Cloudflare Workers AI, which can look up characters and rules and check scripts. For fully offline use choose WebLLM.'}
      </Typography>
      {status?.available && (
        <Typography variant="caption" color="text.secondary" role="status">
          {zh ? '已连接' : 'Connected'} · {status.model}
          {limits?.perIp ? (zh
            ? ` · 每天 ${limits.perIp} 次${limits.perUser ? `（登录 Google 后 ${limits.perUser} 次）` : ''}`
            : ` · ${limits.perIp} requests/day${limits.perUser ? ` (${limits.perUser} when signed in with Google)` : ''}`) : ''}
        </Typography>
      )}
      {status && !status.available && (
        <Alert severity="warning">
          {zh ? 'BOTC 服务器暂未提供 AI，请选择其他模型。' : 'The BOTC server does not offer AI right now; choose another model.'}
        </Alert>
      )}
    </Box>
  )
}
