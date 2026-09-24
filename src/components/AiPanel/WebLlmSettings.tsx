import { useSyncExternalStore } from 'react'
import { Alert, Box, Button, LinearProgress, Typography } from '@mui/material'
import { useT } from '../../context/I18nContext'
import { getWebLlmState, subscribeWebLlm, supportsWebLlm, loadWebLlm, unloadWebLlm } from '../../lib/ai/runtime/webllm'

export function WebLlmSettings({ model }: { model: string }) {
  const { language } = useT()
  const zh = language === 'zh'
  const state = useSyncExternalStore(subscribeWebLlm, getWebLlmState)
  const busy = state.status === 'loading' || state.status === 'generating'
  const ready = state.model === model && state.status === 'ready'
  const supported = supportsWebLlm()
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Typography variant="caption">
        {zh ? '无需 API Key。首次下载需要联网并占用较多存储；模型在此设备运行，不会自动转用在线服务。刷新后请重新加载，已缓存文件会复用。' : 'No API key. The first download needs internet and substantial storage. Inference stays on this device, with no cloud fallback. Reload after refresh; cached files are reused.'}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {zh ? '建议先试 1.7B；设备资源不足可选 0.6B。浏览器清理缓存后需重新下载。资料与模型均已缓存时可断网使用；本版本尚不保证完整应用的离线冷启动。' : 'Try 1.7B first, or 0.6B for smaller devices. Cleared browser caches require a new download. Offline use needs cached models and data; full offline cold-start is not guaranteed yet.'}
      </Typography>
      {!supported && <Alert severity="warning">{zh ? '此浏览器未提供 WebGPU，请使用支持 WebGPU 的桌面浏览器。' : 'WebGPU is unavailable. Use a desktop browser with WebGPU support.'}</Alert>}
      {state.status === 'error' && <Alert severity="error">{state.detail}</Alert>}
      {state.status === 'loading' && <>
        <LinearProgress variant="determinate" value={state.progress * 100} />
        <Typography variant="caption" role="status">{zh ? '下载 / 加载中' : 'Downloading / loading'} · {Math.round(state.progress * 100)}%</Typography>
      </>}
      {ready && <Typography variant="caption" color="success.main" role="status">{zh ? '本地模型已就绪，可以开始聊天' : 'Local model ready to chat'}</Typography>}
      {state.status === 'generating' && <Typography variant="caption" role="status">{zh ? '正在本地生成…' : 'Generating locally…'}</Typography>}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" variant="outlined" disabled={!supported || busy || ready}
          onClick={() => { void loadWebLlm(model).catch(() => { /* error shown in state */ }) }}>
          {zh ? '下载并加载模型' : 'Download / load model'}
        </Button>
        <Button size="small" disabled={!busy && !ready} onClick={unloadWebLlm}>
          {busy ? (zh ? '取消并释放' : 'Cancel / release') : (zh ? '释放内存' : 'Release memory')}
        </Button>
      </Box>
    </Box>
  )
}
