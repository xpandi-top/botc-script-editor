/**
 * Script validation for scripts coming from outside the editor (imports,
 * agents, the planned `POST /v1/scripts:validate` API). The character
 * catalog is injected so the same code runs in the browser and the worker.
 */
import type { ScriptCharacterItem, ScriptFileEntry, ScriptMetaEntry, Team } from '../types/catalog'
import { extractScriptCharacters, isScriptCharacterItem, normalizeScriptMetaEntry } from './format'

export type ScriptCatalogCharacter = { id: string; team: Team; edition?: string }

export type ScriptValidationCatalog = {
  getCharacter(id: string): ScriptCatalogCharacter | undefined
  /** Active jinx pairs known to the catalog. */
  jinxPairs?: ReadonlyArray<readonly [string, string]>
  /** All known ids; enables "did you mean" suggestions for unknown ids. */
  allIds?: readonly string[]
}

export type ScriptIssueCode =
  | 'invalid_format'
  | 'invalid_entry'
  | 'empty_script'
  | 'duplicate_character'
  | 'unknown_character'
  | 'custom_character_missing_field'
  | 'custom_character_invalid_team'
  | 'no_demon'
  | 'no_townsfolk'
  | 'jinx_character_not_in_script'

export type ScriptIssue = {
  severity: 'error' | 'warning'
  code: ScriptIssueCode
  message: string
  characterId?: string
  /** Position in the input array, when the issue is tied to one entry. */
  index?: number
  /** Likely intended catalog id for an unknown_character. */
  suggestion?: string
}

export type ValidatedScriptCharacter = {
  id: string
  team: Team | null
  /** catalog = known id; script = defined inline in the script JSON; unknown = neither. */
  source: 'catalog' | 'script' | 'unknown'
}

export type ScriptValidationResult = {
  /** True when there are no error-severity issues. Warnings do not block. */
  ok: boolean
  issues: ScriptIssue[]
  characters: ValidatedScriptCharacter[]
  teamCounts: Record<Team, number>
  /** Jinx pair ids ("a::b", sorted) whose characters are both on the script. */
  applicableJinxes: string[]
  meta?: ScriptMetaEntry
}

export const SCRIPT_TEAMS: readonly Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric']

function emptyTeamCounts(): Record<Team, number> {
  return { townsfolk: 0, outsider: 0, minion: 0, demon: 0, traveler: 0, fabled: 0, loric: 0 }
}

/** Ids differing only in case, spaces, underscores or dashes (e.g. highpriestess vs high_priestess). */
function looseKey(id: string) {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function pairId(a: string, b: string) {
  return [a, b].sort((left, right) => left.localeCompare(right)).join('::')
}

/** Inline items carrying their own name/ability are custom characters (same rule the importer uses). */
function isInlineDefinition(item: ScriptCharacterItem) {
  return typeof item.name === 'string' || typeof item.ability === 'string'
}

/**
 * Validate a script in the official JSON format (array of ids / character
 * objects with an optional `_meta` entry) or the legacy `{ characters: [] }`
 * shape.
 */
export function validateScript(data: unknown, catalog: ScriptValidationCatalog): ScriptValidationResult {
  const issues: ScriptIssue[] = []
  const teamCounts = emptyTeamCounts()
  const result = (characters: ValidatedScriptCharacter[], applicableJinxes: string[], meta?: ScriptMetaEntry): ScriptValidationResult => ({
    ok: !issues.some((issue) => issue.severity === 'error'),
    issues,
    characters,
    teamCounts,
    applicableJinxes,
    ...(meta ? { meta } : {}),
  })

  let entries: ScriptFileEntry[]
  if (Array.isArray(data)) {
    entries = data as ScriptFileEntry[]
  } else if (data && typeof data === 'object' && Array.isArray((data as { characters?: unknown }).characters)) {
    entries = (data as { characters: ScriptFileEntry[] }).characters
  } else {
    issues.push({ severity: 'error', code: 'invalid_format', message: 'Script must be a JSON array (official format) or an object with a "characters" array.' })
    return result([], [])
  }

  const validEntries: ScriptFileEntry[] = []
  entries.forEach((entry, index) => {
    const valid = typeof entry === 'string'
      ? entry.trim().length > 0
      : !!entry && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string'
    if (valid) validEntries.push(entry)
    else issues.push({ severity: 'error', code: 'invalid_entry', index, message: `Entry ${index} must be a character id string or an object with a string "id".` })
  })

  const meta = normalizeScriptMetaEntry(validEntries)
  const { characters: ids } = extractScriptCharacters(validEntries)
  const inlineById = new Map<string, ScriptCharacterItem>()
  for (const entry of validEntries) {
    if (typeof entry !== 'string' && isScriptCharacterItem(entry) && isInlineDefinition(entry)) inlineById.set(entry.id, entry)
  }

  if (ids.length === 0) {
    issues.push({ severity: 'error', code: 'empty_script', message: 'Script has no characters.' })
  }

  let looseIndex: Map<string, string> | undefined
  const suggestFor = (id: string) => {
    if (!catalog.allIds) return undefined
    looseIndex ??= new Map(catalog.allIds.map((known) => [looseKey(known), known]))
    return looseIndex.get(looseKey(id))
  }

  const seen = new Set<string>()
  const characters: ValidatedScriptCharacter[] = []
  for (const id of ids) {
    if (seen.has(id)) {
      issues.push({ severity: 'error', code: 'duplicate_character', characterId: id, message: `"${id}" appears more than once.` })
      continue
    }
    seen.add(id)

    const inline = inlineById.get(id)
    if (inline) {
      for (const field of ['name', 'ability', 'team'] as const) {
        if (typeof inline[field] !== 'string' || !inline[field]!.trim()) {
          issues.push({ severity: 'error', code: 'custom_character_missing_field', characterId: id, message: `Custom character "${id}" is missing "${field}".` })
        }
      }
      const team = inline.team && SCRIPT_TEAMS.includes(inline.team) ? inline.team : null
      if (inline.team && !team) {
        issues.push({ severity: 'error', code: 'custom_character_invalid_team', characterId: id, message: `Custom character "${id}" has unknown team "${inline.team}".` })
      }
      if (team) teamCounts[team]++
      characters.push({ id, team, source: 'script' })
      continue
    }

    const known = catalog.getCharacter(id)
    if (known) {
      teamCounts[known.team]++
      characters.push({ id, team: known.team, source: 'catalog' })
    } else {
      const suggestion = suggestFor(id)
      issues.push({
        severity: 'error',
        code: 'unknown_character',
        characterId: id,
        message: `"${id}" is not a known character and has no inline definition.${suggestion ? ` Did you mean "${suggestion}"?` : ''}`,
        ...(suggestion ? { suggestion } : {}),
      })
      characters.push({ id, team: null, source: 'unknown' })
    }
  }

  if (ids.length > 0 && teamCounts.demon === 0) {
    issues.push({ severity: 'warning', code: 'no_demon', message: 'Script has no Demon.' })
  }
  if (ids.length > 0 && teamCounts.townsfolk === 0) {
    issues.push({ severity: 'warning', code: 'no_townsfolk', message: 'Script has no Townsfolk.' })
  }

  const applicable = new Set<string>()
  for (const [a, b] of catalog.jinxPairs ?? []) {
    if (seen.has(a) && seen.has(b)) applicable.add(pairId(a, b))
  }
  for (const jinx of meta?.jinxes ?? []) {
    const missing = jinx.characters.filter((id) => !seen.has(id))
    if (missing.length > 0) {
      issues.push({ severity: 'warning', code: 'jinx_character_not_in_script', characterId: missing[0], message: `Jinx "${jinx.id}" references ${missing.map((id) => `"${id}"`).join(' and ')}, which ${missing.length > 1 ? 'are' : 'is'} not on the script.` })
    } else if (jinx.status === 'inactive') {
      // The script explicitly switches this jinx off.
      applicable.delete(jinx.id)
    } else {
      applicable.add(jinx.id)
    }
  }

  return result(characters, [...applicable].sort(), meta)
}
