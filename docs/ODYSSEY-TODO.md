# 奥德赛接入 — 待办清单

配合 [`ODYSSEY.md`](ODYSSEY.md) 使用。分三类：**可自动完成**、**自动生成 + 人工复核**、**必须人工**。

---

## A. 可自动完成（写脚本或改代码即可，无需人判断）

- [x] **A1 · 提示标记多语言** — ✅ 已完成。
      `CharacterFileEntry` 的 `en`/`zh` 块加了可选 `reminders` / `remindersGlobal`；
      `getCharacterReminders(id, language)` / `getCharacterRemindersGlobal(id, language)`
      按 `自定义角色 → 用户覆盖 → 当前语言块 → 另一语言块 → 顶层字段` 解析。
      奥德赛的 208 个标记已移进 `zh.reminders`，英文翻译到位后填 `en.reminders` 即可，无需再改代码。
      顺带修了一个 bug：`ArenaSeatPlayerModal` 和 `RightConsoleTags` 之前直接读
      `characterById[id].reminders`，绕过了 `BOTC_CHAR_REMINDERS` 用户覆盖 —— 现在走统一入口。
      顶层 `reminders` 仍是语言中立的默认值，由 `loadCharacterCatalog` 从 `en`/`zh` 块回填，
      剧本导出和角色编辑器这些不知道语言的路径照常工作。
- [x] **A2 · almanac 懒加载 + 展示区** — ✅ 已完成。
      `catalog.ts` 用非 eager 的 `import.meta.glob` 读 `assets/almanac/*.json`，
      提供 `loadAlmanacFile` / `getAlmanacEntry` / `getAlmanacTerminology` / `hasAlmanac`（带缓存）。
      新组件 `CharacterAlmanacSection` 挂在角色详情面板底部，**展开时才拉数据**。
      构建产物里 `odyssey.zh` 是独立 chunk（652 KB），主包只增加约 0.5 KB。
      没有 almanac 的版本（官方角色）整个区块不渲染。
- [x] **A7 · 数据不变量检查** — ✅ 已完成，`src/__tests__/characterPack.test.ts`（24 条）。
      比原计划的 setup 检查覆盖更广：文件名 = id、id 唯一、team/edition 合法、图标存在、
      `current_revision` 在 revisions 列表里、提示标记是非空字符串；
      夜晚顺序无未知 id / 无重复；相克规则的两个角色都存在且 id 格式匹配；
      奥德赛专项：中文名+能力齐全、英文名齐全、`zh.ability` 与当前 revision 一致、
      `setup` 与能力里的 `[...]` 一一对应、标记存在 `zh` 块而非顶层、标记里没有混进说明文字、
      119 个角色全在 `odyssey.json` 里、全有 almanac 条目。
      跟着 `npm test` 跑，不进构建流程，不会卡住 build。
- [ ] **A4 · 夜序数值化** — ⚠️ **被 C4 卡住，不是纯自动**。
      `night-order.json` 改成 `{ id, order }`（或 `CharacterEntry` 加 `firstNight`/`otherNight` 数值）
      本身是机械改动，但排序需要**官方角色的夜序数值**，本仓库没有 → 先做 C4。
      奥德赛 119 个角色的夜序数值已在 `assets/almanac/odyssey.zh.json` 里。
- [ ] **A5 · 重新同步** — 作者改能力后跑 `scripts/odyssey/`。随时可做，不是待办。
      注意能力有变要**新增 revision**，不能覆盖 `v1`，否则 `validate-revisions` 报错。
      同步后跑 `npm test`，`characterPack.test.ts` 会兜住大部分回归。
- [ ] **A6 · 图标重新生成** — 现在 400×400 PNG8（约 2.5MB / 119 张）。
      要换尺寸或画质改 `scripts/odyssey/emit.py`。随时可做，不是待办。
- [x] ~~**A3 · 旅行者隔绝过滤器**~~ — 划掉，归类错了。
      `utils/seats.ts` 已有 `regularSeats()`（`seats.filter(s => !s.isTraveler)`），
      工具层不缺东西。真正缺的是**把它接到能力结算上**，而应用里根本没有能力结算代码 ——
      那是 UX/玩法设计，属于 C 类，见 C10。

## B. 自动生成 + 人工复核（机器出草稿，人过一遍）

- [ ] **B1 · 英文翻译** — ⏸ **排到最后执行**（2026-08-31 决定）。
      119 条能力 + 首夜/其他夜行动提示 + 208 个提示标记。
      机翻/LLM 出草稿，但**必须逐条人工校对**：BOTC 能力文本对措辞极敏感（“每个夜晚\*”、
      “你要选择”、“会得知”、“可能”这类词决定规则判定）。
      百科注明有官方英文译者（Dj_Dj_Dj），先去要现成译文，比重翻更靠谱 —— 排后面正好留出要译文的时间。
      落点：角色 JSON 的 `en.ability`、`en.firstNightReminder`、`en.otherNightReminder`、
      `en.reminders`、`en.revisions.v1`（A1 之后不需要改代码，纯填数据）。

      **推迟期间的已知状态**（不是 bug，是主动选择的结果）：
      - 英文界面下奥德赛角色的能力文本**显示中文**（`getAbilityText` 回退），角色名是英文
      - 英文界面下提示标记**显示中文**（A1 的跨语言回退）
      - 英文说书人夜晚流程对奥德赛角色**完全空白** —— `src/catalog.ts` 的夜晚提示不做中英回退
      - 剧本 PDF 导英文版时，奥德赛角色那部分是中英混排
- [ ] **B2 · 能力文本抓取准确性抽查** — 从百科「角色能力」小节直接取的，格式统一。
      建议随机抽 20 个对照原页面，重点看含表格、含图片、含多段的角色。
- [x] **B3 · 提示标记数量复核** — ✅ 已完成，**119 个角色全部核对通过，没有发现错误**。
      核对方法是拿 `zh.reminders` 去对 almanac 里保留的 `提示标记` 原文段落 ——
      两者来自不同的提取规则（前者按行过滤，后者整段保留），所以互校是有意义的。
      结果：
      - 之前存疑的三项都是对的：`druid` 原文写「强制选择\*2」、`venomtail` 写「中毒\*5」、
        `titan` 原文就是 `爪牙1/爪牙2/爪牙3/爪牙4` 一行斜杠分隔。
      - 21 个「无提示标记」的角色，原文段落确实是「无」或空。
      - 27 个带倍数的角色，展开数量与原文标记**逐一相符**。
      - 只有 `lethe` 和 `titan` 不使用「放置时机」分块格式，属正常写法差异，不是提取错误。

      把核对逻辑固化成了 4 条测试（`characterPack.test.ts`）：每个标记必须能在原文里找到、
      「放置时机」块数必须等于去重后的标记数、`名字*N` 必须展开成正好 N 个、
      原文说「无」的角色不能有标记。做了变异测试确认这 4 条真的会红。
- [x] **B4 · 中文术语落地** — ✅ 已完成。
      说书人剧本面板（`LeftScriptPanel`）多了一个「术语」tab，折叠列出该剧本用到的角色包
      定义的术语（奥德赛 10 条）。数据走已有的懒加载 almanac，**tab 只在剧本里真的有
      带术语的角色包时才出现**，官方剧本看不到。
      catalog 加了 `getEditionsForCharacters` / `getEditionsWithGlossary`（同步，用来决定 tab 显不显示）。
      组件 `EditionGlossary` 是按角色包抽象的，多个包同时在场会分组显示。
      **关于「哪些术语暴露给玩家」**：全部展示。这 10 条都是公开发布在百科上的规则定义，
      不含任何局内隐藏信息；而且这个面板本来就只有说书人能看到。
      测试：`src/__tests__/editionGlossary.test.tsx`（8 条）。

## C. 必须人工（需要决策、外部数据或找作者）

- [x] **C1 · 投票标记多票机制（多票部分）** — ✅ 已完成。
      **启用方式：按剧本自动判断** —— `editions.json` 加 `multiVoteTokens: true`，
      `usesMultiVoteTokens(characterIds)` 只要剧本里有该包的角色就生效。纯官方剧本行为完全不变。
      - 座位加 `voteTokens?: number`：**死亡时 +1**（复活不没收，说书人仍可手改）。
      - `VoteDraft` / `VoteRecord` 加 `voteWeights?: Record<seat, number>`：只记「投了不止一票」的座位，
        缺省即 1 票 —— 旧存档不用迁移。
      - `computeYesCount` 改为按权重求和（散投和逐个唱票两种模式都覆盖），手动覆盖票数优先级不变。
      - 唱票结束后 `spendVoteTokens` 扣掉死亡投票者花掉的标记，扣不超过持有量。
      - UI：提名投票列表里死亡座位名字后显示 `×标记数`，持有 >1 枚时多一个数字按钮循环切换本次投几票。
      测试：`src/__tests__/voteTokens.test.ts`（20 条），含负数/小数/NaN 权重、重复座位、
      超额消费、复活不没收等边界。

      ⏸ **未做：上交投票标记**（白天公开选一个角色交出全部标记，触发骷髅王/海猫王/倒吊人）。
      按约定这一轮只做多票，上交需要新的操作入口和事件记录，另起一项。
- [ ] **C2 · 审判日 / 变量X / 死亡延迟 的说书人 UX** — 分别需要：阶段派生状态 + 横幅、
      每角色计数器、待结算死亡 + 死因记录。都是新交互，要先画一下再写。
- [ ] **C3 · 7 个奥德赛官方剧本** — 仲夏夜之梦、圆桌骑士团、达芬奇密码、但丁密码、
      飞越疯人院Ⅱ、宝宝巴士、在地下城寻求邂逅是否搞错了什么。
      百科只在角色页写「出现剧本」，没给完整名单，且混了官方角色 → **只能找作者要剧本 JSON**。
- [ ] **C4 · 官方角色夜序数值** — A4 的前置。要么从 botc 官方 script tool 的 schema 拿，要么手工整理。
- [ ] **C5 · 两条相克规则的对手角色缺失** — 守财奴 × 帕克、神秘学家 × 恶堕。
      这两个角色不在本库，先确认它们出自哪个包（官方？其他自制？），补齐角色再加相克。
- [x] **C6 · 显示名重名** — ✅ 已完成（做的时候发现**不止中文那一处**）。
      实际有两组碰撞，一种语言各一组：
      - 中文：奥德赛 `onmyoji`（阴阳师）vs 华灯初上 `yinyangshi`（阴阳师）
      - 英文：奥德赛 `rascal`（Rascal）vs 华灯初上 `xionghaizi`（Rascal）

      所以没有采用「改一个译名」的方案 —— 那要去改别人包里的角色，而且以后加包还会再撞。
      改成**显示时按数据自动消歧**：`catalog.ts` 加 `hasAmbiguousName(id, language)` 和
      `getDisambiguatedName(id, language)`，只有真的和别人重名时才在后面缀上包名
      （`阴阳师（奥德赛）` / `Rascal (Odyssey)`），其余角色一个字都不变。
      碰撞集合按语言惰性计算并缓存，自定义角色和角色包覆盖变动时失效重算
      （`refreshNameDisambiguation`）。
      **只在会并排出现的列表里用**：角色浏览列表、说书人剧本面板（角色列表 + 夜晚顺序）、
      剧本打印表。角色标记（Print Studio）和单角色弹窗仍用 `getDisplayName` ——
      标记上缀包名既没必要也难看。
      测试：`src/__tests__/nameDisambiguation.test.ts`（8 条）。
- [ ] **C7 · 两个手工定位的夜序** — `lady_of_the_lake`（前位：公爵夫人）、`chimera`（前位：玩具匠），
      这两个前位角色不在现有夜序表，是按夜序数值放的。**找作者确认一下**。
- [x] **C8 · 授权署名展示** — ✅ 已完成。
      新增 `assets/editions.json` 存各角色包的署名信息（名称/作者/来源/使用条款/`requiresAttribution`），
      `catalog.ts` 提供 `getEditionCredit` / `getEditionCreditName` / `getEditionCreditAuthor` /
      `getEditionTerms` / `getRequiredAttributions`。
      - **剧本打印表**（`SheetArticle`，屏幕预览和 PDF 导出同一个组件）：
        底部加一行小字署名，**由剧本里实际用到的角色决定**，不含奥德赛角色就完全不渲染。
        中英分页模式下两页都带。
      - **角色详情面板**：能力上方显示「角色包：《奥德赛 Odyssey》· 太一」+ 来源链接 + 使用条款（两行截断，hover 看全文）。
      - **不提供开关** —— 署名是奥德赛的使用条件，不是可选项。
      数据是按「角色包」抽象的，以后加别的需要署名的包只要往 `editions.json` 添一条。
      测试：`src/__tests__/editionAttribution.test.tsx`（11 条）+ `characterPack.test.ts` 里 3 条数据不变量。
- [ ] **C9 · 背景故事怎么用** — 119 段散文式背景故事已抓到 almanac，故意没写进 `flavor`
      （直接进会撑爆 PDF 排版）。魔典面板里已经能看到（`almanac_flavor`），
      要不要同时进角色卡/PDF 得先定截断规则。
- [ ] **C11 · 上交投票标记** — 死亡玩家（旅行者除外）白天公开选一个角色并交出**全部**标记，
      触发该角色能力（骷髅王、海猫王、倒吊人）。剧本里有该角色即可上交，不要求在场；
      剧本有多个可上交角色时要声明选哪个。需要新的操作入口 + 公开事件记录。
      前置的 `voteTokens` 状态 C1 已经建好了。
- [ ] **C10 · 旅行者隔绝原则落地**（原 A3）— 奥德赛所有能力判定一律排除旅行者。
      `regularSeats()` 已经能用，但应用没有能力结算层，无处调用。
      要么等 C2 的说书人辅助功能一起做，要么在选人 UI 上加一个「排除旅行者」开关。

---

## 建议顺序

翻译排到最后执行，其余按「能立刻做完」→「要外部数据」排。

1. ~~**C8**（授权署名，合规先做）~~ ✅ 已完成
2. ~~**B4**（术语速查页）~~ ✅ 已完成
3. ~~**C6**（显示名重名）~~ ✅ 已完成
4. **C1**（投票标记 —— 唯一会算错游戏结果的机制）
5. **C2**（审判日 / 变量X / 死亡延迟 的说书人 UX）
6. **C3 / C5 / C7**（要找原作者：剧本名单、缺失角色、两个夜序确认）—— 可以并行去问，等回复
7. **C4 → A4**（夜序数值化）
8. **B2**（能力文本抓取准确性抽查）—— B3 已完成
9. **C9 / C10**（背景故事用法、旅行者隔绝落地）
10. **B1 英文翻译** ⏸ —— 最后执行
