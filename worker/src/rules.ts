/**
 * Rules search: the source-checked core rules (src/core/ai/rules.ts, both
 * languages) plus the BotC wiki excerpts bundled with the web app
 * (public/wiki-chunks.json), indexed on first use.
 */
import wikiJson from '../../public/wiki-chunks.json'
import { coreRuleSections } from '../../src/core/ai/rules'
import { createWikiIndex, parseWikiFile, type WikiChunk, type WikiIndex } from '../../src/core/ai/wikiIndex'

let index: WikiIndex | undefined

function coreRuleChunks(): WikiChunk[] {
  return (['en', 'zh'] as const).flatMap((lang) => coreRuleSections(lang).map((section, i) => ({
    id: `core-${lang}-${i}`,
    page: lang === 'zh' ? 'core-rules-zh' : 'core-rules',
    url: lang === 'zh' ? 'https://botc.wiki/' : 'https://wiki.bloodontheclocktower.com/Rules_Explanation',
    heading: section.heading,
    text: section.text,
    wordCount: section.text.split(/\s+/).length,
  })))
}

export function getRulesIndex(): WikiIndex {
  index ??= createWikiIndex([...coreRuleChunks(), ...(parseWikiFile(wikiJson) ?? [])])
  return index
}

export function searchRules(query: string, limit = 3) {
  return getRulesIndex().search(query, limit).map(({ page, heading, url, text }) => ({ page, heading, url, text }))
}
