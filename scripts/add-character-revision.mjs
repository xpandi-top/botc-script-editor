import {
  fail,
  findCharacterDefinitionFile,
  getNextRevisionId,
  localeFiles,
  readJson,
  validateAllRevisions,
  writeJson,
} from './revision-helpers.mjs'

function printUsage() {
  console.log(`Usage:
  node scripts/add-character-revision.mjs <character_id> --en "English text" --zh "Chinese text" [--revision v2] [--note "Why this changed"]

Examples:
  node scripts/add-character-revision.mjs clockmaker --en "New English text" --zh "新的中文文本"
  node scripts/add-character-revision.mjs clockmaker --revision v2 --note "Experimental wording" --en "New English text" --zh "新的中文文本"`)
}

function parseArgs(argv) {
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

  const parsed = {
    characterId,
    revision: '',
    note: '',
    en: '',
    zh: '',
  }

  while (args.length > 0) {
    const flag = args.shift()
    const value = args.shift()

    if (!flag) {
      continue
    }

    if (!value) {
      fail(`Missing value for ${flag}`)
    }

    if (flag === '--revision') {
      parsed.revision = value.trim()
      continue
    }

    if (flag === '--note') {
      parsed.note = value
      continue
    }

    if (flag === '--en') {
      parsed.en = value
      continue
    }

    if (flag === '--zh') {
      parsed.zh = value
      continue
    }

    fail(`Unknown argument: ${flag}`)
  }

  if (!parsed.en.trim()) {
    fail('English text is required. Pass it with --en "..."')
  }

  if (!parsed.zh.trim()) {
    fail('Chinese text is required. Pass it with --zh "..."')
  }

  return parsed
}

const { characterId, revision, note, en, zh } = parseArgs(process.argv.slice(2))

const definitionMatch = findCharacterDefinitionFile(characterId)
if (!definitionMatch) {
  fail(`Character not found: ${characterId}`)
}

const { filePath: characterFilePath, data: characterData } = definitionMatch
const definition = characterData[characterId]
const existingRevisions = Array.isArray(definition.revisions) ? [...definition.revisions] : []
const nextRevision = revision || getNextRevisionId(existingRevisions)

if (existingRevisions.some((entry) => entry.id === nextRevision)) {
  fail(`Revision already exists for ${characterId}: ${nextRevision}`)
}

definition.revisions = [...existingRevisions, { id: nextRevision, note: note.trim() }]
definition.current_revision = nextRevision
writeJson(characterFilePath, characterData)

for (const localeFile of localeFiles) {
  const localeData = readJson(localeFile.path)
  const characterCopy = localeData.characters?.[characterId]

  if (!characterCopy) {
    fail(`Missing ${localeFile.language} locale character entry: ${characterId}`)
  }

  const nextAbility = localeFile.language === 'en' ? en : zh
  characterCopy.revision = nextRevision
  characterCopy.ability = nextAbility
  characterCopy.revisions = {
    ...(characterCopy.revisions ?? {}),
    [nextRevision]: nextAbility,
  }

  writeJson(localeFile.path, localeData)
}

validateAllRevisions()

console.log(`Added ${characterId} revision ${nextRevision}`)
