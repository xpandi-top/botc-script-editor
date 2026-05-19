# BOTC AI Agent — Architecture Plan

## Current State (MVP)

```
src/lib/gemini.ts        provider-agnostic REST client (groq/openrouter/gemini)
src/lib/aiSettings.ts    runtime provider/model/key switching via localStorage
src/lib/botcAgent.ts     6 BOTC task functions (translate, suggestId, suggestName, etc.)
src/components/AgentButton.tsx   drop-in ✨ button
src/components/AiChatDialog.tsx  chat UI with provider/model switcher
```

**Problem**: functions are isolated prompt calls. No shared context, no tool use, no memory. Each call re-explains BOTC from scratch. Translations miss character-specific terminology. Suggestions don't know what characters already exist.

---

## Target Architecture

```
┌─────────────────────────────────────────────────────┐
│  UI Layer (React)                                   │
│  AgentButton / AiChatDialog / Concept-to-Char       │
└────────────────────┬────────────────────────────────┘
                     │ calls
┌────────────────────▼────────────────────────────────┐
│  Agent Orchestrator  (src/lib/agentOrchestrator.ts) │
│  - routes tasks to tools                            │
│  - manages multi-step plans                         │
│  - injects BOTC context window                      │
└──────┬──────────┬──────────┬──────────┬─────────────┘
       │          │          │          │
   ┌───▼───┐ ┌───▼───┐ ┌───▼────┐ ┌───▼──────────┐
   │ Tools │ │Embed  │ │ REST   │ │  MCP Server  │
   │ Layer │ │ Index │ │  API   │ │  (optional)  │
   └───────┘ └───────┘ └────────┘ └──────────────┘
```

---

## Layer 1 — Tools / Skills

Each BOTC operation is a **named tool** the LLM can invoke (function calling / tool use).
Tools have typed input/output schemas — LLM fills params, orchestrator executes.

### Tool catalogue

| Tool ID | Input | Output | Notes |
|---------|-------|--------|-------|
| `search_characters` | query, filters (team, edition) | CharacterEntry[] | Uses embeddings |
| `get_character` | id | Full CharacterEntry + locale | Injects from catalog |
| `translate_text` | text, sourceLang, targetLang, context? | translated string | Context = char name + team |
| `suggest_name_zh` | nameEn, abilityEn, team | {name, pinyin, note} | Uses similar char examples |
| `suggest_id` | nameEn, nameZh? | slug | Checks existing IDs for collision |
| `generate_ability` | name, team, concept, style? | {abilityEn, abilityZh} | Few-shot from real chars |
| `check_balance` | ability, team | {verdict, reason} | Compare against team norms |
| `suggest_jinx` | charA, charB | {reason, restriction} | Infer from ability mechanics |
| `generate_character` | description | CharacterDraft | Chains above tools |
| `script_analysis` | characterIds[] | {balance, nightOrder, warnings} | Composition check |
| `generate_icon_prompt` | name, team, concept | image_prompt string | For Stable Diffusion / Flux |

### Implementation

```typescript
// src/lib/tools/index.ts
export type Tool = {
  id: string
  description: string
  parameters: JSONSchema
  execute: (params: unknown, ctx: AgentContext) => Promise<unknown>
}
```

LLM receives tool list in system prompt. Response parsed for `tool_calls`. Orchestrator dispatches → result injected back for next turn (ReAct loop).

---

## Layer 2 — Embeddings + Knowledge Base

### Purpose
- Semantic character search ("find characters like Fortune Teller")
- Few-shot injection: find 3 similar chars → include in prompt so LLM mimics real style
- Translation memory: store confirmed EN↔ZH pairs, retrieve on next translation
- Ability uniqueness check: detect if new ability is too similar to existing one

### Embedding targets

| Collection | Items | Use |
|------------|-------|-----|
| `chars_en` | `{id, name, ability}` per character (EN) | Semantic search, few-shot |
| `chars_zh` | `{id, name, ability}` per character (ZH) | ZH suggestions with real examples |
| `abilities` | Ability text chunks | Similarity + uniqueness |
| `translation_memory` | `{src, tgt, context}` pairs | Consistent terminology |
| `jinxes` | Jinx reason sentences | Jinx pattern matching |

### Stack options

| Option | Cost | Notes |
|--------|------|-------|
| **In-browser (MVP)** | Free | ~500 chars × 1536 dims = ~3MB. `transformers.js` for local embed or precompute + ship as JSON |
| **Cloudflare Vectorize** | Free tier 5M vectors | Good for production, pairs with CF Workers |
| **Supabase pgvector** | Free tier | Easy if already using Postgres |
| **Pinecone** | Free 100K vectors | Simple REST API |

**MVP path**: precompute embeddings at build time (`scripts/build-embeddings.ts`) → ship as `assets/embeddings.json` → load in browser → cosine similarity search locally. No server needed.

### Workflow

```
User types "武德" → embed query → cosine search chars_zh → top-3 similar chars
→ inject into prompt: "Here are similar characters for style reference: ..."
→ LLM generates in consistent style
```

---

## Layer 3 — REST API / Skill Endpoints

> **Simplified**: character catalog lives in bundled assets, custom chars + scripts in Firebase.
> No Cloudflare Worker needed. Two paths depending on use case:

### Path A — Firebase Cloud Functions (external agent access)

Already have Firebase. Add HTTP Cloud Functions to expose BOTC data.

```
functions/
  src/
    characters.ts     GET /characters, GET /characters/:id
    search.ts         POST /search  (semantic, uses precomputed embeddings)
    tools.ts          POST /tool/:id  (translate, generate, analyze)
```

Only add if external agents (n8n, Claude Desktop remote, etc.) need HTTP access.
For single-user local use → skip entirely.

### Path B — In-process tool layer (no HTTP, recommended for now)

Tools run in-browser. Orchestrator calls them directly as TypeScript functions.
No server, no deploy, no auth needed.
MCP server (Layer 4) reads local asset files directly — no HTTP middleman.

**Decision**: start with Path B. Add Firebase Functions only when external HTTP access is actually needed.

---

## Layer 4 — MCP Server

**Model Context Protocol** — Anthropic standard. Claude Desktop / Claude API can connect to MCP servers and call tools natively.

### Server structure

```
mcp-server/
  src/
    index.ts          MCP server entry
    resources/
      characters.ts   expose character catalog as Resources
      scripts.ts      expose scripts
    tools/
      translate.ts
      search.ts
      generate.ts
      analyze.ts
    prompts/
      create_character.ts   guided prompt template
      script_review.ts
```

### Resources (read-only data)

```
botc://characters              all character IDs + names
botc://characters/{id}         full character JSON
botc://scripts/{slug}          script JSON
botc://editions                edition list
botc://night-order/first
botc://night-order/other
```

### Tools (actions)

Same as Tool catalogue above, wrapped in MCP tool schema.

### Prompts (guided workflows)

```
create_character   — step-by-step character creation with user Q&A
review_script      — balance analysis of a script
translate_script   — batch translate all custom chars in a script
```

### Data access

MCP server reads character data **directly from local asset files** — no HTTP layer needed:
```
mcp-server/src/botcData.ts   reads assets/characters/*.json + assets/locales/*.json
```
Custom chars + scripts that live in Firebase: MCP server can either read Firebase directly
(service account key) or accept them as input parameters from the calling agent.

### Deploy options

| Mode | How |
|------|-----|
| Local dev | `node mcp-server/dist/index.js` → Claude Desktop `mcpServers` config |
| Remote (if needed) | Firebase Cloud Function wrapping the same tool logic |

---

## Layer 5 — Improved Translation & Suggestions

### Problems with current approach
1. No BOTC terminology consistency (e.g. "Storyteller" not "讲故事的人")
2. No style reference (generated abilities don't match official BotC phrasing)
3. No collision check (suggest ID that already exists)

### Fixes

**Translation**:
- Inject terminology glossary in system prompt
- Retrieve 2–3 similar existing chars → provide as style examples
- Two-pass: draft → review (second LLM call checks consistency)

**Name suggestion**:
- Search `chars_zh` embeddings for similar ability → find names with similar meaning
- Pass top-3 as examples: "Here are ZH names for similar mechanics: ..."
- Validate: no homophone collision with existing chars

**Ability generation**:
- Few-shot: retrieve 3 chars of same team → include full ability text
- Chain: draft → `check_balance` → if too strong, ask LLM to revise

**Glossary** (`src/lib/botcGlossary.ts`):
```typescript
export const BOTC_TERMS = {
  en: {
    'Storyteller': 'Storyteller',
    'Demon': 'Demon', 'Minion': 'Minion', ...
  },
  zh: {
    'Storyteller': '说书人',
    'Demon': '恶魔', 'Minion': '爪牙',
    'Townsfolk': '镇民', 'Outsider': '外来者',
    'Traveler': '旅行者', 'Fabled': '传奇角色',
    'nominate': '提名', 'execute': '处决',
    'dead vote': '亡者票', 'ghost vote': '亡魂票',
    'poison': '中毒', 'drunk': '醉酒',
    'mad': '疯狂', 'register': '登记为',
    'night': '夜晚', 'day': '白天',
  },
}
```

---

## Implementation Roadmap

### Phase 1 — Improve current MVP (1–2 weeks)
- [ ] `botcGlossary.ts` — terminology constant, inject into all prompts
- [ ] Few-shot injection for `suggestAbility` and `translate` (use catalog similarity)
- [ ] ID collision check against existing catalog in `suggestId`
- [ ] Two-pass translation (draft + review)

### Phase 2 — Embeddings (2–3 weeks)
- [ ] `scripts/build-embeddings.ts` — precompute all char embeddings at build time
- [ ] `src/lib/botcSearch.ts` — cosine similarity search in browser
- [ ] Wire into `suggestAbility` and `suggestChineseName` for few-shot
- [ ] Translation memory (store confirmed translations in localStorage)

### Phase 3 — Tool layer + Orchestrator (2–3 weeks)
- [ ] `src/lib/tools/` — formalize all operations as typed Tools
- [ ] `src/lib/agentOrchestrator.ts` — ReAct loop, tool dispatch, context injection
- [ ] `generate_character` as multi-step tool chain
- [ ] `script_analysis` tool

### Phase 4 — REST API (optional, Firebase Functions)
- [ ] Add only when external HTTP access is needed
- [ ] `functions/src/characters.ts` — GET /characters, GET /characters/:id
- [ ] `functions/src/tools.ts` — POST /tool/:id
- [ ] Reuses same tool layer from Phase 3 (no logic duplication)

### Phase 5 — MCP Server (2–3 weeks)
- [ ] `mcp-server/` — standalone Node.js MCP server
- [ ] Resources: characters, scripts
- [ ] Tools: translate, search, generate, analyze
- [ ] Prompts: create_character, review_script
- [ ] Claude Desktop config instructions

### Phase 6 — Icon generation (1 week)
- [ ] `generate_icon_prompt` tool → structured prompt for image models
- [ ] Wire to Stability AI / Replicate / fal.ai API (all have free/cheap tiers)
- [ ] Image result → store as icon URL in CustomCharacter

---

## File Structure (target)

```
src/
  lib/
    gemini.ts           AI client (current)
    aiSettings.ts       provider settings (current)
    botcAgent.ts        high-level task functions (current → refactor)
    botcGlossary.ts     terminology + style constants        [Phase 1]
    botcSearch.ts       embedding search                     [Phase 2]
    agentOrchestrator.ts tool-use ReAct loop                [Phase 3]
    tools/
      index.ts          tool registry
      translate.ts
      search.ts
      generate.ts
      analyze.ts
  components/
    AgentButton.tsx     (current)
    AiChatDialog.tsx    (current)
    ConceptToChar.tsx   full-page char creation wizard       [Phase 3]

functions/              Firebase Cloud Functions              [Phase 4, optional]
  src/
    characters.ts       HTTP endpoints if external access needed
    tools.ts

mcp-server/             MCP server                           [Phase 5]
  src/
    index.ts
    resources/
    tools/
    prompts/

scripts/
  build-embeddings.ts   precompute + write assets/           [Phase 2]

assets/
  embeddings/
    chars_en.json       precomputed vectors                  [Phase 2]
    chars_zh.json
```
