import { useEffect, useState, useSyncExternalStore } from 'react'
import { Alert, Box, Button, LinearProgress, Typography } from '@mui/material'
import { useT } from '../../context/I18nContext'
import { deleteWebLlm, getWebLlmState, webLlmCacheState, subscribeWebLlm, supportsWebLlm, loadWebLlm, unloadWebLlm, type WebLlmCache } from '../../lib/ai/runtime/webllm'

export function WebLlmSettings({ model }: { model: string }) {
  const { language } = useT()
  const zh = language === 'zh'
  const state = useSyncExternalStore(subscribeWebLlm, getWebLlmState)
  const busy = state.status === 'loading' || state.status === 'generating'
  const ready = state.model === model && state.status === 'ready'
  const supported = supportsWebLlm()
  // Downloaded files, checked again after each load or delete.
  const [cache, setCache] = useState<WebLlmCache>('none')
  const [checked, setChecked] = useState(0)
  useEffect(() => {
    let live = true
    void webLlmCacheState(model).then((value) => { if (live) setCache(value) })
    return () => { live = false }
  }, [model, state.status, checked])
  const cached = cache !== 'none'
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Typography variant="caption">
        {zh ? '无需 API Key。数量、配置、能力原文、剧本信息由程序直接回答（不经过模型，更准确）；模型只回答解释、建议、比较类问题，在本机运行，不会转用在线服务。' : 'No API key. Counts, line-ups, official text and script facts are answered by the program (exact, no model); the model only handles explanations, advice and comparisons, on this device, with no cloud fallback.'}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {zh ? '首次下载需联网：1.7B 约 1 GB，0.6B 约 0.4 GB（设备较弱时选 0.6B）。下载后刷新页面会自动从本机缓存加载；应用与资料在访问过一次后可完全离线使用。浏览器清理站点数据后需重新下载。' : 'The first download needs internet: 1.7B is about 1 GB, 0.6B about 0.4 GB (for smaller devices). After that, the model loads from this device automatically on refresh, and the app and its data work fully offline after one visit. Clearing site data means downloading again.'}
      </Typography>
      {!supported && <Alert severity="warning">{zh ? '此浏览器未提供 WebGPU，请使用支持 WebGPU 的桌面浏览器。' : 'WebGPU is unavailable. Use a desktop browser with WebGPU support.'}</Alert>}
      {state.status === 'error' && <Alert severity="error">{state.detail}</Alert>}
      {state.status === 'loading' && <>
        <LinearProgress variant="determinate" value={state.progress * 100} />
        <Typography variant="caption" role="status">{zh ? '下载 / 加载中' : 'Downloading / loading'} · {Math.round(state.progress * 100)}%</Typography>
      </>}
      {ready && <Typography variant="caption" color="success.main" role="status">{zh ? '本地模型已就绪，可以开始聊天' : 'Local model ready to chat'}</Typography>}
      {cache === 'complete' && state.status !== 'loading' && <Typography variant="caption" color="text.secondary">{zh ? '已完整下载到本机，可离线加载' : 'Fully downloaded to this device; loads offline'}</Typography>}
      {cache === 'partial' && state.status !== 'loading' && <Typography variant="caption" color="warning.main">{ready
        ? (zh ? '部分模型文件未存入本机缓存，离线时无法加载；联网时重新加载可补全。' : 'Some model files are not in the cache, so it cannot load offline; loading again online fills the gaps.')
        : (zh ? '部分模型文件缺失，联网加载时会补全下载。' : 'Some model files are missing; loading online downloads them.')}</Typography>}
      {state.status === 'generating' && <Typography variant="caption" role="status">{zh ? '正在本地生成…' : 'Generating locally…'}</Typography>}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" disabled={!supported || busy || ready}
          onClick={() => { void loadWebLlm(model).catch(() => { /* error shown in state */ }) }}>
          {cached ? (zh ? '加载模型' : 'Load model') : (zh ? '下载并加载模型' : 'Download / load model')}
        </Button>
        <Button size="small" disabled={!busy && !ready} onClick={unloadWebLlm}>
          {busy ? (zh ? '取消并释放' : 'Cancel / release') : (zh ? '释放内存' : 'Release memory')}
        </Button>
        {cached && !busy && (
          <Button size="small" color="error" onClick={() => { void deleteWebLlm(model).finally(() => setChecked((n) => n + 1)) }}>
            {zh ? '删除模型文件' : 'Delete model files'}
          </Button>
        )}
      </Box>
    </Box>
  )
}
