/**
 * Official script JSON format helpers (array of ids / character objects with
 * an optional `_meta` entry). Framework-free so the web app, the validator
 * and the planned API worker parse scripts identically.
 */
import type { ScriptCharacterItem, ScriptFileEntry, ScriptJinxOverride, ScriptMetaEntry, ScriptSourceMeta } from '../types/catalog'

// ── Jinx pair ids ("charA::charB", sorted) ───────────────────────────────────

export function normalizeJinxPairId(id: string) {
  const parts = id
    .split('::')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length !== 2) {
    return null
  }

  return parts.sort((left, right) => left.localeCompare(right)).join('::')
}

export function normalizeScriptJinxOverride(entry: ScriptJinxOverride) {
  const normalizedId = typeof entry.id === 'string' ? normalizeJinxPairId(entry.id) : null
  const normalizedCharacters =
    Array.isArray(entry.characters) && entry.characters.length === 2
      ? [...entry.characters].map((characterId) => characterId.trim()).filter(Boolean)
      : []
  const pairId =
    normalizedId ??
    (normalizedCharacters.length === 2
      ? normalizedJinxPairIdFromCharacters(normalizedCharacters[0], normalizedCharacters[1])
      : null)

  if (!pairId) {
    return null
  }

  const [left, right] = pairId.split('::')

  const status: 'active' | 'inactive' = entry.status === 'inactive' ? 'inactive' : 'active'

  return {
    id: pairId,
    characters: [left, right] as [string, string],
    status,
    reason: entry.reason?.trim() ?? '',
    reason_zh: entry.reason_zh?.trim() ?? '',
  }
}

export function normalizedJinxPairIdFromCharacters(left: string, right: string) {
  return [left.trim(), right.trim()]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join('::')
}

// ── Script entries ───────────────────────────────────────────────────────────

export const isScriptMetaEntry = (entry: ScriptFileEntry): entry is ScriptMetaEntry =>
  typeof entry === 'object' && entry !== null && (entry as ScriptMetaEntry).id === '_meta'

export const isScriptCharacterItem = (entry: ScriptFileEntry): entry is ScriptCharacterItem =>
  typeof entry === 'object' && entry !== null && (entry as ScriptMetaEntry).id !== '_meta'

/** Extract per-character night position overrides from script JSON items. */
export function extractScriptNightPositions(
  items: ScriptCharacterItem[],
): Record<string, { firstNight?: number; otherNight?: number }> | undefined {
  const result: Record<string, { firstNight?: number; otherNight?: number }> = {}
  for (const item of items) {
    const fn = typeof item.firstNight === 'number' && item.firstNight > 0 ? item.firstNight : undefined
    const on = typeof item.otherNight === 'number' && item.otherNight > 0 ? item.otherNight : undefined
    if (fn !== undefined || on !== undefined) {
      result[item.id] = { ...(fn !== undefined ? { firstNight: fn } : {}), ...(on !== undefined ? { otherNight: on } : {}) }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

// ── Shared script-parsing helpers ────────────────────────────────────────────

/** Normalize the _meta entry from an array-format script (handles jinx overrides). */
export function normalizeScriptMetaEntry(data: ScriptFileEntry[]) {
  const meta = data.find(isScriptMetaEntry)
  if (!meta) return undefined
  return {
    ...meta,
    jinxes: Array.isArray(meta.jinxes)
      ? meta.jinxes
          .map(normalizeScriptJinxOverride)
          .filter((e): e is NonNullable<ReturnType<typeof normalizeScriptJinxOverride>> => e !== null)
      : undefined,
  }
}

/** Extract character id list + raw ScriptCharacterItem list from array-format data. */
export function extractScriptCharacters(data: ScriptFileEntry[]) {
  const scriptCharacterItems = data.filter(isScriptCharacterItem)
  const characters = data
    .filter((e): e is string | ScriptCharacterItem => typeof e === 'string' || isScriptCharacterItem(e))
    .map((e) => (typeof e === 'string' ? e : e.id))
  return { scriptCharacterItems, characters }
}

/** The publication a community script came from, when its _meta names one with a link. */
export function communityScriptSource(meta: ScriptMetaEntry | undefined): ScriptSourceMeta | undefined {
  const source = meta?.source
  return meta?.community && source && typeof source.url === 'string' && typeof source.name === 'string' ? source : undefined
}
