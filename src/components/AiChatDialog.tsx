/**
 * AiChatDialog — AI assistant side panel.
 *
 * Renders as a full-height right-edge panel (non-blocking dialog) so the
 * character form stays interactable behind it.
 *
 * Tabs:  Chat | Skills | Log
 * Quick-action chips inject pre-built prompts for common tasks.
 * Auto-apply toggle skips per-fill confirmation.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Box, Dialog, IconButton, TextField, Button, MenuItem,
  Select, Tabs, Tab, Typography, Chip, CircularProgress,
  Divider, Tooltip, Paper, Switch, FormControlLabel,
  Collapse, alpha,
} from '@mui/material'
import CloseIcon           from '@mui/icons-material/Close'
import SendIcon            from '@mui/icons-material/Send'
import DeleteForeverIcon   from '@mui/icons-material/DeleteForever'
import SettingsIcon        from '@mui/icons-material/Settings'
import AutoAwesomeIcon     from '@mui/icons-material/AutoAwesome'
import DownloadIcon        from '@mui/icons-material/Download'
import UndoIcon            from '@mui/icons-material/Undo'
import CheckIcon           from '@mui/icons-material/Check'
import TranslateIcon       from '@mui/icons-material/Translate'
import LightbulbIcon       from '@mui/icons-material/Lightbulb'
import AbcIcon             from '@mui/icons-material/Abc'
import AutoFixHighIcon     from '@mui/icons-material/AutoFixHigh'
import NightsStayIcon      from '@mui/icons-material/NightsStay'
import InfoOutlinedIcon    from '@mui/icons-material/InfoOutlined'
import {
  loadAiSettings, saveAiSettings, PROVIDER_MODELS, getDefaultModel,
  type AiProvider, type AiSettings,
} from '../lib/aiSettings'
import { geminiGenerate, GeminiError } from '../lib/gemini'
import { buildGlossaryPrompt } from '../lib/botcGlossary'
import {
  serializeContextForPrompt, type AgentContext, type FillAction, type AgentResponse,
} from '../lib/agentContext'
import {
  appendFillLog, getFillLogForForm, markUndone, exportFillLogMd,
  type FillLogEntry,
} from '../lib/fillLog'
import { storePair } from '../lib/translationMemory'
import {
  getTeamExamples, getTranslationPairs, formatExamplesPrompt,
} from '../lib/botcSearch'
import { getAllPairs, formatTmPrompt } from '../lib/translationMemory'
import type { Team } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  fills?: FillAction[]
  appliedFills?: string[]
}

type PanelTab = 'chat' | 'skills' | 'log'

const PROVIDER_LABELS: Record<AiProvider, string> = {
  groq:       'Groq',
  openrouter: 'OpenRouter',
  gemini:     'Gemini',
}

// ── Skill definitions ─────────────────────────────────────────────────────────

type SkillDef = {
  id: string
  icon: React.ReactNode
  label: string
  labelZh: string
  desc: string
  descZh: string
  prompt: (ctx?: AgentContext) => string
  requiresForm?: boolean
  chip?: boolean   // show as quick-action chip
}

const SKILLS: SkillDef[] = [
  {
    id: 'translate',
    icon: <TranslateIcon fontSize="small" />,
    label: 'Translate to ZH',
    labelZh: '翻译为中文',
    desc: 'Translate the English ability text into Chinese.',
    descZh: '将英文能力文本翻译成中文。',
    prompt: (ctx) => {
      const ability = ctx?.fields.find((f) => f.key === 'abilityEn')?.value
      return ability
        ? `Translate this ability text to Chinese and fill the abilityZh field:\n"${ability}"`
        : 'Translate the ability text to Chinese and fill abilityZh.'
    },
    requiresForm: true,
    chip: true,
  },
  {
    id: 'translate-en',
    icon: <TranslateIcon fontSize="small" />,
    label: 'Translate to EN',
    labelZh: '翻译为英文',
    desc: 'Translate the Chinese ability text into English.',
    descZh: '将中文能力文本翻译成英文。',
    prompt: (ctx) => {
      const ability = ctx?.fields.find((f) => f.key === 'abilityZh')?.value
      return ability
        ? `Translate this Chinese ability text to English and fill the abilityEn field:\n"${ability}"`
        : 'Translate the Chinese ability text to English and fill abilityEn.'
    },
    requiresForm: true,
    chip: false,
  },
  {
    id: 'suggest-ability',
    icon: <LightbulbIcon fontSize="small" />,
    label: 'Suggest ability',
    labelZh: '建议能力文本',
    desc: 'Generate a BotC-style ability text based on name and team.',
    descZh: '根据名字和阵营生成 BotC 风格的能力文本。',
    prompt: (ctx) => {
      const name = ctx?.fields.find((f) => f.key === 'nameEn')?.value ?? 'this character'
      const team = ctx?.fields.find((f) => f.key === 'team')?.value ?? 'townsfolk'
      return `Suggest an ability text for a ${team} character named "${name}". Fill the abilityEn field.`
    },
    requiresForm: true,
    chip: true,
  },
  {
    id: 'chinese-name',
    icon: <AbcIcon fontSize="small" />,
    label: 'Chinese name',
    labelZh: '建议中文名',
    desc: 'Suggest a 2–4 character Chinese name matching the English name.',
    descZh: '建议匹配英文名含义的 2–4 字中文名。',
    prompt: (ctx) => {
      const name = ctx?.fields.find((f) => f.key === 'nameEn')?.value ?? 'this character'
      const ability = ctx?.fields.find((f) => f.key === 'abilityEn')?.value ?? ''
      return `Suggest a Chinese name for a BotC character named "${name}".${ability ? ` Ability: "${ability}"` : ''} Fill the nameZh field with a 2–4 character Chinese name.`
    },
    requiresForm: true,
    chip: true,
  },
  {
    id: 'full-character',
    icon: <AutoFixHighIcon fontSize="small" />,
    label: 'Full character',
    labelZh: '生成完整角色',
    desc: 'Generate a complete character draft — name, ability, Chinese name, reminders.',
    descZh: '生成完整角色草稿：名字、能力、中文名、提示词。',
    prompt: () =>
      'Generate a complete BotC character draft. Fill all fields: nameEn, nameZh, abilityEn, abilityZh, team, firstNightReminder, otherNightReminder.',
    requiresForm: true,
    chip: true,
  },
  {
    id: 'night-reminders',
    icon: <NightsStayIcon fontSize="small" />,
    label: 'Night reminders',
    labelZh: '夜间提示',
    desc: 'Suggest storyteller night reminders for first night and other nights.',
    descZh: '为说书人建议第一夜和其他夜晚的提示词。',
    prompt: (ctx) => {
      const name = ctx?.fields.find((f) => f.key === 'nameEn')?.value ?? 'this character'
      const ability = ctx?.fields.find((f) => f.key === 'abilityEn')?.value ?? ''
      return `Suggest concise ST night reminders for "${name}".${ability ? ` Ability: "${ability}"` : ''} Fill firstNightReminder and otherNightReminder fields.`
    },
    requiresForm: true,
    chip: false,
  },
  {
    id: 'review',
    icon: <InfoOutlinedIcon fontSize="small" />,
    label: 'Review character',
    labelZh: '检查角色设计',
    desc: 'Review the character design for balance, clarity, and BotC conventions.',
    descZh: '检查角色设计的平衡性、清晰度和 BotC 设计规范。',
    prompt: (ctx) => {
      const name = ctx?.fields.find((f) => f.key === 'nameEn')?.value ?? 'this character'
      const team = ctx?.fields.find((f) => f.key === 'team')?.value ?? ''
      const ability = ctx?.fields.find((f) => f.key === 'abilityEn')?.value ?? ''
      return `Review this BotC character design for balance, clarity, and adherence to BotC conventions:\nName: ${name}\nTeam: ${team}\nAbility: ${ability}\n\nProvide feedback as a message (no fills needed).`
    },
    requiresForm: false,
    chip: false,
  },
]

// ── Few-shot section ──────────────────────────────────────────────────────────

function buildFewShotSection(ctx?: AgentContext): string {
  if (!ctx || ctx.form !== 'character') return ''
  const teamField = ctx.fields.find((f) => f.key === 'team')
  const team      = (teamField?.value ?? '') as Team
  const charId    = ctx.fields.find((f) => f.key === 'id')?.value as string | undefined
  const excludeIds = charId ? [charId] : []
  const parts: string[] = []
  if (team) {
    const ex = getTeamExamples(team, 3, excludeIds)
    const s  = formatExamplesPrompt(ex, 'ability')
    if (s) parts.push(s)
  }
  const pairs = getTranslationPairs(3, { excludeIds })
  const ps    = formatExamplesPrompt(pairs, 'translation')
  if (ps) parts.push(ps)
  const tmPairs = getAllPairs().slice(0, 3)
  const ts      = formatTmPrompt(tmPairs)
  if (ts) parts.push(ts)
  return parts.length > 0 ? `\n\n${parts.join('\n\n')}` : ''
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx?: AgentContext): string {
  const glossary  = buildGlossaryPrompt('zh')
  const ctxSection = ctx ? `\n\n${serializeContextForPrompt(ctx)}` : ''
  const fewShot   = buildFewShotSection(ctx)
  return `\
You are an AI assistant for Blood on the Clocktower (BotC) custom character authoring.
Help the user create, translate, and refine characters and scripts.

${glossary}
${ctxSection}${fewShot}

When filling fields, respond with JSON in this exact format (no markdown fences, no extra text):
{
  "message": "<explanation shown in chat>",
  "fills": [
    { "field": "<fieldKey>", "value": "<value>", "label": "<human label>" }
  ],
  "warning": "<optional warning string>"
}

If no fields to fill, omit "fills". Always include "message".
Field keys: ${ctx?.fields.map((f) => f.key).join(', ') ?? 'none'}.
Only fill fields explicitly requested.`
}

// ── Parse response ────────────────────────────────────────────────────────────

function parseResponse(raw: string): AgentResponse {
  const t = raw.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()
  try { return JSON.parse(t) as AgentResponse }
  catch { return { message: raw } }
}

// ── Props ─────────────────────────────────────────────────────────────────────

export type AiChatCallbacks = {
  onFill: (field: string, value: unknown) => void
  onUndo: (field: string, oldValue: unknown) => void
}

type Props = {
  open: boolean
  onClose: () => void
  context?: AgentContext
  callbacks?: AiChatCallbacks
  language?: 'en' | 'zh'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AiChatDialog({ open, onClose, context, callbacks, language = 'en' }: Props) {
  const zh = language === 'zh'
  const [settings, setSettings]     = useState<AiSettings>(() => loadAiSettings())
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab]   = useState<PanelTab>('chat')
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [autoApply, setAutoApply]   = useState(false)
  const [fillLog, setFillLog]       = useState<FillLogEntry[]>([])
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  const formKey = context ? `${context.form}:${context.title}` : 'none'
  const hasForm = Boolean(context && context.form !== 'none')

  useEffect(() => {
    if (open) {
      setSettings(loadAiSettings())
      setFillLog(getFillLogForForm(formKey))
    }
  }, [open, formKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const patchSettings = (patch: Partial<AiSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch, keys: { ...prev.keys, ...(patch.keys ?? {}) } }
      saveAiSettings(next)
      return next
    })
  }

  const doApplyFill = useCallback((msgId: string, fill: FillAction, oldValue: unknown) => {
    callbacks?.onFill(fill.field, fill.value)
    // Auto-store to translation memory
    if (fill.field === 'abilityZh' || fill.field === 'nameZh') {
      const enField = fill.field === 'abilityZh' ? 'abilityEn' : 'nameEn'
      const enVal   = context?.fields.find((f) => f.key === enField)?.value as string | undefined
      const charId  = context?.fields.find((f) => f.key === 'id')?.value as string | undefined
      if (enVal && String(fill.value)) storePair(enVal, String(fill.value), { charId, field: fill.field })
    }
    const entry = appendFillLog({
      timestamp: Date.now(), form: formKey, field: fill.field,
      fieldLabel: fill.label ?? fill.field, oldValue, newValue: fill.value,
      source: 'ai', model: settings.model,
    })
    setFillLog((prev) => [entry, ...prev])
    setMessages((msgs) => msgs.map((m) =>
      m.id === msgId ? { ...m, appliedFills: [...(m.appliedFills ?? []), fill.field] } : m,
    ))
  }, [callbacks, context, formKey, settings.model])

  const undoFill = useCallback((entry: FillLogEntry) => {
    callbacks?.onUndo(entry.field, entry.oldValue)
    markUndone(entry.id)
    setFillLog((prev) => prev.map((e) => e.id === entry.id ? { ...e, undone: true } : e))
  }, [callbacks])

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages((m) => [...m, userMsg])
    if (!overrideText) setInput('')
    setActiveTab('chat')
    setLoading(true)

    const history = [...messages, userMsg]
      .filter((m) => m.role !== 'error')
      .map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }],
      }))

    try {
      const res    = await geminiGenerate({ systemInstruction: buildSystemPrompt(context), contents: history, temperature: 0.6 })
      const parsed = parseResponse(res.text)
      const msgId  = crypto.randomUUID()
      setMessages((m) => [...m, { id: msgId, role: 'assistant', content: parsed.message, fills: parsed.fills, appliedFills: [] }])

      // Auto-apply fills if toggle on
      if (autoApply && parsed.fills?.length) {
        parsed.fills.forEach((fill) => {
          const oldValue = context?.fields.find((f) => f.key === fill.field)?.value
          doApplyFill(msgId, fill, oldValue)
        })
      }
    } catch (e) {
      const msg = e instanceof GeminiError ? e.message : String(e)
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'error', content: msg }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [input, loading, messages, context, autoApply, doApplyFill])

  const downloadLog = () => {
    const md  = exportFillLogMd(fillLog)
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))
    const a   = document.createElement('a')
    a.href = url; a.download = `botc-ai-log-${Date.now()}.md`; a.click()
    URL.revokeObjectURL(url)
  }

  const apiKey     = settings.keys[settings.provider]
  const models     = PROVIDER_MODELS[settings.provider]
  const quickSkills = SKILLS.filter((s) => s.chip && (!s.requiresForm || hasForm))

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => { if (reason !== 'backdropClick') onClose() }}
      hideBackdrop
      disableEnforceFocus
      disableScrollLock
      sx={{
        pointerEvents: 'none',
        '& .MuiDialog-container': {
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          p: 0,
        },
      }}
      slotProps={{
        backdrop: { sx: { pointerEvents: 'none' } },
        paper: {
          elevation: 8,
          sx: {
            pointerEvents: 'auto',
            m: 0,
            width: { xs: '100vw', sm: 380 },
            height: '100dvh',
            maxHeight: '100dvh',
            borderRadius: 0,
            borderLeft: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 0.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 17, flexShrink: 0 }} />
        <Typography sx={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
          {zh ? 'AI 助手' : 'AI Assistant'}
        </Typography>
        <Chip
          label={zh ? '实验性' : 'EXP'}
          size="small"
          color="warning"
          variant="outlined"
          sx={{ fontSize: '0.58rem', height: 16, '& .MuiChip-label': { px: 0.6 } }}
        />
        <Tooltip title={zh ? '设置' : 'Settings'}>
          <IconButton size="small" onClick={() => setShowSettings((v) => !v)}
            color={showSettings ? 'primary' : 'default'} sx={{ p: 0.4 }}>
            <SettingsIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={zh ? '清除对话' : 'Clear chat'}>
          <IconButton size="small" onClick={() => setMessages([])} disabled={messages.length === 0} sx={{ p: 0.4 }}>
            <DeleteForeverIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={onClose} sx={{ p: 0.4 }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* ── Settings panel ─────────────────────────────────────────── */}
      <Collapse in={showSettings}>
        <Box sx={{ px: 1.5, py: 1, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs value={settings.provider}
            onChange={(_: unknown, v: unknown) => {
              const p = v as AiProvider
              patchSettings({ provider: p, model: getDefaultModel(p) })
            }}
            variant="fullWidth" sx={{ mb: 1, minHeight: 28, '& .MuiTabs-indicator': { height: 2 } }}>
            {(['groq', 'openrouter', 'gemini'] as AiProvider[]).map((p) => (
              <Tab key={p} value={p} label={PROVIDER_LABELS[p]}
                sx={{ minHeight: 28, py: 0, fontSize: '0.68rem', textTransform: 'none' }} />
            ))}
          </Tabs>
          <Select size="small" fullWidth value={settings.model}
            onChange={(e) => patchSettings({ model: e.target.value })}
            sx={{ mb: 1, fontSize: '0.78rem' }}>
            {models.map((m) => (
              <MenuItem key={m.id} value={m.id} sx={{ fontSize: '0.78rem' }}>
                {m.label}
                {m.free && <Chip label="free" size="small" color="success" sx={{ ml: 1, height: 14, fontSize: '0.6rem' }} />}
              </MenuItem>
            ))}
          </Select>
          <TextField size="small" fullWidth type="password"
            label={`${PROVIDER_LABELS[settings.provider]} API Key`}
            value={apiKey ?? ''}
            onChange={(e) => patchSettings({ keys: { [settings.provider]: e.target.value } as AiSettings['keys'] })}
            placeholder="Stored in localStorage only"
            sx={{ '& input': { fontSize: '0.78rem' } }} />
        </Box>
      </Collapse>

      {/* ── Context badge ───────────────────────────────────────────── */}
      {hasForm && (
        <Box sx={{ px: 1.5, pt: 0.75, pb: 0.25, flexShrink: 0 }}>
          <Chip
            size="small"
            icon={<InfoOutlinedIcon sx={{ fontSize: '13px !important' }} />}
            label={`${context!.form} › ${context!.title || '(unnamed)'}`}
            variant="outlined"
            sx={{ fontSize: '0.68rem', height: 20, maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
          />
        </Box>
      )}

      {/* ── Quick-action chips ──────────────────────────────────────── */}
      {quickSkills.length > 0 && (
        <Box sx={{ px: 1.5, py: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5, flexShrink: 0 }}>
          {quickSkills.map((skill) => (
            <Chip
              key={skill.id}
              icon={skill.icon as React.ReactElement}
              label={zh ? skill.labelZh : skill.label}
              size="small"
              variant="outlined"
              onClick={() => handleSend(skill.prompt(context))}
              disabled={loading}
              sx={{
                fontSize: '0.68rem', height: 24, cursor: 'pointer',
                '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
                '& .MuiChip-icon': { fontSize: '0.85rem' },
              }}
            />
          ))}
        </Box>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Tabs value={activeTab} onChange={(_: unknown, v: unknown) => setActiveTab(v as PanelTab)}
          sx={{ minHeight: 36, '& .MuiTabs-indicator': { height: 2 } }}>
          <Tab value="chat"   label={zh ? '对话' : 'Chat'}
            sx={{ minHeight: 36, py: 0, fontSize: '0.75rem', textTransform: 'none', flex: 1 }} />
          <Tab value="skills" label={zh ? '技能' : 'Skills'}
            sx={{ minHeight: 36, py: 0, fontSize: '0.75rem', textTransform: 'none', flex: 1 }} />
          <Tab value="log"    label={zh ? `日志 (${fillLog.length})` : `Log (${fillLog.length})`}
            sx={{ minHeight: 36, py: 0, fontSize: '0.75rem', textTransform: 'none', flex: 1 }} />
        </Tabs>
      </Box>

      {/* ── Main content ────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', display: activeTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', p: 1.5, gap: 1 }}>
        {/* Chat tab */}
        {messages.length === 0 && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, gap: 1.5, py: 4 }}>
            <AutoAwesomeIcon sx={{ fontSize: 32 }} />
            <Typography variant="body2" align="center" sx={{ px: 2 }}>
              {hasForm
                ? (zh ? `正在编辑 "${context?.title || '角色'}"` : `Editing "${context?.title || 'character'}"`)
                : (zh ? '未打开任何表单' : 'No form open')}
            </Typography>
            {quickSkills.length > 0 && (
              <Typography variant="caption" align="center" sx={{ opacity: 0.8, px: 3 }}>
                {zh ? '点击上方快捷键或直接输入' : 'Use quick chips above or type a message'}
              </Typography>
            )}
          </Box>
        )}

        {messages.map((m) => (
          <Box key={m.id}>
            <Box sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <Paper elevation={0} sx={{
                px: 1.25, py: 0.75, maxWidth: '90%',
                bgcolor: m.role === 'user'
                  ? 'primary.main'
                  : m.role === 'error'
                    ? 'error.light'
                    : (t) => alpha(t.palette.action.selected, 0.6),
                color: m.role === 'user' ? 'primary.contrastText' : m.role === 'error' ? 'error.contrastText' : 'text.primary',
                borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                whiteSpace: 'pre-wrap', fontSize: '0.82rem', lineHeight: 1.55,
              }}>
                {m.content}
              </Paper>
            </Box>

            {/* Fill cards */}
            {m.fills && m.fills.length > 0 && !autoApply && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5, ml: 0.5 }}>
                {m.fills.map((fill) => {
                  const applied    = m.appliedFills?.includes(fill.field)
                  const ctxField   = context?.fields.find((f) => f.key === fill.field)
                  return (
                    <Paper key={fill.field} variant="outlined" sx={{ p: 1, borderRadius: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                        <Chip size="small" label={fill.label ?? fill.field}
                          sx={{ fontSize: '0.62rem', height: 17 }} />
                        {applied && <CheckIcon sx={{ fontSize: 13, color: 'success.main' }} />}
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.5, wordBreak: 'break-word', lineHeight: 1.4 }}>
                        {String(fill.value)}
                      </Typography>
                      {!applied && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button size="small" variant="contained"
                            sx={{ py: 0, minHeight: 0, fontSize: '0.68rem', lineHeight: '1.6' }}
                            onClick={() => doApplyFill(m.id, fill, ctxField?.value)}>
                            {zh ? '应用' : 'Apply'}
                          </Button>
                          <Button size="small" variant="text"
                            sx={{ py: 0, minHeight: 0, fontSize: '0.68rem', color: 'text.secondary', lineHeight: '1.6' }}
                            onClick={() => setMessages((msgs) => msgs.map((msg) =>
                              msg.id === m.id
                                ? { ...msg, appliedFills: [...(msg.appliedFills ?? []), fill.field] }
                                : msg,
                            ))}>
                            {zh ? '跳过' : 'Skip'}
                          </Button>
                        </Box>
                      )}
                    </Paper>
                  )
                })}
              </Box>
            )}

            {/* Auto-apply indicator */}
            {m.fills && m.fills.length > 0 && autoApply && (
              <Box sx={{ ml: 0.5, mt: 0.25, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {m.fills.map((fill) => (
                  <Chip key={fill.field} size="small"
                    icon={<CheckIcon sx={{ fontSize: '12px !important' }} />}
                    label={fill.label ?? fill.field}
                    color="success" variant="outlined"
                    sx={{ fontSize: '0.62rem', height: 18 }} />
                ))}
              </Box>
            )}
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={13} />
            <Typography variant="caption" color="text.secondary">{zh ? '思考中…' : 'Thinking…'}</Typography>
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Skills tab */}
      {activeTab === 'skills' && (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
            {zh ? '点击技能卡片运行' : 'Click a skill card to run it'}
          </Typography>
          {SKILLS.filter((s) => !s.requiresForm || hasForm).map((skill) => (
            <Paper key={skill.id} variant="outlined" sx={{
              p: 1.25, cursor: 'pointer', borderRadius: 1.5,
              transition: 'all 0.15s',
              '&:hover': { borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
            }}
              onClick={() => handleSend(skill.prompt(context))}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{ color: 'primary.main', display: 'flex' }}>{skill.icon}</Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                  {zh ? skill.labelZh : skill.label}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                {zh ? skill.descZh : skill.desc}
              </Typography>
            </Paper>
          ))}
          {SKILLS.filter((s) => s.requiresForm && !hasForm).length > 0 && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" color="text.disabled" sx={{ px: 0.5 }}>
                {zh ? '需要打开角色表单' : 'Requires a character form open'}
              </Typography>
              {SKILLS.filter((s) => s.requiresForm && !hasForm).map((skill) => (
                <Paper key={skill.id} variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, opacity: 0.45 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Box sx={{ color: 'text.disabled', display: 'flex' }}>{skill.icon}</Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem', color: 'text.secondary' }}>
                      {zh ? skill.labelZh : skill.label}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.4 }}>
                    {zh ? skill.descZh : skill.desc}
                  </Typography>
                </Paper>
              ))}
            </>
          )}
        </Box>
      )}

      {/* Log tab */}
      {activeTab === 'log' && (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1, fontWeight: 600 }}>
              {zh ? `填充记录 (${fillLog.length})` : `Fill Log (${fillLog.length})`}
            </Typography>
            {fillLog.length > 0 && (
              <Tooltip title={zh ? '导出 Markdown' : 'Export Markdown'}>
                <IconButton size="small" onClick={downloadLog} sx={{ p: 0.4 }}>
                  <DownloadIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          {fillLog.length === 0 && (
            <Typography variant="caption" color="text.disabled">
              {zh ? '暂无记录' : 'No fills applied yet'}
            </Typography>
          )}
          {fillLog.map((entry) => (
            <Paper key={entry.id} variant="outlined" sx={{
              p: 0.75, borderRadius: 1,
              opacity: entry.undone ? 0.4 : 1,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip size="small" label={entry.fieldLabel}
                  sx={{ fontSize: '0.6rem', height: 16, flexShrink: 0 }} />
                <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.secondary', textDecoration: entry.undone ? 'line-through' : 'none' }}>
                  {String(entry.newValue)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0, fontSize: '0.6rem' }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </Typography>
                {!entry.undone && (
                  <Tooltip title={zh ? '撤销' : 'Undo'}>
                    <IconButton size="small" onClick={() => undoFill(entry)} sx={{ p: 0.1 }}>
                      <UndoIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      <Divider />

      {/* ── Input area ──────────────────────────────────────────────── */}
      <Box sx={{ p: 1, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {/* Auto-apply toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5 }}>
          <FormControlLabel
            control={
              <Switch size="small" checked={autoApply}
                onChange={(e) => setAutoApply(e.target.checked)} />
            }
            label={
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {zh ? '自动应用填充' : 'Auto-apply fills'}
              </Typography>
            }
            sx={{ m: 0, flex: 1 }}
          />
          {autoApply && (
            <Chip label={zh ? '已开启' : 'ON'} size="small" color="success"
              sx={{ fontSize: '0.6rem', height: 16, '& .MuiChip-label': { px: 0.6 } }} />
          )}
        </Box>

        {/* Send row */}
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-end' }}>
          <TextField
            inputRef={inputRef}
            size="small"
            fullWidth
            multiline
            maxRows={4}
            placeholder={zh ? '输入消息… (Enter 发送)' : 'Type a message… (Enter to send)'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            disabled={loading}
            sx={{ '& textarea': { fontSize: '0.82rem' } }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={() => handleSend()}
            disabled={loading || !input.trim() || !apiKey?.trim()}
            sx={{ minWidth: 0, px: 1.25, py: 0.9, flexShrink: 0 }}
          >
            {loading ? <CircularProgress size={13} color="inherit" /> : <SendIcon sx={{ fontSize: 16 }} />}
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}
