# 架构演进方案：API / MCP / AI 说书人

> 状态：P0 进行中（分支 `feat/api-core-prep`）
> 目标：在**不影响现有功能**、**全程免费额度**的前提下，把 BOTC Companion 从“纯前端静态站”演进为可被 Agent 调用的平台（REST API + MCP），支撑剧本创建、角色创建、说书人自动化 / AI 化。

---

## 1. 现状架构

```
┌──────────────── 纯前端 SPA（一套代码 4 形态）────────────────┐
│ React 19 + MUI 9 + Vite 6                                     │
│ Web: GitHub Pages /botc-script-editor/ · PWA · Electron · Capacitor(iOS/Android) │
├───────────────────────────────────────────────────────────────┤
│ 静态数据（构建期 import.meta.glob 打进 bundle）                │
│   assets/characters/individual/*.json（357）· scripts（35）   │
│   jinxes · night-order · locales(en/zh) · almanac · icons     │
│   public/wiki-chunks.json · embeddings                        │
├───────────────────────────────────────────────────────────────┤
│ 用户数据：local-first（localStorage / Capacitor Preferences）  │
│   对局 botc-storyteller-companion-v5（useHistory undo/redo）  │
│   剧本 / 自定义角色 / 记录 → bundle 导出 + Google Drive 同步   │
│   键清单见 docs/STORAGE.md                                     │
├───────────────────────────────────────────────────────────────┤
│ Firebase Spark：仅 Firestore（无 Functions、无 Auth）          │
│   shortlinks（分享短链 24h）                                   │
│   dealSessions（座位认领 / 发角色 / 私信 / 远程投票，onSnapshot）│
├───────────────────────────────────────────────────────────────┤
│ AI：客户端 BYOK（Groq / OpenRouter / Gemini）                  │
│   src/lib/ai/skills.ts 23 个 skill prompt（纯数据）            │
│   context builder + JSON fill 协议 + wiki 检索 + 向量相似      │
└───────────────────────────────────────────────────────────────┘
```

### 1.1 API 化阻碍

| # | 问题 | 位置 | 影响 |
|---|---|---|---|
| 1 | 规则逻辑与 UI setter 耦合（`setPickerMode` / `setIsTimerRunning` / `window.setTimeout`） | `src/hooks/useGameActions.ts`、`useGameLifecycle.ts` | 服务端 / MCP 不能复用 |
| 2 | `catalog.ts`（1400+ 行）混合静态数据、localStorage overlay、Vite glob | `src/catalog.ts` | 无法在 Worker / Node 运行 |
| 3 | 事件日志存已本地化字符串 | `src/utils/logI18n.ts` | 机器不可读；切语言后旧日志不变 |
| 4 | 计时器以“剩余秒数”存于 state | `DayState.privateSeconds` 等 | 服务端权威状态需要 `endsAt` 时间戳 |
| 5 | 统计是 React hook | `AnalyticsStudio/useStats.ts` | API 不能直接用 |
| 6 | 无身份体系 | — | 无法做“我的剧本 / 记录”API |

### 1.2 安全待修（与本方案无关，独立跟踪）

- **I-73**：CI 把 `VITE_GOOGLE_CLIENT_SECRET`（Web OAuth client secret）打进公开 bundle（`src/lib/googleAuth.ts`、`.github/workflows/deploy-pages.yml`）。修复：P2 的 Worker 做 token 交换代理。
- **I-74**：`dealSessions` 规则 `allow update: if true`，而 `hostToken` 存在公开可读的 session 文档里 → 任何知道 sessionId 的人可读 token 并篡改角色 / 投票。修复：P3 迁到 Durable Object，写操作走服务端。

---

## 2. 目标架构

### 2.1 选型（全部免费额度）

| 方案 | 结论 | 理由 |
|---|---|---|
| **Cloudflare Workers + Durable Objects + D1 + KV + R2** | ✅ 采用 | 不绑卡；超额直接 429，不会产生账单；DO 单线程 = 每局一个权威房间，投票无竞态；官方 MCP（`agents` SDK / `McpAgent`）与 OAuth（`@cloudflare/workers-oauth-provider`）支持 |
| Firebase Blaze + Cloud Functions | ❌ | Functions 需 Blaze（绑卡，无硬上限，被刷有账单风险） |
| Supabase Free | ❌ | 7 天无活动自动暂停，对低流量项目致命 |

Firebase 保留：**Auth**（Google 登录，免费）+ **Firestore**（过渡期继续承载 shortlinks / dealSessions）。

```
 客户端（Web / Electron / App）                 Agent（Claude / ChatGPT / Cursor / 脚本）
   local-first 不变 + @botc/core                     │ MCP (Streamable HTTP)   │ REST + PAT
        │ REST / WS        │ 静态 JSON                 ▼                         ▼
        ▼                  ▼             ┌──── Cloudflare Worker (Hono) ─────────────────┐
                GitHub Pages             │ /v1/*   /mcp   /openapi.json   /llms.txt       │
                /api/v1/*.json           │ @botc/core：engine · validator · stats         │
                （目录只读，零成本）     │ OAuth provider ← Firebase Auth (Google)        │
                                         ├─ DO GameRoom：每局一个，权威状态 + WS 广播      │
                                         ├─ D1：用户剧本 / 自定义角色 / 记录 / PAT          │
                                         ├─ KV：OAuth grant、缓存 · R2：自定义角色图标      │
                                         └─ Firestore（过渡期）：shortlinks、dealSessions    │
                                         └──────────────────────────────────────────────────┘
```

### 2.2 架构决策（ADR 摘要）

| # | 决策 | 说明 |
|---|---|---|
| D1 | **纯 TS 核心 `src/core/`**，Web / Worker / MCP / 测试四处复用 | 核心内禁止 React、MUI、Firebase、DOM、localStorage、`import.meta`；数据通过参数注入。由 `tsconfig.core.json`（无 DOM lib）+ 边界测试强制 |
| D2 | **Command → Event → State** | `apply(state, cmd, ctx) → { state, events, effects }`；UI 副作用（计时器 / 弹窗）作为 `effects` 交给客户端；`ctx` 注入 `now` / `rng` 保证可回放 |
| D3 | **结构化事件** | 事件存 `{ code, params }`，渲染时本地化；保留旧 `detail` 字段向后兼容 |
| D4 | **时间用 deadline** | 状态存 `endsAt`，剩余秒数由客户端计算 |
| D5 | **MCP 服务端不跑 LLM** | 推理由调用方 Agent 完成 → 服务端 LLM 成本为 0；应用内 AI 保持 BYOK |
| D6 | **一份 schema** | zod 定义 → OpenAPI（`@hono/zod-openapi`）+ MCP `inputSchema` + TS 类型；与 `src/script_schema.json` 对齐。zod 只进 worker 包，不进 Web bundle |
| D7 | **视角隔离** | token 带 scope：🎩 ST / 🌐 public / 🪑 seat:N；ST-only 信息永不进入 public / seat 视图 |
| D8 | **local-first 不变** | 离线对局、Electron、Capacitor 照常；云端是可选“云对局 / 云库” |
| D9 | **重计算留客户端** | 免费 Worker 每次调用 10ms CPU：PDF / 图片不在服务端生成，API 返回 app 深链；完整 catalog 不在冷启动解析，用精简索引 + 按需拉取 |
| D10 | **乐观并发 + 幂等** | 写接口带 `expectedVersion`（409 冲突）和 `Idempotency-Key` |

### 2.3 目录规划

```
src/core/                 # 纯 TS（P0 在仓库内建立，稳定后可升级为 packages/core workspace）
  types/                  # 领域类型（旧路径 re-export 兼容）
  stats/                  # 统计纯函数
  script/                 # 剧本格式解析、校验、分析
  engine/                 # 对局状态机（命令 / 事件 / 状态）
worker/                   # P1：Hono + MCP + DO（独立 package.json，不影响 Web 构建与 CI 安装）
scripts/build-catalog.mjs # P1：产出 Worker 可用的精简 catalog JSON + 静态 /api/v1/*.json
```

---

## 3. API 清单（按 Tab）

权限：🌐 公开　👤 用户（Firebase ID token / PAT / MCP OAuth）　🎩 对局主持（host scope）　🪑 座位（seat scope）
阶段：P1 只读 + 无账号　P2 账号 + 云库　P3 云对局　P4 AI 说书人

### 3.1 共享目录（Scripts + Characters）

| 接口 | 用途 | 权限 | 阶段 | MCP |
|---|---|---|---|---|
| `GET /v1/characters?team&edition&q&lang` | 列表 / 搜索 | 🌐 | P1 | `search_characters` |
| `GET /v1/characters/{id}?lang&revision` | 能力 / 修订 / jinx / 夜序 / 提醒标记 / almanac | 🌐 | P1 | `get_character` |
| `GET /v1/characters/{id}/similar?k=5` | 向量相似（复用预计算 embeddings） | 🌐 | P1 | `find_similar_characters` |
| `GET /v1/night-order` · `/v1/editions` · `/v1/jinxes?ids=` | 基础数据 | 🌐 | P1 | resource |
| `GET /v1/rules/search?q` | 规则检索（wiki-chunks） | 🌐 | P1 | `search_rules` |

静态镜像（GitHub Pages）：`/api/v1/characters.json`、`/api/v1/characters/{id}.json`、`/api/v1/scripts/{slug}.json`、`/api/v1/night-order.json`。

### 3.2 Scripts

| 接口 | 用途 | 权限 | 阶段 | MCP |
|---|---|---|---|---|
| `GET /v1/scripts` · `/v1/scripts/{slug}` | 官方 / 社区剧本 | 🌐 | P1 | `list_scripts` / `get_script` |
| `POST /v1/scripts:validate` | 未知 id、重复、阵营计数、缺恶魔、自定义角色字段、适用 jinx；返回解析后完整角色表 + 夜序 | 🌐 | P1 | `validate_script` |
| `POST /v1/scripts:analyze` | 确定性统计：信息 / 保护 / 杀伤占比、外来者修正、难度指标 | 🌐 | P1 | `analyze_script` |
| `POST /v1/scripts:convert` | 官方 script JSON ⇄ EditableScript | 🌐 | P1 | — |
| `POST /v1/share` | 复用 shortlinks → 返回 app `?sl=` 导入链接 | 🌐 | P1 | `create_script_draft` |
| `GET·POST /v1/me/scripts`，`GET·PATCH·DELETE /v1/me/scripts/{id}` | 我的剧本库 | 👤 | P2 | `list_my_scripts` / `save_script` |
| `POST /v1/me/scripts/{id}/revisions` · `PUT /v1/me/folders` | 版本 / 文件夹 | 👤 | P2 | — |
| `GET /v1/me/scripts/{id}/export?format=json` | 官方 JSON；PDF → 返回打印深链 | 👤 | P2 | — |

### 3.3 Characters

| 接口 | 用途 | 权限 | 阶段 | MCP |
|---|---|---|---|---|
| `POST /v1/characters:validate` | 字段校验 + 风格 lint + id 冲突 | 🌐 | P1 | `validate_character` |
| `GET·POST /v1/me/characters`，`PATCH·DELETE /{id}` | 自定义角色（`custom_*`，图标 → R2） | 👤 | P2 | `create_character` / `update_character` |
| `POST /v1/me/characters/{id}/revisions` | 能力修订（对应 `npm run add-revision`） | 👤 | P2 | `add_revision` |
| `PATCH /v1/me/overrides/{jinxes\|reminders\|night}` | 相克 / 提醒标记 / 夜序覆盖 | 👤 | P2 | — |
| `POST /v1/me/character-packs:import` · `GET :export` | 角色包 | 👤 | P2 | — |

### 3.4 Storyteller

| 接口 | 用途 | 权限 | 阶段 | MCP |
|---|---|---|---|---|
| `POST /v1/games` | 剧本 + 人数建局 → `gameId` + host token | 👤/🎩 | P3 | `create_game` |
| `POST /v1/games/{id}/setup:propose` | 按人数分布 + setup 修正随机抽 bag、恶魔伪装 | 🎩 | P3 | `propose_setup` |
| `PUT /v1/games/{id}/setup` | 座位名、真实 / 自认角色、旅行者、传奇 / Loric、伪装 | 🎩 | P3 | `apply_setup` |
| `GET /v1/games/{id}?view=st\|public\|seat:N` | 视角过滤状态 | 🎩/🌐/🪑 | P3 | `get_grimoire` |
| `POST /v1/games/{id}/commands` | 命令总线（见下） | 🎩 | P3 | `run_command` |
| `GET /v1/games/{id}/night-script?night=first\|other` | 当夜唤醒顺序：在场角色 × 存活 × 醉 / 毒 × 提醒文本 | 🎩 | P3 | `get_night_script` |
| `GET /v1/games/{id}/events?since=v` | 事件流（WS / SSE） | 🎩 | P3 | `get_events` |
| `POST /v1/games/{id}:undo` · `:end` | 撤销 / 结束并生成 GameRecord | 🎩 | P3 | `undo` / `end_game` |
| `POST /v1/games/{id}/lobby` | 开座位认领 | 🎩 | P3 | `open_lobby` |
| `POST /v1/games/{id}/seats/{n}:reveal` | 发角色（含双卡模式） | 🎩 | P3 | `reveal_character` |
| `POST /v1/games/{id}/messages` | ST → 座位 / 广播（夜间信息） | 🎩 | P3 | `send_player_message` |
| `POST /v1/games/{id}/remote-votes` | 远程投票 | 🎩 | P3 | `start_remote_vote` |
| `POST /v1/lobby/{sid}/claim\|vote\|messages` | 玩家端 | 🪑 | P3 | — |

**命令总线**（`POST /commands`，body 为判别联合）：

```
phase.set | phase.next | day.next
seat.update { seat, alive?, isExecuted?, hasNoVote?, isTraveler?, characterId?, userCharacterId?, teamTag?, note? }
seat.tag.add | seat.tag.remove { seat, tag, scope: 'st' | 'public' }
nomination.open { actor, target } | nomination.confirm | nomination.reject
speech.target | speech.next
vote.start | vote.cast { seat, yes, weight? } | vote.record { countOverride?, passedOverride? }
exile.open { actor, target }
skill.record { actor, roleId, targets, statement, result, visibility }
note.log { text, visibility }
```

### 3.5 Analytics

| 接口 | 用途 | 权限 | 阶段 | MCP |
|---|---|---|---|---|
| `GET·POST /v1/me/records`，`GET·DELETE /{id}` | 对局记录 | 👤 | P2 | `list_records` / `get_record` |
| `GET /v1/me/stats/{kpi\|scripts\|players\|characters\|storytellers}` | 统计（`src/core/stats`） | 👤 | P2 | `get_stats` |
| `POST /v1/records:share` | 分享短链 | 👤 | P2 | — |

### 3.6 Print Studio / Settings

| 接口 | 用途 | 权限 | 阶段 | MCP |
|---|---|---|---|---|
| `GET /v1/scripts/{slug}/tokens` | 打印清单：角色 token + 提醒标记数量 + icon URL（PDF 仍客户端生成） | 🌐 | P1 | `get_token_manifest` |
| `GET /v1/me` · `POST·GET·DELETE /v1/me/tokens` | 身份 / PAT 管理 | 👤 | P2 | — |
| `GET·PUT /v1/me/bundle` | 全量导入导出（复用 bundleIO 校验） | 👤 | P2 | — |
| `POST /v1/auth/google/token` | OAuth code 交换代理（修 I-73） | 🌐 | P2 | — |

AI 设置保持本地 BYOK，永不上传。

---

## 4. MCP 设计

- **Tools**（约 25 个，粗粒度）：见上表 MCP 列。标注 `readOnlyHint` / `destructiveHint`；返回 `structuredContent` + `outputSchema` + 简短文本。
- **Resources**：`botc://characters/{id}`、`botc://scripts/{slug}`、`botc://glossary`、`botc://night-order`、`botc://games/{id}/grimoire`（可订阅）。
- **Prompts**：`src/lib/ai/skills.ts` 的 23 个 skill 已是纯数据，直接映射为 MCP prompts（`translate-zh`、`full-character`、`analyze-script`、`st-advice`、`debrief` …）。
- **分发**：远程 `https://<name>.workers.dev/mcp`（Claude.ai / Claude Desktop / ChatGPT / Cursor 可连）；非 MCP Agent 用 `/openapi.json` + `/llms.txt`。
- **认证**：只读工具无需认证；写工具走 MCP OAuth 2.1（上游 Firebase Auth / Google）或 PAT。
- **Prompt injection**：玩家私信、玩家名等均为不可信输入，进入 AI ST 上下文时以“数据”包裹并标注来源。

---

## 5. AI 说书人分级

| 级别 | 形态 | 依赖 |
|---|---|---|
| L0 助手 | 现有 AI 面板，建议型 | 已有 |
| L1 协作 | 人类 ST；Agent 经 MCP 读 grimoire / 夜序、做规则检查、起草夜间信息 | P3 只读工具 |
| L2 半自动 | Agent 生成 proposal → ST 在 UI 一键批准 → 自动私信座位 | `proposals` 队列 + 审批 UI |
| L3 全自动 | Agent 主持全局，玩家只用 guest 页 | 服务端权威状态 + 视角隔离 + deadline + `get_pending_decisions` |

关键确定性工具 **`suggest_night_info(seat)`**：返回在当前局面下**合法的**真实信息候选；若该座位醉 / 毒则返回任意候选。Agent 只做选择，杜绝 LLM 编造违规信息。先覆盖 Trouble Brewing（约 22 个角色），再逐版本扩展。

评测：用 `GameRecord.savedDays` 回放历史对局，作为 AI ST 的回归 fixture。

---

## 6. 分阶段计划

| 阶段 | 内容 | 验收 |
|---|---|---|
| **P0 抽 core**（约 2 周，零基础设施） | 见 §7 清单 | 现有测试全绿；Node 下可完整回放一局 |
| **P1 只读 API + MCP，无账号**（约 1 周） | `worker/` 脚手架（Hono）；静态 `/api/v1/*.json`；目录 / 校验 / 分析 / 相似 / token 清单；MCP 只读 tools + prompts + resources；`create_script_draft` 通过 Firestore REST 写 shortlinks（现有规则允许匿名 create）→ 返回 `?sl=` 导入链接 | 在 Claude 中“设计一个 8 人剧本” → 拿到可一键导入的链接 |
| **P2 账号 + 云库**（约 2 周） | Firebase Auth → Worker JWKS 校验；D1 表；PAT；MCP OAuth；Web ↔ 云库同步（`updatedAt` LWW + tombstone）；OAuth 交换代理并从 bundle 移除 client secret | Agent 写入的剧本 / 角色自动出现在 app |
| **P3 云对局**（3–4 周） | DO `GameRoom`（WS hibernation）；“云对局”模式（本地模式仍为默认）；Deal 从 Firestore 迁到 DO（修 I-74）；ST MCP tools | ST 与 Agent 同时操作同一局，状态一致 |
| **P4 AI 说书人**（持续） | L1 → L2 → L3；夜间信息生成器；proposal 审批；回放评测；可选服务端 Agent 循环（Gemini 免费档 / Workers AI，每用户每日限额） | TB 全局由 L2 跑通 |

---

## 7. P0 清单与进度

兼容性原则：
1. localStorage 键与数据形状不变（见 `docs/STORAGE.md`）。
2. 旧 import 路径保留（re-export shim），迁移可逐文件进行。
3. P0 不给 Web bundle 引入新的运行时依赖。
4. 每一步单独 commit；`npm test` + `tsc -b` + `npm run core:check` 全绿。

| 状态 | 项目 | 备注 |
|---|---|---|
| ✅ | 方案文档 + 安全问题登记（I-73 / I-74） | 本文 |
| ✅ | `src/core/` + 边界守卫（`tsconfig.core.json` 无 DOM lib；边界测试禁止 React / Firebase / DOM / `import.meta`） | `npm run core:check`、`src/__tests__/coreBoundary.test.ts`；已加入 `npm run verify` |
| ✅ | 领域类型迁入 `src/core/types/`（旧路径 re-export） | `catalog.ts`（原 `src/types.ts`）、`game.ts`（原 StorytellerSub 领域类型） |
| ✅ | 统计纯函数 `src/core/stats/`（`useStats` 仅保留 `useMemo` 包装） | `src/core/stats/records.ts` + `coreStats.test.ts` |
| ✅ | 剧本格式解析迁入 `src/core/script/` + 新增 `validateScript` | `format.ts`（从 catalog.ts 原样迁出）、`validate.ts`（含 did-you-mean 建议）；已发现 I-75 |
| ✅ | 座位 / 投票规则与状态工厂迁入 `src/core/engine/`（`seats.ts`、`votes.ts`、`factories.ts`） | 原样搬迁，`utils/seats`、`utils/votes`、`constants` re-export |
| ✅ | 引擎第一片：提名 / 投票状态迁移（`src/core/engine/nomination.ts`） | `useGameActions` 只保留 UI 副作用；浏览器实测记录 / 失败提名路径 |
| ✅ | 引擎：座位更新 + 结构化事件（`{ code, params }`） | `core/engine/events.ts`（`diffSeat`、`applySeatEdit`）；日志条目新增可选 `code`/`params`，`detail` 文本不变（`utils/eventText.ts`） |
| ✅ | 引擎：阶段 / 日程 / 建局（`useGameLifecycle`） | `core/engine/lifecycle.ts`、`setup.ts`（随机发牌可注入种子）、`alignment.ts`；浏览器实测阶段推进、新游戏、随机分配 |
| ⏸ | 计时器 → `endsAt` | **推迟到 P3**：本地应用无收益且需迁移持久化状态；云对局的 DO 状态直接用 `endsAt`，客户端换算剩余秒数 |
| ✅ | catalog 快照：`scripts/build-catalog.mjs` → `CatalogData`；`src/core/catalog`（查询）、`src/core/script/analyze.ts`（确定性分析） | Web 继续用 `catalog.ts`（含用户覆盖）；测试逐角色比对二者一致（名称 / 能力 / 提醒 / 夜序文本 / jinx / 剧本） |
| ⬜ | 回放 fixture 测试（`GameRecord.savedDays`） | |

---

## 8. 免费额度核算

> 数据为规划时的公开额度，落地前以官网为准。

| 服务 | 免费额度 | 用途 | 小规模预估占用 |
|---|---|---|---|
| Workers | 10 万请求 / 天，10ms CPU / 次 | REST + MCP | < 5% |
| Durable Objects（SQLite） | 10 万请求 / 天，5GB | 对局房间 + WS | 50 局 × 300 命令 ≈ 1.5 万 |
| D1 | 读 500 万行 / 天，写 10 万行 / 天，5GB | 用户库 / 记录 | 极低 |
| KV | 读 10 万 / 天，写 1000 / 天 | OAuth grant、缓存 | 低 |
| R2 | 10GB | 自定义角色图标 | 低 |
| Firebase Auth | 免费（非短信） | 身份 | — |
| Firestore Spark | 读 5 万 / 写 2 万 / 天，1GiB | 短链 + 过渡期 deal | 低 |
| GitHub Pages | 站点 1GB，约 100GB / 月（软） | 前端 + 静态 API | 注意 `assets/pdfs`（43M）、`assets/icons`（33M） |
| LLM | MCP 调用方自带 / 应用内 BYOK / 可选 Gemini 免费档、Workers AI 1 万 neurons / 天 | 智能 | 服务端 ≈ 0 |

---

## 9. 风险

| 风险 | 缓解 |
|---|---|
| Worker 10ms CPU 上限 | 精简 catalog 索引；重计算（PDF / 图片）留客户端 |
| KV 写 1000 / 天 | 只存 OAuth grant；计数器用 DO |
| 隐藏信息泄漏给玩家 / Agent | 视角过滤在服务端做；token scope；视图快照测试 |
| Prompt injection（玩家输入进入 AI ST） | 数据包裹 + 来源标注；破坏性命令需 ST 批准（L2） |
| 双端状态分叉（本地 vs 云对局） | 同一 `src/core/engine`；云对局以 DO 为唯一权威 |
| 免费额度变化 | 超额即 429 不计费；关键路径保留 local-first 降级 |
