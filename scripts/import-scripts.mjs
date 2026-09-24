#!/usr/bin/env node
/**
 * Import community scripts from the 钟楼剧本博物馆 (docs/COMMUNITY-CONTENT.md).
 *
 *   npm run import:scripts -- <folder>            report only
 *   npm run import:scripts -- <folder> --write    write assets/scripts/community/museum-<issue>.json
 *
 * <folder> holds the script JSON downloaded from the museum's Baidu Netdisk
 * shares (any nesting; zip / rar archives must be extracted first). Each file
 * is matched to an issue of scripts/museum/index.json (by "第N期" in the file
 * name, else by title), its characters are mapped to local ids
 * (scripts/script-import.mjs), and characters that are not in
 * assets/characters/individual are looked up on the community BWIKI.
 *
 * Written: scripts whose characters are all local and that are not already
 * bundled in assets/scripts/. Skipped and listed: character packs, scripts
 * with community characters (unless --allow-community, which keeps the
 * script's own inline definitions), duplicates, files without an issue.
 *
 * Options:
 *   --write              write the scripts (default: report only)
 *   --allow-community    also write scripts with community characters that the JSON defines inline
 *   --out <dir>          output folder (default assets/scripts/community)
 *   --report <file>      also write the full report as JSON
 *   --no-bwiki           do not look up community characters on BWIKI
 *   --refresh            refetch BWIKI pages instead of using the cache
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildCharacterIndex, buildScriptFile, characterSetKey, convertScript, matchIssue, parseBwikiCharacter, slugFor, titleKey,
} from './script-import.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
const folder = args.find((arg, i) => !arg.startsWith('--') && !['--out', '--report'].includes(args[i - 1]))
if (!folder || args.includes('--help')) {
  console.log('Usage: npm run import:scripts -- <folder> [--write] [--allow-community] [--out <dir>] [--report <file>] [--no-bwiki] [--refresh]')
  process.exit(folder ? 0 : 1)
}
const WRITE = args.includes('--write')
const ALLOW_COMMUNITY = args.includes('--allow-community')
const OUT_DIR = path.resolve(flag('--out') ?? path.join(ROOT, 'assets', 'scripts', 'community'))
const BWIKI = !args.includes('--no-bwiki')
const REFRESH = args.includes('--refresh')
const CACHE = path.join(ROOT, 'node_modules', '.cache', 'import-scripts', 'bwiki')
const BWIKI_API = 'https://wiki.biligame.com/bloodontheclocktower/api.php'
const BWIKI_PAGE = (title) => `https://wiki.biligame.com/bloodontheclocktower/${encodeURIComponent(title)}`
// A script with more characters than this is a character pack (华灯初上 / 山雨欲来 角色合集).
const PACK_SIZE = 40

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || entry.name === '__MACOSX') return []
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

// ── Local data ───────────────────────────────────────────────────────────────

const charDir = path.join(ROOT, 'assets', 'characters', 'individual')
const index = buildCharacterIndex(fs.readdirSync(charDir).filter((f) => f.endsWith('.json')).map((f) => readJson(path.join(charDir, f))))
const museum = readJson(path.join(ROOT, 'scripts', 'museum', 'index.json'))

// Bundled scripts (not ones this importer wrote): same characters or same title = already in the app.
const scriptDir = path.join(ROOT, 'assets', 'scripts')
const bundledBySet = new Map()
const bundledByTitle = new Map()
for (const file of fs.readdirSync(scriptDir).filter((f) => f.endsWith('.json'))) {
  const data = readJson(path.join(scriptDir, file))
  if (!Array.isArray(data)) continue
  const meta = data.find((e) => e && typeof e === 'object' && e.id === '_meta') ?? {}
  const ids = data.filter((e) => typeof e === 'string' || (e && e.id !== '_meta')).map((e) => (typeof e === 'string' ? e : e.id))
  bundledBySet.set(characterSetKey(ids), file)
  for (const title of [meta.name, meta.name_zh]) if (titleKey(title)) bundledByTitle.set(titleKey(title), file)
}

// ── BWIKI lookup ─────────────────────────────────────────────────────────────

async function bwikiJson(params, cacheName) {
  fs.mkdirSync(CACHE, { recursive: true })
  const file = path.join(CACHE, `${cacheName.replace(/[\\/:*?"<>|]/g, '_')}.json`)
  if (!REFRESH && fs.existsSync(file)) return readJson(file)
  await sleep(300)
  const res = await fetch(`${BWIKI_API}?${new URLSearchParams({ format: 'json', ...params })}`)
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { throw new Error(`BWIKI: HTTP ${res.status}, not JSON: ${text.slice(0, 80)}`) }
  fs.writeFileSync(file, text)
  return json
}

/** name → { page, url, english, collection, author, team, ability } | { missing: true } */
async function lookUpOnBwiki(names) {
  const found = new Map()
  for (const name of names) {
    let title = name
    let via = 'title'
    const exact = await bwikiJson({ action: 'query', titles: name, redirects: '1' }, `q-${name}`)
    const page = Object.values(exact.query?.pages ?? {})[0]
    if (!page || 'missing' in page || 'invalid' in page) {
      const search = await bwikiJson({ action: 'query', list: 'search', srsearch: name, srlimit: '1' }, `s-${name}`)
      const hit = search.query?.search?.[0]?.title
      if (!hit) { found.set(name, { missing: true }); continue }
      title = hit
      via = 'search'
    } else {
      title = page.title
    }
    const parsed = await bwikiJson({ action: 'parse', page: title, prop: 'wikitext', redirects: '1' }, `p-${title}`)
    const wikitext = parsed.parse?.wikitext?.['*']
    if (!wikitext) { found.set(name, { missing: true }); continue }
    found.set(name, { page: parsed.parse.title, url: BWIKI_PAGE(parsed.parse.title), via, ...parseBwikiCharacter(wikitext) })
  }
  return found
}

// ── Import ───────────────────────────────────────────────────────────────────

const files = walk(path.resolve(folder))
const jsonFiles = files.filter((f) => /\.json$/i.test(f))
const archives = files.filter((f) => /\.(zip|rar|7z)$/i.test(f))
const results = []
const seenSets = new Map()
const taken = new Set()

for (const full of jsonFiles.sort()) {
  const file = path.relative(path.resolve(folder), full)
  let data
  try { data = readJson(full) } catch (error) { results.push({ file, status: 'error', reason: `invalid JSON: ${error.message}` }); continue }
  const converted = convertScript(data, index)
  if (converted.error) { results.push({ file, status: 'error', reason: converted.error }); continue }
  const { meta, characters, warnings } = converted
  const title = meta?.name ?? path.basename(file, '.json')
  const match = matchIssue({ fileName: file, metaName: meta?.name }, museum.issues)
  const ids = characters.filter((c) => c.id).map((c) => c.id)
  const other = characters.filter((c) => !c.id)
  const result = {
    file, title, author: meta?.author ?? '', issue: match.issue?.issue, issueTitle: match.issue?.title, categories: match.issue?.categories,
    characters: characters.length, local: ids.length, community: other.map(({ input, status, inline, candidates }) => ({ input, status, name: inline?.name, team: inline?.team, candidates })),
    ...(warnings.length ? { warnings } : {}),
  }
  const setKey = characterSetKey(ids)
  if (characters.length > PACK_SIZE || /角色合集/.test(match.issue?.title ?? '')) result.status = 'pack'
  else if (!match.issue) { result.status = 'unmatched'; result.reason = match.candidates ? `several issues: ${match.candidates.map((c) => c.issue).join(', ')}` : 'no issue with this number or title' }
  else if (!other.length && bundledBySet.has(setKey)) { result.status = 'bundled'; result.reason = `same characters as assets/scripts/${bundledBySet.get(setKey)}` }
  else if (bundledByTitle.has(titleKey(title))) { result.status = 'bundled'; result.reason = `same title as assets/scripts/${bundledByTitle.get(titleKey(title))}` }
  else if (seenSets.has(setKey) && !other.length) { result.status = 'duplicate'; result.reason = `same characters as ${seenSets.get(setKey)}` }
  else if (other.length) {
    const definedInline = other.every((c) => c.inline?.name && c.inline?.ability && c.inline?.team)
    result.status = ALLOW_COMMUNITY && definedInline ? 'ok' : 'community'
    if (!definedInline) result.reason = 'community characters without an inline definition'
  } else result.status = 'ok'
  if (result.status === 'ok') {
    seenSets.set(setKey, file)
    result.slug = slugFor(match.issue.issue, taken)
    taken.add(result.slug)
    result.output = buildScriptFile(converted, { issue: match.issue, file: path.basename(file) })
  }
  results.push(result)
}

// Community characters: unique names, looked up on BWIKI.
const unknown = new Map()
for (const r of results) for (const c of r.community ?? []) {
  const key = c.name ?? c.input
  const entry = unknown.get(key) ?? { name: key, ids: new Set(), status: c.status, candidates: c.candidates, scripts: [] }
  entry.ids.add(c.input)
  entry.scripts.push(r.issue ?? r.file)
  unknown.set(key, entry)
}
let bwiki = new Map()
if (BWIKI && unknown.size) {
  try { bwiki = await lookUpOnBwiki([...unknown.keys()]) } catch (error) { console.warn(`BWIKI lookup failed: ${error.message}`) }
}

// ── Report ───────────────────────────────────────────────────────────────────

const count = (status) => results.filter((r) => r.status === status).length
console.log(`${jsonFiles.length} JSON files in ${folder}${archives.length ? ` (+${archives.length} archives: extract them first)` : ''}`)
console.log(`  ok (local characters only)   ${count('ok')}`)
console.log(`  community characters         ${count('community')}`)
console.log(`  already bundled              ${count('bundled')}`)
console.log(`  duplicate                    ${count('duplicate')}`)
console.log(`  character pack               ${count('pack')}`)
console.log(`  no issue matched             ${count('unmatched')}`)
console.log(`  unreadable                   ${count('error')}`)

const byCategory = new Map()
for (const r of results) for (const cat of r.categories ?? ['(no issue)']) {
  const row = byCategory.get(cat) ?? { ok: 0, community: 0, other: 0 }
  row[r.status === 'ok' ? 'ok' : r.status === 'community' ? 'community' : 'other']++
  byCategory.set(cat, row)
}
console.log('\nBy category (ok / community / other):')
for (const [cat, row] of [...byCategory].sort()) console.log(`  ${String(row.ok).padStart(3)} / ${String(row.community).padStart(3)} / ${String(row.other).padStart(3)}  ${cat}`)

console.log('\nScripts:')
for (const r of results) {
  const where = r.issue ? `第${r.issue}期《${r.issueTitle}》` : ''
  const extra = r.community?.length ? ` · ${r.community.length} not local: ${r.community.map((c) => c.name ?? c.input).join('、')}` : ''
  console.log(`  ${r.status.padEnd(9)} ${r.file}${where ? ` → ${where}` : ''}${r.author ? ` · ${r.author}` : ''}${extra}${r.reason ? ` (${r.reason})` : ''}`)
}

if (unknown.size) {
  console.log(`\nCharacters not in assets/characters/individual (${unknown.size}):`)
  for (const entry of [...unknown.values()].sort((a, b) => b.scripts.length - a.scripts.length)) {
    const info = bwiki.get(entry.name)
    const status = entry.status === 'modified' ? ` [same name as ${entry.candidates.join('/')}, other ability]` : entry.status === 'ambiguous' ? ` [ambiguous: ${entry.candidates.join('/')}]` : ''
    const wiki = !BWIKI ? '' : !info || info.missing ? ' · BWIKI: no page' : ` · BWIKI${info.via === 'search' ? ' (search)' : ''}: ${info.page}${info.collection ? ` · ${info.collection}` : ''}${info.author ? ` · ${info.author}` : ''}`
    console.log(`  ${entry.name}${status} · ${entry.scripts.length} script(s)${wiki}`)
  }
}

if (flag('--report')) {
  const report = {
    folder, generated: new Date().toISOString(),
    scripts: results.map(({ output, ...rest }) => rest),
    characters: [...unknown.values()].map((entry) => ({ ...entry, ids: [...entry.ids], bwiki: bwiki.get(entry.name) })),
  }
  fs.writeFileSync(flag('--report'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`\nReport: ${flag('--report')}`)
}

if (WRITE) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const written = results.filter((r) => r.output)
  for (const r of written) fs.writeFileSync(path.join(OUT_DIR, `${r.slug}.json`), `${JSON.stringify(r.output, null, 2)}\n`)
  console.log(`\nWrote ${written.length} scripts to ${OUT_DIR.startsWith(ROOT) ? path.relative(ROOT, OUT_DIR) : OUT_DIR}`)
} else {
  console.log('\nReport only; add --write to write the ok scripts.')
}
