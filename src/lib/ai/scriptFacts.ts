/**
 * Facts for "which script should we play?" questions: the official advice
 * (public/wiki-chunks.json, setup page) and a program-computed complexity
 * estimate for every bundled script. The estimate counts what makes a game
 * harder to run and read — characters that wake at night, sources of false
 * information (drunk, poison, registering, madness), jinxes and setup
 * modifiers — per character on the script. It is a guide, not a rating.
 */
import { getAbilityText, getCharacterById, getDisplayName, getEffectiveNightOrderFromRegistry, getJinxReason, initialScripts, jinxes } from '../../catalog'
import type { Language } from '../../types'

const ASKS_SCRIPT = /剧本|板子|script/i
// Choosing a script — not a question about what is on one ("这个剧本里有哪些相克").
const ASKS_ADVICE = /推荐|入门|新手|休闲|轻松|简单|容易|难度|复杂|适合|哪个剧本|哪些剧本|有什么剧本|什么剧本|玩什么|recommend|beginner|new players?|first game|easy|casual|simple|difficult|complex|which scripts?\b|what script/i
const SMALL_GROUP = /小型|人少|5\s*[-–~到至]?\s*6\s*人|五六个人|teensy|small group|few players/i
const ONLY_OFFICIAL = /官方|official/i
const OFFICIAL = ['tb', 'bmr', 'snv']

const MISINFORMATION = {
  en: /drunk|poison|register|\bmad\b|"mad"|false|thinks? (they|you) (are|is)|you do not know|swap/i,
  zh: /醉酒|中毒|被当作|视为|疯狂|错误|以为你是|你不知道|交换/,
}

export type ScriptComplexity = { slug: string; title: string; titleZh: string; author: string; characters: number; wakers: number; misinformation: number; jinxes: number; modifiers: number; perCharacter: number }

let cache: ScriptComplexity[] | null = null

/** Bundled scripts with 10–30 characters (not whole character packs or demos), simplest first. */
export function scriptComplexities(): ScriptComplexity[] {
  if (cache) return cache
  const order = getEffectiveNightOrderFromRegistry()
  const wakes = new Set([...(order.first_night ?? []), ...(order.other_nights ?? [])])
  cache = initialScripts.map((s) => {
    const ids = s.characters.filter((id) => ['townsfolk', 'outsider', 'minion', 'demon'].includes(getCharacterById(id)?.team ?? ''))
    const text = (id: string) => ({ en: getAbilityText(id, 'en') ?? '', zh: getAbilityText(id, 'zh') ?? '' })
    const wakers = ids.filter((id) => wakes.has(id)).length
    const misinformation = ids.filter((id) => MISINFORMATION.en.test(text(id).en) || MISINFORMATION.zh.test(text(id).zh)).length
    const jinxCount = Object.values(jinxes).filter((j) => j.characters?.length === 2 && j.characters.every((id) => ids.includes(id))).length
    const modifiers = ids.filter((id) => /[[［][^\]］]+[\]］]/.test(text(id).en || text(id).zh)).length
    const score = wakers + 2 * misinformation + 1.5 * jinxCount + modifiers
    return { slug: s.slug, title: s.title, titleZh: s.titleZh || s.title, author: s.author ?? '', characters: ids.length, wakers, misinformation, jinxes: jinxCount, modifiers, perCharacter: ids.length ? score / ids.length : 0 }
  }).filter((s) => s.characters >= 10 && s.characters <= 30).sort((a, b) => a.perCharacter - b.perCharacter)
  return cache
}

/** Empty when the question is not about choosing a script. */
export function scriptRecommendationFacts(query: string, language: Language): string[] {
  if (!ASKS_SCRIPT.test(query) || !ASKS_ADVICE.test(query)) return []
  const zh = language === 'zh'
  const all = scriptComplexities()
  // Rank among the bundled scripts: 1 = simplest.
  const rank = (s: ScriptComplexity) => all.indexOf(s) + 1
  const describe = (s: ScriptComplexity) => zh
    ? `${s.titleZh}（${s.slug}${s.author ? `，作者 ${s.author}` : ''}）：${s.characters} 个角色，夜晚唤醒 ${s.wakers} 个，错误信息来源 ${s.misinformation} 个，相克 ${s.jinxes} 条，复杂度排名 ${rank(s)}/${all.length}`
    : `${s.title} (${s.slug}${s.author ? `, by ${s.author}` : ''}): ${s.characters} characters, ${s.wakers} wake at night, ${s.misinformation} sources of false information, ${s.jinxes} jinxes; complexity rank ${rank(s)}/${all.length}`

  const facts = [zh
    ? '官方建议（官方规则·准备游戏）：先从暗流涌动开始，熟悉后再尝试其他剧本；暗流涌动 5 人即可开局，其他剧本建议 7 人或以上。首局建议 5–10 人，且不加旅行者和传奇角色。'
    : 'Official advice (rules, setup): start with Trouble Brewing and then move on to other editions; Trouble Brewing needs 5+ players, other editions 7+. For a first game use 5–10 players and no Travellers or Fabled.']
  const official = OFFICIAL.map((slug) => all.find((s) => s.slug === slug)).filter((s): s is ScriptComplexity => !!s)
  // One script per nested list item, so answers stay readable.
  const items = (list: ScriptComplexity[]) => list.map((sc) => `\n  - ${describe(sc)}`).join('')
  facts.push(`${zh ? '官方剧本（只有这三个是官方基础剧本）' : 'Official scripts (only these three are the official base editions)'}：${items(official)}`)
  const small = SMALL_GROUP.test(query)
  // A question about official scripts gets only those; community scripts would be mistaken for official ones.
  const others = ONLY_OFFICIAL.test(query) ? [] : all.filter((s) => !OFFICIAL.includes(s.slug) && (!small || s.characters <= 16)).slice(0, 5)
  if (others.length) facts.push(`${zh ? (small ? '适合人少的非官方内置剧本（社区作者，按复杂度从低到高）' : '非官方内置剧本中较简单的（社区作者，按复杂度从低到高）') : (small ? 'Small unofficial bundled scripts (community authors, simplest first)' : 'Simplest unofficial bundled scripts (community authors)')}：${items(others)}`)
  facts.push(zh
    ? `复杂度排名由程序按每个角色的夜晚唤醒、错误信息来源（醉酒、中毒、登记、疯狂等）、相克和设置修正估算，在 ${all.length} 个内置剧本中排序（1 = 最简单），仅供参考。`
    : `Complexity rank is estimated by program from night wakers, false-information sources (drunk, poison, registering, madness), jinxes and setup modifiers per character, among ${all.length} bundled scripts (1 = simplest); a guide only.`)
  return facts
}

// ── Questions about one script ───────────────────────────────────────────────

const ASKS_JINXES = /相克|jinx/i
const ASKS_NIGHT_ORDER = /(夜晚|夜间|首夜|第一(个)?夜|其他夜|其余夜|每晚)[^？?。]{0,8}(顺序|先后|谁先|唤醒)|唤醒顺序|夜序|night order|wake order|order of (the )?(first|other) nights?/i
// "哪些角色会让人醉酒或中毒" / "which characters poison": ability keywords in both languages.
const ABILITY_WORDS: Array<[RegExp, RegExp]> = [
  [/醉酒/, /drunk/i], [/中毒/, /poison/i], [/疯狂/, /\bmad\b/i], [/登记|被当作/, /regist/i],
  [/复活|起死回生/, /resurrect|return to life|back to life/i], [/保护|不会死亡|安全/, /\bsafe\b|protect|cannot die/i],
  [/得知|信息/, /\blearn/i], [/杀死|杀人|死亡/, /\bdies?\b|\bkill/i], [/交换|换/, /swap|exchange/i],
]
const ASKS_WHICH = /哪些|哪几个|有谁|谁会|which|who/i
const NIGHT_MARKERS: Record<string, [string, string]> = { MINION_INFO: ['爪牙信息', 'Minion info'], DEMON_INFO: ['恶魔信息', 'Demon info'] }

/**
 * Facts about the script in scope (named in the question, else the page's):
 * its jinxes, its night order, or its characters whose ability does what
 * the question asks about. Empty when the question asks none of these.
 */
export function scriptQueryFacts(query: string, language: Language, script: { ids: string[]; name: string }): string[] {
  const zh = language === 'zh'
  const ids = script.ids.filter((id) => getCharacterById(id))
  if (!ids.length) return []
  const name = (id: string) => getDisplayName(id, language)
  const facts: string[] = []

  if (ASKS_JINXES.test(query)) {
    const pairs = Object.values(jinxes).filter((j) => j.characters?.length === 2 && j.characters.every((id) => ids.includes(id)))
    facts.push(pairs.length
      ? `${zh ? `${script.name}的相克（共 ${pairs.length} 条）` : `Jinxes on ${script.name} (${pairs.length})`}：${pairs.map((j) => `\n  - ${j.characters.map(name).join(' + ')}：${getJinxReason(j.id, language)}`).join('')}`
      : (zh ? `${script.name}的角色之间没有相克规则。` : `No jinxes between the characters on ${script.name}.`))
  }

  if (ASKS_NIGHT_ORDER.test(query)) {
    const order = getEffectiveNightOrderFromRegistry()
    const other = /其他夜|其余夜|每个夜晚\*|other nights?/i.test(query)
    const first = /首夜|第一(个)?夜|first night/i.test(query)
    const nights: Array<['first_night' | 'other_nights', string]> = [
      ...(!other || first ? [['first_night', zh ? '第一个夜晚' : 'First night'] as ['first_night', string]] : []),
      ...(!first || other ? [['other_nights', zh ? '其他夜晚' : 'Other nights'] as ['other_nights', string]] : []),
    ]
    for (const [key, label] of nights) {
      const sequence = (order[key] ?? []).filter((id) => ids.includes(id) || (key === 'first_night' && NIGHT_MARKERS[id]))
      const steps = sequence.map((id) => NIGHT_MARKERS[id]?.[zh ? 0 : 1] ?? name(id))
      facts.push(`${zh ? `${script.name}${label}的唤醒顺序` : `${label} order on ${script.name}`}：${steps.length ? steps.join(' → ') : (zh ? '无角色被唤醒' : 'nobody wakes')}${key === 'first_night' ? (zh ? '（爪牙信息与恶魔信息仅 7 人及以上）' : ' (Minion and Demon info only with 7+ players)') : ''}`)
    }
  }

  const words = ABILITY_WORDS.filter(([zhWord, enWord]) => zhWord.test(query) || enWord.test(query))
  if (ASKS_WHICH.test(query) && words.length && !ASKS_JINXES.test(query)) {
    const matching = ids.filter((id) => words.some(([zhWord, enWord]) => zhWord.test(getAbilityText(id, 'zh') ?? '') || enWord.test(getAbilityText(id, 'en') ?? '')))
    facts.push(matching.length
      ? `${zh ? `${script.name}上能力涉及“${words.map(([w]) => w.source.split('|')[0]).join('、')}”的角色（${matching.length} 个）` : `Characters on ${script.name} whose ability involves ${words.map(([, w]) => w.source.replace(/\\b/g, '').split('|')[0]).join(', ')} (${matching.length})`}：${matching.map((id) => `\n  - ${name(id)}：${getAbilityText(id, language) ?? ''}`).join('')}`
      : (zh ? `${script.name}上没有能力涉及这些的角色。` : `No character on ${script.name} has such an ability.`))
  }
  return facts
}

