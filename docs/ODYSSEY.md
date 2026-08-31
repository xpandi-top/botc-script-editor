# 《奥德赛 Odyssey》角色包接入

来源：https://www.yuque.com/u48069482/taiyi （主编：太一）
授权：开放使用于任意剧本创作；**不可修改角色能力或图标**；使用时需标注来源。
抓取日期：2026-08-30

---

## 1. 已完成的数据补充

| 内容 | 位置 | 数量 |
|------|------|------|
| 角色定义 | `assets/characters/individual/*.json`（`edition: "odyssey"`） | 119 |
| 角色图标 | `assets/icons/*.png`（400×400 PNG8） | 119 |
| 夜晚顺序 | `assets/characters/night-order.json` | 首夜 +33 / 其他夜 +72 |
| 相克规则 | `assets/jinxes.json` + `assets/locales/{en,zh}.jinxes.json` | 6 |
| 剧本 | `assets/scripts/odyssey.json`（全角色包） | 1 |
| 版本名 | `assets/locales/{en,zh}.json`、`src/catalog.ts`、`src/lib/t.ts` | `odyssey` |
| 完整百科原文 | `assets/almanac/odyssey.zh.json`（懒加载，独立 chunk） | 119 + 10 术语 |
| 授权署名 | `assets/editions.json` + 打印表页脚 + 角色详情面板 | 1 |

角色分布：镇民 51、外来者 21、爪牙 24、恶魔 18、传奇 3（`fabled`）、奇遇 2（`loric`）。

### 每个角色 JSON 包含

- `id`（英文名 slug）、`team`、`edition: "odyssey"`、`current_revision: "v1"`
- `setup`：能力文本含 `[...]` 时为 `true`（17 个角色）
- `reminders`：提示标记名（中文，208 个）
- `en.name`：英文名
- `zh.name` / `zh.ability` / `zh.revisions.v1`
- `zh.firstNightReminder` / `zh.otherNightReminder`：来自百科「行动提示」

### 夜晚顺序推导方式

百科给出「夜序数值」和「前位角色」。脚本按夜序数值升序，把角色插到「前位角色」之后。
两个前位角色（公爵夫人 Duchess、玩具匠 Toymaker）不在现有夜晚顺序表里，
`lady_of_the_lake`、`chimera` 按夜序数值手工放到相邻奥德赛角色之后。

### 已加入的相克规则

`hanged_man::puck`、`ettin::hells_outcast`、`doll::snitch`、
`devilsadvocate::white_knight`、`cerberus::mastermind`、`damsel::sphinx`

奥德赛的相克设计原则是「下放给剧本作者」，因此官方统一相克规则本来就很少。

---

## 2. 没能加入的数据 / 需要改应用

按优先级排列。

### P0 — 英文翻译（数据缺口，不需要改代码）⏸ 已排到最后执行

- 119 个角色只有中文能力文本。`getAbilityText('x','en')` 会回退到中文，界面不会崩，但英文用户看到中文。
- **例外**：`src/catalog.ts:1025` / `:1031` 的夜晚提示 **不做中英回退**。英文说书人夜晚流程对奥德赛角色是空白。
  → 补 `en.ability` / `en.firstNightReminder` / `en.otherNightReminder` 即可，无需改代码。
- `assets/locales/en.jinxes.json` 的 6 条英文相克已补（构建校验强制要求）。

### ~~P1 — 提示标记没有多语言~~ ✅ 已解决

`CharacterFileEntry` 的 `en`/`zh` 块加了可选 `reminders` / `remindersGlobal`，
`getCharacterReminders(id, language)` 按
`自定义角色 → 用户覆盖 → 当前语言块 → 另一语言块 → 顶层字段` 解析。
奥德赛的 208 个标记存在 `zh.reminders`；英文翻译填 `en.reminders` 即可，不用再改代码。
顶层 `reminders` 仍是语言中立的默认值，由 `loadCharacterCatalog` 从 `en`/`zh` 回填。

### ~~P1 — 缺少「魔典 / almanac」字段~~ ✅ 已解决

`catalog.ts` 懒加载 `assets/almanac/*.json`（`loadAlmanacFile` / `getAlmanacEntry` /
`getAlmanacTerminology` / `hasAlmanac`，带缓存），组件 `CharacterAlmanacSection`
挂在角色详情面板底部，展开时才拉数据。`odyssey.zh` 是独立 chunk，主包基本没变大。
没有 almanac 的版本不渲染该区块。

背景故事（`flavor`）现在在魔典面板里可见，但仍**没有**写进角色 JSON 的 `flavor` 字段
—— 奥德赛的背景故事是整段散文，直接进会撑爆 PDF 排版。要进角色卡先定截断规则。

### P2 — 新术语 / 新机制（需要改说书人助手）

百科定义了 10 条奥德赛专属术语，多数只是说书人口头规则，但有几条会碰到应用状态：

| 术语 | 含义 | 应用影响 |
|------|------|----------|
| 使用投票标记 / 上交投票标记 | 与官方不同：死亡玩家可持有**多枚**投票标记，一次提名可投多票 | `useGameActions` 的投票逻辑假设死亡玩家最多 1 票。多票投票、票数计数、票数公开可查都需要改。**这是唯一会算错结果的机制。** |
| 审判日 Judgment Day | 首个存活玩家不足 5 人（不含旅行者）的白天，全局只触发一次 | 需要派生状态 + 阶段横幅；`utils/seats.ts` 已有存活/旅行者判定可复用 |
| 变量 X | 角色能力中随夜数或初始状态变化的整数 | 说书人需要一个每角色的计数器（代号X、逆蝶、毒尾） |
| 延迟 Delay / 死亡延迟 | 死亡被推迟到延迟效果结束，死因取延迟期间**首次**死因 | 需要「待结算死亡」状态 + 死因记录 |
| 攻击 Attack | 明确「不能攻击」「只能攻击」两种受限攻击 | 夜晚流程提示文案 |
| 从说书人处 | 白天私下向说书人索取信息/物品 | 建议在私聊阶段加快捷记录 |
| 旅行者隔绝原则 | 所有奥德赛能力判定一律排除旅行者 | `utils/seats.ts` 需要一个「排除旅行者」的选人过滤器 |
| 其他（玩家） | ≈ 官方「除你以外的」 | 纯文案 |
| 回溯 | 奥德赛不使用回溯概念，一律按 token 当前状态判定 | 纯规则说明 |
| 地狱轮盘 / 幸运星 | 提名后掷 6 面骰；额外加入袋中的标记 | 需要掷骰工具 + 非角色标记进袋的支持 |

术语原文全部在 `assets/almanac/odyssey.zh.json` 的 `terminology` 字段。

### P2 — 无法补的数据

1. **奥德赛官方剧本**：百科只在每个角色页写「出现剧本」，没有给出剧本完整名单，
   而这些剧本还混入官方角色。涉及：仲夏夜之梦、圆桌骑士团、达芬奇密码、但丁密码、
   飞越疯人院Ⅱ、宝宝巴士、在地下城寻求邂逅是否搞错了什么。
   → 需要从原作者处拿剧本 JSON，或手工整理。
2. **两条相克规则**，对手角色不在本库：
   - 守财奴 × 帕克（守财奴：「被帕克选择或创造时立即失去能力」）
   - 神秘学家 × 恶堕（「开局外来者数量与默认不一致时，神秘学家只会得知错误信息」）
   → 先补齐这两个角色，再加相克。
3. ~~**中文重名**~~ ✅ 已解决。实际有两组：中文 `onmyoji` vs `yinyangshi`（阴阳师），
   英文 `rascal` vs `xionghaizi`（Rascal）。`getDisambiguatedName(id, language)` 只对真正
   重名的角色缀上包名，用在角色列表、说书人剧本面板和打印表；标记和单角色视图不变。

### ~~授权署名~~ ✅ 已解决

`assets/editions.json` 存各角色包的署名信息，`getRequiredAttributions(characterIds)`
按剧本里实际用到的角色返回需要署名的包。
剧本打印表（屏幕预览 + PDF 导出同一组件）底部渲染
`角色来自《奥德赛 Odyssey》· yuque.com/u48069482/taiyi · 太一`；
角色详情面板显示角色包、作者、来源链接和使用条款。
**没有开关** —— 署名是使用条件，不是可选项；剧本不含奥德赛角色时一个字都不渲染。

图标要求（「使用奥德赛角色底纹」）本来就满足：我们直接用的是原作者的图，只做了尺寸压缩，
没有改画面内容。

### P2 — 数据不变量检查 ✅ 已加

`src/__tests__/characterPack.test.ts`（21 条）跟着 `npm test` 跑：文件名 = id、id 唯一、
team/edition 合法、图标存在、`current_revision` 有效、提示标记是非空字符串；
夜晚顺序无未知 id / 无重复；相克规则两个角色都存在且 id 格式匹配；
奥德赛专项包括 `setup` 与能力里的 `[...]` 一一对应、`zh.ability` 与当前 revision 一致、
标记没混进说明文字、119 个角色全在剧本和 almanac 里。重新同步后先跑它。

### P3 — 夜晚顺序数据结构

`night-order.json` 是纯数组，没有数值。奥德赛给了标准夜序数值（如 7510 / 11010），
下次同步或插入新角色只能靠「前位角色」锚点，很脆弱。

改法：`night-order.json` 改为 `{ id, order }` 列表，或在角色 JSON 里存 `firstNight` / `otherNight` 数值
（`ScriptCharacterItem` 已有这两个字段，`CharacterEntry` 没有），排序改为按数值。

---

## 3. 后续同步流程

百科有「角色调整记录」页，作者会持续改能力。重新同步时：

1. 拉 TOC：`https://www.yuque.com/u48069482/taiyi` 页面里的 `window.appData`（URI 编码的 JSON），取 `book.toc`。
2. 逐篇取正文：`https://www.yuque.com/api/docs/{slug}?book_id=68685424&merge_dynamic_data=false`
   （公开只读，无需登录；带 `x-requested-with: XMLHttpRequest` 头）。
3. 正文是 lake HTML，图片在 `<card name="image" value="data:{URI编码JSON}">` 里，`src` 就是图标地址。
4. 能力有变化时**新增 revision**（`v2026-xx`），不要覆盖 `v1` —— 项目的
   `scripts/validate-revisions.mjs` 会强制 `ability === revisions[current_revision]`。
