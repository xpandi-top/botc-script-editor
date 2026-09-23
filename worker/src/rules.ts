/** BotC wiki excerpts bundled with the web app (public/wiki-chunks.json), indexed on first use. */
import wikiJson from '../../public/wiki-chunks.json'
import { createWikiIndex, parseWikiFile, type WikiIndex } from '../../src/core/ai/wikiIndex'

let index: WikiIndex | undefined

export function getRulesIndex(): WikiIndex {
  index ??= createWikiIndex(parseWikiFile(wikiJson) ?? [])
  return index
}

export function searchRules(query: string, limit = 3) {
  return getRulesIndex().search(query, limit).map(({ page, heading, url, text }) => ({ page, heading, url, text }))
}
