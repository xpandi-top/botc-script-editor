/**
 * Facts for "which script should we play?" questions: the official advice
 * (public/wiki-chunks.json, setup page) and a program-computed complexity
 * estimate for every bundled script. The estimate counts what makes a game
 * harder to run and read — characters that wake at night, sources of false
 * information (drunk, poison, registering, madness), jinxes and setup
 * modifiers — per character on the script. It is a guide, not a rating.
 */
import { getAbilityText, getCharacterById, getEffectiveNightOrderFromRegistry, initialScripts, jinxes } from '../../catalog'
import type { Language } from '../../types'

const ASKS_SCRIPT = /剧本|板子|script/i
const ASKS_ADVICE = /推荐|入门|新手|休闲|轻松|简单|容易|难度|复杂|适合|有哪些|哪个|哪些|什么剧本|玩什么|recommend|beginner|new players?|first game|easy|casual|simple|difficult|complex|which|what script/i
const SMALL_GROUP = /小型|人少|5\s*[-–~到至]?\s*6\s*人|五六个人|teensy|small group|few players/i
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
  facts.push(`${zh ? '官方剧本' : 'Official scripts'}：${official.map(describe).join(zh ? '；' : '; ')}`)
  const small = SMALL_GROUP.test(query)
  const others = all.filter((s) => !OFFICIAL.includes(s.slug) && (!small || s.characters <= 16)).slice(0, 5)
  if (others.length) facts.push(`${zh ? (small ? '适合人少的内置小型剧本（按复杂度从低到高）' : '其他内置剧本中较简单的（按复杂度从低到高）') : (small ? 'Small bundled scripts (simplest first)' : 'Simplest other bundled scripts')}：${others.map(describe).join(zh ? '；' : '; ')}`)
  facts.push(zh
    ? `复杂度排名由程序按每个角色的夜晚唤醒、错误信息来源（醉酒、中毒、登记、疯狂等）、相克和设置修正估算，在 ${all.length} 个内置剧本中排序（1 = 最简单），仅供参考。`
    : `Complexity rank is estimated by program from night wakers, false-information sources (drunk, poison, registering, madness), jinxes and setup modifiers per character, among ${all.length} bundled scripts (1 = simplest); a guide only.`)
  return facts
}
