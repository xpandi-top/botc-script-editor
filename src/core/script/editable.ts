/**
 * Convert a script file (official array format or the legacy
 * `{ title, characters }` object) into the editor's EditableScript shape.
 * Used by the web importer (src/catalog.ts parseScriptFromData) and by the
 * API when it hands a generated script to the app as a share link.
 */
import type { EditableScript, ScriptFileEntry } from '../types/catalog'
import { extractScriptCharacters, extractScriptNightPositions, normalizeScriptMetaEntry } from './format'

export function toTitleCase(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export type EditableScriptOptions = {
  /** Slug to store (callers dedupe it against existing scripts). */
  slug: string
  /** Slug derived from the file name; used for the fallback title. */
  baseSlug: string
  sourceFile: string
  /** Edition for array-format scripts (legacy objects carry their own). */
  edition: string
}

export function editableScriptFromData(data: unknown, opts: EditableScriptOptions): EditableScript {
  const { slug, baseSlug, sourceFile, edition } = opts
  if (Array.isArray(data)) {
    const normalizedMeta = normalizeScriptMetaEntry(data as ScriptFileEntry[])
    const { scriptCharacterItems, characters } = extractScriptCharacters(data as ScriptFileEntry[])
    const nightPositions = extractScriptNightPositions(scriptCharacterItems)
    return {
      slug,
      title: normalizedMeta?.name ?? toTitleCase(baseSlug),
      titleZh: normalizedMeta?.name_zh ?? normalizedMeta?.name ?? toTitleCase(baseSlug),
      author: normalizedMeta?.author ?? '',
      meta: normalizedMeta ?? { id: '_meta', name: toTitleCase(baseSlug) },
      customCharacters: scriptCharacterItems.filter(
        (e) => typeof e.name === 'string' || typeof e.ability === 'string',
      ),
      edition,
      characters,
      sourceFile,
      ...(normalizedMeta?.version !== undefined ? { version: normalizedMeta.version } : {}),
      ...(normalizedMeta?.tags?.length ? { tags: normalizedMeta.tags } : {}),
      ...(nightPositions ? { scriptNightPositions: nightPositions } : {}),
    }
  }

  // Not null-safe on purpose: importers surface a malformed file as an error.
  const d = data as { title?: string; edition?: string; characters?: unknown; version?: string }
  return {
    slug,
    title: d.title ?? toTitleCase(baseSlug),
    titleZh: d.title ?? toTitleCase(baseSlug),
    author: '',
    meta: { id: '_meta', name: d.title ?? toTitleCase(baseSlug) },
    customCharacters: [],
    edition: d.edition ?? 'custom',
    characters: Array.isArray(d.characters) ? d.characters : [],
    sourceFile,
    ...(d.version !== undefined ? { version: d.version } : {}),
  }
}
