/**
 * Core Blood on the Clocktower rules for AI prompts and the rules search,
 * shared by the web app and the API worker. Every line follows the official
 * rules / glossary (bundled in public/wiki-chunks.json: pages "rules",
 * "glossary", "zh-glossary"); src/__tests__/coreRules.test.ts guards the
 * points models most often get wrong. Paragraphs are separated by blank lines
 * so context selection can keep the relevant ones whole.
 */
import { CHARACTER_DISTRIBUTION } from '../engine/setup'

function distributionLine(zh: boolean): string {
  return Object.entries(CHARACTER_DISTRIBUTION)
    .map(([players, d]) => `${players}${zh ? '人' : ''}: ${d.townsfolk}/${d.outsider}/${d.minion}/${d.demon}`)
    .join(' · ')
}

const EN = `BLOOD ON THE CLOCKTOWER — CORE RULES (official rules and glossary; they override memory)

TEAMS & WINNING:
- Good = Townsfolk + Outsiders; evil = Minions + Demon. Players do not know each other's characters.
- Good wins when the Demon dies (every Demon, if there are several) — unless an ability first makes a new Demon (e.g. the Scarlet Woman, with 5 or more players alive).
- Evil wins when just two players are alive (Travellers do not count).
- Some characters add win or loss conditions (e.g. Saint, Mayor).

SCRIPTS & SETUP:
- A script is the list of characters the Storyteller may use, not a story. A full script commonly has 13 Townsfolk, 4 Outsiders, 4 Minions and 1–4 Demons (Trouble Brewing: 13/4/4/1).
- Not every character on the script is in play: each game the Storyteller picks characters for the player count; the rest stay out of play.
- Characters in play by player count (Townsfolk/Outsiders/Minions/Demons): ${distributionLine(false)}.
- Setup abilities in [brackets] change these counts, e.g. Baron [+2 Outsiders] means 2 more Outsiders and 2 fewer Townsfolk.
- Travellers are extra players on top of these counts. Fabled are Storyteller characters, not players.

FIRST NIGHT INFO (7 or more players):
- Minion info: the Minions learn which players are Minions and which player is the Demon.
- Demon info: the Demon learns which players are the Minions and 3 good characters that are not in play, to bluff as.
- With 5 or 6 players there is no Minion info or Demon info.

NIGHT & DAY:
- At night characters wake in the night order. "Each night*" means every night except the first.
- During the day players talk, then nominate and vote.

NOMINATIONS, VOTES & EXECUTION:
- Each player may nominate only once per day, and each player may be nominated only once per day. Dead players cannot nominate.
- A nominated player is executed if they got votes equal to at least half the number of alive players (e.g. 6 alive → 3 votes, 7 alive → 4 votes) and more votes than any other nominated player. A tie for the most votes means no execution.
- There is at most one execution per day, and there may be none.
- Alive players may vote as many times as they want per day. A dead player may vote only once more for the rest of the game.

EXECUTION & DEATH:
- Execution is the group decision to kill a player (not a Traveller) during the day; some abilities stop the executed player from dying.
- When a player dies they immediately lose their ability, and persistent effects of it end. Dead players still talk and keep one vote.
- Abilities that trigger when a player "dies" trigger on any death; "executed" abilities trigger only on execution.

DRUNK & POISONED:
- A drunk or poisoned player has no ability but thinks they do, and the Storyteller acts like they do. If the ability gives information, the Storyteller may give false information. They do not know they are drunk or poisoned.
- Example: a drunk Empath may learn a wrong number; a poisoned Demon's kill does not happen.

REGISTERING & MADNESS:
- A player who "registers as" a character or alignment counts as it for game rules and other players' abilities, but keeps their real alignment (and wins with it) and does not gain that character's ability.
- A player who is "mad" about something tries to convince the group it is true; if they do not try, the Storyteller may apply a penalty.

TRAVELLERS, EXILE & FABLED:
- Travellers are for players who join late or leave early. The player chooses the Traveller, the Storyteller chooses its alignment.
- Exile is the group decision to kill a Traveller during the day; there may be any number per day. Any player may support an exile, even dead players without a vote token. An exile is not a vote and not an execution, and abilities cannot affect it.
- Fabled are neutral characters the Storyteller chooses publicly to make the game fairer in strange situations.

STORYTELLER:
- The Storyteller decides how abilities resolve within the rules ("might" = the Storyteller decides), may give false information when an ability malfunctions, and never lies about the rules themselves.

REFERENCES: https://wiki.bloodontheclocktower.com/ · Chinese community wiki: https://botc.wiki/`

const ZH = `血染钟楼——核心规则（依据官方规则与术语表；与记忆冲突时以此为准）

阵营与胜负：
- 善良阵营 = 镇民 + 外来者；邪恶阵营 = 爪牙 + 恶魔。玩家不知道彼此的角色。
- 恶魔死亡（有多个恶魔时需全部死亡）时善良获胜——除非某个能力先产生了新的恶魔（例如存活玩家不少于 5 人时的红唇女郎）。
- 仅剩两名玩家存活时邪恶获胜（旅行者不计入）。
- 部分角色有额外的胜负条件（例如圣徒、镇长）。

剧本与配置：
- 剧本是说书人本局可以使用的角色清单，不是故事剧情。完整剧本通常有 13 个镇民、4 个外来者、4 个爪牙和 1–4 个恶魔（暗流涌动：13/4/4/1）。
- 剧本上的角色不会全部上场：每局说书人按人数从剧本中挑选在场角色，其余角色不在场。
- 按人数的在场角色数量（镇民/外来者/爪牙/恶魔）：${distributionLine(true)}。
- 方括号 [ ] 里的设置能力会改变这些数量，例如男爵 [+2 外来者]：外来者多 2 个，镇民少 2 个。
- 旅行者是在以上数量之外额外加入的玩家；传奇角色由说书人使用，不是玩家角色。

首夜信息（7 人及以上）：
- 爪牙信息：爪牙得知哪些玩家是爪牙、哪位玩家是恶魔。
- 恶魔信息：恶魔得知哪些玩家是爪牙，以及 3 个不在场的善良角色，供其伪装。
- 5 或 6 人局没有爪牙信息和恶魔信息。

夜晚与白天：
- 夜晚按夜晚顺序唤醒角色。“每个夜晚*”指除第一个夜晚以外的每个夜晚。
- 白天玩家讨论，然后提名与投票。

提名、投票与处决：
- 每名玩家每天只能提名一次，每名玩家每天也只能被提名一次。死亡玩家不能提名。
- 被提名的玩家得票数至少达到存活玩家数的一半（例如 6 人存活需 3 票，7 人存活需 4 票），并且多于其他被提名的玩家时被处决。最高票平票则无人被处决。
- 每天最多处决一次，也可以不处决。
- 存活玩家每天可以投任意次票；死亡玩家在余下的游戏中只能再投一次票。

处决与死亡：
- 处决是白天由玩家集体决定杀死一名玩家（旅行者除外）；部分能力会让被处决的玩家不死亡。
- 玩家死亡时立即失去能力，其能力的持续效果也随之结束。死亡玩家仍可发言，并保留一票。
- “死亡时”触发的能力在任何死亡时触发；“被处决时”触发的能力只在处决时触发。

醉酒与中毒：
- 醉酒或中毒的玩家没有能力，但以为自己有，说书人也会假装其能力生效。若能力提供信息，说书人可以给出错误信息。玩家不知道自己醉酒或中毒。
- 例如：醉酒的共情者可能得到错误的数字；中毒的恶魔杀人不会生效。

登记与疯狂：
- “登记为”某角色或阵营的玩家，在游戏规则和其他玩家的能力面前视为该角色或阵营，但仍属于原阵营（随原阵营胜负），也不会获得该角色的能力。
- 对某事“疯狂”的玩家要努力让大家相信此事为真；若说书人认为其没有努力，可能会给予惩罚。

旅行者、流放与传奇角色：
- 旅行者供晚到或需要提前离开的玩家使用。玩家自选旅行者角色，说书人决定其阵营。
- 流放是白天玩家集体决定杀死一名旅行者；每天可以流放任意次，也可以不流放。任何玩家都可以支持流放，已死亡玩家也可以不消耗投票标记支持。流放不是投票，也不是处决，角色能力不能影响流放。
- 传奇角色是说书人公开选择的中立角色，用来让特殊情况下的游戏更公平。

说书人：
- 说书人在规则范围内决定能力如何生效（“可能”= 由说书人决定），能力失效时可以给出错误信息，但从不就规则本身说谎。

参考：英文官方 Wiki https://wiki.bloodontheclocktower.com/ · 中文社区 Wiki https://botc.wiki/`

export const CORE_RULES: Record<'en' | 'zh', string> = { en: EN, zh: ZH }

/** One entry per rules section (for search indexes). */
export function coreRuleSections(lang: 'en' | 'zh'): Array<{ heading: string; text: string }> {
  return CORE_RULES[lang].split(/\n\s*\n/).slice(1, -1).map((block) => ({ heading: block.split('\n')[0].replace(/[:：]$/, ''), text: block }))
}
