/**
 * Shape checks for library documents. They accept the app's own JSON
 * (EditableScript / CustomCharacter / GameRecord) and keep unknown fields, so
 * newer app versions can sync through older servers.
 */
import { SCRIPT_TEAMS } from '../../../src/core/script/validate'
import type { Team } from '../../../src/core/types/catalog'
import type { DocKind } from './store'

export const MAX_DOC_BYTES = 512 * 1024

export const KIND_BY_PATH: Record<string, DocKind> = { scripts: 'script', characters: 'character', records: 'record' }

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/** Returns a problem description, or null when the document is acceptable for `id`. */
export function checkDocument(kind: DocKind, id: string, data: unknown): string | null {
  if (!isObject(data)) return 'data must be a JSON object.'
  if (JSON.stringify(data).length > MAX_DOC_BYTES) return `data is larger than ${MAX_DOC_BYTES / 1024} KB.`
  switch (kind) {
    case 'script':
      if (data.slug !== id) return 'script.slug must equal the id in the URL.'
      if (typeof data.title !== 'string') return 'script.title must be a string.'
      if (!Array.isArray(data.characters) || !data.characters.every((c) => typeof c === 'string')) return 'script.characters must be an array of character ids.'
      return null
    case 'character':
      if (data.id !== id) return 'character.id must equal the id in the URL.'
      if (!id.startsWith('custom_')) return 'custom character ids must start with "custom_".'
      if (!isString(data.nameEn) || !isString(data.abilityEn)) return 'character.nameEn and character.abilityEn are required.'
      if (!SCRIPT_TEAMS.includes(data.team as Team)) return `character.team must be one of ${SCRIPT_TEAMS.join(', ')}.`
      return null
    case 'record':
      if (data.id !== id) return 'record.id must equal the id in the URL.'
      if (typeof data.endedAt !== 'number') return 'record.endedAt must be a number.'
      if (!Array.isArray(data.days)) return 'record.days must be an array.'
      return null
  }
}
