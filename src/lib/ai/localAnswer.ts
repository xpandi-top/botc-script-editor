/**
 * The no-model answer (docs/AI-ARCHITECTURE-OFFLINE-FIRST.md §3, first row):
 * what the app can say from local data alone — offline, with no model
 * loaded, or when the online AI fails. It never generates prose; it shows
 * catalog facts, program-computed rule facts, and the most relevant rules
 * passages, each with its source.
 */
import {
  getAbilityText, getCharacterById, getDisplayName, getEffectiveNightOrderFromRegistry, getJinxReason, jinxes, teamLabels,
} from '../../catalog'
import { coreRuleSections } from '../../core/ai/rules'
import { createWikiIndex } from '../../core/ai/wikiIndex'
import type { Language, Team } from '../../types'
import { searchWiki } from '../wikiSearch'
import { retrieveCatalog } from './catalogRetrieval'
import { computeRuleFacts } from './ruleFacts'
import type { AiContext } from './types'

const TEAM_WORDS: Array<[Team, RegExp]> = [
  ['townsfolk', /镇民|townsfolk/i], ['outsider', /外来者|outsiders?/i], ['minion', /爪牙|minions?/i],
  ['demon', /恶魔|demons?/i], ['traveler', /旅行者|travell?ers?/i], ['fabled', /传奇角色|fabled/i],
]

const ruleIndexes = new Map<Language, ReturnType<typeof createWikiIndex>>()
function ruleIndex(language: Language) {
  let index = ruleIndexes.get(language)
  if (!index) {
    index = createWikiIndex(coreRuleSections(language).map((s, i) => ({ id: String(i), page: 'core', url: '', heading: s.heading, text: s.text, wordCount: 0 })))
    ruleIndexes.set(language, index)
  }
  return index
}

function characterCard(id: string, language: Language, bilingual: boolean): string {
  const zh = language === 'zh'
  const team = getCharacterById(id)?.team as Team | undefined
  const teamName = team ? (zh ? teamLabels.zh[team] : teamLabels.en[team]) : ''
  const ability = bilingual
    ? `${zh ? '官方英文' : 'Official English'}: ${getAbilityText(id, 'en')}\n${zh ? '官方中文' : 'Official Chinese'}: ${getAbilityText(id, 'zh')}`
    : getAbilityText(id, language)
  return `**${getDisplayName(id, 'zh')} / ${getDisplayName(id, 'en')}**（${teamName}）\n${ability}`
}

function nightOrderLines(ids: string[], language: Language, query: string): string[] {
  const zh = language === 'zh'
  const order = getEffectiveNightOrderFromRegistry()
  const nights: Array<['first_night' | 'other_nights', string]> = /其他夜|其余夜|other night/i.test(query) ? [['other_nights', zh ? '其他夜晚' : 'Other nights']]
    : /第一|首夜|首个夜晚|first night/i.test(query) ? [['first_night', zh ? '第一个夜晚' : 'First night']]
    : [['first_night', zh ? '第一个夜晚' : 'First night'], ['other_nights', zh ? '其他夜晚' : 'Other nights']]
  return nights.map(([key, label]) => {
    const list = order[key] ?? []
    const waking = ids.filter((id) => list.includes(id)).sort((a, b) => list.indexOf(a) - list.indexOf(b))
    const idle = ids.filter((id) => !list.includes(id))
    if (!waking.length) return `${label}：${ids.map((id) => getDisplayName(id, language)).join('、')}${zh ? '都不被唤醒' : ' do not wake'}`
    const first = getDisplayName(waking[0], language)
    const sequence = waking.map((id) => `${getDisplayName(id, language)}（${zh ? '第' : '#'}${list.indexOf(id) + 1}${zh ? '位' : ''}）`).join(' → ')
    return zh
      ? `${label}：${first}先被唤醒。顺序：${sequence}${idle.length ? `；${idle.map((id) => getDisplayName(id, language)).join('、')}不被唤醒` : ''}`
      : `${label}: the ${first} wakes first. Order: ${sequence}${idle.length ? `; ${idle.map((id) => getDisplayName(id, language)).join(', ')} do not wake` : ''}`
  })
}

/** Up to `max` characters, ending at a sentence end when there is one. */
function excerpt(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const end = Math.max(...['。', '！', '？', '. ', '! ', '? '].map((p) => cut.lastIndexOf(p)))
  return end > max * 0.4 ? cut.slice(0, end + 1) : `${cut}…`
}

export type LocalAnswer = { message: string; found: boolean }

export function answerLocally(ctx: AiContext, query: string, previousQueries: string[] = []): LocalAnswer {
  const language = ctx.language
  const zh = language === 'zh'
  const retrieval = retrieveCatalog(query, language, previousQueries)
  const sections: string[] = []

  const facts = computeRuleFacts(query, language, ctx)
  if (facts) sections.push(facts.split('\n').slice(1).join('\n'))

  // Characters the question names: official text (both languages for translations).
  const bilingual = /翻译|译成|translat/i.test(query) || retrieval.quotedIds.length > 0
  const characters = retrieval.characterIds.slice(0, 6)
  if (characters.length) sections.push(characters.map((id) => characterCard(id, language, bilingual || retrieval.quotedIds.includes(id))).join('\n\n'))

  if (characters.length >= 2) {
    const pairJinxes = Object.values(jinxes).filter((j) => j.characters?.length === 2 && j.characters.every((id) => characters.includes(id)))
    if (pairJinxes.length) sections.push(pairJinxes.map((j) => `${zh ? '相克' : 'Jinx'}（${j.characters.map((id) => getDisplayName(id, language)).join(' + ')}）：${getJinxReason(j.id, language)}`).join('\n'))
    else if (/相克|jinx/i.test(query)) sections.push(zh ? '本地目录中这些角色之间没有相克规则。' : 'The local catalog has no jinx between these characters.')
    if (/夜|唤醒|顺序|night|wake|order/i.test(query)) sections.push(nightOrderLines(characters, language, query).join('\n'))
  }

  // Editions: exact counts, author, and the roster (only the teams asked about).
  if (retrieval.editionIds.length && !characters.length) {
    sections.push(retrieval.facts.split('\n').filter((line) => !/^Source:|publication status/i.test(line)).join('\n'))
    const teams = TEAM_WORDS.filter(([, pattern]) => pattern.test(query)).map(([team]) => team)
    const rosters = retrieval.rosters.join('\n').split('\n').filter((line) => !teams.length || teams.some((team) => line.startsWith(`${team} (`)))
    if (/哪些|列出|名单|有什么|which|list/i.test(query)) sections.push(rosters.join('\n'))
  }

  // Rules and terms: the most relevant core rules sections, then wiki excerpts.
  if (!characters.length || /规则|怎么|如何|能不能|可以|吗|rule|how|can /i.test(query)) {
    const rules = ruleIndex(language).search(query, 2).map((chunk) => chunk.text)
    if (rules.length) sections.push(`${rules.join('\n\n')}\n${zh ? '（来源：官方规则与术语表）' : '(Source: official rules and glossary)'}`)
    const wiki = searchWiki(query, 1).filter((chunk) => zh === chunk.page.startsWith('zh-'))
    if (wiki.length) sections.push(wiki.map((chunk) => `${excerpt(chunk.text, 500)}\n${zh ? '来源' : 'Source'}: ${chunk.url}`).join('\n\n'))
  }

  const found = sections.length > 0
  const header = zh ? '*本地资料（未使用模型生成）*' : '*From local data (no model)*'
  const body = found
    ? sections.join('\n\n')
    : (zh ? '本地资料中没有找到与这个问题直接相关的内容。可以换个说法，或在 AI 设置中选择在线 AI / 下载本地模型。' : 'Nothing in the local data answers this directly. Try rephrasing, or choose the online AI or a local model in AI settings.')
  return { message: `${header}\n\n${body}`, found }
}
