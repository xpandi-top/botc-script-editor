/**
 * Facts the program computes for the model to use as given
 * (docs/AI-ARCHITECTURE-OFFLINE-FIRST.md §1: programs count, models explain).
 * The AI evaluation showed models miscount even with the rule in front of
 * them ("6 alive" → 4 votes; a Baron line-up with two Minions; a
 * "beginner script" without Outsiders), so these are computed here:
 *
 * - votes needed for N alive players;
 * - in-play counts for N players, and with the script's setup modifiers;
 * - a legal line-up (+ bluffs) when the question asks to set up a game;
 * - a legal script pool when the question asks to design a script;
 * - on a game page: what would end the game from the current state.
 *
 * The same facts are the no-model offline answer (localAnswer.ts).
 */
import { allCharacterFiles, getAbilityText, getCharacterById, getDisplayName, initialScripts, teamLabels } from '../../catalog'
import { buildScriptPool, planSetup, type ScriptPool, type SetupPlan } from '../../core/engine/planning'
import { CHARACTER_DISTRIBUTION, SETUP_OUTSIDER_SHIFTS } from '../../core/engine/setup'
import { gameStateFacts, type GameFact } from '../../core/engine/winConditions'
import { catalogTeamOf } from '../../utils/seatAlignment'
import type { Language, Team } from '../../types'
import type { PoolRequirements } from './answerParse'
import { mentionedEntities } from './catalogRetrieval'
import { scriptRecommendationFacts } from './scriptFacts'
import type { AiContext } from './types'

/** The page (script / game) plus earlier user questions in the chat, for follow-ups like "那 7 个人玩它". */
export type FactsPage = Pick<AiContext, 'characterIds' | 'seats'> & {
  previousQueries?: string[]
  /** The assistant's last answer: "它" often means the script it just recommended. */
  lastAnswer?: string
}

const SETUP_WORDS = /局|配置|开局|在场|上场|发牌|推荐角色|挑选|setup|set up|in play|line-?up|deal|which characters/i
const SCRIPT_DESIGN = /(设计|生成|创建|组|做|出|编|写)[^。？?\n]{0,16}剧本|剧本[^。？?\n]{0,6}(设计|生成)|(design|build|create|make|generate)\b[^.?\n]{0,30}\bscript/i
const TEENSY = /teensy|小型|小剧本|5\s*[-–~到至]\s*6\s*人|五到六人|5-6|5～6/i
const ONLY_EDITION = /只用|仅用|只包含|只从|全部来自|全部用|only (use|from)|entirely from/i

function aliveCount(query: string): number | null {
  const m = query.match(/(\d{1,2})\s*(?:个|名)?\s*(?:人|玩家)?\s*(?:存活|活着)|存活(?:的)?(?:玩家)?(?:有|还剩|剩)?\s*(\d{1,2})|(\d{1,2})\s+(?:players?\s+)?(?:are\s+)?(?:alive|living)/i)
  const n = m ? Number(m[1] ?? m[2] ?? m[3]) : NaN
  return n >= 1 && n <= 20 ? n : null
}

function playerCount(query: string): number | null {
  if (!SETUP_WORDS.test(query)) return null
  const m = query.match(/(\d{1,2})\s*(?:个|名)?\s*(?:人|玩家)|(\d{1,2})[-\s]?players?/i)
  const n = m ? Number(m[1] ?? m[2]) : NaN
  return CHARACTER_DISTRIBUTION[n] ? n : null
}

const name = (id: string, zh: boolean) => getDisplayName(id, zh ? 'zh' : 'en')
const teamName = (id: string, zh: boolean) => {
  const team = getCharacterById(id)?.team as Team | undefined
  return team ? (zh ? teamLabels.zh[team] : teamLabels.en[team]) : ''
}
const row = (zh: boolean, c: { townsfolk: number; outsider: number; minion: number; demon: number }) =>
  zh ? `镇民 ${c.townsfolk} / 外来者 ${c.outsider} / 爪牙 ${c.minion} / 恶魔 ${c.demon}` : `${c.townsfolk} Townsfolk / ${c.outsider} Outsiders / ${c.minion} Minions / ${c.demon} Demon`
const list = (ids: string[], zh: boolean) => `${ids.join(', ')}（${ids.map((id) => name(id, zh)).join(zh ? '、' : ', ')}）`

const REFERS_BACK = /它|这个|那个|这套|该剧本|上面|刚才|前者|后者|推荐的|你说的|第[一二三四五1-5]个(?![夜晚白天])|\b(it|this|that|the (first|second|third|former|latter))\b/i
// "第一个" / "the first" = the first script the last answer named, and so on; -1 = the last one.
const ORDINALS: [RegExp, number][] = [
  [/第[一1]个(?![夜晚白天])|前者|\bthe (first|former)\b/i, 0],
  [/第[二2]个(?![夜晚白天])|\bthe second\b/i, 1],
  [/第[三3]个(?![夜晚白天])|\bthe third\b/i, 2],
  [/后者|\bthe latter\b/i, -1],
]
const bundledScriptOf = (text: string) => mentionedEntities(text).editionIds.map((id) => initialScripts.find((s) => s.slug === id)?.characters).find(Boolean)

/**
 * Bundled scripts named in a text by title, in order of first mention.
 * Longer titles are matched first, so "暗流涌动-进阶" is not also a mention
 * of "暗流涌动".
 */
function scriptMentions(text: string): { characters: string[]; first: number; count: number }[] {
  const titles = initialScripts
    .flatMap((s) => [s.titleZh, s.title].filter((t): t is string => !!t && t.length > 1).map((title) => ({ s, title })))
    .sort((a, b) => b.title.length - a.title.length)
  let rest = text
  const found = new Map<string, { characters: string[]; first: number; count: number }>()
  for (const { s, title } of titles) {
    let at = rest.indexOf(title)
    while (at !== -1) {
      const entry = found.get(s.slug) ?? { characters: s.characters, first: at, count: 0 }
      entry.first = Math.min(entry.first, at)
      entry.count++
      found.set(s.slug, entry)
      rest = rest.slice(0, at) + '\u0000'.repeat(title.length) + rest.slice(at + title.length)
      at = rest.indexOf(title, at + title.length)
    }
  }
  return [...found.values()]
}

/** The bundled script an answer names most often (by title). */
export function mostNamedScript(text: string): string[] | undefined {
  return scriptMentions(text).sort((a, b) => b.count - a.count || a.first - b.first)[0]?.characters
}

/** The bundled script a text's first line (its heading) names, if any. */
export function headlineScript(text: string): string[] | undefined {
  const first = text.split('\n').find((line) => line.trim()) ?? ''
  return mostNamedScript(first)
}

/** The bundled script the question names, or a follow-up's earlier one ("它", "第一个"), else the page's script. */
function scriptFor(query: string, page: FactsPage): string[] {
  const named = bundledScriptOf(query)
  if (named) return named
  if (REFERS_BACK.test(query)) {
    const ordinal = ORDINALS.find(([pattern]) => pattern.test(query))?.[1]
    if (ordinal !== undefined && page.lastAnswer) {
      const inOrder = scriptMentions(page.lastAnswer).sort((a, b) => a.first - b.first)
      const picked = inOrder[ordinal < 0 ? inOrder.length + ordinal : ordinal]
      if (picked) return picked.characters
    }
    for (const previous of [...(page.previousQueries ?? [])].reverse().slice(0, 6)) {
      const earlier = bundledScriptOf(previous)
      if (earlier) return earlier
    }
    const recommended = page.lastAnswer ? mostNamedScript(page.lastAnswer) : undefined
    if (recommended) return recommended
  }
  return page.characterIds ?? []
}

function gameFactText(fact: GameFact, zh: boolean, seatName: (seat: number) => string): string {
  switch (fact.code) {
    case 'alive':
      return zh ? `当前存活 ${fact.alive} 人（不含旅行者）；今天处决至少需要 ${fact.votesNeeded} 票。` : `${fact.alive} players are alive (not counting Travellers); an execution today needs at least ${fact.votesNeeded} votes.`
    case 'evil_wins_after_deaths':
      return zh ? `再有 ${fact.deaths} 人死亡（处决或夜间死亡都算）就只剩 2 名存活玩家，邪恶立即获胜。` : `${fact.deaths} more deaths (execution or night) leave 2 players alive: evil wins at once.`
    case 'execute_demon_scarlet_woman':
      return zh ? `若恶魔 ${seatName(fact.demonSeat)} 现在死亡（例如被处决）：存活 ${fact.alive} 人 ≥ 5，红唇女郎 ${seatName(fact.scarletWomanSeat)} 变成恶魔，游戏继续，善良不会获胜。` : `If the Demon ${seatName(fact.demonSeat)} dies now (e.g. executed): ${fact.alive} alive ≥ 5, so the Scarlet Woman ${seatName(fact.scarletWomanSeat)} becomes the Demon and the game goes on.`
    case 'execute_demon_good_wins':
      return zh ? `若恶魔 ${seatName(fact.demonSeat)} 死亡：没有能接任的红唇女郎，善良获胜。` : `If the Demon ${seatName(fact.demonSeat)} dies: no Scarlet Woman can take over, so good wins.`
    case 'several_demons':
      return zh ? `有多个存活的恶魔（${fact.demonSeats.map(seatName).join('、')}），全部死亡善良才获胜。` : `Several Demons are alive (${fact.demonSeats.map(seatName).join(', ')}); good wins only when all are dead.`
    case 'mayor_no_execution':
      return zh ? `存活 3 人且镇长 ${seatName(fact.mayorSeat)} 能力有效：若今天白天无人被处决，善良阵营获胜。` : `3 alive and the Mayor ${seatName(fact.mayorSeat)} works: if nobody is executed today, good wins.`
    case 'saint_executed':
      return zh ? `圣徒 ${seatName(fact.saintSeat)} 若被处决，善良阵营落败。` : `If the Saint ${seatName(fact.saintSeat)} is executed, good loses.`
  }
}

/** Tolerance for a generated script, per shape (the target is SCRIPT_SHAPES). */
const POOL_RANGES: Record<'full' | 'teensy', { counts: PoolRequirements['counts']; dealable: number[] }> = {
  full: { counts: { townsfolk: [11, 14], outsider: [3, 5], minion: [3, 5], demon: [1, 4] }, dealable: [7, 8, 9, 10, 11, 12] },
  teensy: { counts: { townsfolk: [5, 8], outsider: [1, 3], minion: [1, 3], demon: [1, 3] }, dealable: [5, 6] },
}

export type PlanRequest =
  | { kind: 'setup'; players: number; script: string[]; plan: SetupPlan | null }
  | { kind: 'script'; pool: ScriptPool; requirements: PoolRequirements }

/** A game setup or script design the question asks for, with the program's legal answer. */
export function planRequest(query: string, page: FactsPage = {}): PlanRequest | null {
  if (SCRIPT_DESIGN.test(query)) {
    const { editionIds, characterIds } = mentionedEntities(query)
    const only = ONLY_EDITION.test(query) && editionIds.length > 0
    const candidates = allCharacterFiles.filter((c) => c?.id && c.team).map((c) => ({ id: c.id, team: c.team as Team, edition: c.edition }))
    const prefer = editionIds.flatMap((id) => initialScripts.find((s) => s.slug === id)?.characters ?? allCharacterFiles.filter((c) => c.edition === id).map((c) => c.id))
    const shape = TEENSY.test(query) ? 'teensy' : 'full'
    const pool = buildScriptPool({ candidates, shape, include: characterIds, prefer, editions: only ? editionIds : undefined })
    return { kind: 'script', pool, requirements: { include: characterIds, noTeams: ['traveler'], editions: only ? editionIds : undefined, ...POOL_RANGES[shape] } }
  }
  const players = playerCount(query)
  if (!players) return null
  const script = scriptFor(query, page)
  const include = mentionedEntities(query).characterIds.filter((id) => script.includes(id))
  return { kind: 'setup', players, script, plan: script.length ? planSetup({ scriptCharacters: script, players, getTeam: catalogTeamOf, include }) : null }
}

/** An empty string when nothing in the question or page can be computed. */
export function computeRuleFacts(query: string, language: Language, page: FactsPage = {}): string {
  const zh = language === 'zh'
  const facts: string[] = []

  const alive = aliveCount(query)
  if (alive) {
    const votes = Math.ceil(alive / 2)
    facts.push(zh
      ? `${alive} 名存活玩家时，处决至少需要 ${votes} 票（存活人数的一半，向上取整），且票数要多于当天其他被提名者——这只是与其他被提名者比较，不会提高 ${votes} 票的门槛。`
      : `With ${alive} players alive, an execution needs at least ${votes} votes (half the alive players, rounded up) and more votes than any other nominee today — that comparison does not raise the ${votes}-vote threshold.`)
  }

  const request = planRequest(query, page)
  const players = request?.kind === 'setup' ? request.players : null
  if (players) {
    const d = CHARACTER_DISTRIBUTION[players]
    const script = scriptFor(query, page)
    facts.push(zh
      ? `${players} 人局的在场角色：${row(true, d)}（旅行者另计）。剧本上其余角色不在场。`
      : `A ${players}-player game has in play: ${row(false, d)} (Travellers extra). The other script characters are not in play.`)
    const q = query.toLowerCase()
    for (const id of Object.keys(SETUP_OUTSIDER_SHIFTS).filter((id) => script.includes(id) || [id, name(id, false), name(id, true)].some((n) => n.length > 1 && q.includes(n.toLowerCase())))) {
      const bracket = getAbilityText(id, language)?.match(/[[［][^\]］]+[\]］]/)?.[0] ?? ''
      for (const shift of SETUP_OUTSIDER_SHIFTS[id].filter(Boolean)) {
        const c = { townsfolk: d.townsfolk - shift, outsider: d.outsider + shift, minion: d.minion, demon: d.demon }
        facts.push(zh
          ? `若${name(id, true)}（${teamName(id, true)}${bracket ? `，${bracket}` : ''}）在场：${row(true, c)}；${name(id, true)}本身占一个${teamName(id, true)}名额。`
          : `If the ${name(id, false)} (${teamName(id, false)}${bracket ? `, ${bracket}` : ''}) is in play: ${row(false, c)}; the ${name(id, false)} fills a ${teamName(id, false)} slot itself.`)
      }
    }
    if (request?.kind === 'setup') {
      const plan = request.plan
      if (plan?.inPlay.length === players) {
        facts.push(zh
          ? `程序生成的一套合法开局（${row(true, plan.counts)}）：在场角色: ${list(plan.inPlay, true)}${plan.bluffs.length ? `；恶魔伪装（不在场的善良角色）: ${list(plan.bluffs, true)}` : ''}。可以直接采用；替换角色时保持各类数量不变。`
          : `A legal line-up generated by program (${row(false, plan.counts)}): Characters in play: ${list(plan.inPlay, false)}${plan.bluffs.length ? `; Demon bluffs (good characters not in play): ${list(plan.bluffs, false)}` : ''}. Use it as is, or swap characters while keeping these counts.`)
      }
    }
  }

  if (request?.kind === 'script') {
    const { pool } = request
    const shape = pool.shape
    facts.push(zh
      ? `血染钟楼的剧本是角色池，每局只用其中一部分。程序按问题的约束组出的合法${shape === 'teensy' ? '小型（Teensyville，5–6 人）' : '完整'}剧本（${row(true, pool.counts)}）：剧本角色: ${list(pool.characters, true)}。可以直接采用；替换角色时保持各类数量、不加旅行者。`
      : `A Blood on the Clocktower script is a character pool; each game uses part of it. A legal ${shape === 'teensy' ? 'Teensyville (5–6 player)' : 'full'} script built by program from the question's constraints (${row(false, pool.counts)}): Script characters: ${list(pool.characters, false)}. Use it as is, or swap characters while keeping these counts and adding no Travellers.`)
  }

  if (!request) facts.push(...scriptRecommendationFacts(query, language))

  if (page.seats?.length) {
    const seatName = (seat: number) => {
      const id = page.seats!.find((s) => s.seat === seat)?.characterId
      return `#${seat}${id ? (zh ? `（${name(id, true)}）` : ` (${name(id, false)})`) : ''}`
    }
    facts.push(...gameStateFacts(page.seats, catalogTeamOf).map((f) => gameFactText(f, zh, seatName)))
  }

  if (!facts.length) return ''
  return `${zh ? '程序计算的规则事实（直接使用这些数字与名单）：' : 'COMPUTED RULE FACTS (by program; use these numbers and lists as given):'}\n${facts.map((f) => `- ${f}`).join('\n')}`
}
