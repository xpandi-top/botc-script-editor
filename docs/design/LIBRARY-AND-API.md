# 剧本库、角色库与 AI 可调用 API 设计

状态：UI 第一轮已实现；本文所有 API、权限和服务端机制均为设计，尚未上线。
日期：2026-09-22。

## 1. 本轮 UI 设计与落地

### 剧本库

- 顶部固定操作区：新建、导入、导出 / 分享。列表和卡片视图共用，手机端换行显示。
- 导入流程：一次选多个 JSON → 逐文件预览名称、角色数及错误 → 选择已有的个人文件夹 → 确认有效文件。单文件上限 5 MB；同名文件自动分配不同 slug，始终新增副本，不覆盖旧内容。
- 导出面板明确显示当前剧本名称，分成 JSON、PDF、分享链接三个选择。PDF 接现有排版设置和另存为 PDF 流程。
- 内置剧本提供“复制后编辑”；保留已有文件夹、来源分组、标签、排序、列表 / 卡片视图。
- 列表与卡片搜索都支持名称、中英文名、作者、slug、标签、文件夹、角色名及角色 ID；多个关键词共同匹配。

### 全部角色

- 常用条件放在上方：关键词、角色类型、剧本；版本和角色包、夜间顺序、相克工具折叠。
- 剧本筛选可搜索、多选，显示已选剧本；多个剧本取角色 ID 并集，再与关键词、角色类型、版本条件求交集。
- 选择剧本时可按内置 / 我的剧本以及文件夹缩小候选范围。来源、文件夹控制的是剧本候选菜单，只有选中剧本后才影响角色结果。
- 候选菜单最多显示 50 项，输入关键词继续定位；同名剧本显示作者、slug、角色数区分。文件夹选择支持搜索。
- 角色列表每批 80 项，点击加载更多；切换条件重置显示数量。无结果时给出空状态与清空入口，详情面板随过滤结果更新。
- 当前筛选针对角色目录，剧本内嵌但未加入目录的自定义角色需要通过现有角色包导入功能加入目录。应明确提示缺失，不静默将剧本定义提升为全局定义；同 ID 的剧本局部版本不能覆盖全局角色。

### 下一阶段大量剧本的管理

第一轮使用内存搜索索引与结果上限，避免把全部剧本铺成按钮。后续统一 `LibraryQueryService`，使剧本库和角色选择器使用同一查询语义；在真实数据量测量后引入虚拟列表。数千至数万条数据可迁到 IndexedDB 索引，不在每次按键时解析所有 JSON。

建议索引：`id`、规范化名称 / 别名、作者、来源、folderId、tags、updatedAt；成员关系 `scriptId → characterId[]` 及反向 `characterId → scriptId[]`。文件夹只负责收纳，多标签负责跨文件夹分类。在已有收藏标签基础上，增加最近使用、保存的筛选条件、批量移动 / 打标签 / 导出可作为第二轮，避免本次同时引入多套新管理方式。

## 2. 现有结构与 API 边界

当前代码并不是可直接开放的后台：

| 当前入口 | 职责 | 抽取目标 |
| --- | --- | --- |
| `src/App.tsx` | 剧本 CRUD、角色过滤、React 状态 | ScriptService、LibraryQueryService |
| `src/catalog.ts` | 角色目录、覆盖层、JSON 解析、语言与版本解析 | CatalogService、ImportService |
| `src/components/tabs/CharactersTab.tsx` | 角色包导入 / 导出、编辑 | CharacterService、PackService |
| `src/hooks/useGameActions.ts` | 座位、标签、投票、能力动作及日志 | GameCommandService |
| `src/hooks/useGameLifecycle.ts` | 新游戏、阶段推进、结束 | GameLifecycleService |
| `src/hooks/useGameExport.ts` | 存档、游戏导出 | RecordService |
| `src/lib/DealSession.ts` | 联机领座、分配、投票、私信 | SessionService + 受认证远端适配器 |
| `src/lib/bundleIO.ts` / `driveSync.ts` / `storage.ts` | 备份、同步、本地持久化 | Repository、BackupService、SyncService |
| `src/lib/ai/*` / `agentContext.ts` / `fillLog.ts` | AI 上下文、字段填入、记录 | AI Tool Adapter、计划预览 |
| `src/lib/nativePrint.ts`、打印工坊 | PDF 与 token 排版导出 | ExportService、JobService |

架构建议：

```text
React 界面 ─────┐
AI 工具调用 ────┼─→ Command / Query 服务 → Repository → 本地存储 / 远端
HTTP / MCP ────┘          │
                         └→ 校验、权限、版本、事件、任务队列
```

先抽取与 React 无关的 TypeScript 服务，让 UI 和 AI 使用同一业务实现；再增加可选 HTTP / MCP 适配器。静态网页不能自行变成可信 API 服务器。远程调用必须配套认证后台；桌面本地桥接必须显式启用、绑定回环地址且验证来源与凭据。不要把 React setter 或任意 localStorage 写入开放成工具。

本轮不新增服务端、不修改持久化键、不改变现有 AI 自动填表协议。API 设计与现有 [AI 字段填入设计](../AI-AGENT.md) 并存，未来把“填字段”作为尚未提交的草稿编辑。

## 3. 资源模型

| 资源 | 关键字段与约束 |
| --- | --- |
| Character | 稳定 `id`、slug、team、双语文本、图标引用、提醒、来源、revision、version；内置定义只读，通过用户修订覆盖 |
| Script | 稳定 `id`、可改 slug、双语名称、作者、folderId、tags、成员引用及 pinnedRevision、内嵌定义、version |
| Folder / SavedView | 收纳 / 保存查询，不复制实体；删文件夹默认移出成员，不删除剧本 |
| Game | id、scriptSnapshot、rulesProfile、status、currentDayId、version；开始后固定剧本与角色修订快照 |
| Seat | 稳定 seatId、可变座位号、名字、alive、executed、traveler、投票权；identity 私有分区独立 |
| SeatIdentity | characterRef、perceivedCharacterRef、alignment、privateNotes；阵营默认来自角色，换角默认保留当前阵营 |
| Day / Phase | dayId、dayNumber、phase；支持现有 night / private / public / nomination，不擅自简化状态机 |
| Reminder / NightAction | ownerSeatId、sourceCharacterRef、targets、result、状态、作用阶段；默认 st-only |
| Nomination / Vote | actor、target、isExile、逐座位票、人工修正、规则快照、结算状态；适配现有扩展多票规则 |
| Event / Record | actor、source、commandId、发生时间、版本、结构化 payload、visibility；存档保留快照与结果 |
| DealSession / Message | gameId、有效期、host/seat 凭据；玩家仅拥有自己的座位和消息 |
| ImportPlan / CommandPlan | 内容摘要、差异、冲突、受影响版本、有效期、可执行步骤 |
| Artifact / Job | 文件类型、大小、内容摘要、权限、过期时间、状态 / 进度 / 错误 |

`team` 是镇民、外来者、爪牙、恶魔等角色类型；`alignment` 是善良 / 邪恶，不能用一个字段代替。外部稳定 ID 不再与可重命名的 slug 绑定；迁移时保存旧 slug 别名。剧本内嵌角色使用 `(scriptId, localId, revision)` 引用，避免两个自定义同名 ID 相互覆盖。

## 4. 通用接口约定

- 路径统一 `/api/v1`；下表省略此前缀。操作名可直接映射 AI 工具名称，如 `scripts.create`。
- 查询支持 `q`、`limit`（默认 50，最多 100）、不透明 `cursor`、`sort`；稳定排序加 id 作为次序键。结果返回 `{items,nextCursor,total,facets}`。查询不同维度 AND，同一维度数组 OR；`scriptMode=any|all` 默认 any。
- 所有修改携带 `If-Match` 资源版本；创建和命令要求 `Idempotency-Key`。幂等键按身份 + 操作隔离，同键同请求返回原结果，同键不同请求返回 409。保留期至少 24 小时；过期重试先查询 commandId。
- DTO 用字段白名单和运行时 schema 校验，明确大小、数量和嵌套深度上限；不得将 TypeScript 类型断言当校验。兼容旧导入的扩展字段可以存入受限 extensions，不能直接写入内部执行字段。
- 返回 `{data,version,commandId,events,warnings}`；错误 `{error:{code,message,fieldErrors,requestId,retryable}}`。
- 常见状态：400 格式错误，401 未认证，403 无权限，404 不存在或不可见，409 业务冲突，412 版本变化，422 内容校验失败，429 限流，503 外部依赖不可用。错误信息也不泄露角色等秘密。
- 读接口无隐式副作用；“下一天”“处决”“消耗投票权”使用命令，不开放任意 JSON Patch 修改游戏状态。
- 长任务返回 202 + jobId，通过任务读取或 SSE 订阅；导出文件短期授权下载，不在响应里塞大段 base64。
- 日期 ISO 8601 UTC；名称、中文说明是内容，日志保存结构化值后本地化渲染。

## 5. 可实现的 API 清单

这是覆盖当前产品及 AI 扩展的目标清单，不表示现已实现。P0 = 先抽取共用服务；P1 = 游戏操作；P2 = 联机 / 自动化 / 外部开放。每行可包含同一资源的一组方法，括号内列出命令种类。

### 5.1 能力发现、目录与角色

| 方法 / 路径 | 操作 / 用途 | 权限 / 优先级 |
| --- | --- | --- |
| GET `/capabilities` | 查询可用版本、工具、规则配置与当前授权范围 | 按调用方裁剪 / P0 |
| GET `/characters` | 关键词、team、edition、scriptIds、来源、修订筛选 | catalog.read / P0 |
| GET `/characters/{id}` | 有效角色定义及来源，支持语言、修订 | catalog.read / P0 |
| POST `/characters` | 创建自定义角色，检测 ID 冲突 | catalog.write / P0 |
| PATCH `/characters/{id}` | 更新自定义草稿元数据 | catalog.write / P0 |
| DELETE `/characters/{id}` | 删除自定义角色；有引用时返回冲突与处理计划 | catalog.write / P0 |
| POST `/characters/{id}/copies` | 从内置或自定义角色复制 | catalog.write / P0 |
| GET, POST `/characters/{id}/revisions` | 列出或创建不可变修订 | catalog.read/write / P0 |
| PUT `/characters/{id}/active-revision` | 设置工作区使用的修订，游戏快照不变 | catalog.write / P0 |
| GET, PUT `/characters/{id}/reminders` | 提醒 token 定义 | catalog.read/write / P0 |
| GET, PUT `/characters/{id}/night-info` | 首夜 / 其他夜顺序、提示、设置文本 | catalog.read/write / P0 |
| GET `/editions`、`/teams` | 版本 / 类型选项及筛选计数 | catalog.read / P0 |
| GET, POST `/jinxes`；PATCH, DELETE `/jinxes/{id}` | 相克关系、双语解释、启用状态 | catalog.read/write / P0 |
| GET, PUT `/night-order` | 全局 / 剧本夜序查询与用户覆盖 | catalog.read/write / P0 |
| POST `/character-packs/import-plans` | 预览角色包、冲突、覆盖范围 | catalog.write / P0 |
| POST `/character-packs/export-jobs` | 按版本 / 选择集导出 | catalog.read / P0 |
| POST `/catalog-overrides/reset-plans` | 预览清除角色包、夜序或修订覆盖 | catalog.write / P0 |

### 5.2 剧本与组织

| 方法 / 路径 | 操作 / 用途 | 权限 / 优先级 |
| --- | --- | --- |
| GET `/scripts` | 搜索、来源、文件夹、标签、作者、角色反查、排序分页 | scripts.read / P0 |
| GET `/scripts/{id}` | 完整剧本及已解析成员、缺失引用 | scripts.read / P0 |
| POST `/scripts` | 新建草稿 | scripts.write / P0 |
| PATCH `/scripts/{id}` | 名称、作者、注释、标签、版本元数据 | scripts.write / P0 |
| DELETE `/scripts/{id}` | 删除个人剧本；内置拒绝，游戏保留快照 | scripts.write / P0 |
| POST `/scripts/{id}/copies` | 复制并保留局部角色与修订 | scripts.write / P0 |
| PUT `/scripts/{id}/characters` | 有序成员集合，添加 / 移除 / 排序 / 固定修订 | scripts.write / P0 |
| GET, PUT `/scripts/{id}/rules` | Bootlegger、自定义设置规则与相克覆盖 | scripts.read/write / P0 |
| GET, POST `/scripts/{id}/revisions` | 剧本修订、说明与成员快照 | scripts.read/write / P0 |
| POST `/scripts/{id}/validation` | 缺失定义、重复成员、组成及相克提示；不声称证明平衡 | scripts.read / P0 |
| POST `/scripts/import-plans` | JSON / 多文件预览、解析错误、重复项、目标文件夹 | scripts.write / P0 |
| POST `/import-plans/{id}/apply` | 按已确认的冲突策略原子导入，禁止重新解释源文本 | 对应资源 write / P0 |
| GET `/import-plans/{id}` | 查看完整差异与状态 | 计划所有者 / P0 |
| POST `/scripts/{id}/export-jobs` | JSON / PDF / token，参数明确 scope | scripts.read / P0 |
| POST `/scripts/{id}/share-links`；DELETE `/share-links/{id}` | 创建 / 撤销分享，指定版本和有效期 | sharing.write / P2 |
| GET, POST `/folders`；PATCH, DELETE `/folders/{id}` | 文件夹管理，删除不级联删除剧本 | scripts.read/write / P0 |
| POST `/scripts/batch-commands` | 批量移动、打标签、复制、删除计划 | scripts.write / P0 |
| GET `/tags` | 标签候选、使用数量 | scripts.read / P0 |
| GET, POST `/saved-views`；PATCH, DELETE `/saved-views/{id}` | 收藏查询、快捷视图 | preferences.write / P2 |

### 5.3 游戏准备、座位与阶段

| 方法 / 路径 | 操作 / 用途 | 权限 / 优先级 |
| --- | --- | --- |
| GET, POST `/games` | 列出可访问游戏 / 从剧本快照创建草稿 | game.read / game.manage / P1 |
| GET `/games/{id}` | 按身份返回公开 / 本人 / ST 投影 | 对应 game.read / P1 |
| PATCH `/games/{id}/setup` | 玩家数、旅行者、角色池、恶魔伪装、传奇 / 奇遇、规则 | game.manage / P1 |
| POST `/games/{id}/setup-validation` | 引用、人数、阵容、冲突预检，返回提醒和阻断项 | game.manage / P1 |
| POST `/games/{id}/assignment-plans` | 随机或指定分配预览；记录种子但不公开给玩家 | game.manage / P1 |
| POST `/games/{id}/commands` | start / advance-phase / advance-day / end / reopen；各有独立输入 schema | game.manage / P1 |
| DELETE `/games/{id}` | 删除草稿或存档计划，运行中先显式结束 | game.manage / P1 |
| GET, POST `/games/{id}/seats` | 座位列表 / 添加玩家或旅行者 | game.read / game.manage / P1 |
| PATCH `/games/{id}/seats/{seatId}` | 改名等非规则状态 | game.manage / P1 |
| PUT `/games/{id}/seat-order` | 重排座位，稳定 seatId 不变 | game.manage / P1 |
| POST `/games/{id}/seats/{seatId}/commands` | change-character / change-perceived-character / change-alignment / die / revive / execute / exile / set-vote-entitlement | game.manage / P1 |
| GET, POST `/games/{id}/seats/{seatId}/reminders`；DELETE `/.../reminders/{reminderId}` | 公开标签 / ST 标记，指定来源、目标、期限 | game.read / game.manage / P1 |
| GET, PUT `/games/{id}/seats/{seatId}/private-note` | ST 笔记 | game.secrets / P1 |
| GET `/games/{id}/days`；GET `/games/{id}/days/{dayId}` | 历史快照；历史纠错不伪装为推进当前游戏 | game.read / P1 |
| GET, PUT `/games/{id}/presentation` | 当前展示视图、夜间显示角色开关、布局 | game.presentation / P1 |
| GET, POST `/games/{id}/timer-commands` | 查询 / start / pause / resume / reset / set-duration | game.manage / P1 |

### 5.4 夜间能力、提名、投票、日志

| 方法 / 路径 | 操作 / 用途 | 权限 / 优先级 |
| --- | --- | --- |
| GET `/games/{id}/night-queue` | 本夜顺序、已完成、待处理；只给 ST | game.secrets / P1 |
| POST `/games/{id}/night-actions` | 记录行动、目标、告知内容、效果提案；默认私有 | game.manage + game.secrets / P1 |
| GET, PATCH `/games/{id}/night-actions/{actionId}` | 查询 / 修改尚未提交的行动草稿 | game.secrets / P1 |
| POST `/games/{id}/night-actions/{actionId}/commands` | resolve / mark-done / undo-completion / cancel | game.manage / P1 |
| POST `/games/{id}/nominations` | 提名 / 流放，验证阶段与资格 | game.manage / P1 |
| GET `/games/{id}/nominations` | 本日 / 历史提名与公开状态 | game.read / P1 |
| POST `/games/{id}/nominations/{nominationId}/commands` | 开始陈述、辩护、投票、结束、取消、人工纠正 | game.manage / P1 |
| PUT `/games/{id}/nominations/{nominationId}/votes/{seatId}` | 记录 / 更改票数，结算前可改；与实时玩家投票分开授权 | game.manage / P1 |
| POST `/games/{id}/nominations/{nominationId}/settlement` | 原子结算，消耗票权一次，记事件与候选处决状态 | game.manage / P1 |
| GET, POST `/games/{id}/events` | 按日 / 阶段 / 类型查询，添加结构化手动日志 | game.read / game.manage / P1 |
| POST `/games/{id}/events/{eventId}/corrections` | 追加纠错，不覆盖审计原文 | game.manage / P1 |
| POST `/games/{id}/commands/{commandId}/undo` | 有条件补偿：验证版本、下游依赖与是否已发布 | game.manage / P1 |
| GET `/games/{id}/stream` | SSE：权限裁剪后的事件与版本变化 | game.read / P2 |

处决、死亡、阵营变化是不同命令；不推断“被处决就一定死亡”。夜间信息记录与真实效果执行也分开。胜负、醉酒 / 中毒下的信息裁定、特殊角色规则保留给说书人判断，AI 不直接当自动裁判。

### 5.5 联机、存档、分析和基础服务

| 方法 / 路径 | 操作 / 用途 | 权限 / 优先级 |
| --- | --- | --- |
| POST `/games/{id}/sessions`；GET, DELETE `/sessions/{id}` | 创建 / 查询 / 关闭领座发牌会话 | session.host / P2 |
| POST `/sessions/{id}/claims`；DELETE `/sessions/{id}/claims/{seatId}` | 玩家领取 / 主持释放座位 | session.player / host / P2 |
| GET `/sessions/{id}/me` | 仅本人座位、已发身份与消息 | session.player / P2 |
| POST `/sessions/{id}/deal-commands` | 发牌 / 改派 / 撤回；实际送达作为外部副作用 | session.host / P2 |
| GET, POST `/sessions/{id}/messages` | ST 与指定座位私信；禁止跨座位读取 | session.host/player / P2 |
| PUT `/sessions/{id}/messages/{messageId}/read` | 标记本人消息已读 | session.player/host / P2 |
| POST `/sessions/{id}/polls`；POST `/sessions/{id}/polls/{pollId}/commands` | 开启、推进、关闭、取消远端投票 | session.host / P2 |
| PUT `/sessions/{id}/polls/{pollId}/response` | 本人同意 / 反对，幂等替换 | session.player / P2 |
| GET, POST `/records`；GET, PATCH, DELETE `/records/{id}` | 存档列表、保存快照、名称 / 评分 / 结果纠错、删除 | records.read/write / P1 |
| POST `/records/import-plans`；POST `/records/{id}/export-jobs` | 预览导入 / 按公开或 ST 范围导出 | records.read/write + secrets / P1 |
| POST `/records/{id}/resume-plans` | 从存档建立新工作副本，保留原记录 | game.manage / P1 |
| POST `/records/{id}/share-links` | 生成裁剪后的只读分享 | sharing.write / P2 |
| GET `/analytics/summary`、`/analytics/players`、`/analytics/characters`、`/analytics/scripts` | 胜率、评分、使用频次等带样本量的统计 | records.read / P2 |
| POST `/print/jobs` | scope=script / tokens / both；布局、纸张、语言、图文开关 | export.write / P0 |
| GET `/jobs/{id}`；POST `/jobs/{id}/cancel` | 进度、错误、尽力取消 | 任务所有者 / P0 |
| GET `/artifacts/{id}` | 下载 JSON / PDF / 图片等结果 | 产物授权 / P0 |
| POST `/assets`；GET, DELETE `/assets/{id}` | 自定义图标上传 / 引用 / 删除；有引用时阻止删除 | assets.write/read / P2 |
| GET, PATCH `/preferences` | 语言、主题、字体、默认计时器等白名单设置 | preferences.read/write / P2 |
| POST `/backups/export-jobs`、`/backups/import-plans` | 全量备份、合并 / 替换预览；排除凭据 | backup.manage / P2 |
| GET `/sync/status`；POST `/sync/plans`；POST `/sync/plans/{id}/apply` | 云端差异、冲突解决、执行 | sync.manage / P2 |
| GET `/search` | 角色 / 剧本 / Wiki 检索，带类型、引用来源 | catalog.read / P0 |
| POST `/translations/drafts` | 翻译草稿；确认后才写角色修订 / 翻译记忆 | ai.use / P2 |
| GET, POST `/translation-memory`；DELETE `/translation-memory/{id}` | 已确认术语和翻译对 | preferences.read/write / P2 |
| GET `/audit` | 操作来源、人 / AI、计划、事件与撤销记录 | workspace.audit / P2 |
| GET `/health` | 适配器状态，不泄露密钥 / 私有数据 | 最少信息 / P2 |

OAuth 授权、模型密钥更新和设备凭据必须走专用授权通道，不作为 AI 通用工具读写。BGM 播放、打开对话框、滚动定位等属于可选 `ui.*` 本地能力，不纳入核心数据 API，也不能用于替代业务动作。

## 6. AI 调用：计划、预览、执行

新增工具族：`capabilities.get`、`catalog.search`、`scripts.*`、`characters.*`、`games.*`、`plans.preview`、`plans.apply`、`jobs.get`。工具参数使用与服务端相同的 schema，枚举合法操作，禁止自由代码或任意路径执行。

外部路径：POST `/command-plans` 创建计划；GET `/command-plans/{id}` 读差异；POST `/command-plans/{id}/apply` 执行；DELETE `/command-plans/{id}` 放弃。身份、授权、确认状态由宿主记录，不能接受模型自行填入 `approved:true`。

例：用户“做一个含厨师、共情者和小恶魔的草稿，名字叫迷雾小镇”。

```json
{
  "steps": [{
    "operation": "scripts.create",
    "arguments": {
      "title": "迷雾小镇",
      "characters": ["chef", "empath", "imp"],
      "tags": ["wip"]
    }
  }],
  "mode": "preview"
}
```

预览返回明确差异、角色类型数量和“当前是未完成阵容”的非阻断提醒。用户创建草稿的授权可直接覆盖该操作；不因每个小字段反复确认。若涉及运行中的游戏、公开秘密、批量删除、外部发牌 / 发信、覆盖备份，宿主根据已有授权范围判断是否需要新确认，并展示具体对象与影响。

再如“为这个剧本开 9 人局”，先查询明确 scriptId，建立 setup 草稿并返回分配建议，不自动开始游戏或发送身份。自然语言缺失的必需信息通过一轮补全；同名角色必须返回候选，不能猜测选第一个。

跨资源计划可按顺序创建角色 → 剧本 → 游戏，以 `{ref:"step1.id"}` 引用前一步结果。执行前校验完整计划，限制步骤数与范围；同一 Repository 的修改在事务内全部成功或全部失败。发牌、云同步、文件分享等外部动作走 outbox / job，在提交后执行；外部失败应返回“本地已保存，外部动作失败”，不能假装可跨外部系统原子回滚。

每次计划绑定版本、差异摘要、过期时间。预览后任一相关对象变更，apply 返回 412，要求重新预览；幂等键保证网络重试不创建重复游戏或重复消耗票权。

## 7. 隐私和权限是 API 约束

- 工作区角色：owner / editor / viewer；游戏角色：storyteller / assistant / player / spectator。辅助说书人的授权可按操作范围缩小。
- 公共投影包含名字、公开状态、公开提名 / 日志；不返回 characterId、alignment、恶魔伪装、ST 标签、私密笔记、夜间行动与结果。公开身份由独立发布命令生成，不能只修改客户端显示开关。
- 玩家投影仅额外包含自己已被告知的身份和消息；真实角色与玩家认知角色独立处理。
- ST 投影仍要求 game.secrets 权限。当前夜晚 / 显示角色开关只是 UI 显示规则，不是访问授权。白天隐藏 UI 不能阻止恶意调用读取本来就下发的数据，因此远端必须先裁剪数据。
- 查询、统计、搜索、导出、SSE、错误与审计日志使用同一权限投影；不能在私有实体总数、缓存或文件链接上侧漏。
- 默认给 AI 最少上下文。私密游戏信息发送至外部模型需要宿主明确授权范围；资料中的文字均为数据，不能改变工具权限或执行指令。
- 联机现有 `DealSession` 的 host token 校验不能直接视为远端安全边界。按 [存储契约](../STORAGE.md)，先补服务端规则 / 认证函数与会话过期校验，再开放 P2。所有凭据都不得进入备份、日志和模型上下文。

## 8. 一致性、迁移与交付顺序

1. **P0a：服务抽取。** 为脚本、角色、导入 / 导出建立独立 DTO、schema、Repository 接口，UI 调用同一服务。保留现有存储格式与兼容导入，先不引入 HTTP。
2. **P0b：索引和 AI 草稿工具。** 统一检索与成员索引，建立计划、预览、幂等执行与审计。只开放角色 / 剧本草稿；类型声明生成工具 schema 和 OpenAPI。
3. **P1：说书人命令。** 从 `buildGameActions` / `buildGameLifecycle` 去除 React setter 依赖，保留原有规则语义；加入 version、稳定 seatId、游戏快照、事件补偿，逐操作迁移。
4. **P2：远端与联机。** 决定部署形态后提供 HTTP / MCP adapter；完成真正的认证授权、玩家投影、限流、事件推送和外部任务 outbox。HTTP 与 MCP 不另写业务规则。

持久化迁移需更新 STORAGE.md、备份版本与原生预加载列表。当前 localStorage 多 key 写入没有事务能力；真正宣称原子批量前迁入支持事务的存储，或单一版本化快照写入。多标签页使用版本协调；不要依赖闭包中的旧 React 状态作并发控制。

撤销不是删除日志：追加补偿事件，验证其后是否有依赖操作；已经向玩家发送的身份不能“撤回记忆”，仅能明确发送更正。历史记录编辑和当前游戏状态修改要分开。

### 验收清单

- 同一输入由 UI、AI、HTTP 执行产生同一领域结果与事件。
- 导入先校验；无效文件不写库；重复 ID、同名、内嵌角色、未知字段均有明确策略。
- 搜索在中英、多个关键词、多选剧本、删除剧本、同名角色、1 万剧本数据集下结果正确；列表分页无重复或遗漏。
- 幂等重试只创建一次、只消耗一次票权；并发编辑返回版本冲突，不覆盖新状态。
- public / player 无法从任一路由、事件、导出和错误读到 ST 秘密。
- 所有失败分支可辨别“未执行 / 已提交 / 外部动作失败”，支持按 commandId 查询。
- 游戏阶段、旅行者、处决不死、角色变化不等于阵营变化、扩展票权等保持已有规则测试。
- 老存档升级与备份往返不丢数据；原生、浏览器、离线模式分别验收。

本轮不包含自动裁定完整规则引擎、远程服务器部署、自动开始 / 结束游戏或模型无需授权持续操控游戏。
