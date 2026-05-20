/**
 * AiPanelContent — the AI assistant panel body.
 *
 * Renders as a plain flex-column Box (no Dialog wrapper).
 * Can be embedded inside any modal or used inside AiChatDialog.
 *
 * variant="side"     — full-height right side panel (in AiChatDialog)
 * variant="embedded" — inside a modal, shares the modal height
 *
 * Also exports:
 *   AiToggleButton   — button for modal title bars
 *   AiChatCallbacks  — fill/undo callback type
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Box, IconButton, TextField, Button, MenuItem, Select, Tabs, Tab,
  Typography, Chip, CircularProgress, Divider, Tooltip, Paper,
  Switch, FormControlLabel, Collapse, alpha,
} from '@mui/material'
import CloseIcon         from '@mui/icons-material/Close'
import SendIcon          from '@mui/icons-material/Send'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import SettingsIcon      from '@mui/icons-material/Settings'
import AutoAwesomeIcon   from '@mui/icons-material/AutoAwesome'
import DownloadIcon      from '@mui/icons-material/Download'
import UndoIcon          from '@mui/icons-material/Undo'
import CheckIcon         from '@mui/icons-material/Check'
import TranslateIcon     from '@mui/icons-material/Translate'
import LightbulbIcon     from '@mui/icons-material/Lightbulb'
import AbcIcon           from '@mui/icons-material/Abc'
import AutoFixHighIcon   from '@mui/icons-material/AutoFixHigh'
import NightsStayIcon    from '@mui/icons-material/NightsStay'
import InfoOutlinedIcon  from '@mui/icons-material/InfoOutlined'
import ArticleIcon       from '@mui/icons-material/Article'
import TimelineIcon      from '@mui/icons-material/Timeline'
import BarChartIcon      from '@mui/icons-material/BarChart'
import ReviewsIcon       from '@mui/icons-material/Reviews'
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
import { searchWiki, formatWikiPrompt } from '../lib/wikiSearch'
import type { GameLogContext } from '../lib/gameLogContext'
import type { Team } from '../types'

// ── Public types ──────────────────────────────────────────────────────────────

export type AiChatCallbacks = {
  onFill: (field: string, value: unknown) => void
  onUndo: (field: string, oldValue: unknown) => void
}

export type AiPanelVariant = 'side' | 'embedded'

export type AiPanelContentProps = {
  open: boolean
  onClose?: () => void
  context?: AgentContext
  callbacks?: AiChatCallbacks
  language?: 'en' | 'zh'
  variant?: AiPanelVariant
  /** Optional game log context — enables 复盘 skills */
  gameLogContext?: GameLogContext
}

// ── Internal types ────────────────────────────────────────────────────────────

type Message = {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  fills?: FillAction[]
  appliedFills?: string[]
}

type PanelTab = 'chat' | 'skills' | 'log'

const PROVIDER_LABELS: Record<AiProvider, string> = {
  groq: 'Groq', openrouter: 'OpenRouter', gemini: 'Gemini',
}

// ── Skill definitions ─────────────────────────────────────────────────────────

type SkillDef = {
  id: string
  icon: React.ReactNode
  label: string; labelZh: string
  desc: string;  descZh: string
  prompt: (ctx?: AgentContext) => string
  requiresForm?: boolean
  requiresGameLog?: boolean
  chip?: boolean
}

export const SKILLS: SkillDef[] = [
  {
    id: 'translate', icon: <TranslateIcon fontSize="small" />,
    label: 'Translate to ZH', labelZh: '翻译为中文',
    desc: 'Translate the English ability text into Chinese.',
    descZh: '将英文能力文本翻译成中文。',
    prompt: (ctx) => {
      const ab = ctx?.fields.find((f) => f.key === 'abilityEn')?.value
      return ab ? `Translate this ability text to Chinese and fill the abilityZh field:\n"${ab}"` : 'Translate the ability text to Chinese and fill abilityZh.'
    },
    requiresForm: true, chip: true,
  },
  {
    id: 'translate-en', icon: <TranslateIcon fontSize="small" />,
    label: 'Translate to EN', labelZh: '翻译为英文',
    desc: 'Translate the Chinese ability text into English.',
    descZh: '将中文能力文本翻译成英文。',
    prompt: (ctx) => {
      const ab = ctx?.fields.find((f) => f.key === 'abilityZh')?.value
      return ab ? `Translate this Chinese ability text to English and fill the abilityEn field:\n"${ab}"` : 'Translate the Chinese ability text to English and fill abilityEn.'
    },
    requiresForm: true, chip: false,
  },
  {
    id: 'suggest-ability', icon: <LightbulbIcon fontSize="small" />,
    label: 'Suggest ability', labelZh: '建议能力文本',
    desc: 'Generate a BotC-style ability text based on name and team.',
    descZh: '根据名字和阵营生成 BotC 风格的能力文本。',
    prompt: (ctx) => {
      const name = ctx?.fields.find((f) => f.key === 'nameEn')?.value ?? 'this character'
      const team = ctx?.fields.find((f) => f.key === 'team')?.value ?? 'townsfolk'
      return `Suggest an ability text for a ${team} character named "${name}". Fill the abilityEn field.`
    },
    requiresForm: true, chip: true,
  },
  {
    id: 'chinese-name', icon: <AbcIcon fontSize="small" />,
    label: 'Chinese name', labelZh: '建议中文名',
    desc: 'Suggest a 2–4 character Chinese name matching the English name.',
    descZh: '建议匹配英文名含义的 2–4 字中文名。',
    prompt: (ctx) => {
      const name   = ctx?.fields.find((f) => f.key === 'nameEn')?.value ?? 'this character'
      const ability = ctx?.fields.find((f) => f.key === 'abilityEn')?.value ?? ''
      return `Suggest a Chinese name for a BotC character named "${name}".${ability ? ` Ability: "${ability}"` : ''} Fill the nameZh field with a 2–4 character Chinese name.`
    },
    requiresForm: true, chip: true,
  },
  {
    id: 'full-character', icon: <AutoFixHighIcon fontSize="small" />,
    label: 'Full character', labelZh: '生成完整角色',
    desc: 'Generate a complete character draft — name, ability, Chinese name, reminders.',
    descZh: '生成完整角色草稿：名字、能力、中文名、提示词。',
    prompt: () => 'Generate a complete BotC character draft. Fill all fields: nameEn, nameZh, abilityEn, abilityZh, team, firstNightReminder, otherNightReminder.',
    requiresForm: true, chip: true,
  },
  {
    id: 'night-reminders', icon: <NightsStayIcon fontSize="small" />,
    label: 'Night reminders', labelZh: '夜间提示',
    desc: 'Suggest ST night reminders for first night and other nights.',
    descZh: '为说书人建议第一夜和其他夜晚的提示词。',
    prompt: (ctx) => {
      const name   = ctx?.fields.find((f) => f.key === 'nameEn')?.value ?? 'this character'
      const ability = ctx?.fields.find((f) => f.key === 'abilityEn')?.value ?? ''
      return `Suggest concise ST night reminders for "${name}".${ability ? ` Ability: "${ability}"` : ''} Fill firstNightReminder and otherNightReminder fields.`
    },
    requiresForm: true, chip: false,
  },
  {
    id: 'review', icon: <InfoOutlinedIcon fontSize="small" />,
    label: 'Review character', labelZh: '检查角色设计',
    desc: 'Review the character for balance, clarity, and BotC conventions.',
    descZh: '检查角色设计的平衡性、清晰度和 BotC 设计规范。',
    prompt: (ctx) => {
      const name   = ctx?.fields.find((f) => f.key === 'nameEn')?.value ?? 'this character'
      const team   = ctx?.fields.find((f) => f.key === 'team')?.value ?? ''
      const ability = ctx?.fields.find((f) => f.key === 'abilityEn')?.value ?? ''
      return `Review this BotC character for balance, clarity, and conventions:\nName: ${name}\nTeam: ${team}\nAbility: ${ability}\n\nProvide feedback as a message (no fills needed).`
    },
    requiresForm: false, chip: false,
  },
  // ── Game log / 复盘 skills ───────────────────────────────────────────────────
  {
    id: 'game-summary', icon: <ArticleIcon fontSize="small" />,
    label: 'Game Summary', labelZh: '游戏总结',
    desc: 'Summarize the full game: script, days, outcome, and key moments.',
    descZh: '总结整局游戏：剧本、天数、结果、关键时刻。',
    prompt: () => 'Summarize this game. Include: script name, days played, who survived, who died and when, key vote results, and the final outcome. Write a concise narrative (3–6 sentences).',
    requiresGameLog: true, chip: true,
  },
  {
    id: 'debrief', icon: <ReviewsIcon fontSize="small" />,
    label: '复盘 (Debrief)', labelZh: '复盘分析',
    desc: 'Analyze player decisions, deception, and pivotal turning points.',
    descZh: '分析玩家决策、欺骗行为和关键转折点。',
    prompt: () => 'Perform a thorough 复盘 (post-game debrief) analysis covering: (1) key information flow and who was deceived and when; (2) the most critical vote decisions and whether they were correct in hindsight; (3) which actions most influenced the final outcome; (4) what the good/evil sides could have done differently. Be specific and analytical.',
    requiresGameLog: true, chip: true,
  },
  {
    id: 'timeline', icon: <TimelineIcon fontSize="small" />,
    label: 'Timeline', labelZh: '时间线',
    desc: 'Chronological timeline of key events by day.',
    descZh: '按天整理的关键事件时间线。',
    prompt: () => 'Create a concise chronological timeline of the most important game events. Format as a bullet list grouped by day. Focus on: deaths, execution vote outcomes, ability uses, and information reveals.',
    requiresGameLog: true, chip: false,
  },
  {
    id: 'player-stats', icon: <BarChartIcon fontSize="small" />,
    label: 'Player Stats', labelZh: '玩家统计',
    desc: 'Per-player stats: role, nominations, votes, survival.',
    descZh: '每位玩家统计：角色、提名、投票、存活。',
    prompt: () => 'Generate per-player statistics from the game log. For each player list: their role (if known), whether they survived, nominations they made, times they were nominated, and any notable ability uses. Format as a structured table or list.',
    requiresGameLog: true, chip: false,
  },
]

// ── Few-shot + system prompt ──────────────────────────────────────────────────

function buildFewShotSection(ctx?: AgentContext): string {
  if (!ctx || ctx.form !== 'character') return ''
  const team     = (ctx.fields.find((f) => f.key === 'team')?.value ?? '') as Team
  const charId   = ctx.fields.find((f) => f.key === 'id')?.value as string | undefined
  const excludeIds = charId ? [charId] : []
  const parts: string[] = []
  if (team) {
    const s = formatExamplesPrompt(getTeamExamples(team, 3, excludeIds), 'ability')
    if (s) parts.push(s)
  }
  const ps = formatExamplesPrompt(getTranslationPairs(3, { excludeIds }), 'translation')
  if (ps) parts.push(ps)
  const ts = formatTmPrompt(getAllPairs().slice(0, 3))
  if (ts) parts.push(ts)
  return parts.length ? `\n\n${parts.join('\n\n')}` : ''
}

function buildSystemPrompt(
  ctx?: AgentContext,
  gameLogCtx?: GameLogContext,
  query?: string,
  lang: 'en' | 'zh' = 'en',
): string {
  const zh = lang === 'zh'

  // Wiki RAG — inject relevant chunks for any query
  let wikiSection = ''
  if (query && query.length > 4) {
    const chunks = searchWiki(query, 3)
    const fmt = formatWikiPrompt(chunks)
    if (fmt) wikiSection = `\n\n${fmt}`
  }

  // ── Game log / 复盘 mode ────────────────────────────────────────────────────
  if (gameLogCtx) {
    return zh
      ? `你是一个血腥钟楼（BotC）游戏复盘 AI 助手。
帮助分析游戏记录、进行复盘，并回答关于游戏过程的问题。

${buildGlossaryPrompt('zh')}${wikiSection}

${gameLogCtx.serialized}

用中文回答。分析要具体、深入。
始终以 JSON 格式回复：{"message": "你的回答"}`
      : `You are an AI assistant for Blood on the Clocktower (BotC) game analysis.
Help analyze game logs, perform post-game debrief (复盘), and answer questions about the game.

${buildGlossaryPrompt('en')}${wikiSection}

${gameLogCtx.serialized}

Respond in English. Be specific and analytical.
Always respond as JSON: {"message": "<your response>"}`
  }

  // ── Character authoring mode ────────────────────────────────────────────────
  return zh
    ? `你是一个血腥钟楼（BotC）自定义角色创作 AI 助手。
帮助用户创建、翻译和完善角色与剧本。

${buildGlossaryPrompt('zh')}${wikiSection}
${ctx ? `\n${serializeContextForPrompt(ctx)}` : ''}${buildFewShotSection(ctx)}

需要填写字段时，请用以下 JSON 格式回复（不要用代码块围栏）：
{
  "message": "说明",
  "fills": [{ "field": "字段键", "value": "填入值", "label": "字段名" }],
  "warning": "可选警告"
}

不需要填写时省略 "fills"。始终包含 "message"。
可用字段键：${ctx?.fields.map((f) => f.key).join(', ') ?? '无'}。
只填写明确要求的字段。`
    : `You are an AI assistant for Blood on the Clocktower (BotC) custom character authoring.
Help the user create, translate, and refine characters and scripts.

${buildGlossaryPrompt('en')}${wikiSection}
${ctx ? `\n${serializeContextForPrompt(ctx)}` : ''}${buildFewShotSection(ctx)}

When filling fields, respond with JSON in this exact format (no markdown fences):
{
  "message": "<explanation>",
  "fills": [{ "field": "<key>", "value": "<value>", "label": "<label>" }],
  "warning": "<optional>"
}

If no fills, omit "fills". Always include "message".
Field keys: ${ctx?.fields.map((f) => f.key).join(', ') ?? 'none'}.
Only fill fields explicitly requested.`
}

function parseResponse(raw: string): AgentResponse {
  const t = raw.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()
  try { return JSON.parse(t) as AgentResponse }
  catch { return { message: raw } }
}

// ── AiToggleButton ────────────────────────────────────────────────────────────

export function AiToggleButton({
  open,
  onToggle,
  language = 'en',
}: {
  open: boolean
  onToggle: () => void
  language?: 'en' | 'zh'
}) {
  return (
    <Tooltip title={language === 'zh' ? (open ? '关闭 AI 助手' : 'AI 助手（实验）') : (open ? 'Close AI Assistant' : 'AI Assistant (Experimental)')}>
      <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
        <IconButton
          size="small"
          onClick={onToggle}
          color={open ? 'primary' : 'default'}
          sx={{ p: 0.5, border: open ? '1px solid' : '1px solid transparent', borderColor: open ? 'primary.main' : 'transparent', borderRadius: 1 }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 17 }} />
        </IconButton>
        {!open && (
          <Box sx={{
            position: 'absolute', top: -3, right: -3,
            bgcolor: 'warning.main', color: 'warning.contrastText',
            fontSize: '0.48rem', fontWeight: 700, px: 0.35, py: 0.05,
            borderRadius: 0.5, lineHeight: 1.5, pointerEvents: 'none',
          }}>
            {language === 'zh' ? '实验' : 'EXP'}
          </Box>
        )}
      </Box>
    </Tooltip>
  )
}

// ── AiPanelContent ────────────────────────────────────────────────────────────

export function AiPanelContent({
  open,
  onClose,
  context,
  callbacks,
  language = 'en',
  variant = 'side',
  gameLogContext,
}: AiPanelContentProps) {
  const zh = language === 'zh'
  const [settings, setSettings]     = useState<AiSettings>(() => loadAiSettings())
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab]   = useState<PanelTab>('chat')
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [autoApply, setAutoApply]   = useState(false)
  const [fillLog, setFillLog]       = useState<FillLogEntry[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const formKey    = context ? `${context.form}:${context.title}` : (gameLogContext ? `game-log:${gameLogContext.title}` : 'none')
  const hasForm    = Boolean(context && context.form !== 'none')
  const hasGameLog = Boolean(gameLogContext)

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
      .map((m) => ({ role: m.role === 'user' ? 'user' as const : 'model' as const, parts: [{ text: m.content }] }))
    try {
      const res    = await geminiGenerate({ systemInstruction: buildSystemPrompt(context, gameLogContext, text, language), contents: history, temperature: 0.6 })
      const parsed = parseResponse(res.text)
      const msgId  = crypto.randomUUID()
      setMessages((m) => [...m, { id: msgId, role: 'assistant', content: parsed.message, fills: parsed.fills, appliedFills: [] }])
      if (autoApply && parsed.fills?.length) {
        parsed.fills.forEach((fill) => {
          doApplyFill(msgId, fill, context?.fields.find((f) => f.key === fill.field)?.value)
        })
      }
    } catch (e) {
      const msg = e instanceof GeminiError ? e.message : String(e)
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'error', content: msg }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [input, loading, messages, context, gameLogContext, autoApply, doApplyFill])

  const downloadLog = () => {
    const md  = exportFillLogMd(fillLog)
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))
    const a   = document.createElement('a')
    a.href = url; a.download = `botc-ai-log-${Date.now()}.md`; a.click()
    URL.revokeObjectURL(url)
  }

  const apiKey     = settings.keys[settings.provider]
  const models     = PROVIDER_MODELS[settings.provider]
  const quickSkills = SKILLS.filter((s) => s.chip && (
    (s.requiresGameLog && hasGameLog) ||
    (!s.requiresGameLog && (!s.requiresForm || hasForm))
  ))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <Box sx={{
        px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5,
        borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,
        bgcolor: variant === 'embedded' ? 'action.hover' : 'background.paper',
      }}>
        <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 16, flexShrink: 0 }} />
        <Typography sx={{ flex: 1, fontSize: '0.82rem', fontWeight: 700 }}>
          {zh ? 'AI 助手' : 'AI Assistant'}
        </Typography>
        <Chip
          label={zh ? '实验性' : 'EXP'}
          size="small" color="warning" variant="outlined"
          sx={{ fontSize: '0.55rem', height: 15, '& .MuiChip-label': { px: 0.5 } }}
        />
        <Tooltip title={zh ? '设置' : 'Settings'}>
          <IconButton size="small" onClick={() => setShowSettings((v) => !v)}
            color={showSettings ? 'primary' : 'default'} sx={{ p: 0.3 }}>
            <SettingsIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={zh ? '清除对话' : 'Clear chat'}>
          <IconButton size="small" onClick={() => setMessages([])} disabled={!messages.length} sx={{ p: 0.3 }}>
            <DeleteForeverIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        {onClose && (
          <IconButton size="small" onClick={onClose} sx={{ p: 0.3 }}>
            <CloseIcon sx={{ fontSize: 15 }} />
          </IconButton>
        )}
      </Box>

      {/* ── Settings ───────────────────────────────────────────────── */}
      <Collapse in={showSettings}>
        <Box sx={{ px: 1.5, py: 1, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <Tabs value={settings.provider}
            onChange={(_: unknown, v: unknown) => { const p = v as AiProvider; patchSettings({ provider: p, model: getDefaultModel(p) }) }}
            variant="fullWidth" sx={{ mb: 1, minHeight: 26, '& .MuiTabs-indicator': { height: 2 } }}>
            {(['groq', 'openrouter', 'gemini'] as AiProvider[]).map((p) => (
              <Tab key={p} value={p} label={PROVIDER_LABELS[p]}
                sx={{ minHeight: 26, py: 0, fontSize: '0.65rem', textTransform: 'none' }} />
            ))}
          </Tabs>
          <Select size="small" fullWidth value={settings.model}
            onChange={(e) => patchSettings({ model: e.target.value })}
            sx={{ mb: 1, fontSize: '0.75rem' }}>
            {models.map((m) => (
              <MenuItem key={m.id} value={m.id} sx={{ fontSize: '0.75rem' }}>
                {m.label}
                {m.free && <Chip label="free" size="small" color="success" sx={{ ml: 1, height: 14, fontSize: '0.58rem' }} />}
              </MenuItem>
            ))}
          </Select>
          <TextField size="small" fullWidth type="password"
            label={`${PROVIDER_LABELS[settings.provider]} API Key`}
            value={apiKey ?? ''}
            onChange={(e) => patchSettings({ keys: { [settings.provider]: e.target.value } as AiSettings['keys'] })}
            placeholder="Stored in localStorage only"
            sx={{ '& input': { fontSize: '0.75rem' } }} />
        </Box>
      </Collapse>

      {/* ── Context badge ───────────────────────────────────────────── */}
      {(hasForm || hasGameLog) && (
        <Box sx={{ px: 1.5, pt: 0.5, pb: 0.25, flexShrink: 0 }}>
          <Chip
            size="small"
            icon={<InfoOutlinedIcon sx={{ fontSize: '12px !important' }} />}
            label={hasGameLog
              ? `game-log › ${gameLogContext!.title || '(unnamed)'}`
              : `${context!.form} › ${context!.title || '(unnamed)'}`}
            variant="outlined"
            sx={{ fontSize: '0.65rem', height: 19, maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
          />
        </Box>
      )}

      {/* ── Quick-action chips ──────────────────────────────────────── */}
      {quickSkills.length > 0 && (
        <Box sx={{ px: 1.5, py: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5, flexShrink: 0 }}>
          {quickSkills.map((skill) => (
            <Chip
              key={skill.id}
              icon={skill.icon as React.ReactElement}
              label={zh ? skill.labelZh : skill.label}
              size="small" variant="outlined"
              onClick={() => handleSend(skill.prompt(context))}
              disabled={loading}
              sx={{
                fontSize: '0.65rem', height: 22, cursor: 'pointer',
                '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
                '& .MuiChip-icon': { fontSize: '0.82rem' },
              }}
            />
          ))}
        </Box>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Tabs value={activeTab} onChange={(_: unknown, v: unknown) => setActiveTab(v as PanelTab)}
          sx={{ minHeight: 32, '& .MuiTabs-indicator': { height: 2 } }}>
          <Tab value="chat"   label={zh ? '对话' : 'Chat'}
            sx={{ minHeight: 32, py: 0, fontSize: '0.72rem', textTransform: 'none', flex: 1 }} />
          <Tab value="skills" label={zh ? '技能' : 'Skills'}
            sx={{ minHeight: 32, py: 0, fontSize: '0.72rem', textTransform: 'none', flex: 1 }} />
          <Tab value="log"    label={zh ? `日志 (${fillLog.length})` : `Log (${fillLog.length})`}
            sx={{ minHeight: 32, py: 0, fontSize: '0.72rem', textTransform: 'none', flex: 1 }} />
        </Tabs>
      </Box>

      {/* ── Chat tab ────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', display: activeTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', p: 1.25, gap: 0.75 }}>
        {messages.length === 0 && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.38, gap: 1.5, py: 4 }}>
            <AutoAwesomeIcon sx={{ fontSize: 28 }} />
            <Typography variant="body2" align="center" sx={{ px: 2, fontSize: '0.8rem' }}>
              {hasGameLog
                ? (zh ? `复盘: "${gameLogContext!.title}"` : `Analyzing: "${gameLogContext!.title}"`)
                : hasForm
                  ? (zh ? `正在编辑 "${context?.title || '角色'}"` : `Editing "${context?.title || 'character'}"`)
                  : (zh ? '未打开任何表单' : 'No form open')}
            </Typography>
            {quickSkills.length > 0 && (
              <Typography variant="caption" align="center" sx={{ opacity: 0.8, px: 3 }}>
                {zh ? '点击上方快捷键或直接输入' : 'Use quick chips above or type'}
              </Typography>
            )}
          </Box>
        )}
        {messages.map((m) => (
          <Box key={m.id}>
            <Box sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <Paper elevation={0} sx={{
                px: 1.25, py: 0.65, maxWidth: '90%',
                bgcolor: m.role === 'user' ? 'primary.main' : m.role === 'error' ? 'error.light' : (t) => alpha(t.palette.action.selected, 0.6),
                color: m.role === 'user' ? 'primary.contrastText' : m.role === 'error' ? 'error.contrastText' : 'text.primary',
                borderRadius: m.role === 'user' ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                whiteSpace: 'pre-wrap', fontSize: '0.8rem', lineHeight: 1.5,
              }}>
                {m.content}
              </Paper>
            </Box>
            {m.fills && m.fills.length > 0 && !autoApply && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, mt: 0.4, ml: 0.5 }}>
                {m.fills.map((fill) => {
                  const applied  = m.appliedFills?.includes(fill.field)
                  const ctxField = context?.fields.find((f) => f.key === fill.field)
                  return (
                    <Paper key={fill.field} variant="outlined" sx={{ p: 0.875, borderRadius: 1.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
                        <Chip size="small" label={fill.label ?? fill.field} sx={{ fontSize: '0.6rem', height: 16 }} />
                        {applied && <CheckIcon sx={{ fontSize: 12, color: 'success.main' }} />}
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.4, wordBreak: 'break-word', lineHeight: 1.35 }}>
                        {String(fill.value)}
                      </Typography>
                      {!applied && (
                        <Box sx={{ display: 'flex', gap: 0.4 }}>
                          <Button size="small" variant="contained" sx={{ py: 0, minHeight: 0, fontSize: '0.65rem', lineHeight: 1.5 }}
                            onClick={() => doApplyFill(m.id, fill, ctxField?.value)}>
                            {zh ? '应用' : 'Apply'}
                          </Button>
                          <Button size="small" variant="text" sx={{ py: 0, minHeight: 0, fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1.5 }}
                            onClick={() => setMessages((msgs) => msgs.map((msg) =>
                              msg.id === m.id ? { ...msg, appliedFills: [...(msg.appliedFills ?? []), fill.field] } : msg,
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
            {m.fills && m.fills.length > 0 && autoApply && (
              <Box sx={{ ml: 0.5, mt: 0.25, display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                {m.fills.map((fill) => (
                  <Chip key={fill.field} size="small" icon={<CheckIcon sx={{ fontSize: '11px !important' }} />}
                    label={fill.label ?? fill.field} color="success" variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 17 }} />
                ))}
              </Box>
            )}
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CircularProgress size={12} />
            <Typography variant="caption" color="text.secondary">{zh ? '思考中…' : 'Thinking…'}</Typography>
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>

      {/* ── Skills tab ──────────────────────────────────────────────── */}
      {activeTab === 'skills' && (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography variant="caption" color="text.secondary">
            {zh ? '点击技能卡片运行' : 'Click a skill card to run it'}
          </Typography>

          {/* Available char skills */}
          {SKILLS.filter((s) => !s.requiresGameLog && (!s.requiresForm || hasForm)).map((skill) => (
            <Paper key={skill.id} variant="outlined" sx={{
              p: 1, cursor: 'pointer', borderRadius: 1.25,
              transition: 'all 0.15s',
              '&:hover': { borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
            }} onClick={() => handleSend(skill.prompt(context))}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                <Box sx={{ color: 'primary.main', display: 'flex', flexShrink: 0 }}>{skill.icon}</Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                  {zh ? skill.labelZh : skill.label}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                {zh ? skill.descZh : skill.desc}
              </Typography>
            </Paper>
          ))}

          {/* Disabled char skills (require form) */}
          {SKILLS.some((s) => !s.requiresGameLog && s.requiresForm && !hasForm) && (
            <>
              <Divider sx={{ my: 0.25 }} />
              <Typography variant="caption" color="text.disabled">
                {zh ? '需要打开角色表单' : 'Requires a character form open'}
              </Typography>
              {SKILLS.filter((s) => !s.requiresGameLog && s.requiresForm && !hasForm).map((skill) => (
                <Paper key={skill.id} variant="outlined" sx={{ p: 1, borderRadius: 1.25, opacity: 0.4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                    <Box sx={{ color: 'text.disabled', display: 'flex', flexShrink: 0 }}>{skill.icon}</Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.secondary' }}>
                      {zh ? skill.labelZh : skill.label}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.35 }}>
                    {zh ? skill.descZh : skill.desc}
                  </Typography>
                </Paper>
              ))}
            </>
          )}

          {/* Game log / 复盘 skills */}
          {hasGameLog && (
            <>
              <Divider sx={{ my: 0.25 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {zh ? '复盘技能' : 'Game Log Analysis'}
              </Typography>
              {SKILLS.filter((s) => s.requiresGameLog).map((skill) => (
                <Paper key={skill.id} variant="outlined" sx={{
                  p: 1, cursor: 'pointer', borderRadius: 1.25,
                  transition: 'all 0.15s',
                  borderColor: 'secondary.main',
                  '&:hover': { borderColor: 'secondary.dark', bgcolor: (t) => alpha(t.palette.secondary.main, 0.04) },
                }} onClick={() => handleSend(skill.prompt(context))}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                    <Box sx={{ color: 'secondary.main', display: 'flex', flexShrink: 0 }}>{skill.icon}</Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      {zh ? skill.labelZh : skill.label}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                    {zh ? skill.descZh : skill.desc}
                  </Typography>
                </Paper>
              ))}
            </>
          )}

          {/* Disabled log skills (no game log loaded) */}
          {!hasGameLog && SKILLS.some((s) => s.requiresGameLog) && (
            <>
              <Divider sx={{ my: 0.25 }} />
              <Typography variant="caption" color="text.disabled">
                {zh ? '需要打开游戏日志' : 'Requires game log context'}
              </Typography>
              {SKILLS.filter((s) => s.requiresGameLog).map((skill) => (
                <Paper key={skill.id} variant="outlined" sx={{ p: 1, borderRadius: 1.25, opacity: 0.4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                    <Box sx={{ color: 'text.disabled', display: 'flex', flexShrink: 0 }}>{skill.icon}</Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.secondary' }}>
                      {zh ? skill.labelZh : skill.label}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.35 }}>
                    {zh ? skill.descZh : skill.desc}
                  </Typography>
                </Paper>
              ))}
            </>
          )}
        </Box>
      )}

      {/* ── Log tab ─────────────────────────────────────────────────── */}
      {activeTab === 'log' && (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1, fontWeight: 600 }}>
              {zh ? `填充记录 (${fillLog.length})` : `Fill Log (${fillLog.length})`}
            </Typography>
            {fillLog.length > 0 && (
              <Tooltip title={zh ? '导出 Markdown' : 'Export Markdown'}>
                <IconButton size="small" onClick={downloadLog} sx={{ p: 0.3 }}>
                  <DownloadIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          {fillLog.length === 0 && (
            <Typography variant="caption" color="text.disabled">{zh ? '暂无记录' : 'No fills applied yet'}</Typography>
          )}
          {fillLog.map((entry) => (
            <Paper key={entry.id} variant="outlined" sx={{ p: 0.625, borderRadius: 1, opacity: entry.undone ? 0.4 : 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip size="small" label={entry.fieldLabel} sx={{ fontSize: '0.58rem', height: 15, flexShrink: 0 }} />
                <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.secondary', textDecoration: entry.undone ? 'line-through' : 'none' }}>
                  {String(entry.newValue)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0, fontSize: '0.58rem' }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </Typography>
                {!entry.undone && (
                  <Tooltip title={zh ? '撤销' : 'Undo'}>
                    <IconButton size="small" onClick={() => undoFill(entry)} sx={{ p: 0.1 }}>
                      <UndoIcon sx={{ fontSize: 11 }} />
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
      <Box sx={{ p: 0.875, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        <FormControlLabel
          control={<Switch size="small" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} />}
          label={
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
              {zh ? '自动应用填充' : 'Auto-apply fills'}
            </Typography>
          }
          sx={{ m: 0 }}
        />
        <Box sx={{ display: 'flex', gap: 0.625, alignItems: 'flex-end' }}>
          <TextField
            inputRef={inputRef} size="small" fullWidth multiline maxRows={4}
            placeholder={zh ? '输入消息… (Enter 发送)' : 'Type a message… (Enter to send)'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            disabled={loading}
            sx={{ '& textarea': { fontSize: '0.8rem' } }}
          />
          <Button variant="contained" size="small"
            onClick={() => handleSend()}
            disabled={loading || !input.trim() || !apiKey?.trim()}
            sx={{ minWidth: 0, px: 1.1, py: 0.85, flexShrink: 0 }}>
            {loading ? <CircularProgress size={12} color="inherit" /> : <SendIcon sx={{ fontSize: 15 }} />}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
