import fs from 'node:fs'
import path from 'node:path'

export const rootDir = process.cwd()
export const charactersDir = path.join(rootDir, 'assets', 'characters', 'individual')
export const jinxesFile = path.join(rootDir, 'assets', 'jinxes.json')
export const localeFiles = [
  { language: 'en', path: path.join(rootDir, 'assets', 'locales', 'en.json') },
  { language: 'zh', path: path.join(rootDir, 'assets', 'locales', 'zh.json') },
]
export const characterLanguages = ['en', 'zh']

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

export function fail(message) {
  throw new Error(message)
}

/**
 * Every character file (assets/characters/individual/<id>.json): the
 * revision list with a note each, a current_revision from it, and per
 * language (en / zh) the text of each revision, with `ability` equal to the
 * current one. A language may be absent altogether (Odyssey has no English
 * yet), but every revision needs text in at least one language.
 */
export function loadCharacterDefinitions() {
  const revisionMap = new Map()

  for (const fileName of fs.readdirSync(charactersDir).sort()) {
    if (!fileName.endsWith('.json')) continue
    const character = readJson(path.join(charactersDir, fileName))
    const id = character.id
    if (!id) fail(`Missing id in ${fileName}`)

    const { current_revision: currentRevision, revisions } = character
    if (!Array.isArray(revisions) || revisions.length === 0) fail(`Missing revisions list for character: ${id}`)
    if (!currentRevision) fail(`Missing current_revision for character: ${id}`)

    const revisionIds = revisions.map((revision) => {
      if (!revision || typeof revision !== 'object' || !revision.id) fail(`Invalid revision entry for character: ${id}`)
      if (typeof revision.note !== 'string') fail(`Missing revision note for character: ${id}.${revision.id}`)
      if (
        revision.jinx_updates !== undefined &&
        (typeof revision.jinx_updates !== 'object' || revision.jinx_updates === null || Array.isArray(revision.jinx_updates))
      ) {
        fail(`Invalid jinx_updates map for character: ${id}.${revision.id}`)
      }
      return revision.id
    })
    if (new Set(revisionIds).size !== revisionIds.length) fail(`Duplicate revision ids for character: ${id}`)
    if (!revisionIds.includes(currentRevision)) fail(`Character ${id} has current_revision ${currentRevision} not present in revisions list`)

    for (const revision of revisionIds) {
      if (!characterLanguages.some((language) => character[language]?.revisions?.[revision]?.trim())) {
        fail(`No ability text in any language for ${id} revision ${revision}`)
      }
    }
    for (const language of characterLanguages) {
      const copy = character[language]
      if (!copy?.revisions) continue
      const current = copy.revisions[currentRevision]
      if (typeof current !== 'string' || !current.trim()) fail(`Missing ${language} text for ${id} current revision ${currentRevision}`)
      if (copy.ability !== undefined && copy.ability !== current) {
        fail(`Current ability mismatch for ${language}.${id}: ability must match revisions.${currentRevision}`)
      }
    }

    revisionMap.set(id, { currentRevision, revisions, revisionIds })
  }

  return revisionMap
}

export function loadJinxDefinitions() {
  const data = readJson(jinxesFile)
  const jinxMap = new Map()

  for (const [id, definition] of Object.entries(data)) {
    if (!definition || typeof definition !== 'object') {
      continue
    }

    if (!Array.isArray(definition.characters) || definition.characters.length !== 2) {
      fail(`Invalid jinx characters for jinx definition: ${id}`)
    }

    if (!definition.current_revision) {
      fail(`Missing current_revision for jinx definition: ${id}`)
    }

    if (definition.status !== 'active' && definition.status !== 'inactive') {
      fail(`Missing or invalid status for jinx definition: ${id}`)
    }

    if (!Array.isArray(definition.revisions) || definition.revisions.length === 0) {
      fail(`Missing revisions list for jinx definition: ${id}`)
    }

    const revisionIds = definition.revisions.map((revision) => {
      if (!revision || typeof revision !== 'object' || !revision.id) {
        fail(`Invalid revision entry for jinx definition: ${id}`)
      }

      if (typeof revision.note !== 'string') {
        fail(`Missing revision note for jinx definition: ${id}.${revision.id}`)
      }

      if (revision.status !== 'active' && revision.status !== 'inactive') {
        fail(`Missing or invalid revision status for jinx definition: ${id}.${revision.id}`)
      }

      if (
        revision.triggered_by !== undefined &&
        (typeof revision.triggered_by !== 'object' ||
          revision.triggered_by === null ||
          Array.isArray(revision.triggered_by))
      ) {
        fail(`Invalid triggered_by map for jinx definition: ${id}.${revision.id}`)
      }

      return revision.id
    })

    if (!revisionIds.includes(definition.current_revision)) {
      fail(`Jinx definition ${id} has current_revision ${definition.current_revision} not present in revisions list`)
    }

    jinxMap.set(id, {
      currentRevision: definition.current_revision,
      status: definition.status,
      revisions: definition.revisions,
      revisionIds,
    })
  }

  return jinxMap
}

export function validateLocaleFile(language, filePath, jinxMap) {
  const locale = readJson(filePath)
  // Jinx text may live in a separate <lang>.jinxes.json sidecar file
  const jinxSidecar = filePath.replace('.json', '.jinxes.json')
  const localeJinxes = (locale.jinxes ?? (fs.existsSync(jinxSidecar) ? readJson(jinxSidecar) : {}))

  for (const [id, definition] of jinxMap.entries()) {
    const copy = localeJinxes[id]

    if (!copy) {
      fail(`Missing ${language} locale jinx entry: ${id}`)
    }

    if (!copy.revision) {
      fail(`Missing ${language} locale revision for jinx: ${id}`)
    }

    if (copy.revision !== definition.currentRevision) {
      fail(
        `Locale revision mismatch for ${language} jinx ${id}: expected ${definition.currentRevision}, got ${copy.revision}`,
      )
    }

    if (!copy.revisions || typeof copy.revisions !== 'object' || Array.isArray(copy.revisions)) {
      fail(`Missing ${language} locale revisions map for jinx: ${id}`)
    }

    for (const revision of definition.revisionIds) {
      const description = copy.revisions[revision]

      if (typeof description !== 'string' || description.trim() === '') {
        fail(`Missing ${language} locale description for jinx ${id} revision ${revision}`)
      }
    }

    const currentDescription = copy.revisions[copy.revision]

    if (copy.reason !== currentDescription) {
      fail(`Current jinx reason mismatch for ${language}.${id}: reason must match revisions.${copy.revision}`)
    }
  }
}

export function validateAllRevisions() {
  const revisionMap = loadCharacterDefinitions()
  const jinxMap = loadJinxDefinitions()

  for (const [characterId, definition] of revisionMap.entries()) {
    for (const revision of definition.revisions) {
      const updates = revision.jinx_updates ?? {}

      for (const [jinxId, jinxRevision] of Object.entries(updates)) {
        const jinxDefinition = jinxMap.get(jinxId)

        if (!jinxDefinition) {
          fail(`Unknown jinx reference in ${characterId}.${revision.id}: ${jinxId}`)
        }

        if (!jinxDefinition.revisionIds.includes(jinxRevision)) {
          fail(`Unknown jinx revision reference in ${characterId}.${revision.id}: ${jinxId}.${jinxRevision}`)
        }
      }
    }
  }

  for (const localeFile of localeFiles) {
    validateLocaleFile(localeFile.language, localeFile.path, jinxMap)
  }
}

/** The character's file and its parsed contents, or null. */
export function findCharacterDefinitionFile(characterId) {
  const filePath = path.join(charactersDir, `${characterId}.json`)
  return fs.existsSync(filePath) ? { filePath, data: readJson(filePath) } : null
}

export function getNextRevisionId(revisions) {
  const maxVersion = revisions.reduce((highest, revision) => {
    const revisionId =
      typeof revision === 'string' ? revision : revision?.id
    const match = /^v(\d+)$/i.exec(revisionId ?? '')
    if (!match) {
      return highest
    }

    return Math.max(highest, Number(match[1]))
  }, 0)

  return `v${maxVersion + 1}`
}
