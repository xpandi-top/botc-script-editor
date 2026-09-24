/**
 * The text embedded for a character's semantic vector (P5, API worker):
 * both names, the team and both ability texts, so a query in either language
 * finds it. The worker stores a hash of this text with each vector, so a
 * character whose name or ability changes is re-embedded automatically.
 */
import type { CatalogCharacter } from '../catalog/types'

/** Placeholder the catalog uses when a character has no ability text. */
export const MISSING_ABILITY = 'No ability text available.'

const uniq = (values: Array<string | undefined>) => [...new Set(values.map((v) => v?.trim()).filter((v): v is string => !!v))]

/** Null when the character has no ability text to embed. */
export function characterEmbeddingText(c: Pick<CatalogCharacter, 'team' | 'name' | 'ability'>): string | null {
  const abilities = uniq([c.ability.en, c.ability.zh]).filter((a) => a !== MISSING_ABILITY)
  if (abilities.length === 0) return null
  return `${uniq([c.name.en, c.name.zh]).join(' / ')} (${c.team}): ${abilities.join('\n')}`
}
