/**
 * useAiPanel — state and logic for the AI panel.
 */

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react'
import {
  loadAiSettings, saveAiSettings, isAiAvailable, type AiSettings,
} from '../../lib/aiSettings'
import {
  appendFillLog, getFillLogForForm, markUndone, exportFillLogMd,
  type FillLogEntry,
} from '../../lib/fillLog'
import { getWebLlmState, resumeWebLlm, subscribeWebLlm, unloadWebLlm } from '../../lib/ai/runtime/webllm'
import { getHostedStatus, HOSTED_INPUT_BUDGET } from '../../lib/ai/runtime/hosted'
import { answerLocally } from '../../lib/ai/localAnswer'
import { initWikiSearch } from '../../lib/wikiSearch'
import { BUILD_ID, emptyMeta, PROMPT_VERSION, type AnswerRoute, type AnswerTrace, type RetrievalMeta } from '../../lib/ai/trace'
import { conversationMarkdown, feedbackItem, flushFeedback, sendFeedback, type FeedbackMessage, type FeedbackRating, type FeedbackReason } from '../../lib/ai/feedback'
import { checkAnswer } from '../../lib/ai/answerCheck'
import { useT } from '../../context/I18nContext'
import { storePair } from '../../lib/translationMemory'
import { prepareSystemPrompt, callAi } from '../../lib/ai'
import { buildGeneralContext } from '../../lib/ai/context'
import type { AiContext, FillAction } from '../../lib/ai/types'
import type { AiMessage, PanelTab, AiChatCallbacks, AiPanelVariant } from './types'

export type UseAiPanelOptions = {
  open: boolean
  context?: AiContext
  callbacks?: AiChatCallbacks
  variant?: AiPanelVariant
}

// fetch() failures across browsers: Chrome, Firefox, Safari.
const NETWORK_ERROR = /Failed to fetch|NetworkError|Load failed|network error|ERR_INTERNET_DISCONNECTED/i

export function useAiPanel({ open, context, callbacks }: UseAiPanelOptions) {
  const [settings, setSettings]         = useState<AiSettings>(() => loadAiSettings())
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab]       = useState<PanelTab>('chat')
  const [messages, setMessages]         = useState<AiMessage[]>([])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [autoApply, setAutoApply]       = useState(false)
  const [fillLog, setFillLog]           = useState<FillLogEntry[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const { language } = useT()
  const localState = useSyncExternalStore(subscribeWebLlm, getWebLlmState)
  // null = not checked yet; the hosted AI is usable until the server says otherwise.
  const [hostedAvailable, setHostedAvailable] = useState<boolean | null>(null)
  // Whether the chosen runtime can generate now; without it the panel still
  // answers from local data (localAnswer.ts), so sending is always allowed.
  const modelReady = (s: AiSettings) => s.provider === 'webllm'
    ? localState.status === 'ready' && localState.model === s.model
    : s.provider === 'botc'
      ? isAiAvailable(s) && hostedAvailable !== false
      : isAiAvailable(s)
  const canSend = true
  const effectiveCtx: AiContext = context ?? buildGeneralContext(language)
  const formKey = `${effectiveCtx.type}:${effectiveCtx.title}`

  useEffect(() => {
    if (open) {
      setSettings(loadAiSettings())
      setFillLog(getFillLogForForm(formKey))
    }
  }, [open, formKey])

  // Load the wiki index while online, so offline answers can quote it later (the service worker caches it).
  useEffect(() => {
    if (open) void initWikiSearch()
  }, [open])

  // Local mode after a reload: load the cached model again without a click (never downloads).
  useEffect(() => {
    if (open && settings.provider === 'webllm') void resumeWebLlm(settings.model).catch(() => { /* error shown in settings */ })
  }, [open, settings.provider, settings.model])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!open || settings.provider !== 'botc') return
    let live = true
    void getHostedStatus().then((s) => { if (live) setHostedAvailable(s.available) })
    return () => { live = false }
  }, [open, settings.provider])

  const patchSettings = useCallback((patch: Partial<AiSettings>) => {
    if ((patch.provider && patch.provider !== settings.provider) || (patch.model && patch.model !== settings.model)) unloadWebLlm()
    setSettings((prev) => {
      const next = { ...prev, ...patch, keys: { ...prev.keys, ...(patch.keys ?? {}) } }
      saveAiSettings(next)
      return next
    })
  }, [settings.provider, settings.model])

  const doApplyFill = useCallback((msgId: string, fill: FillAction, oldValue: unknown) => {
    callbacks?.onFill(fill.field, fill.value)
    // Store translation pairs when filling ZH fields
    if (fill.field === 'abilityZh' || fill.field === 'nameZh') {
      const enField = fill.field === 'abilityZh' ? 'abilityEn' : 'nameEn'
      const enVal   = context?.fields.find((f) => f.key === enField)?.value as string | undefined
      const charId  = context?.fields.find((f) => f.key === 'id')?.value as string | undefined
      if (enVal && String(fill.value)) {
        storePair(enVal, String(fill.value), { charId, field: fill.field })
      }
    }
    const latestSettings = loadAiSettings()
    const entry = appendFillLog({
      timestamp: Date.now(),
      form: formKey,
      field: fill.field,
      fieldLabel: fill.label ?? fill.field,
      oldValue,
      newValue: fill.value,
      source: 'ai',
      model: latestSettings.model,
    })
    setFillLog((prev) => [entry, ...prev])
    setMessages((msgs) =>
      msgs.map((m) =>
        m.id === msgId
          ? { ...m, appliedFills: [...(m.appliedFills ?? []), fill.field] }
          : m,
      ),
    )
  }, [callbacks, context, formKey])

  const undoFill = useCallback((entry: FillLogEntry) => {
    callbacks?.onUndo(entry.field, entry.oldValue)
    markUndone(entry.id)
    setFillLog((prev) => prev.map((e) => e.id === entry.id ? { ...e, undone: true } : e))
  }, [callbacks])

  const handleSend = useCallback(async (overrideText?: string, displayLabel?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return
    const userMsg: AiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      // Skill chip prompts are long & technical — show only the short label in UI
      displayContent: displayLabel,
    }
    setMessages((m) => [...m, userMsg])
    if (!overrideText) setInput('')
    setActiveTab('chat')
    setLoading(true)

    const latestSettings = loadAiSettings()
    const history = [...messages, userMsg]
      .filter((m) => m.role !== 'error')
      .map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }] as [{ text: string }],
      }))

    const previousQueries = messages.filter((m) => m.role === 'user').map((m) => m.content)
    const lastAnswer = [...messages].reverse().find((m) => m.role === 'assistant')?.content
    const zh = effectiveCtx.language === 'zh'
    const started = performance.now()
    const trace = (route: AnswerRoute, meta: RetrievalMeta, extra: Partial<AnswerTrace> = {}): AnswerTrace => ({
      ...meta, ...extra,
      at: new Date().toISOString(), build: BUILD_ID, promptVersion: PROMPT_VERSION, route,
      provider: latestSettings.provider, model: latestSettings.model, language: effectiveCtx.language,
      contextType: effectiveCtx.type, latencyMs: Math.round(performance.now() - started),
    })
    // Offline answers quote the wiki, so wait for its index (cached after the first load).
    const local = async () => { await initWikiSearch(); return answerLocally(effectiveCtx, text, previousQueries, lastAnswer) }
    const reply = (content: string, answerTrace: AnswerTrace) => {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content, local: true, trace: answerTrace }])
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    // Offline with an online model selected: local data right away, no request to wait on.
    if (latestSettings.provider !== 'webllm' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      const answer = await local()
      reply(`${answer.message}\n\n_${zh ? '当前离线，以上为本地资料。' : 'Offline; this is local data only.'}_`, trace('offline', answer.meta))
      return
    }
    // Local mode: what the program answers exactly (counts, line-ups, official text,
    // script facts) never goes to the model — a small model gets numbers wrong.
    if (latestSettings.provider === 'webllm') {
      const answer = await local()
      if (answer.definitive) { reply(answer.message, trace('program', answer.meta)); return }
      if (!modelReady(latestSettings)) {
        const loadingModel = localState.status === 'loading'
        reply(`${answer.message}\n\n_${loadingModel
          ? (zh ? `本地模型加载中（${Math.round(localState.progress * 100)}%），以上为本地资料；加载完成后可回答解释类问题。` : `The local model is loading (${Math.round(localState.progress * 100)}%); this is local data only.`)
          : (zh ? '本地模型尚未下载或加载，以上为本地资料；加载模型后可回答解释类问题。' : 'The local model is not loaded; this is local data only. Load it for explanations.')}_`, trace('fallback', answer.meta, { error: loadingModel ? 'model loading' : 'model not loaded' }))
        return
      }
    }
    if (!modelReady(latestSettings)) {
      const why = latestSettings.provider === 'botc'
        ? (zh ? 'BOTC 在线 AI 暂不可用' : 'The BOTC online AI is not available')
        : (zh ? '未填写 API Key' : 'No API key')
      const answer = await local()
      reply(`${answer.message}\n\n_${why}${zh ? '，以上为本地资料。' : '; this is local data only.'}_`, trace('fallback', answer.meta, { error: latestSettings.provider === 'botc' ? 'hosted unavailable' : 'no key' }))
      return
    }

    let result: Awaited<ReturnType<typeof callAi>>
    const meta = emptyMeta()
    try {
      const systemPrompt = await prepareSystemPrompt(effectiveCtx, text, previousQueries, { local: latestSettings.provider === 'webllm', inputBudget: latestSettings.provider === 'botc' ? HOSTED_INPUT_BUDGET : undefined, lastAnswer, meta })
      result = await callAi({ systemPrompt, history, settings: latestSettings, temperature: 0.6 })
    } catch (error) {
      result = { ok: false, error: error instanceof Error ? error.message : String(error) }
    }

    if (result.ok) {
      const { response } = result
      // Line-ups and scripts in the answer are checked; illegal ones get the program's legal version.
      const checked = checkAnswer(effectiveCtx, text, response.message, previousQueries, lastAnswer)
      const msgId = crypto.randomUUID()
      const answerTrace = trace('model', meta, {
        ...(checked.notes?.length ? { checks: checked.notes } : {}),
        ...(result.steps ? { tools: result.steps.map(({ tool, ok }) => ({ tool, ok })) } : {}),
        ...(result.usage?.neurons !== undefined ? { neurons: result.usage.neurons } : {}),
      })
      setMessages((m) => [
        ...m,
        { id: msgId, role: 'assistant', content: checked.text, fills: response.fills, appliedFills: [], trace: answerTrace, ...(result.steps ? { steps: result.steps, remaining: result.remaining } : {}) },
      ])
      if (autoApply && response.fills?.length) {
        response.fills.forEach((fill) => {
          doApplyFill(msgId, fill, context?.fields.find((f) => f.key === fill.field)?.value)
        })
      }
    } else {
      // The model failed (offline, limits, outage): still show what local data says.
      const fallback = await local()
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'error', content: NETWORK_ERROR.test(result.error) ? (zh ? '无法连接在线 AI（网络不可用或请求被拦截）。' : 'Could not reach the online AI (no network, or the request was blocked).') : result.error },
        ...(fallback.found ? [{ id: crypto.randomUUID(), role: 'assistant' as const, content: fallback.message, local: true, trace: trace('fallback', fallback.meta, { error: result.error.slice(0, 200) }) }] : []),
      ])
    }

    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  // modelReady reads localState and hostedAvailable, so both are dependencies.
  }, [input, loading, localState, hostedAvailable, messages, effectiveCtx, autoApply, doApplyFill, context])

  const downloadLog = useCallback(() => {
    const md  = exportFillLogMd(fillLog)
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))
    const a   = document.createElement('a')
    a.href = url
    a.download = `botc-ai-log-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [fillLog])

  const clearMessages = useCallback(() => setMessages([]), [])

  // ── Feedback (src/lib/ai/feedback.ts) ───────────────────────────────────────
  const [notice, setNotice] = useState<string | null>(null)
  const feedbackContext = useCallback(() => ({ type: effectiveCtx.type, title: effectiveCtx.title, ...(effectiveCtx.characterIds?.length ? { script: effectiveCtx.characterIds } : {}) }), [effectiveCtx])
  const asFeedback = (list: AiMessage[]): FeedbackMessage[] => list
    .filter((m): m is AiMessage & { role: 'user' | 'assistant' } => m.role !== 'error')
    .map((m) => ({ role: m.role, content: m.content, ...(m.trace ? { trace: m.trace } : {}) }))

  /** Rate one answer; the item carries the question and a few turns before it. */
  const rateAnswer = useCallback(async (msgId: string, rating: FeedbackRating, reasons: FeedbackReason[] = [], comment?: string) => {
    const index = messages.findIndex((m) => m.id === msgId)
    if (index < 0) return
    const item = feedbackItem({
      kind: 'answer', rating, reasons, comment, language: effectiveCtx.language, context: feedbackContext(),
      messages: asFeedback(messages.slice(Math.max(0, index - 6), index + 1)),
    })
    setMessages((list) => list.map((m) => m.id === msgId ? { ...m, feedback: { rating, reasons, comment, state: 'queued' } } : m))
    const state = await sendFeedback(item)
    setMessages((list) => list.map((m) => m.id === msgId ? { ...m, feedback: { rating, reasons, comment, state } } : m))
  }, [messages, effectiveCtx.language, feedbackContext])

  /** One click: send the whole conversation with its diagnostics, and copy it as Markdown. */
  const shareConversation = useCallback(async () => {
    const list = asFeedback(messages)
    if (!list.length) return
    const zh = effectiveCtx.language === 'zh'
    const markdown = conversationMarkdown(list, zh, effectiveCtx.title)
    const copied = await navigator.clipboard?.writeText(markdown).then(() => true, () => false) ?? false
    const state = await sendFeedback(feedbackItem({ kind: 'conversation', language: effectiveCtx.language, context: feedbackContext(), messages: list }))
    const sent = { sent: zh ? '已发送给开发者用于改进' : 'Sent to the developers', queued: zh ? '已保存，联网后发送' : 'Saved; it will be sent when online', local: zh ? '未配置服务器，未发送' : 'No server configured; not sent' }[state]
    setNotice(`${copied ? (zh ? '对话已复制；' : 'Copied; ') : ''}${sent}`)
    setTimeout(() => setNotice(null), 5000)
  }, [messages, effectiveCtx, feedbackContext])

  // Feedback given offline goes out once the browser is online again.
  useEffect(() => {
    if (!open) return
    void flushFeedback()
    const online = () => { void flushFeedback() }
    window.addEventListener('online', online)
    return () => window.removeEventListener('online', online)
  }, [open])


  return {
    settings,
    patchSettings,
    showSettings,
    setShowSettings,
    activeTab,
    setActiveTab,
    messages,
    setMessages,
    input,
    setInput,
    loading,
    autoApply,
    setAutoApply,
    fillLog,
    bottomRef,
    inputRef,
    effectiveCtx,
    canSend,
    localState,
    doApplyFill,
    undoFill,
    handleSend,
    downloadLog,
    clearMessages,
    rateAnswer,
    shareConversation,
    notice,
  }
}
