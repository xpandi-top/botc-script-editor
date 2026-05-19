# BOTC AI Agent — Design Document

## Principle

No per-field AI buttons. One chat interface knows the current editing context, fills fields by name, logs every change, and can be used across all forms in the app.

---

## Chat-Driven Field Filling

### How it works

```
User opens CustomCharDialog (editing "Wude")
  → clicks FAB → AiChatDialog opens
  → dialog receives context: { form: "character", fields: { nameEn, nameZh, abilityEn, abilityZh, team, ... } }

User types: "translate ability to Chinese"
  → Agent sees abilityEn in context
  → responds with fill action + explanation

Agent response (structured):
{
  "message": "Translated ability to Chinese.",
  "fills": [
    { "field": "abilityZh", "value": "决斗获胜的玩家不能在下个白天发起决斗…" }
  ]
}

App applies fills → fields update in real time
Fill log records: { field, oldValue, newValue, timestamp, source: "ai" }
```

### Context object

```typescript
type AgentContext = {
  form: 'character' | 'script' | 'import' | 'none'
  // Current form data (read-only snapshot for AI)
  fields?: Record<string, unknown>
  // Character catalog summary (for collision checks, style reference)
  catalogSummary?: { id: string; nameEn: string; team: string }[]
  // Active language
  language: 'en' | 'zh'
}
```

### Fill action schema

```typescript
type FillAction = {
  field: string       // matches field key in current form
  value: unknown      // string | number | boolean
  label?: string      // human-readable field name for log
}

type AgentResponse = {
  message: string     // explanation shown in chat
  fills?: FillAction[]
  navigate?: string   // optional: scroll to / highlight a field
  warning?: string    // shown as amber chip in chat
}
```

---

## Chat UI Design

```
┌─────────────────────────────────────────┐
│ ✨ AI Assistant          ⚙  🗑  ×       │
├─────────────────────────────────────────┤
│ Context: Editing "Wude" (Townsfolk)  📋 │  ← context chip, click to see fields
├─────────────────────────────────────────┤
│                                         │
│  [user] translate ability to Chinese    │
│                                         │
│  [ai] Translated abilityZh:             │
│  ┌─────────────────────────────────┐    │
│  │ ✅ abilityZh  ← filled          │    │  ← fill card
│  │ 决斗获胜的玩家不能...            │    │
│  │ [Apply] [Skip]                  │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│ 📋 Fill Log  (3 changes)        [Export]│  ← collapsible
│  abilityZh  10:42  "..."                │
│  nameZh     10:40  "武德"               │
│  id         10:38  "wude"               │
├─────────────────────────────────────────┤
│ [Type a message…]              [Send →] │
└─────────────────────────────────────────┘
```

### Key UI elements

| Element | Purpose |
|---------|---------|
| Context chip | Shows active form + char name. Click → see all current field values |
| Fill card | AI-suggested fill with preview, Apply / Skip buttons |
| Fill log | Timestamped list of AI-applied changes, collapsible |
| Export | Download fill log as JSON or markdown |
| ⚙ Settings | Provider / model / key switcher (current) |

---

## Supported Commands (Phase 1 MVP)

Natural language — no slash commands needed. Agent infers intent from context.

| User says | Agent does |
|-----------|-----------|
| "translate ability to Chinese" | fills `abilityZh` from `abilityEn` |
| "suggest a Chinese name" | fills `nameZh` |
| "suggest an ID" | fills `id` (new chars only) |
| "generate ability for [team] character" | fills `abilityEn` |
| "what team should this be?" | advice in chat, no fill |
| "check balance" | analysis in chat |
| "translate name" | fills `nameZh` from `nameEn` |
| "fill all" / "complete this character" | fills all empty fields |
| "undo last" | reverts last fill in log |

---

## Navigation & Logs

### Fill log (localStorage)

```typescript
type FillLogEntry = {
  id: string          // uuid
  timestamp: number
  form: string        // 'character:wude'
  field: string
  fieldLabel: string
  oldValue: unknown
  newValue: unknown
  source: 'ai' | 'user'
  model: string       // which model made this fill
}
```

Stored in `BOTC_AI_FILL_LOG` (localStorage, capped at 500 entries).

### Export formats

- **JSON**: full log array
- **Markdown**: human-readable changelog per character

### Undo

Apply button → stores `oldValue`. "Undo last" reverts in form + marks log entry as undone.

---

## System Prompt Strategy (Phase 1)

### BOTC glossary injection

```typescript
// src/lib/botcGlossary.ts
export const TERM_MAP: Record<string, string> = {
  'Storyteller': '说书人', 'Demon': '恶魔', 'Minion': '爪牙',
  'Townsfolk': '镇民', 'Outsider': '外来者', 'Traveler': '旅行者',
  'nominate': '提名', 'execute': '处决', 'poison': '中毒',
  'drunk': '醉酒', 'mad': '疯狂', 'register as': '登记为',
  'ghost vote': '亡魂票', 'dead': '已死亡',
}
```

Injected in every system prompt to ensure consistent terminology.

### Few-shot style reference

For ability generation + translation: retrieve 3 real BotC chars of same team from catalog → include as examples in prompt. Forces LLM to match official phrasing style.

### Structured output

All agent responses return JSON. System prompt instructs:
```
Always respond with valid JSON: { "message": "...", "fills": [...] }
If no fills, omit the "fills" key.
Never include markdown fences in your response.
```

---

## Implementation Plan

### Phase 1 — Context-aware chat fills (implement now)

1. `src/lib/botcGlossary.ts` — terminology map
2. `src/lib/agentContext.ts` — `AgentContext` type + builder functions
3. `src/lib/fillLog.ts` — `FillLogEntry`, localStorage store, undo
4. Update `AiChatDialog` — accept `context` prop, parse fill actions, show fill cards
5. Update `App.tsx` / `CustomCharDialog` — pass context to chat, apply fills via callback
6. Fill log panel in chat — collapsible, export button

### Phase 2 — Embeddings + few-shot (2–3 weeks)

1. `scripts/build-embeddings.ts` — precompute char vectors at build time
2. `src/lib/botcSearch.ts` — cosine similarity, top-k retrieval
3. Inject similar chars as few-shot examples in ability + translation prompts

### Phase 3 — Tool layer + orchestrator

1. `src/lib/tools/` — typed tool registry
2. `src/lib/agentOrchestrator.ts` — ReAct loop, multi-step chains
3. "Complete this character" → chained tool calls

### Phase 4 — REST API (Firebase Functions, optional)

Only if external agents need HTTP access. Reuses Phase 3 tool layer.

### Phase 5 — MCP Server

Standalone Node.js MCP server. Reads local asset files directly (no HTTP middleman).
Exposes characters as Resources, tools as Tools, creation workflows as Prompts.
Claude Desktop connects via `mcpServers` config.

---

## Current State

```
✅ src/lib/gemini.ts          provider-agnostic client (groq/openrouter/gemini)
✅ src/lib/aiSettings.ts      runtime provider/model/key switching
✅ src/lib/botcAgent.ts       task functions (kept as internal helpers)
✅ src/components/AiChatDialog.tsx   chat UI + provider switcher
✅ src/components/AgentButton.tsx    (kept, not used in forms anymore)
❌ field buttons removed from CustomCharDialog
⬜ Phase 1 work items above
```
