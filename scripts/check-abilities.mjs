#!/usr/bin/env node
/**
 * Flag ability texts that differ from the official sources:
 *   English — TPI's release data (roles.json), for the official characters;
 *   Chinese — the 集石 wiki's 角色能力 section, for every character with a page.
 *
 *   node scripts/check-abilities.mjs [--json]
 *
 * Reads the caches that `npm run sync-reminders` (roles.json) and
 * `npm run build:guides` (集石 pages) leave in node_modules/.cache. Each
 * difference gets a kind, to be reviewed before adding a revision
 * (`npm run add-revision`):
 *   en-wording   official English differs only in spelling (neighbour, first, and)
 *   en-errata    official English differs in words
 *   zh-older     the wiki matches an older local revision better than the current one (wiki not updated)
 *   zh-wording   same ability, different Chinese wording (official characters, or close text)
 *   zh-version   probably a different version of the ability (Chinese editions, text far apart)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanInline } from './guide-parse.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const norm = (id) => id.toLowerCase().replace(/[^a-z0-9]/g, '')
const plain = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/[\s\p{P}\p{S}]+/gu, '').toLowerCase()
const canon = (s) => plain((s ?? '').replace(/neighbour/gi, 'neighbor').replace(/\bfirst\b/gi, '1st').replace(/\band\b/gi, '&'))
const bigrams = (s) => new Set(Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2)))
/** Character-pair overlap of two texts, 0–1. */
export function similarity(a, b) {
  const x = bigrams(plain(a)), y = bigrams(plain(b))
  let shared = 0
  for (const pair of x) if (y.has(pair)) shared++
  return x.size + y.size ? (2 * shared) / (x.size + y.size) : 1
}

/** The 角色能力 section of a 集石 page, as text. */
export function wikiAbility(wikitext) {
  const section = wikitext?.match(/==\s*角色能力\s*==\n([\s\S]*?)\n==[^=]/)?.[1]
  return section ? cleanInline(section).replace(/\s*\n\s*/g, '') : null
}

/**
 * Differences for one character. `official` is its roles.json entry (if
 * any), `wiki` the 集石 ability text (if any).
 */
export function classify(character, official, wiki) {
  const out = []
  const current = character.current_revision
  if (official && plain(official.ability) !== plain(character.en?.ability)) {
    out.push({ kind: canon(official.ability) === canon(character.en?.ability) ? 'en-wording' : 'en-errata', language: 'en', official: official.ability, ours: character.en?.ability })
  }
  if (wiki && plain(wiki) !== plain(character.zh?.ability)) {
    const scores = Object.entries(character.zh?.revisions ?? {}).map(([id, text]) => [id, similarity(wiki, text)])
    const [best] = scores.sort((a, b) => b[1] - a[1])
    const sim = similarity(wiki, character.zh?.ability)
    const kind = best && best[0] !== current ? 'zh-older'
      : official || sim >= 0.8 ? 'zh-wording'
      : 'zh-version'
    out.push({ kind, language: 'zh', official: wiki, ours: character.zh?.ability, similarity: Math.round(sim * 100) / 100, matches: best?.[0] })
  }
  return out
}

function main() {
  const rolesFile = path.join(ROOT, 'node_modules/.cache/sync-reminders/roles.json')
  const roles = fs.existsSync(rolesFile) ? JSON.parse(fs.readFileSync(rolesFile, 'utf8')) : []
  if (!roles.length) console.error('(no roles.json cache: run npm run sync-reminders; English not checked)')
  const byId = new Map(roles.map((r) => [norm(r.id), r]))
  const zhCache = path.join(ROOT, 'node_modules/.cache/build-guides/zh')
  if (!fs.existsSync(zhCache)) console.error('(no 集石 cache: run npm run build:guides; Chinese not checked)')
  const dir = path.join(ROOT, 'assets/characters/individual')
  const rows = []
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const character = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    const page = path.join(zhCache, `${norm(character.id)}.json`)
    const wiki = fs.existsSync(page) ? wikiAbility(JSON.parse(fs.readFileSync(page, 'utf8')).parse?.wikitext?.['*']) : null
    for (const diff of classify(character, byId.get(norm(character.id)), wiki)) {
      rows.push({ id: character.id, name: character.zh?.name, edition: character.edition, current: character.current_revision, ...diff })
    }
  }
  if (process.argv.includes('--json')) { console.log(JSON.stringify(rows, null, 1)); return }
  const kinds = ['en-errata', 'en-wording', 'zh-version', 'zh-wording', 'zh-older']
  for (const kind of kinds) {
    const list = rows.filter((r) => r.kind === kind)
    if (!list.length) continue
    console.log(`\n## ${kind} (${list.length})\n`)
    console.log('| 角色 | 版本 | 当前修订 | 官方 | 本地 |\n|---|---|---|---|---|')
    for (const r of list) console.log(`| ${r.name ?? ''} ${r.id} | ${r.edition} | ${r.current}${r.matches && r.matches !== r.current ? ` (wiki≈${r.matches})` : ''} | ${r.official.replace(/\|/g, '/')} | ${(r.ours ?? '').replace(/\|/g, '/')} |`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main()
