import {
  characterLanguages,
  fail,
  findCharacterDefinitionFile,
  getNextRevisionId,
  validateAllRevisions,
  writeJson,
} from './revision-helpers.mjs'

function printUsage() {
  console.log(`Usage:
  node scripts/add-character-revision.mjs <character_id> [--en "English text"] [--zh "Chinese text"] [--revision v2] [--note "Why this changed"] [--keep-current]

Adds a revision to assets/characters/individual/<character_id>.json and makes
it the current one (--keep-current adds it as an alternative instead). A
language left out keeps its current text for the new revision, so a
translation fix passes only --zh.

Examples:
  node scripts/add-character-revision.mjs clockmaker --en "New English text" --zh "新的中文文本"
  node scripts/add-character-revision.mjs mayor --revision v2026-09 --note "集石官方中文译文" --zh "……"`)
}

/** Parse the command line; exported for tests. */
export function parseArgs(argv) {
  const args = [...argv]
  if (args[0] === '--help' || args[0] === '-h') {
    printUsage()
    process.exit(0)
  }

  const characterId = args.shift()
  if (!characterId || characterId.startsWith('-')) {
    printUsage()
    fail('Character id is required.')
  }

  const parsed = { characterId, revision: '', note: '', en: '', zh: '', keepCurrent: false }
  while (args.length > 0) {
    const flag = args.shift()
    if (flag === '--keep-current') { parsed.keepCurrent = true; continue }
    const value = args.shift()
    if (!value) fail(`Missing value for ${flag}`)
    if (flag === '--revision') parsed.revision = value.trim()
    else if (flag === '--note') parsed.note = value
    else if (flag === '--en') parsed.en = value
    else if (flag === '--zh') parsed.zh = value
    else fail(`Unknown argument: ${flag}`)
  }
  if (!parsed.en.trim() && !parsed.zh.trim()) fail('Pass the new text with --en "..." and/or --zh "..."')
  return parsed
}

/**
 * The character with a new revision: `texts` per language (a missing one
 * copies the current revision's text), made current unless `keepCurrent`.
 */
export function addRevision(character, { revision, note = '', texts, keepCurrent = false }) {
  const revisions = Array.isArray(character.revisions) ? [...character.revisions] : []
  const id = revision || getNextRevisionId(revisions)
  if (revisions.some((entry) => entry.id === id)) fail(`Revision already exists for ${character.id}: ${id}`)
  const current = character.current_revision
  const next = { ...character, revisions: [...revisions, { id, note: note.trim() }] }
  if (!keepCurrent) next.current_revision = id
  for (const language of characterLanguages) {
    const copy = character[language]
    const text = texts[language]?.trim() || copy?.revisions?.[current]
    if (!text) continue
    const updated = { ...copy, revisions: { ...(copy?.revisions ?? {}), [id]: text } }
    if (!keepCurrent) updated.ability = text
    next[language] = updated
  }
  return next
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { characterId, revision, note, en, zh, keepCurrent } = parseArgs(process.argv.slice(2))
  const match = findCharacterDefinitionFile(characterId)
  if (!match) fail(`Character not found: ${characterId}`)
  const next = addRevision(match.data, { revision, note, texts: { en, zh }, keepCurrent })
  writeJson(match.filePath, next)
  validateAllRevisions()
  const added = next.revisions[next.revisions.length - 1].id
  console.log(`Added ${characterId} revision ${added}${keepCurrent ? ' (current stays ' + next.current_revision + ')' : ' (now current)'}`)
}
