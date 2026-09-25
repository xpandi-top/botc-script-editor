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
| 完整百科原文 | `assets/almanac/odyssey.zh.json`（懒加载，独立 chunk，首次使用时缓存） | 119 + 10 术语 |
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

### ~~P0 — 英文翻译~~ ✅ 已补（社区翻译，非官方，见 §4）

- 119 个角色都有 `en.ability` / `en.revisions`、有夜晚行动的 105 条 `en.firstNightReminder` / `en.otherNightReminder`、`en.reminders`（与 `zh.reminders` 一一对应）。
- 英文年鉴 `assets/almanac/odyssey.en.json`：简介、范例、技巧、伪装与 10 条术语。
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

2026-09-24：官方与中文版角色也有了同格式的攻略（`assets/almanac/<版本>.<语言>.json`，由
`npm run build:guides` 从集石 / 官方 wiki 生成），字段名沿用奥德赛年鉴（`summary`、`howto`、
`examples`、`rules`、`reminder_details`、`tips`、`bluffing`、`flavor`），格式见
`src/core/ai/guides.ts` 与 [AI-CONTENT.md](AI-CONTENT.md)。`assets/almanac/index.json` 是同步可读的清单：
手改或重新导出 `odyssey.zh.json` 后跑 `node scripts/build-guides.mjs --index-only`，否则
`guides.test.ts` 会报清单过期。术语表入口改为按清单的术语数判断（`hasGlossary`）。

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

### ~~P3 — 夜晚顺序数据结构~~ ✅ 已解决

`night-order.json` 在数组之外加了 `order`（位置数值，×10 间隔）和 `source_order`
（角色包公布的夜序数值）。数组保持不变，所有消费方无需改动；
`getNightOrderValue` / `getNightSourceValue` / `nightOrderFromValues` 供插入和校验使用。
`nightOrderValues.test.ts` 保证按值排序能还原原数组，不会悄悄漂移。

修这一项时发现并修掉了导入时的排序 bug：同一「前位角色」下的多个角色被各自插到锚点正后方，
导致整组倒序，其他夜 9 处受影响。`scripts/odyssey/emit.py` 已改为按组累加偏移插入。

---

## 3. 后续同步流程

百科有「角色调整记录」页，作者会持续改能力。重新同步时：

1. 拉 TOC：`https://www.yuque.com/u48069482/taiyi` 页面里的 `window.appData`（URI 编码的 JSON），取 `book.toc`。
2. 逐篇取正文：`https://www.yuque.com/api/docs/{slug}?book_id=68685424&merge_dynamic_data=false`
   （公开只读，无需登录；带 `x-requested-with: XMLHttpRequest` 头）。
3. 正文是 lake HTML，图片在 `<card name="image" value="data:{URI编码JSON}">` 里，`src` 就是图标地址。
4. 能力有变化时**新增 revision**（`v2026-xx`），不要覆盖 `v1` —— 项目的
   `scripts/validate-revisions.mjs` 会强制 `ability === revisions[current_revision]`。
5. 同步后跑 `python3 scripts/odyssey/verify.py` 校验能力文本（用独立于导入管线的解析路径），
   再跑 `npm test`。`content_updated_at` 字段可以直接看出哪些页面变过。

已同步的上游改动：
- **2026-08-31 骚客 Versifier** —「首次有玩家吟诵」→「首次有存活玩家吟诵」，记为 `v2026-08`。

---

## 4. 英文（社区翻译，非官方）

2026-09-24 起草。作者只发布了中文；英文是本项目的社区翻译（机器辅助初稿），**未经作者审阅**，
与中文原文冲突时以中文为准。

| 内容 | 位置 | 标注 |
|------|------|------|
| 能力（当前修订；骚客另译 `v1`） | 角色文件 `en.ability` / `en.revisions` | 当前修订的 `note`：“English text: community translation, not official …” |
| 夜晚提示 105 条 | `en.firstNightReminder` / `en.otherNightReminder` | 同上 |
| 提示标记 208 个 | `en.reminders`（与 `zh.reminders` 同序同数） | 同上 |
| 年鉴：简介、范例、技巧、伪装（119） + 术语（10） | `assets/almanac/odyssey.en.json`（315 KB，gzip 79 KB，独立懒加载 chunk） | 文件 `translation` 块（`official: false`），每条 `translated_from: "zh"` + 中文原页链接 |
| 角色包署名 | `assets/editions.json` → `translations.en` | 角色面板署名下方、英文打印表署名行、年鉴面板、术语表、AI 回答里都注明“unofficial community translation” |

**没翻译的**：运作方式、规则细节、提示标记说明、设计笔记、背景故事、署名。英文提问“怎么主持 / 规则细节”时，
`loadCharacterGuides` 改用中文年鉴（有模型时给中文让它翻译，无模型时给中文原页链接），见 `guideCovers`。

**措辞约定**（对齐官方英文）：`You start knowing …`（= 在你的首个夜晚，你会得知）、`Each night*, choose a player: they die.`、
`Once per game, at night*, choose …`（官方英文省略 “may”）、`[+1 Outsider]`、`Townsfolk abilities yield false info.`（= 镇民玩家的能力一定会产生错误信息，同涡流）、
`until dusk` / `until dusk tomorrow` / `until dawn`（= 直到下个黄昏 / 明天黄昏 / 下个黎明）、`steps`（距离）、`neighbours`、`Traveller`；
奥德赛术语：Judgment Day（审判日）、before Judgment Day / when Judgment Day arrives（审判日降临前 / 时）、attack（攻击）、
delayed death（死亡延迟）、vote token / give up vote tokens（投票标记 / 上交投票标记）、from the Storyteller（从说书人处）、feign death（假死）。
提示标记沿用官方英文名：死亡 Dead、醉酒 Drunk、中毒 Poisoned、失去能力 No Ability、得知 Know、保留能力 / 重获能力 Has Ability、已触发 Used、不会死亡 Cannot Die。
画家、猎魔人原有的英文草稿按同一约定改写（`Lost Ability` → `No Ability`）；盗血者英文名去掉了一个零宽空格。

**能力改了怎么办**：`npm run add-revision -- <id> --zh "…" --en "…"`，并同步 `odyssey.en.json` 里该角色的 `ability`
（`characterPack.test.ts` 会检查两者一致、年鉴每条都标了 `translated_from`）。

### 4.1 请作者确认的译法

含义不确定、或原文前后不一致的地方（按角色）：

| 角色 | 中文 | 英文译法 | 疑问 |
|------|------|----------|------|
| 塞壬 Siren | 你要选择是否永久失去你的下一条能力 | choose whether to permanently lose the ability that follows | “下一条能力”是否就是后一句（镇民产生错误信息）？ |
| 女爵 Dame | 当邪恶玩家死亡时，你醉酒 | When an evil player dies, you become drunk. | 按运作方式理解为“从此醉酒”；官方英文习惯写 “drunk from now on”，是否这样写？ |
| 毒爆 Toxblast | 与他邻近的两名镇民中毒 | their 2 Townsfolk neighbours are poisoned | 能力与运作方式说的是**被处决者**两侧最近的镇民，规则细节写的是“在**毒爆**顺时针与逆时针方向”，哪个对？ |
| 地狱弃子 Hell's Outcast | …与恶魔交换角色，然后他醉酒 | …swap characters with the Demon, who is then drunk | “他”按“罢黜（醉酒）”标记理解为原恶魔（新地狱弃子），不是拥立的爪牙。 |
| 敲钟人 Bellringer | 如果他说谎，你立即被处决 | if they lie, you are executed immediately | 被处决的确实是敲钟人本人（不是说谎者）？ |
| 骚客 Versifier | 你会得知一个字（均出自同一句诗词） | you learn a word (all from the same line of verse) | 英文局用英文诗句、一次给一个**词**，是否符合设计？ |
| 皮匠 / 殉教少女 / 美人鱼 / 调香师 | 邪恶角色 | evil character(s) | 规则细节说“邪恶角色”只指爪牙与恶魔角色；英文 “evil character” 容易被读成“任何邪恶阵营的角色”，是否改写成 “Minion or Demon character”？ |
| 恶堕 Corruptus | 他必死 | they die, no matter what | 按运作方式理解为“无视免死”；官方刺客写 “even if for some reason they could not”，要不要用官方句式？ |
| 雪怪 Yeti | 如果白天没人被处决，你的阵营落败 | If nobody is executed during the day, your team loses. | 运作方式是**每个**黄昏检查，是否写成 “Each day, if no-one is executed, your team loses.”（同涡流）？ |
| 白骑士 White Knight | 疯狂地想要存活的玩家 | a player who is "mad" about wanting to live | 这里的“疯狂”是否就是官方的疯狂（madness）机制？ |
| 巫女 Miko | 两名邻座的其他玩家 | 2 players (not yourself) who neighbour each other | 两人彼此邻座即可，不必与巫女邻座（夜晚提示是这样写的）？ |
| 天平师 Scalebearer | 该玩家与他对立阵营的两名玩家距离相等 | a player who is equally far from 2 players of the opposite alignment to them | 两名对立阵营玩家分别在他两侧、同一距离？ |
| 逆蝶 Crosswing | 在第X个夜晚 | On night X | X 为游戏的第几个夜晚（术语表），能力本身没说明，是否需要写出？ |
| 忘川 Lethe | 可能出现： | Possibly: | 奇遇角色开头的固定译法？ |
| 奸奇 Tzeentch（首夜提示） | 从三个伪装角色中挑选一个 | chooses 1 of their bluffs | 能力写“更多的伪装”，范例是 4–6 个，提示却写“三个”。 |
| 萨满 Shaman（夜晚提示） | 让他选择一个角色 | might choose characters | 能力是选择四个角色，提示写“一个”。 |

年鉴里提到、但本库没有的角色，英文名是猜的：神秘学家 → Occultist（相克规则）、祈愿妖精 → Wishing Fairy、银匠 → Silversmith。
英文名 “Mob lawyer” 按作者原样保留（其他角色都是首字母大写）。

