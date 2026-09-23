/**
 * Read-only queries over a CatalogData snapshot: character lookup and search,
 * bundled scripts, jinxes and night order. Used by the API worker; the web app
 * keeps using src/catalog.ts (which also applies the user's local overrides).
 */
import type { ScriptFileEntry, ScriptMetaEntry, Team } from '../types/catalog'
import type { TeamLookup } from '../engine/alignment'
import { extractScriptCharacters, normalizeScriptMetaEntry } from '../script/format'
import type { ScriptValidationCatalog } from '../script/validate'
import type { CatalogCharacter, CatalogData, CatalogJinx } from './types'

export type * from './types'

export type CatalogScriptSummary = {
  slug: string
  title: string
  titleZh: string
  author: string
  characterCount: number
}

export type ResolvedCatalogScript = CatalogScriptSummary & {
  characters: string[]
  meta?: ScriptMetaEntry
  /** The script as bundled, in the official JSON format when it was authored that way. */
  data: unknown
}

export type CharacterSearch = {
  /** Case-insensitive match on id, names and ability text (EN and ZH). */
  q?: string
  team?: Team
  edition?: string
  limit?: number
}

export type CatalogIndex = {
  data: CatalogData
  getCharacter(id: string): CatalogCharacter | undefined
  teamOf: TeamLookup
  searchCharacters(search?: CharacterSearch): CatalogCharacter[]
  listScripts(): CatalogScriptSummary[]
  getScript(slug: string): ResolvedCatalogScript | undefined
  /** Active jinxes whose two characters are both in `ids`. */
  jinxesAmong(ids: Iterable<string>): CatalogJinx[]
  /** Wake order for the given characters (characters that do not wake are left out). */
  nightOrderFor(ids: Iterable<string>, night: 'first' | 'other'): string[]
  /** Adapter for validateScript. */
  validationCatalog: ScriptValidationCatalog
}

const toTitleCase = (value: string) => value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

function summarize(slug: string, data: unknown): ResolvedCatalogScript {
  if (Array.isArray(data)) {
    const entries = data as ScriptFileEntry[]
    const meta = normalizeScriptMetaEntry(entries)
    const { characters } = extractScriptCharacters(entries)
    const title = meta?.name ?? toTitleCase(slug)
    return { slug, title, titleZh: meta?.name_zh ?? title, author: meta?.author ?? '', characterCount: characters.length, characters, ...(meta ? { meta } : {}), data }
  }
  const legacy = (data ?? {}) as { title?: string; characters?: unknown }
  const characters = Array.isArray(legacy.characters) ? legacy.characters.filter((c): c is string => typeof c === 'string') : []
  const title = legacy.title ?? toTitleCase(slug)
  return { slug, title, titleZh: title, author: '', characterCount: characters.length, characters, data }
}

function searchRank(character: CatalogCharacter, needle: string): number {
  const names = [character.id, character.name.en, character.name.zh].map((n) => n.toLowerCase())
  if (names.some((n) => n === needle)) return 0
  if (names.some((n) => n.startsWith(needle))) return 1
  if (names.some((n) => n.includes(needle))) return 2
  if ([character.ability.en, character.ability.zh].some((a) => a.toLowerCase().includes(needle))) return 3
  return -1
}

export function createCatalogIndex(data: CatalogData): CatalogIndex {
  const byId = new Map(data.characters.map((c) => [c.id, c]))
  const scripts = new Map(data.scripts.map((s) => [s.slug, s]))
  const resolved = new Map<string, ResolvedCatalogScript>()
  const teamOf: TeamLookup = (id) => byId.get(id)?.team
  const activePairs = data.jinxes.filter((j) => j.status === 'active').map((j) => j.characters)

  const getScript = (slug: string) => {
    const cached = resolved.get(slug)
    if (cached) return cached
    const script = scripts.get(slug)
    if (!script) return undefined
    const summary = summarize(script.slug, script.data)
    resolved.set(slug, summary)
    return summary
  }

  return {
    data,
    getCharacter: (id) => byId.get(id),
    teamOf,
    searchCharacters: ({ q, team, edition, limit } = {}) => {
      let list = data.characters.filter((c) => (!team || c.team === team) && (!edition || c.edition === edition))
      const needle = q?.trim().toLowerCase()
      if (needle) {
        list = list
          .map((c) => ({ c, rank: searchRank(c, needle) }))
          .filter((x) => x.rank >= 0)
          .sort((a, b) => a.rank - b.rank)
          .map((x) => x.c)
      }
      return limit !== undefined ? list.slice(0, Math.max(0, limit)) : list
    },
    listScripts: () => data.scripts.map((s) => {
      const { slug, title, titleZh, author, characterCount } = getScript(s.slug)!
      return { slug, title, titleZh, author, characterCount }
    }),
    getScript,
    jinxesAmong: (ids) => {
      const set = new Set(ids)
      return data.jinxes.filter((j) => j.status === 'active' && set.has(j.characters[0]) && set.has(j.characters[1]))
    },
    nightOrderFor: (ids, night) => {
      const set = new Set(ids)
      return (night === 'first' ? data.nightOrder.first : data.nightOrder.other).filter((id) => set.has(id))
    },
    validationCatalog: {
      getCharacter: (id) => byId.get(id),
      jinxPairs: activePairs,
      allIds: data.characters.map((c) => c.id),
    },
  }
}
