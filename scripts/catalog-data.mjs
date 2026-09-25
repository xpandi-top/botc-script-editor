/**
 * Builds the portable catalog snapshot (CatalogData, src/core/catalog/types.ts)
 * from the asset files, resolving names, abilities, reminders and jinx
 * reasons the same way src/catalog.ts does for a user with no overrides.
 * src/__tests__/coreCatalog.test.ts checks the two stay equivalent.
 *
 * Used by scripts/build-catalog.mjs (CLI) and by tests.
 */
import fs from 'node:fs'
import path from 'node:path'

const TEAM_ORDER = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric']
const EDITION_LABEL_KEYS = ['tb', 'snv', 'bmr', 'custom', 'experimental', 'huadengchushang', 'shanyuyulai', 'odyssey', 'fabled', 'loric']
const LANGS = ['en', 'zh']
const other = (lang) => (lang === 'en' ? 'zh' : 'en')

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const toTitleCase = (value) => value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

function listJson(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
}

function pickStringList(...candidates) {
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    const cleaned = candidate.filter((value) => typeof value === 'string')
    if (cleaned.length > 0) return cleaned
  }
  return undefined
}

/** @param {string} root repository root */
export function buildCatalogData(root = process.cwd()) {
  const assets = path.join(root, 'assets')
  const charDir = path.join(assets, 'characters', 'individual')
  const files = listJson(charDir).map((f) => readJson(path.join(charDir, f)))

  // Per-language locale blocks from the character files (last file wins, like the app).
  const locale = { en: {}, zh: {} }
  for (const file of files) {
    if (!file?.id) continue
    if (file.en) locale.en[file.id] = file.en
    if (file.zh) locale.zh[file.id] = file.zh
  }

  const icons = new Map()
  for (const f of fs.readdirSync(path.join(assets, 'icons'))) {
    const match = f.match(/^(.+)\.(png|jpe?g|webp|svg)$/i)
    if (match && !icons.has(match[1])) icons.set(match[1], f)
  }

  const nightOrderFile = readJson(path.join(assets, 'characters', 'night-order.json'))
  const nightOrder = { first: nightOrderFile.first_night ?? [], other: nightOrderFile.other_nights ?? [] }

  const resolveText = (id, field, fallbackText) => Object.fromEntries(LANGS.map((lang) => [
    lang,
    locale[lang][id]?.[field] || locale[other(lang)][id]?.[field] || fallbackText(id),
  ]))

  const seen = new Set()
  const characters = []
  for (const file of files) {
    if (!file?.id || seen.has(file.id)) continue
    if (!file.team || !TEAM_ORDER.includes(file.team) || !file.edition) continue
    seen.add(file.id)
    const id = file.id
    const baseReminders = pickStringList(file.reminders, file.en?.reminders, file.zh?.reminders) ?? []
    const baseGlobal = pickStringList(file.remindersGlobal, file.en?.remindersGlobal, file.zh?.remindersGlobal) ?? []
    const nightText = (key) => {
      const top = typeof file[key] === 'string' && file[key] ? file[key] : undefined
      const en = file.en?.[key] ?? top
      const zh = file.zh?.[key] ?? en
      return en || zh ? { ...(en ? { en } : {}), ...(zh ? { zh } : {}) } : undefined
    }
    const flavor = {}
    for (const lang of LANGS) if (locale[lang][id]?.flavor) flavor[lang] = locale[lang][id].flavor
    const firstNight = nightOrder.first.indexOf(id) + 1
    const otherNight = nightOrder.other.indexOf(id) + 1
    const character = {
      id,
      team: file.team,
      edition: file.edition,
      name: resolveText(id, 'name', toTitleCase),
      ability: resolveText(id, 'ability', () => 'No ability text available.'),
      reminders: Object.fromEntries(LANGS.map((lang) => [lang, locale[lang][id]?.reminders ?? baseReminders])),
      remindersGlobal: Object.fromEntries(LANGS.map((lang) => [lang, locale[lang][id]?.remindersGlobal ?? baseGlobal])),
    }
    if (Object.keys(flavor).length > 0) character.flavor = flavor
    if (typeof file.setup === 'boolean') character.setup = file.setup
    const firstNightReminder = nightText('firstNightReminder')
    const otherNightReminder = nightText('otherNightReminder')
    if (firstNightReminder) character.firstNightReminder = firstNightReminder
    if (otherNightReminder) character.otherNightReminder = otherNightReminder
    if (firstNight > 0) character.firstNight = firstNight
    if (otherNight > 0) character.otherNight = otherNight
    if (icons.has(id)) character.icon = icons.get(id)
    characters.push(character)
  }
  characters.sort((a, b) => {
    const teamCompare = TEAM_ORDER.indexOf(a.team) - TEAM_ORDER.indexOf(b.team)
    return teamCompare !== 0 ? teamCompare : a.name.en.localeCompare(b.name.en)
  })

  const jinxFile = readJson(path.join(assets, 'jinxes.json'))
  const jinxLocale = {
    en: readJson(path.join(assets, 'locales', 'en.jinxes.json')),
    zh: readJson(path.join(assets, 'locales', 'zh.jinxes.json')),
  }
  const jinxes = Object.values(jinxFile)
    .filter((j) => Array.isArray(j.characters) && j.characters.length === 2)
    .map((j) => ({
      id: j.id,
      characters: [j.characters[0], j.characters[1]],
      status: j.status === 'inactive' ? 'inactive' : 'active',
      reason: Object.fromEntries(LANGS.map((lang) => {
        const preferred = jinxLocale[lang][j.id]
        const copy = preferred?.reason ? preferred : jinxLocale[other(lang)][j.id]
        return [lang, copy?.reason ?? '']
      })),
    }))

  // Bundled scripts, then community ones (assets/scripts/community/, like src/catalog.ts).
  const scriptDir = path.join(assets, 'scripts')
  const communityDir = path.join(scriptDir, 'community')
  const scriptPaths = [
    ...listJson(scriptDir).map((f) => path.join(scriptDir, f)),
    ...(fs.existsSync(communityDir) ? listJson(communityDir).map((f) => path.join(communityDir, f)) : []),
  ]
  const scripts = scriptPaths.map((file) => {
    const data = readJson(file)
    const sourceFile = path.basename(file)
    const base = sourceFile.replace('.json', '')
    return { slug: Array.isArray(data) ? base : (data.slug ?? base), sourceFile, data }
  })

  const ui = { en: readJson(path.join(assets, 'locales', 'en.json')).ui ?? {}, zh: readJson(path.join(assets, 'locales', 'zh.json')).ui ?? {} }
  const credits = readJson(path.join(assets, 'editions.json'))
  const editionIds = [...new Set([...EDITION_LABEL_KEYS, ...Object.keys(credits), ...characters.map((c) => c.edition)])]
  const editions = editionIds.map((id) => {
    const credit = credits[id]
    const edition = {
      id,
      name: Object.fromEntries(LANGS.map((lang) => [lang, ui[lang][id] ?? credit?.[`name_${lang}`] ?? id])),
    }
    if (credit?.author_en || credit?.author_zh) {
      edition.author = { ...(credit.author_en ? { en: credit.author_en } : {}), ...(credit.author_zh ? { zh: credit.author_zh } : {}) }
    }
    if (credit?.source) edition.source = credit.source
    if (credit?.community) edition.community = true
    return edition
  })

  return { version: 1, generatedAt: new Date().toISOString(), characters, jinxes, nightOrder, scripts, editions }
}
