/**
 * Community (民间) character packs from a published script JSON (Bloodstar
 * Clocktica exports: one object per character with id, name, team, ability,
 * image, reminders, night reminders and night positions). Pure, so
 * src/__tests__/packImport.test.ts can run it on fixtures; the fetching and
 * writing is scripts/import-packs.mjs, the list of packs
 * scripts/community-packs.json.
 *
 * A pack becomes one edition (`community-<key>`): character files in the
 * format of assets/characters/individual, ids `<key>_<source id>`, a credit
 * in assets/editions.json marked `community`, and its night wakers in
 * assets/characters/night-order.json.
 */

import { SAME_ABILITY, textSimilarity } from './script-import.mjs'

const TEAMS = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric']
export const teamOf = (team) => (team === 'traveller' ? 'traveler' : TEAMS.includes(team) ? team : null)

const isMeta = (entry) => entry && typeof entry === 'object' && entry.id === '_meta'

/** The pack's characters (entries with a known team and a name), and its _meta. */
export function packEntries(data) {
  const list = Array.isArray(data) ? data : []
  const meta = list.find(isMeta) ?? {}
  const characters = list.filter((e) => e && typeof e === 'object' && !isMeta(e) && teamOf(e.team) && typeof e.name === 'string' && e.name.trim())
  return { meta, characters }
}

/**
 * Local id for a source id: Bloodstar appends the project name ("hagrid_hp2_2",
 * "1_sjjl5", "_sjjl5"), which is dropped; what is left is kept lowercase
 * alphanumeric, or "0" when nothing is left.
 */
export function localId(key, sourceId, projectSuffix) {
  let base = String(sourceId)
  if (projectSuffix && base.toLowerCase().endsWith(`_${projectSuffix.toLowerCase()}`)) base = base.slice(0, -(projectSuffix.length + 1))
  base = base.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${key}_${base || '0'}`
}

/** The suffix Bloodstar adds to every id of a project: the longest "_…" all ids share. */
export function commonSuffix(ids) {
  if (!ids.length) return ''
  const parts = ids.map((id) => String(id).toLowerCase().split('_'))
  const suffix = []
  for (let i = 1; ; i++) {
    const part = parts[0].at(-i)
    if (part === undefined || !parts.every((p) => p.length > i && p.at(-i) === part)) break
    suffix.unshift(part)
  }
  return suffix.join('_')
}

const clean = (text) => (typeof text === 'string' ? text.replace(/\r\n/g, '\n').trim() : '')
const tokens = (list) => (Array.isArray(list) ? list.map(clean).filter(Boolean) : [])

/** One language block of a character file from a script entry. */
function languageBlock(entry) {
  const ability = clean(entry.ability)
  const block = {
    name: clean(entry.name),
    ...(ability ? { ability, revisions: { v1: ability } } : {}),
    ...(clean(entry.flavor) ? { flavor: clean(entry.flavor) } : {}),
    ...(clean(entry.firstNightReminder) ? { firstNightReminder: clean(entry.firstNightReminder) } : {}),
    ...(clean(entry.otherNightReminder) ? { otherNightReminder: clean(entry.otherNightReminder) } : {}),
    ...(tokens(entry.reminders).length ? { reminders: tokens(entry.reminders) } : {}),
    ...(tokens(entry.remindersGlobal).length ? { remindersGlobal: tokens(entry.remindersGlobal) } : {}),
  }
  return block
}

/**
 * Character file for a pack entry. `language` is the entry's language;
 * `translation` (optional) is the same character in the other language.
 */
export function characterFile(entry, { id, edition, language, translation }) {
  const other = language === 'en' ? 'zh' : 'en'
  const own = languageBlock(entry)
  const out = {
    id,
    team: teamOf(entry.team),
    edition,
    current_revision: 'v1',
    setup: entry.setup === true,
    ...(own.reminders ? { reminders: own.reminders } : {}),
    ...(own.remindersGlobal ? { remindersGlobal: own.remindersGlobal } : {}),
    revisions: [{ id: 'v1', note: '' }],
  }
  const blocks = { [language]: own }
  if (translation) blocks[other] = languageBlock(translation)
  for (const lang of ['en', 'zh']) if (blocks[lang]) out[lang] = blocks[lang]
  return out
}

// ── Translations ─────────────────────────────────────────────────────────────

/**
 * Pair a pack with its translation listed in the same order (a translated
 * copy of the project). Returns source id → translated entry, and the
 * positions whose teams differ (a sign the orders do not match).
 */
export function alignByOrder(source, translated) {
  const pairs = new Map()
  const mismatches = []
  source.forEach((entry, i) => {
    const other = translated[i]
    if (!other || teamOf(other.team) !== teamOf(entry.team)) mismatches.push(entry.id)
    else pairs.set(entry.id, other)
  })
  return { pairs, mismatches }
}

/**
 * Pair a pack with translations given as a map (scripts/community-packs/*.json):
 * source id → { name, ability, reminders, … }. Ids missing from the map stay
 * untranslated; map entries naming no character are reported.
 */
export function alignByMap(source, map) {
  const pairs = new Map()
  for (const entry of source) if (map[entry.id]) pairs.set(entry.id, { team: entry.team, ...map[entry.id] })
  const unknown = Object.keys(map).filter((id) => !id.startsWith('$') && !source.some((e) => e.id === id))
  return { pairs, unknown }
}

// ── Night order ──────────────────────────────────────────────────────────────

/**
 * Put a pack's night wakers into the shipped night order. The pack's own
 * positions only order its characters among themselves, so they go in as one
 * block in that order, before an official anchor: on the first night before
 * the Washerwoman (after the official setup, poison and protection steps,
 * before the information roles), on other nights before the Imp (among the
 * official poison, protection and kill steps). A script can still reorder
 * them. Characters already listed stay where they are. `order` (position
 * values, spaced by 10) is rebuilt and the pack's own numbers kept in
 * `source_order`, as for Odyssey.
 */
export const NIGHT_ANCHORS = { first_night: 'washerwoman', other_nights: 'imp' }

export function insertNightOrder(nightOrder, wakers) {
  const out = structuredClone(nightOrder)
  const nights = [['first_night', 'firstNight'], ['other_nights', 'otherNight']]
  for (const [key, field] of nights) {
    const list = out[key]
    const block = wakers
      .filter((w) => typeof w[field] === 'number' && w[field] > 0 && !list.includes(w.id))
      .sort((a, b) => a[field] - b[field])
      .map((w) => w.id)
    const at = list.indexOf(NIGHT_ANCHORS[key])
    list.splice(at === -1 ? list.length : at, 0, ...block)
    out.order = out.order ?? {}
    out.order[key] = Object.fromEntries(list.map((id, i) => [id, (i + 1) * 10]))
    out.source_order = out.source_order ?? {}
    out.source_order[key] = { ...out.source_order[key] }
    for (const w of wakers) if (typeof w[field] === 'number' && w[field] > 0) out.source_order[key][w.id] = w[field]
  }
  return out
}

/** Remove a pack's characters from the night order (before re-importing it). */
export function removeFromNightOrder(nightOrder, ids) {
  const drop = new Set(ids)
  const out = structuredClone(nightOrder)
  for (const key of ['first_night', 'other_nights']) {
    out[key] = out[key].filter((id) => !drop.has(id))
    if (out.order?.[key]) out.order[key] = Object.fromEntries(out[key].map((id, i) => [id, (i + 1) * 10]))
    if (out.source_order?.[key]) out.source_order[key] = Object.fromEntries(Object.entries(out.source_order[key]).filter(([id]) => !drop.has(id)))
  }
  return out
}

// ── Credit ───────────────────────────────────────────────────────────────────

export const COMMUNITY_TERMS = {
  terms_en: 'Community (fan-made) characters, not official. © their authors; credit the pack and link its source.',
  terms_zh: '民间自制角色，非官方。版权归原作者；使用时请注明角色包与来源链接。',
}

/** The assets/editions.json entry for a pack. */
export function editionCredit(pack) {
  return {
    id: pack.edition,
    name_en: pack.name_en,
    name_zh: pack.name_zh,
    ...(pack.author_en ? { author_en: pack.author_en } : {}),
    ...(pack.author_zh ? { author_zh: pack.author_zh } : {}),
    source: pack.source,
    requiresAttribution: true,
    community: true,
    ...COMMUNITY_TERMS,
  }
}

/**
 * Pack entries that copy a character the app already has (same name, same
 * ability in some revision): source id → local id. They are left out of the
 * pack; scripts use the existing character.
 */
export function existingCopies(characters, existing) {
  const byName = new Map()
  for (const c of existing) for (const name of [c.en?.name, c.zh?.name]) if (name) byName.set(name.toLowerCase(), [...(byName.get(name.toLowerCase()) ?? []), c])
  const texts = (c) => [c.en?.ability, c.zh?.ability, ...Object.values(c.en?.revisions ?? {}), ...Object.values(c.zh?.revisions ?? {})].filter(Boolean)
  const copies = new Map()
  for (const entry of characters) {
    const match = (byName.get(String(entry.name).toLowerCase()) ?? []).find((c) => texts(c).some((t) => textSimilarity(t, entry.ability) >= SAME_ABILITY))
    if (match) copies.set(entry.id, match.id)
  }
  return copies
}

/**
 * Names a pack shares with characters outside it (the app tells same-named
 * characters apart by edition, but a clash is worth knowing about).
 */
export function nameClashes(files, existing) {
  const names = new Map()
  for (const c of existing) for (const name of [c.en?.name, c.zh?.name]) if (name) names.set(name.toLowerCase(), c.id)
  return files.flatMap((f) => [f.en?.name, f.zh?.name].filter(Boolean)
    .filter((name) => names.has(name.toLowerCase()) && names.get(name.toLowerCase()) !== f.id)
    .map((name) => `${f.id} "${name}" = ${names.get(name.toLowerCase())}`))
}
