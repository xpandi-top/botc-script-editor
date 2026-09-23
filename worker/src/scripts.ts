/**
 * Script inputs shared by the REST routes and MCP tools: resolve a bundled
 * script or caller-supplied JSON, build a new script draft, and convert it
 * into the app's EditableScript for share links.
 */
import type { CatalogIndex } from '../../src/core/catalog'
import { analyzeScript } from '../../src/core/script/analyze'
import { editableScriptFromData } from '../../src/core/script/editable'
import { validateScript, type ScriptValidationResult } from '../../src/core/script/validate'
import type { EditableScript, ScriptCharacterItem } from '../../src/core/types/catalog'

export class InputError extends Error {}

/** A bundled script by slug, or script JSON (array/object, or a JSON string of either). */
export type ScriptInput = { slug?: string; script?: unknown }

export function resolveScriptData(catalog: CatalogIndex, input: ScriptInput): unknown {
  if (input.slug) {
    const bundled = catalog.getScript(input.slug)
    if (!bundled) throw new InputError(`Unknown script "${input.slug}". Use list_scripts / GET /v1/scripts for valid slugs.`)
    return bundled.data
  }
  if (input.script === undefined) throw new InputError('Provide either "slug" or "script".')
  if (typeof input.script === 'string') {
    try {
      return JSON.parse(input.script)
    } catch {
      throw new InputError('"script" is a string but not valid JSON.')
    }
  }
  return input.script
}

export function slugify(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || 'script'
}

export type DraftInput = {
  name: string
  name_zh?: string
  author?: string
  /** Catalog ids, or inline custom characters in the official format. */
  characters: Array<string | ScriptCharacterItem>
}

/** Official-format script JSON for a new draft. */
export function buildDraftScript(draft: DraftInput): unknown[] {
  if (!draft.name?.trim()) throw new InputError('"name" is required.')
  return [
    { id: '_meta', name: draft.name.trim(), ...(draft.name_zh ? { name_zh: draft.name_zh } : {}), author: draft.author ?? '' },
    ...draft.characters,
  ]
}

export function toEditableScript(data: unknown, name: string): EditableScript {
  const slug = slugify(name)
  return editableScriptFromData(data, { slug, baseSlug: slug, sourceFile: `${slug}.json`, edition: 'custom' })
}

export function checkScript(catalog: CatalogIndex, data: unknown): ScriptValidationResult {
  return validateScript(data, catalog.validationCatalog)
}

export function analyze(catalog: CatalogIndex, data: unknown) {
  const validation = checkScript(catalog, data)
  // Inline custom characters count by their declared team.
  const inline = new Map(validation.characters.filter((c) => c.source === 'script' && c.team).map((c) => [c.id, { id: c.id, team: c.team! }]))
  const lookup = { getCharacter: (id: string) => catalog.getCharacter(id) ?? inline.get(id), jinxesAmong: (ids: string[]) => catalog.jinxesAmong(ids) }
  return { validation, analysis: analyzeScript(validation.characters.map((c) => c.id), lookup) }
}
