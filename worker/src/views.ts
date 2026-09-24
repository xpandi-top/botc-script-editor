/**
 * Response shapes. Every localized field is returned for both languages
 * unless the caller picks one with `lang` (en | zh).
 */
import type { CatalogCharacter, CatalogIndex, CatalogJinx } from '../../src/core/catalog'

export type Lang = 'en' | 'zh'

export function parseLang(value: string | undefined | null): Lang | undefined {
  return value === 'en' || value === 'zh' ? value : undefined
}

export function characterView(c: CatalogCharacter, lang?: Lang) {
  if (!lang) return c
  return {
    id: c.id,
    team: c.team,
    edition: c.edition,
    name: c.name[lang],
    ability: c.ability[lang],
    ...(c.flavor?.[lang] ?? c.flavor?.en ? { flavor: c.flavor?.[lang] ?? c.flavor?.en } : {}),
    reminders: c.reminders[lang],
    remindersGlobal: c.remindersGlobal[lang],
    ...(c.setup !== undefined ? { setup: c.setup } : {}),
    ...(c.firstNight ? { firstNight: c.firstNight, firstNightReminder: c.firstNightReminder?.[lang] } : {}),
    ...(c.otherNight ? { otherNight: c.otherNight, otherNightReminder: c.otherNightReminder?.[lang] } : {}),
    ...(c.icon ? { icon: c.icon } : {}),
  }
}

/**
 * One page of matches with the true total. `count` is kept for older
 * clients and equals `returned` (the page size), not the total.
 */
export function pageOf<T>(all: T[], offset: number, limit: number) {
  const items = all.slice(offset, offset + limit)
  const next = offset + items.length
  return { totalMatches: all.length, returned: items.length, offset, nextCursor: next < all.length ? String(next) : null, count: items.length, items }
}

/** Editions with exact character counts per team, straight from the catalog. */
export function editionSummaries(catalog: CatalogIndex, lang?: Lang) {
  return catalog.data.editions.map((e) => {
    const members = catalog.data.characters.filter((c) => c.edition === e.id)
    const teamCounts: Record<string, number> = {}
    for (const c of members) teamCounts[c.team] = (teamCounts[c.team] ?? 0) + 1
    return {
      id: e.id,
      name: lang ? e.name[lang] : e.name,
      ...(e.author ? { author: lang ? e.author[lang] ?? e.author.en ?? e.author.zh : e.author } : {}),
      ...(e.source ? { source: e.source } : {}),
      characterCount: members.length,
      teamCounts,
    }
  })
}

export function jinxView(j: CatalogJinx, lang?: Lang) {
  return lang ? { id: j.id, characters: j.characters, status: j.status, reason: j.reason[lang] } : j
}

const isPlaceholder = (id: string) => /^[A-Z_]+$/.test(id)

/**
 * Wake order for a set of characters, with the standing placeholders
 * (Dusk, Minion/Demon info on the first night, Dawn) kept in place.
 */
export function nightOrderView(catalog: CatalogIndex, ids: string[], night: 'first' | 'other', lang: Lang = 'en') {
  const set = new Set(ids)
  const order = night === 'first' ? catalog.data.nightOrder.first : catalog.data.nightOrder.other
  return order
    .filter((id) => set.has(id) || isPlaceholder(id))
    .map((id) => {
      const c = catalog.getCharacter(id)
      if (!c) return { id, placeholder: true }
      const reminder = night === 'first' ? c.firstNightReminder?.[lang] : c.otherNightReminder?.[lang]
      return { id, name: c.name[lang], team: c.team, ...(reminder ? { reminder } : {}) }
    })
}

/** What to print for a script: one token per character plus its reminder tokens. */
export function tokenManifest(catalog: CatalogIndex, ids: string[], lang: Lang = 'en') {
  const characters = ids.map((id) => catalog.getCharacter(id)).filter((c): c is CatalogCharacter => !!c)
  const reminderTokens = new Map<string, { label: string; count: number; characterId: string; global: boolean }>()
  for (const c of characters) {
    const add = (label: string, global: boolean) => {
      const key = `${c.id}:${label}:${global}`
      const existing = reminderTokens.get(key)
      if (existing) existing.count++
      else reminderTokens.set(key, { label, count: 1, characterId: c.id, global })
    }
    for (const label of c.reminders[lang]) add(label, false)
    for (const label of c.remindersGlobal[lang]) add(label, true)
  }
  return {
    characterTokens: characters.map((c) => ({ id: c.id, name: c.name[lang], team: c.team, ...(c.icon ? { icon: c.icon } : {}) })),
    reminderTokens: [...reminderTokens.values()],
    totals: { characterTokens: characters.length, reminderTokens: [...reminderTokens.values()].reduce((n, t) => n + t.count, 0) },
    unknown: ids.filter((id) => !catalog.getCharacter(id)),
  }
}
