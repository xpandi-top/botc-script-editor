/**
 * Community script import (scripts/import-scripts.mjs): script JSON from the
 * 钟楼剧本博物馆 netdisk → catalog ids + source metadata. Pure, so
 * src/__tests__/scriptImport.test.ts can run it on fixtures.
 *
 * Script tools export characters as ids ("washerwoman", "fortune_teller"),
 * as Chinese names, or as full objects (id, name, team, ability, image).
 * Each entry is resolved to a character in assets/characters/individual:
 * by id, by id ignoring case and punctuation, then by Chinese or English
 * name. An object whose ability differs from every revision of the
 * character it names is a homebrew variant, not that character. Anything
 * left over is a community character.
 */

import { cleanInline, parseGuidePage } from './guide-parse.mjs'

export const MUSEUM = {
  name: '钟楼剧本博物馆',
  index: 'https://www.bilibili.com/opus/882589412561518648',
}

export const looseId = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const CJK = /[\u3400-\u9fff]/
/** Name comparison key: width-folded, no spaces, dots, quotes or dashes. */
export const nameKey = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\s·・•.\-_'’"“”「」]/g, '')
/** Ability comparison key: text only, no punctuation, markup or reminder brackets. */
const textKey = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}]/gu, '')

function push(map, key, value) {
  if (!key) return
  const list = map.get(key) ?? []
  if (!list.includes(value)) list.push(value)
  map.set(key, list)
}

/** Lookup tables over the character files (assets/characters/individual/*.json). */
export function buildCharacterIndex(files) {
  const byId = new Map()
  const byLoose = new Map()
  const byName = new Map()
  for (const file of files) {
    if (!file?.id || !file.team) continue
    byId.set(file.id, file)
    push(byLoose, looseId(file.id), file.id)
    for (const name of [file.zh?.name, file.en?.name]) push(byName, nameKey(name), file.id)
  }
  return { byId, byLoose, byName }
}

/** Every ability text a character has had, both languages. */
function abilityTexts(file) {
  return [file.en?.ability, file.zh?.ability, ...Object.values(file.en?.revisions ?? {}), ...Object.values(file.zh?.revisions ?? {})]
    .filter((text) => typeof text === 'string' && text.trim())
}

function bigrams(text) {
  const out = new Map()
  for (let i = 0; i < text.length - 1; i++) {
    const gram = text.slice(i, i + 2)
    out.set(gram, (out.get(gram) ?? 0) + 1)
  }
  return out
}

/** Dice similarity of two texts' character bigrams, 0–1. */
export function textSimilarity(a, b) {
  const left = textKey(a)
  const right = textKey(b)
  if (!left || !right) return 0
  if (left === right) return 1
  const l = bigrams(left)
  const r = bigrams(right)
  let shared = 0
  for (const [gram, count] of l) shared += Math.min(count, r.get(gram) ?? 0)
  return (2 * shared) / (Math.max(left.length - 1, 1) + Math.max(right.length - 1, 1))
}

/** Same ability as some revision of the character (wording and punctuation may differ). */
export const SAME_ABILITY = 0.75
function sameAbility(file, text) {
  return abilityTexts(file).some((known) => textSimilarity(known, text) >= SAME_ABILITY)
}

const TEAMS = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric']
const normTeam = (team) => (team === 'traveller' ? 'traveler' : TEAMS.includes(team) ? team : undefined)

/**
 * One script entry → { input, id, status, via, ... }.
 * status: catalog (id is a local character), community (not in the
 * catalog), modified (names a local character but with another ability),
 * ambiguous (a name shared by several local characters).
 */
export function resolveEntry(entry, index) {
  const object = entry && typeof entry === 'object' ? entry : null
  const rawId = object ? object.id : entry
  const inline = object && (typeof object.name === 'string' || typeof object.ability === 'string')
    ? {
      name: typeof object.name === 'string' ? object.name.trim() : undefined,
      ability: typeof object.ability === 'string' ? object.ability.trim() : undefined,
      team: normTeam(object.team),
    }
    : undefined
  const input = String(rawId ?? inline?.name ?? '').trim()
  const base = { input, ...(inline ? { inline } : {}) }

  const byTeam = (ids) => (inline?.team ? ids.filter((id) => index.byId.get(id)?.team === inline.team) : ids)
  const candidates = []
  if (input && index.byId.has(input)) candidates.push([[input], 'id'])
  const loose = index.byLoose.get(looseId(input))
  if (loose && looseId(input)) candidates.push([loose, 'loose-id'])
  for (const name of [input, inline?.name]) {
    const ids = index.byName.get(nameKey(name))
    if (ids) candidates.push([ids, 'name'])
  }

  for (const [ids, via] of candidates) {
    const matching = ids.length > 1 ? byTeam(ids) : ids
    if (matching.length > 1) return { ...base, id: null, status: 'ambiguous', via, candidates: matching }
    if (matching.length === 0) continue
    const id = matching[0]
    const file = index.byId.get(id)
    if (inline?.ability && !sameAbility(file, inline.ability)) {
      return { ...base, id: null, status: 'modified', via, candidates: [id] }
    }
    return { ...base, id, status: 'catalog', via }
  }
  return { ...base, id: null, status: 'community' }
}

const isMeta = (entry) => entry && typeof entry === 'object' && entry.id === '_meta'

/**
 * A script file's parsed JSON → its meta entry and resolved characters.
 * Accepts the official array format and `{ characters: [...] }`.
 */
export function convertScript(data, index) {
  const entries = Array.isArray(data) ? data : Array.isArray(data?.characters) ? data.characters : null
  if (!entries) return { error: 'not a script (expected a JSON array or an object with "characters")' }
  const meta = entries.find(isMeta) ?? (Array.isArray(data) ? undefined : { id: '_meta', name: data.name ?? data.title, author: data.author })
  const characters = []
  const warnings = []
  const seen = new Set()
  for (const entry of entries) {
    if (isMeta(entry)) continue
    if (typeof entry !== 'string' && !(entry && typeof entry === 'object' && (typeof entry.id === 'string' || typeof entry.name === 'string'))) {
      warnings.push(`skipped entry ${JSON.stringify(entry)?.slice(0, 40)}`)
      continue
    }
    const resolved = resolveEntry(entry, index)
    const key = resolved.id ?? `?${resolved.input}`
    if (seen.has(key)) { warnings.push(`duplicate ${resolved.input}`); continue }
    seen.add(key)
    characters.push(resolved)
  }
  if (!characters.length) return { error: 'script has no characters' }
  return { meta, characters, warnings }
}

// ── Issues ───────────────────────────────────────────────────────────────────

/** Title comparison key: no 《》, versions ("v1.3", "V 6.1", "2.0"), punctuation or ".json". */
export function titleKey(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\.json$/i, '')
    .replace(/[《》【】（）()[\]]/g, ' ')
    .replace(/\s*[vV]\s?\d+(\.\d+)*\s*$/, '')
    .replace(/\s*\d+(\.\d+)+\s*$/, '')
    .replace(/[\s!！?？,，。.·・:：'"“”‘’]/g, '')
    .toLowerCase()
}

/** "第100期" / "100期" / "100_" / "100 " at the start of a file name. */
export function issueNumberFromName(fileName) {
  const base = String(fileName).replace(/^.*[\\/]/, '')
  const match = base.match(/第\s*(\d{1,4})\s*期/) ?? base.match(/(?:^|[^\d.])(\d{1,4})\s*期/) ?? base.match(/^(\d{1,4})(?=[\s._\-、，,])/)
  return match ? Number(match[1]) : undefined
}

/**
 * The museum issue a script file belongs to: by the issue number in its file
 * name, else by title (the file name or its _meta name). An issue with two
 * scripts ("善意谎言&双重加速") matches either part. Never guesses between
 * issues with the same title.
 */
export function matchIssue({ fileName, metaName }, issues) {
  const number = issueNumberFromName(fileName)
  if (number !== undefined) {
    const issue = issues.find((entry) => entry.issue === number)
    if (issue) return { issue, via: 'number' }
  }
  const keys = [metaName, String(fileName).replace(/^.*[\\/]/, '').replace(/^第?\s*\d{1,4}\s*期?[\s._\-、，,]*/, '')]
    .map(titleKey).filter(Boolean)
  for (const key of keys) {
    const exact = issues.filter((entry) => titleKey(entry.title) === key)
    if (exact.length === 1) return { issue: exact[0], via: 'title' }
    if (exact.length > 1) return { issue: null, candidates: exact }
    const part = issues.filter((entry) => /[&＆、/]/.test(entry.title) && entry.title.split(/[&＆、/]/).some((p) => titleKey(p) === key))
    if (part.length === 1) return { issue: part[0], via: 'title-part' }
  }
  return { issue: null }
}

// ── Output ───────────────────────────────────────────────────────────────────

/** Output slug: the issue number, with a suffix for an issue's second script. */
export function slugFor(issueNumber, taken) {
  const base = `museum-${issueNumber}`
  let slug = base
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
  return slug
}

const KEEP_META = ['name', 'name_zh', 'author', 'bootlegger', 'bootlegger_zh', 'jinxes', 'firstNight', 'otherNight', 'version', 'almanac', 'hideTitle']

/**
 * The file written to assets/scripts/community/: the official array format,
 * characters as local ids (community characters as the script's inline
 * definitions, when allowed), and `_meta.community` + `_meta.source` naming
 * the museum issue. Images (logo, background, character icons) are left out.
 */
export function buildScriptFile(converted, { issue, file }) {
  const { meta = {}, characters } = converted
  const mapping = new Map(characters.filter((c) => c.id).map((c) => [c.input, c.id]))
  const mapId = (id) => mapping.get(id) ?? id
  const kept = {}
  for (const key of KEEP_META) if (meta[key] !== undefined && meta[key] !== '') kept[key] = meta[key]
  for (const key of ['firstNight', 'otherNight']) if (Array.isArray(kept[key])) kept[key] = kept[key].map(mapId)
  if (Array.isArray(kept.jinxes)) {
    kept.jinxes = kept.jinxes.map((jinx) => ({
      ...jinx,
      ...(Array.isArray(jinx.characters) ? { characters: jinx.characters.map(mapId) } : {}),
      ...(typeof jinx.id === 'string' ? { id: jinx.id.split('::').map(mapId).sort().join('::') } : {}),
    }))
  }
  const { name, name_zh: nameZh, author, ...rest } = kept
  const title = String(name ?? '').trim() || issue.title
  const out = {
    id: '_meta',
    name: title,
    ...(nameZh ? { name_zh: nameZh } : CJK.test(title) ? { name_zh: title } : {}),
    author: typeof author === 'string' ? author.trim() : '',
    ...rest,
    community: true,
    source: {
      name: MUSEUM.name,
      issue: issue.issue,
      title: issue.title,
      url: issue.url,
      index: MUSEUM.index,
      file,
    },
  }
  const entries = characters.map((c) => {
    if (c.id) return c.id
    const { name, ability, team } = c.inline ?? {}
    return { id: c.input, ...(name ? { name } : {}), ...(team ? { team } : {}), ...(ability ? { ability } : {}) }
  })
  return [out, ...entries]
}

/** Sorted catalog ids of a script, for spotting a script that is already bundled. */
export const characterSetKey = (ids) => [...new Set(ids)].sort().join(',')

// ── BWIKI ────────────────────────────────────────────────────────────────────

const BWIKI_TEAMS = { 镇民: 'townsfolk', 外来者: 'outsider', 爪牙: 'minion', 恶魔: 'demon', 旅行者: 'traveler', 传奇角色: 'fabled', 奇遇角色: 'loric' }

/** A BWIKI character page (MediaWiki source) → what its 角色信息 and 角色能力 sections say. */
export function parseBwikiCharacter(wikitext) {
  const field = (label) => {
    const match = wikitext.match(new RegExp(`^[*\\s]*${label}[：:]\\s*(.+)$`, 'm'))
    const text = match ? cleanInline(match[1]) : ''
    return text || undefined
  }
  const type = field('角色类型')
  const info = {
    english: field('英文名'),
    collection: field('所属角色合集') ?? field('所属剧本'),
    author: field('创意来源'),
    team: type ? BWIKI_TEAMS[type.split(/[、，,\s]/)[0]] : undefined,
    ability: parseGuidePage(wikitext).ability || undefined,
  }
  return Object.fromEntries(Object.entries(info).filter(([, value]) => value))
}
