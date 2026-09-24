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
import { getWebLlmState, subscribeWebLlm, unloadWebLlm } from '../../lib/ai/runtime/webllm'
import { getHostedStatus } from '../../lib/ai/runtime/hosted'
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
  const canSend = settings.provider === 'webllm'
    ? localState.status === 'ready' && localState.model === settings.model
    : settings.provider === 'botc'
      ? isAiAvailable(settings) && hostedAvailable !== false
      : isAiAvailable(settings)
  const effectiveCtx: AiContext = context ?? buildGeneralContext(language)
  const formKey = `${effectiveCtx.type}:${effectiveCtx.title}`

  useEffect(() => {
    if (open) {
      setSettings(loadAiSettings())
      setFillLog(getFillLogForForm(formKey))
    }
  }, [open, formKey])

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
    if (!text || loading || !canSend) return
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

    let result: Awaited<ReturnType<typeof callAi>>
    try {
      const systemPrompt = await prepareSystemPrompt(effectiveCtx, text, messages.filter((m) => m.role === 'user').map((m) => m.content), { local: latestSettings.provider === 'webllm' })
      result = await callAi({ systemPrompt, history, settings: latestSettings, temperature: 0.6 })
    } catch (error) {
      result = { ok: false, error: error instanceof Error ? error.message : String(error) }
    }

    if (result.ok) {
      const { response } = result
      const msgId = crypto.randomUUID()
      setMessages((m) => [
        ...m,
        { id: msgId, role: 'assistant', content: response.message, fills: response.fills, appliedFills: [], ...(result.steps ? { steps: result.steps, remaining: result.remaining } : {}) },
      ])
      if (autoApply && response.fills?.length) {
        response.fills.forEach((fill) => {
          doApplyFill(msgId, fill, context?.fields.find((f) => f.key === fill.field)?.value)
        })
      }
    } else {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'error', content: result.error },
      ])
    }

    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [input, loading, canSend, messages, effectiveCtx, autoApply, doApplyFill, context])

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
  }
}
