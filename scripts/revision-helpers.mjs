import fs from 'node:fs'
import path from 'node:path'

export const rootDir = process.cwd()
export const charactersDir = path.join(rootDir, 'assets', 'characters')
export const jinxesFile = path.join(rootDir, 'assets', 'jinxes.json')
export const localeFiles = [
  { language: 'en', path: path.join(rootDir, 'assets', 'locales', 'en.json') },
  { language: 'zh', path: path.join(rootDir, 'assets', 'locales', 'zh.json') },
]

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

export function fail(message) {
  throw new Error(message)
}

export function loadCharacterDefinitions() {
  const revisionMap = new Map()

  for (const fileName of fs.readdirSync(charactersDir)) {
    if (!fileName.endsWith('.json') || fileName === 'night-order.json') {
      continue
    }

    const filePath = path.join(charactersDir, fileName)
    const data = readJson(filePath)

    for (const [id, definition] of Object.entries(data)) {
      if (!definition || typeof definition !== 'object') {
        continue
      }

      const currentRevision = definition.current_revision
      const revisions = definition.revisions

      if (!currentRevision) {
        fail(`Missing current_revision for character definition: ${id}`)
      }

      if (!Array.isArray(revisions) || revisions.length === 0) {
        fail(`Missing revisions list for character definition: ${id}`)
      }

      const revisionIds = revisions.map((revision) => {
        if (!revision || typeof revision !== 'object' || !revision.id) {
          fail(`Invalid revision entry for character definition: ${id}`)
        }

        if (typeof revision.note !== 'string') {
          fail(`Missing revision note for character definition: ${id}.${revision.id}`)
        }

        if (
          revision.jinx_updates !== undefined &&
          (typeof revision.jinx_updates !== 'object' ||
            revision.jinx_updates === null ||
            Array.isArray(revision.jinx_updates))
        ) {
          fail(`Invalid jinx_updates map for character definition: ${id}.${revision.id}`)
        }

        return revision.id
      })

      if (!revisionIds.includes(currentRevision)) {
        fail(
          `Character definition ${id} has current_revision ${currentRevision} not present in revisions list`,
        )
      }

      revisionMap.set(id, {
        currentRevision,
        revisions,
        revisionIds,
      })
    }
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

export function validateLocaleFile(language, filePath, revisionMap, jinxMap) {
  const locale = readJson(filePath)
  const characters = locale.characters ?? {}
  const localeJinxes = locale.jinxes ?? {}

  for (const [id, definition] of revisionMap.entries()) {
    const copy = characters[id]

    if (!copy) {
      fail(`Missing ${language} locale character entry: ${id}`)
    }

    if (!copy.revision) {
      fail(`Missing ${language} locale revision for character: ${id}`)
    }

    if (copy.revision !== definition.currentRevision) {
      fail(
        `Locale revision mismatch for ${language}.${id}: expected ${definition.currentRevision}, got ${copy.revision}`,
      )
    }

    if (!copy.revisions || typeof copy.revisions !== 'object' || Array.isArray(copy.revisions)) {
      fail(`Missing ${language} locale revisions map for character: ${id}`)
    }

    for (const revision of definition.revisionIds) {
      const description = copy.revisions[revision]

      if (typeof description !== 'string' || description.trim() === '') {
        fail(`Missing ${language} locale description for ${id} revision ${revision}`)
      }
    }

    const currentDescription = copy.revisions[copy.revision]

    if (copy.ability !== currentDescription) {
      fail(
        `Current ability mismatch for ${language}.${id}: ability must match revisions.${copy.revision}`,
      )
    }
  }

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
    validateLocaleFile(localeFile.language, localeFile.path, revisionMap, jinxMap)
  }
}

export function findCharacterDefinitionFile(characterId) {
  for (const fileName of fs.readdirSync(charactersDir)) {
    if (!fileName.endsWith('.json') || fileName === 'night-order.json') {
      continue
    }

    const filePath = path.join(charactersDir, fileName)
    const data = readJson(filePath)

    if (data[characterId]) {
      return { filePath, data }
    }
  }

  return null
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
