/**
 * Character guides: the prose behind "怎么玩 / 举个例子 / 怎么主持 / 伪装"
 * questions, in one schema for every edition (docs/AI-CONTENT.md).
 *
 * Files: assets/almanac/<edition>.<lang>.json — the Odyssey almanac from the
 * pack itself, the official and Chinese editions from the wikis
 * (scripts/build-guides.mjs) — plus assets/almanac/index.json, a small
 * manifest the app reads synchronously. Each section is plain text,
 * paragraphs separated by a blank line, so a paragraph is the unit that
 * retrieval ranks and budgets keep whole.
 *
 * Framework-free: the web app loads the files, this module picks what a
 * question needs.
 */
import { createWikiIndex } from './wikiIndex'

/** Section ids in display order, with their headings. */
export const GUIDE_SECTIONS = [
  { id: 'summary', zh: '角色简介', en: 'Summary' },
  { id: 'howto', zh: '运作方式', en: 'How to run' },
  { id: 'examples', zh: '范例', en: 'Examples' },
  { id: 'rules', zh: '规则细节', en: 'Rules details' },
  { id: 'reminder_details', zh: '提示标记', en: 'Reminder tokens' },
  { id: 'tips', zh: '提示与技巧', en: 'Tips & tricks' },
  { id: 'bluffing', zh: '伪装技巧', en: 'Bluffing' },
  { id: 'fighting', zh: '对抗技巧', en: 'Fighting' },
  { id: 'flavor', zh: '背景故事', en: 'Flavour' },
] as const

export type GuideSectionId = typeof GUIDE_SECTIONS[number]['id']

/** One character's guide. Pack almanacs (Odyssey) carry extra fields, which readers ignore. */
export type CharacterGuide = Partial<Record<GuideSectionId, string>> & {
  /** The page the entry was taken from. */
  source?: string
  /** Wiki revision the entry was built from. */
  revid?: number
  /** Ability kinds (集石 “角色能力类型”: 免死, 醉酒, …). */
  tags?: string[]
  zh_name?: string
  en_name?: string
  number?: string
  ability?: string
  design_notes?: string
  scripts?: string
  credits?: { design?: string; concept?: string; art?: string }
}

export type GuideTerm = { title: string; text: string; source?: string }

export type GuideFile = {
  /** 1 for files written by scripts/build-guides.mjs; the Odyssey almanac predates it. */
  schema?: number
  edition: string
  language?: 'zh' | 'en'
  name_zh?: string
  name_en?: string
  source?: string
  source_name?: string
  license?: string
  fetched?: string
  scraped?: string
  terminology?: Record<string, GuideTerm>
  characters?: Record<string, CharacterGuide>
}

/** assets/almanac/index.json */
export type GuideIndex = {
  schema: number
  files: Record<string, {
    edition: string
    language: string
    source: string | null
    fetched: string | null
    bytes: number
    terminology: number
    characters: string[]
  }>
}

export type GuideIntent = 'examples' | 'bluffing' | 'fighting' | 'run' | 'play' | 'summary' | 'detail'

/**
 * What a question wants from a guide, first match wins. `ranked`: pick the
 * paragraphs that match the question (a rules detail may sit in any
 * section) instead of reading the sections in order.
 */
const INTENTS: Array<{ intent: GuideIntent; pattern: RegExp; sections: GuideSectionId[]; ranked?: boolean }> = [
  { intent: 'examples', pattern: /举例|举个|例子|比如|示例|范例|examples?\b|for instance/i, sections: ['examples'] },
  { intent: 'bluffing', pattern: /伪装|假扮|冒充|假跳|悍跳|bluff/i, sections: ['bluffing'] },
  { intent: 'fighting', pattern: /对抗|对付|反制|怎么(打|抓|找)|如何(打|抓|找)|\bfight|counter|against/i, sections: ['fighting', 'tips'] },
  { intent: 'run', pattern: /主持|运作|说书人(要|该|怎么|如何|需要)|提示标记|标记怎么|how (do i|to|should i|does the storyteller) run|\brunning\b/i, sections: ['howto', 'reminder_details'] },
  { intent: 'play', pattern: /怎么玩|玩法|如何玩|怎样玩|技巧|策略|思路|心得|注意(什么|事项)|how (do i|to|should i) play|tips?\b|strateg|advice/i, sections: ['summary', 'tips'] },
  { intent: 'summary', pattern: /介绍|简介|讲讲|说说|聊聊|是个什么|什么样的角色|overview|summar|tell me about/i, sections: ['summary'] },
  {
    intent: 'detail',
    pattern: /会不会|能不能|能否|可不可以|是否|如果|假如|要是|的话|算不算|怎么算|会死|还会|还能|被处决|醉酒|中毒|死亡|\b(would|could|can|if)\b/i,
    sections: ['rules', 'summary', 'howto', 'examples'],
    ranked: true,
  },
]

export function guideIntent(query: string): { intent: GuideIntent; sections: GuideSectionId[]; ranked: boolean } | null {
  const found = INTENTS.find(({ pattern }) => pattern.test(query))
  return found ? { intent: found.intent, sections: found.sections, ranked: Boolean(found.ranked) } : null
}

/** Budgets per character, in characters of text: a 4K local model, the no-model answer, an online model. */
export const GUIDE_BUDGET = { local: 700, answer: 900, online: 1600 } as const

/** English runs about 2.5× longer than Chinese for the same content. */
const budgetFor = (maxChars: number, text: string) => /[一-鿿]/.test(text) ? maxChars : Math.round(maxChars * 2.5)

/** Up to `max` characters, ending at a sentence end when there is one. */
export function cutAtSentence(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const end = Math.max(...['。', '！', '？', '. ', '! ', '? '].map((p) => cut.lastIndexOf(p)))
  return end > max * 0.4 ? cut.slice(0, end + 1) : `${cut}…`
}

const paragraphsOf = (text: string | undefined) => (text ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

export type GuideSelection = { intent: GuideIntent; sections: Array<{ id: GuideSectionId; text: string }> }

/**
 * The parts of a character's guide a question needs, within `maxChars`
 * (Chinese characters; English gets proportionally more). Whole paragraphs,
 * in source order; a first paragraph longer than the budget is cut at a
 * sentence end. Null when the question is not a guide question or the guide
 * has nothing for it.
 */
export function selectGuide(entry: CharacterGuide, query: string, maxChars: number): GuideSelection | null {
  const wanted = guideIntent(query)
  if (!wanted) return null
  // No tips (the Chinese editions, Fabled, Loric): the whole summary and the examples explain how it plays.
  if (wanted.intent === 'play' && !entry.tips?.trim()) wanted.sections = ['summary', 'examples']
  const sample = wanted.sections.map((id) => entry[id] ?? '').join('')
  let remaining = budgetFor(maxChars, sample)
  const picked = new Map<GuideSectionId, Array<{ i: number; text: string }>>()

  const candidates = wanted.sections.flatMap((id) => paragraphsOf(entry[id]).map((text, i) => ({ id, i, text })))
  let order = candidates
  if (wanted.ranked) {
    const index = createWikiIndex(candidates.map((c, n) => ({ id: String(n), page: '', url: '', heading: '', text: c.text, wordCount: 0 })))
    const hits = index.scored(query, candidates.length)
    const best = hits[0]?.score ?? 0
    order = hits.filter(({ score }) => score >= best * 0.5).map(({ chunk }) => candidates[Number(chunk.id)])
  } else if (wanted.sections[1] === 'tips') {
    // "怎么玩": the summary's first paragraph sets the scene; the rest of the budget goes to the tips.
    order = candidates.filter((c) => c.id !== 'summary' || c.i === 0)
  }

  for (const c of order) {
    if (remaining <= 40) break
    const text = c.text.length <= remaining ? c.text : picked.size === 0 ? cutAtSentence(c.text, remaining) : ''
    if (!text) continue
    picked.set(c.id, [...(picked.get(c.id) ?? []), { i: c.i, text }])
    remaining -= text.length
  }
  if (!picked.size) return null
  // Sections in display order, paragraphs in source order (ranking may have reordered them).
  const sections = GUIDE_SECTIONS.filter(({ id }) => picked.has(id)).map(({ id }) => ({
    id, text: picked.get(id)!.sort((a, b) => a.i - b.i).map((p) => p.text).join('\n\n'),
  }))
  return { intent: wanted.intent, sections }
}

const plainText = (s: string) => s.replace(/<[^>]+>/g, '').replace(/[\s\p{P}\p{S}]+/gu, '').toLowerCase()
const bigrams = (s: string) => new Set(Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2)))

/**
 * Whether a guide was written for a different version of the ability than
 * the catalog's (e.g. the wiki's 暴君 or 戏子): character-pair overlap below
 * 60%. Wording and punctuation differences ("neighbour", 即将死亡) stay above.
 */
export function abilityDiffers(guideAbility: string | undefined, catalogAbility: string | undefined): boolean {
  if (!guideAbility || !catalogAbility) return false
  const a = bigrams(plainText(guideAbility))
  const b = bigrams(plainText(catalogAbility))
  if (!a.size || !b.size) return false
  let shared = 0
  for (const pair of a) if (b.has(pair)) shared++
  return (2 * shared) / (a.size + b.size) < 0.6
}

export function guideSectionLabel(id: GuideSectionId, language: 'zh' | 'en'): string {
  return GUIDE_SECTIONS.find((s) => s.id === id)![language]
}
