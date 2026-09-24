/**
 * Numbers the rules determine, computed by program and given to the model as
 * facts to use as-is. Models miscount even with the rule in front of them
 * (the AI evaluation caught "6 alive" turned into 4 votes, and a Baron line-up
 * with two Minions). docs/AI-ARCHITECTURE-OFFLINE-FIRST.md §1: programs count,
 * models explain.
 */
import { getAbilityText, getCharacterById, getDisplayName, teamLabels } from '../../catalog'
import { CHARACTER_DISTRIBUTION, SETUP_OUTSIDER_SHIFTS } from '../../core/engine/setup'
import type { Language, Team } from '../../types'

const SETUP_WORDS = /局|配置|开局|在场|上场|发牌|setup|in play|line-?up|deal/i

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

function row(zh: boolean, t: number, o: number, m: number, d: number): string {
  return zh ? `镇民 ${t} / 外来者 ${o} / 爪牙 ${m} / 恶魔 ${d}` : `${t} Townsfolk / ${o} Outsiders / ${m} Minions / ${d} Demon`
}

/** Setup modifiers relevant to the question: on the page's script or named in the question. */
function modifiersFor(query: string, characterIds: string[]): string[] {
  const q = query.toLowerCase()
  return Object.keys(SETUP_OUTSIDER_SHIFTS).filter((id) => characterIds.includes(id)
    || [id, getDisplayName(id, 'en'), getDisplayName(id, 'zh')].some((name) => name.length > 1 && q.includes(name.toLowerCase())))
}

/** An empty string when the question involves no computable numbers. */
export function computeRuleFacts(query: string, language: Language, characterIds: string[] = []): string {
  const zh = language === 'zh'
  const facts: string[] = []

  const alive = aliveCount(query)
  if (alive) {
    const votes = Math.ceil(alive / 2)
    facts.push(zh
      ? `${alive} 名存活玩家时，处决至少需要 ${votes} 票（存活人数的一半，向上取整），且票数要多于当天其他被提名者——这只是与其他被提名者比较，不会提高 ${votes} 票的门槛。`
      : `With ${alive} players alive, an execution needs at least ${votes} votes (half the alive players, rounded up) and more votes than any other nominee today — that comparison does not raise the ${votes}-vote threshold.`)
  }

  const players = playerCount(query)
  if (players) {
    const d = CHARACTER_DISTRIBUTION[players]
    facts.push(zh
      ? `${players} 人局的在场角色：${row(true, d.townsfolk, d.outsider, d.minion, d.demon)}（旅行者另计）。其余剧本角色不在场。`
      : `A ${players}-player game has in play: ${row(false, d.townsfolk, d.outsider, d.minion, d.demon)} (Travellers extra). The other script characters are not in play.`)
    for (const id of modifiersFor(query, characterIds)) {
      const team = getCharacterById(id)?.team as Team | undefined
      const teamName = team ? (zh ? teamLabels.zh[team] : teamLabels.en[team]) : ''
      const bracket = getAbilityText(id, language)?.match(/[[［][^\]］]+[\]］]/)?.[0] ?? ''
      for (const shift of SETUP_OUTSIDER_SHIFTS[id]) {
        if (!shift) continue
        facts.push(zh
          ? `若${getDisplayName(id, 'zh')}（${teamName}${bracket ? `，${bracket}` : ''}）在场：${row(true, d.townsfolk - shift, d.outsider + shift, d.minion, d.demon)}；${getDisplayName(id, 'zh')}本身占${teamName}名额。`
          : `If the ${getDisplayName(id, 'en')} (${teamName}${bracket ? `, ${bracket}` : ''}) is in play: ${row(false, d.townsfolk - shift, d.outsider + shift, d.minion, d.demon)}; the ${getDisplayName(id, 'en')} fills a ${teamName} slot itself.`)
      }
    }
  }

  if (!facts.length) return ''
  return `${zh ? '程序计算的规则事实（直接使用这些数字）：' : 'COMPUTED RULE FACTS (by program; use these numbers as given):'}\n${facts.map((f) => `- ${f}`).join('\n')}`
}
