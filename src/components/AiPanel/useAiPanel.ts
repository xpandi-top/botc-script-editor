/**
 * useAiPanel — state and logic for the AI panel.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  loadAiSettings, saveAiSettings, type AiSettings,
} from '../../lib/aiSettings'
import {
  appendFillLog, getFillLogForForm, markUndone, exportFillLogMd,
  type FillLogEntry,
} from '../../lib/fillLog'
import { storePair } from '../../lib/translationMemory'
import { buildSystemPrompt, callAi } from '../../lib/ai'
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

  const effectiveCtx: AiContext = context ?? buildGeneralContext('en')
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

  const patchSettings = useCallback((patch: Partial<AiSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch, keys: { ...prev.keys, ...(patch.keys ?? {}) } }
      saveAiSettings(next)
      return next
    })
  }, [])

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

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return
    const userMsg: AiMessage = { id: crypto.randomUUID(), role: 'user', content: text }
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

    const result = await callAi({
      systemPrompt: buildSystemPrompt(effectiveCtx, text),
      history,
      settings: latestSettings,
      temperature: 0.6,
    })

    if (result.ok) {
      const { response } = result
      const msgId = crypto.randomUUID()
      setMessages((m) => [
        ...m,
        { id: msgId, role: 'assistant', content: response.message, fills: response.fills, appliedFills: [] },
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
  }, [input, loading, messages, effectiveCtx, autoApply, doApplyFill, context])

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

  const apiKey = settings.keys[settings.provider]

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
    apiKey,
    doApplyFill,
    undoFill,
    handleSend,
    downloadLog,
    clearMessages,
  }
}
