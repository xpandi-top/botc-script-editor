/**
 * The no-model answer (docs/AI-ARCHITECTURE-OFFLINE-FIRST.md §3, first row):
 * what the app can say from local data alone — offline, with no model
 * loaded, or when the online AI fails. It never generates prose; it shows
 * catalog facts, program-computed rule facts, and the most relevant rules
 * passages, each with its source.
 */
import {
  allCharacterFiles, editionLabels, getAbilityText, getCharacterById, getDisplayName, getEditionCredit, getEditionCreditAuthor,
  getAlmanacEntry, getEffectiveNightOrderFromRegistry, getJinxReason, jinxes, teamLabels,
} from '../../catalog'
import { searchCoreRules } from '../../core/ai/rules'
import type { Language, Team } from '../../types'
import { searchWiki } from '../wikiSearch'
import { mentionedEntities, retrieveCatalog } from './catalogRetrieval'
import { computeRuleFacts } from './ruleFacts'
import type { AiContext } from './types'
import { emptyMeta, type RetrievalMeta } from './trace'

const TEAM_WORDS: Array<[Team, RegExp]> = [
  ['townsfolk', /镇民|townsfolk/i], ['outsider', /外来者|outsiders?/i], ['minion', /爪牙|minions?/i],
  ['demon', /恶魔|demons?/i], ['traveler', /旅行者|travell?ers?/i], ['fabled', /传奇角色|fabled/i],
]

const TEAM_ORDER: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric']

/** "暗流涌动 / Trouble Brewing：本地共 28 个角色——镇民 13、……" with the author when recorded. */
function editionSummary(id: string, language: Language): string {
  const zh = language === 'zh'
  const roster = allCharacterFiles.filter((c) => c?.edition === id && c.team)
  const counts = TEAM_ORDER.map((team) => [team, roster.filter((c) => c.team === team).length] as const).filter(([, n]) => n > 0)
  const credit = getEditionCredit(id)
  const author = credit ? getEditionCreditAuthor(credit, language) ?? '' : ''
  return `**${editionLabels.zh[id] ?? id} / ${editionLabels.en[id] ?? id}**${zh ? `：本地共 ${roster.length} 个角色——` : `: ${roster.length} characters locally — `}${counts.map(([team, n]) => `${teamLabels[language][team]} ${n}`).join(zh ? '、' : ', ')}${author ? (zh ? `；作者：${author}` : `; by ${author}`) : ''}`
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

/**
 * Questions that want judgement or explanation rather than a fact: these go
 * to a model when one is available; the rest the program answers exactly.
 */
const OPEN_QUESTION = /为什么|怎么办|怎么(玩|主持|做|打|判断|应对|处理|讲|说)|如何|策略|技巧|思路|心得|注意|建议|讲讲|聊聊|分析|区别|对比|比较|推理|why|how (do|should|can|to|would)|strategy|tips?\b|advice|explain|analy[sz]e|compare|difference/i

// Questions about how the game works, even when they also name a character.
const RULE_WORDS = /规则|能不能|允许|醉|中毒|疯狂|登记|提名|处决|死亡|复活|旅行者|传奇角色|恶魔伪装|rule|allowed|drunk|poison|mad(ness)?\b|register|nominat|execut|resurrect|travell?er|fabled|bluff/i
// "醉着是什么意思" / "血染里的醉确定是这个意思吗": a question about what a term means.
const ASKS_TERM = /什么意思|啥意思|是什么|什么是|指什么|是指|含义|定义|意思吗|确定是|真的是|what does .{1,30} mean|what is|meaning|definition/i
// Guide questions a character's almanac can answer: examples, how to play, tips, bluffing.
const ASKS_GUIDE = /怎么玩|玩法|如何玩|怎样玩|举例|举个|例子|比如|示例|技巧|策略|伪装|假扮|how (do i|to) play|examples?\b|tips?\b|strategy|bluff/i

/**
 * `definitive`: the program's answer is exact (computed facts, official
 * text, counts) and needs no model; a small local model only adds errors.
 */
export type LocalAnswer = { message: string; found: boolean; definitive: boolean; meta: RetrievalMeta }

/**
 * Almanac prose for the characters a guide question is about ("怎么玩",
 * "举个例子", "技巧", "伪装"), for packs that ship one; empty otherwise.
 */
export async function loadCharacterGuides(query: string, language: Language, previousQueries: string[] = []): Promise<Record<string, string>> {
  if (!ASKS_GUIDE.test(query)) return {}
  const zh = language === 'zh'
  const guides: Record<string, string> = {}
  for (const id of retrieveCatalog(query, language, previousQueries).characterIds.slice(0, 2)) {
    const entry = await getAlmanacEntry(id, language)
    if (!entry) continue
    const fields: Array<[keyof typeof entry, string, string]> = /例|比如|example/i.test(query) ? [['examples', '范例', 'Examples']]
      : /伪装|假扮|bluff/i.test(query) ? [['bluffing', '伪装技巧', 'Bluffing']]
      : [['tips', '玩法技巧', 'Tips'], ['examples', '范例', 'Examples']]
    const parts = fields.flatMap(([key, labelZh, labelEn]) => {
      const text = entry[key]
      return typeof text === 'string' && text.trim() ? [`**${getDisplayName(id, language)} · ${zh ? labelZh : labelEn}**\n${excerpt(text.trim(), 700)}`] : []
    })
    if (parts.length) guides[id] = parts.join('\n\n')
  }
  return guides
}

export function answerLocally(ctx: AiContext, query: string, previousQueries: string[] = [], lastAnswer?: string, guides: Record<string, string> = {}): LocalAnswer {
  const language = ctx.language
  const zh = language === 'zh'
  const retrieval = retrieveCatalog(query, language, previousQueries)
  const sections: string[] = []

  const meta = emptyMeta()
  const facts = computeRuleFacts(query, language, { ...ctx, previousQueries, lastAnswer, gameFacts: 'when-asked' }, meta.facts)
  if (facts) sections.push(facts.split('\n').slice(1).join('\n'))
  let exact = Boolean(facts)

  // A question about a term ("醉着是什么意思") is answered by the rules, even
  // when a follow-up carried the last question's character along.
  const asksTerm = ASKS_TERM.test(query) && RULE_WORDS.test(query)
  const namedHere = mentionedEntities(query).characterIds
  // Characters the question names: official text (both languages for translations).
  const bilingual = /翻译|译成|translat/i.test(query) || retrieval.quotedIds.length > 0
  const characters = retrieval.characterIds.filter((id) => !asksTerm || namedHere.includes(id)).slice(0, 6)
  meta.characters = characters
  meta.editions = retrieval.editionIds
  if (characters.length) sections.push(characters.map((id) => characterCard(id, language, bilingual || retrieval.quotedIds.includes(id))).join('\n\n'))
  exact ||= characters.length > 0
  const guideText = characters.map((id) => guides[id]).filter(Boolean)
  if (guideText.length) sections.push(`${guideText.join('\n\n')}\n${zh ? '（来源：角色年鉴）' : '(Source: character almanac)'}`)

  if (characters.length >= 2) {
    const pairJinxes = Object.values(jinxes).filter((j) => j.characters?.length === 2 && j.characters.every((id) => characters.includes(id)))
    if (pairJinxes.length) sections.push(pairJinxes.map((j) => `${zh ? '相克' : 'Jinx'}（${j.characters.map((id) => getDisplayName(id, language)).join(' + ')}）：${getJinxReason(j.id, language)}`).join('\n'))
    else if (/相克|jinx/i.test(query)) sections.push(zh ? '本地目录中这些角色之间没有相克规则。' : 'The local catalog has no jinx between these characters.')
    if (/夜|唤醒|顺序|night|wake|order/i.test(query)) sections.push(nightOrderLines(characters, language, query).join('\n'))
  }

  // Editions: exact counts, author, and the roster (only the teams asked about).
  if (retrieval.editionIds.length && !characters.length) {
    sections.push(retrieval.editionIds.map((id) => editionSummary(id, language)).join('\n'))
    const teams = TEAM_WORDS.filter(([, pattern]) => pattern.test(query)).map(([team]) => team)
    const rosters = retrieval.rosters.join('\n').split('\n')
      .filter((line) => /^\w+ \(\d+\):/.test(line) && (!teams.length || teams.some((team) => line.startsWith(`${team} (`))))
      .map((line) => line.replace(/^(\w+) \((\d+)\):\s*/, (_m, team: string, n: string) => `${teamLabels[language][team as Team] ?? team}（${n}）：`))
    if (/哪些|列出|名单|有什么|which|list/i.test(query)) sections.push(rosters.join('\n'))
    exact = true
  }

  // Rules and terms: the most relevant core rules sections — unless the program
  // already computed the answer — then a wiki excerpt when nothing else is exact.
  if (!exact || asksTerm || (!facts && RULE_WORDS.test(query))) {
    // Next to a character's text, only sections about the rule the question names ("醉").
    const term = exact || asksTerm ? query.match(RULE_WORDS)?.[0]?.toLowerCase() ?? '' : ''
    const sections2 = searchCoreRules(query, language, 2).filter((section) => !term || section.text.toLowerCase().includes(term))
    meta.rules = sections2.map((section) => section.heading)
    const rules = sections2.map((section) => section.text)
    if (rules.length) {
      const block = `${rules.join('\n\n')}\n${zh ? '（来源：官方规则与术语表）' : '(Source: official rules and glossary)'}`
      // The rule is the answer to a term question: put it first.
      if (asksTerm) { sections.unshift(block); exact = true } else sections.push(block)
    }
  }
  if (!exact) {
    const wiki = searchWiki(query, 1).filter((chunk) => zh === chunk.page.startsWith('zh-'))
    meta.wiki = wiki.map((chunk) => chunk.page)
    if (wiki.length) sections.push(wiki.map((chunk) => `${excerpt(chunk.text, 500)}\n${zh ? '来源' : 'Source'}: ${chunk.url}`).join('\n\n'))
  }

  const found = sections.length > 0
  const header = zh ? '*本地资料（未使用模型生成）*' : '*From local data (no model)*'
  const body = found
    ? sections.join('\n\n')
    : (zh ? '本地资料中没有找到与这个问题直接相关的内容。可以换个说法，或在 AI 设置中选择在线 AI / 下载本地模型。' : 'Nothing in the local data answers this directly. Try rephrasing, or choose the online AI or a local model in AI settings.')
  return { message: `${header}\n\n${body}`, found, definitive: found && exact && !OPEN_QUESTION.test(query), meta }
}
