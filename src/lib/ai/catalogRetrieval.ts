/** Entity-first retrieval over the bundled catalog. Counts never come from top-K results. */
import {
  allCharacterFiles, editionLabels, getEditionCredit, getDisplayName, getAbilityText,
  loadAlmanacFile, hasGlossary,
} from '../../catalog'
import { estimateTokens, selectContext } from '../../core/ai/contextBudget'
import { GUIDE_SECTIONS } from '../../core/ai/guides'
import { createWikiIndex } from '../../core/ai/wikiIndex'
import type { Language } from '../../types'

const characters = allCharacterFiles.filter((c) => c?.id && c?.edition)
const editions = [...new Set(characters.map((c) => c.edition!))]

/** "《…》 by author" for a character from a community (民间) pack, else undefined. */
function communityPackOf(id: string): string | undefined {
  const credit = getEditionCredit(characters.find((c) => c.id === id)?.edition ?? '')
  if (!credit?.community) return undefined
  const author = credit.author_zh ?? credit.author_en
  return `${credit.name_zh || credit.name_en}${author ? ` by ${author}` : ''}${credit.source ? ` (${credit.source})` : ''}`
}

function matches(query: string, alias: string): boolean {
  const value = alias.trim().toLowerCase()
  if (!value) return false
  if (/[一-鿿]/.test(value)) {
    // Single-character names such as 幻 / 晓 must not match ordinary prose.
    return value.length > 1 ? query.includes(value) :
      query.trim() === value || [`角色${value}`, `“${value}”`, `「${value}」`, `《${value}》`].some((s) => query.includes(s))
  }
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(query)
}

// Official ability texts (both languages), for questions that quote one — e.g. "translate …".
const normalizeText = (s: string) => s.replace(/<[^>]+>/g, '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')
const abilityTexts: Array<[string, string]> = characters.flatMap((c) => (['en', 'zh'] as const).map((lang) => [normalizeText(getAbilityText(c.id, lang) ?? ''), c.id] as [string, string]))
  .filter(([text]) => text.length >= 16 && text !== normalizeText('No ability text available.'))

function quotedAbilities(query: string): string[] {
  const q = normalizeText(query)
  return [...new Set(abilityTexts.filter(([text]) => q.includes(text)).map(([, id]) => id))]
}

function entities(query: string) {
  const q = query.toLowerCase()
  const editionIds = editions.filter((id) => {
    const credit = getEditionCredit(id)
    const aliases = [id, editionLabels.en[id], editionLabels.zh[id], credit?.name_en, credit?.name_zh]
      .filter((value): value is string => Boolean(value))
      .flatMap((value) => [value, ...(value.match(/[一-鿿]+/g) ?? [])])
    return aliases.some((alias) => matches(q, alias))
  })
  const quotedIds = quotedAbilities(query)
  const named = characters.filter((c) =>
    [c.id, getDisplayName(c.id, 'en'), getDisplayName(c.id, 'zh')].some((alias) => matches(q, alias)),
  ).map((c) => c.id)
  return { editionIds, characterIds: [...new Set([...named, ...quotedIds])], quotedIds }
}

/** Editions and characters a question names (by name, id or quoted ability). */
export function mentionedEntities(query: string): { editionIds: string[]; characterIds: string[] } {
  const { editionIds, characterIds } = entities(query)
  return { editionIds, characterIds }
}

export type CatalogRetrieval = ReturnType<typeof retrieveCatalog>

// A question that continues the last one ("它", "能举个例子吗", "那怎么玩") is about the same characters.
const FOLLOW_UP = /它|这个|这些|该角色|该包|其中|那[么些个]|^(还有|有多少|一共|总共|多少|有哪些|几个)|例子|举例|举个|比如|具体|详细|展开|再说|继续|怎么玩|玩法|技巧|伪装|\b(it|its|they|their|those|these|how many|which ones|example|examples|more detail|how to play|tips?)\b/i

export function retrieveCatalog(query: string, language: Language, previousQueries: string[] = []) {
  let resolved = entities(query)
  let retrievalQuery = query
  // Resolve only referential follow-ups; never import assistant-generated guesses.
  if (!resolved.editionIds.length && !resolved.characterIds.length &&
      FOLLOW_UP.test(query)) {
    for (const previous of previousQueries.slice(-6).reverse()) {
      const found = entities(previous)
      if (found.editionIds.length || found.characterIds.length) {
        resolved = found
        retrievalQuery = `${previous}\n${query}`
        break
      }
    }
  }
  // A role's own pack supplies provenance, even when only its name was queried.
  const editionIds = [...new Set([...resolved.editionIds, ...resolved.characterIds.map((id) => characters.find((c) => c.id === id)!.edition!)])]
  const facts: string[] = []
  const rosters: string[] = []
  for (const id of editionIds) {
    const roster = characters.filter((c) => c.edition === id)
    const credit = getEditionCredit(id)
    const counts = new Map<string, number>()
    for (const c of roster) counts.set(c.team ?? 'unknown', (counts.get(c.team ?? 'unknown') ?? 0) + 1)
    facts.push(`Local edition: ${editionLabels.zh[id] ?? id} / ${editionLabels.en[id] ?? id} [${id}]\n` +
      `Exact local catalog count (all teams, not retrieval hits): ${roster.length}\n` +
      `Team counts: ${[...counts].map(([team, count]) => `${team}=${count}`).join(', ')}\n` +
      `Source: assets/characters/individual/*.json (edition=${id})` +
      (credit ? `; assets/editions.json; ${credit.source ?? ''}\nAuthor: ${credit.author_zh ?? credit.author_en ?? 'not recorded'}` : '') +
      (credit?.community
        ? '\nStatus: community (民间) character pack, fan-made, NOT official; say so when answering.'
        : '\nOfficial publication status: not established by these catalog fields; do not infer it.'))
    const wantsRoster = !resolved.characterIds.length && !/规则|机制|能力|审判日|变量|投票|怎么|如何|\b(rule|mechanic|ability|abilities|judgment|vote|how does)\b/i.test(query)
    if (resolved.editionIds.includes(id) && wantsRoster) {
      rosters.push(`Complete local roster [${id}]:\n` + [...counts].map(([team, count]) =>
        `${team} (${count}): ${roster.filter((c) => (c.team ?? 'unknown') === team).map((c) => getDisplayName(c.id, language)).join('、')}`,
      ).join('\n'))
    }
  }
  // Translations need the official text in both languages.
  const bilingual = (id: string) => resolved.quotedIds.includes(id) || /翻译|译成|translat/i.test(query)
  const details = resolved.characterIds.map((id) =>
    `Character: ${getDisplayName(id, 'zh')} / ${getDisplayName(id, 'en')} [${id}]\n` +
    (communityPackOf(id) ? `Community (民间) character, NOT official — pack ${communityPackOf(id)}\n` : '') +
    `Source: assets/characters/individual/${id}.json (current local revision)\n` +
    (bilingual(id)
      ? `Official ability (en): ${getAbilityText(id, 'en')}\nOfficial ability (zh): ${getAbilityText(id, 'zh')}`
      : `Ability: ${getAbilityText(id, language)}`),
  )
  return { ...resolved, editionIds, query: retrievalQuery, facts: facts.join('\n\n'), rosters, details }
}

/** Resolve pack-specific terminology even when the user did not name its edition. */
export async function resolveCatalogQuery(query: string, language: Language, previousQueries: string[] = []): Promise<CatalogRetrieval> {
  const direct = retrieveCatalog(query, language, previousQueries)
  if (direct.editionIds.length) return direct
  // Only packs that define terms: the other guide files hold character prose alone.
  const files = await Promise.all(editions.filter(hasGlossary).map((id) => loadAlmanacFile(id, language)))
  const matching = files.filter((file) => file && Object.values(file.terminology ?? {}).some((term) =>
    (term.title.match(/[一-鿿]+|[A-Za-z]+(?: [A-Za-z]+)*/g) ?? []).some((alias) => matches(query.toLowerCase(), alias)),
  ))
  return matching.length ? retrieveCatalog(`${matching.map((file) => file!.edition).join(' ')}\n${query}`, language) : direct
}

/**
 * Lazy local almanac loading; no LLM prequery or remote embedding request.
 * `characters: false` leaves out the named characters' guide paragraphs (a
 * guide question gets them from loadCharacterGuides instead).
 */
export async function retrieveAlmanac(retrieval: CatalogRetrieval, language: Language, options: { characters?: boolean } = {}): Promise<string> {
  const files = await Promise.all(retrieval.editionIds.map((id) => loadAlmanacFile(id, language)))
  const passages: string[] = []
  const definitions: string[] = []
  for (const file of files) {
    if (!file) continue
    const source = `Local almanac [${file.edition}]: ${file.source ?? 'assets/almanac'}`
    for (const term of Object.values(file.terminology ?? {})) {
      const paragraphs = term.text.split(/\n\s*\n/).filter((s) => s.length > 10)
      const aliases = term.title.match(/[一-鿿]+|[A-Za-z]+(?: [A-Za-z]+)*/g) ?? []
      const explicitlyNamed = aliases.some((alias) => matches(retrieval.query.toLowerCase(), alias))
      for (const [i, paragraph] of paragraphs.entries()) {
        const passage = `${source}\n${term.source ?? ''}\n${term.title}\n${paragraph}`
        passages.push(passage)
        // Definitions must survive cosine ranking, which otherwise favors short repeated headings.
        if (explicitlyNamed && i === 0) definitions.push(passage)
      }
    }
    for (const id of options.characters === false ? [] : retrieval.characterIds) {
      const entry = file.characters?.[id]
      if (!entry) continue
      // Prose sections only: not the source URL, credits or night-order fields.
      for (const section of [...GUIDE_SECTIONS.map((s) => s.id), 'design_notes' as const]) {
        const value = entry[section]
        if (typeof value === 'string' && value.trim()) {
          for (const paragraph of value.split(/\n\s*\n/)) {
            passages.push(`${source}\n${entry.source ?? ''}\n${getDisplayName(id, language)} [${id}] ${section}\n${paragraph}`)
          }
        }
      }
    }
  }
  const index = createWikiIndex(passages.map((text, i) => ({ id: String(i), heading: '', page: '', url: '', text, wordCount: 0 })))
  return [...new Set([...definitions, ...index.search(retrieval.query, 4).map((chunk) => chunk.text)])].join('\n\n')
}

export function formatCatalogRetrieval(retrieval: CatalogRetrieval, almanac = '', budget = 1900): string {
  if (!retrieval.facts) return ''
  const header = 'LOCAL CATALOG RESULTS — authoritative for local counts, membership and abilities. Cite the supplied source. Counts include all matching catalog entries; never infer totals from excerpts.\n'
  const facts = header + retrieval.facts
  // Keep aggregate facts intact. Large multi-pack queries must be narrowed rather than fabricated.
  let remaining = budget - estimateTokens(facts)
  const sections = [facts]
  for (const detail of retrieval.details) {
    const cost = estimateTokens('\n\n' + detail)
    if (cost > remaining) { sections.push('[Some requested abilities omitted; ask to narrow the question.]'); break }
    sections.push(detail)
    remaining -= cost
  }
  for (const roster of retrieval.rosters) {
    const cost = estimateTokens('\n\n' + roster)
    if (cost > remaining) {
      sections.push('[Roster omitted for space. Exact counts above remain complete. Ask for a team or a specific character; do not invent missing names.]')
      break
    }
    sections.push(roster)
    remaining -= cost
  }
  if (almanac && remaining > 150) sections.push(selectContext(almanac, retrieval.query, remaining - 20))
  return sections.join('\n\n')
}
