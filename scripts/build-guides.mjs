#!/usr/bin/env node
/**
 * Build character guides (examples, how to run, tips, bluffing, rules
 * details, …) from the wikis' character pages, one file per edition and
 * language, in the schema of src/core/ai/guides.ts:
 *
 *   assets/almanac/<edition>.<lang>.json   (lazy-loaded per edition)
 *   assets/almanac/index.json              (small manifest, bundled)
 *
 *   node scripts/build-guides.mjs [--lang zh|en|all] [--only id,id] [--cache <dir>] [--refresh] [--out <dir>]
 *   node scripts/build-guides.mjs --index-only
 *
 * zh: the official Chinese wiki (clocktower-wiki.gstonegames.com), page = the
 *     character's Chinese name; every edition except Odyssey, whose almanac
 *     comes from the pack itself (scripts/odyssey/).
 * en: the official wiki (wiki.bloodontheclocktower.com), page = the English
 *     name; official editions only.
 *
 * Pages are fetched one at a time and cached (default
 * node_modules/.cache/build-guides/<lang>/); --refresh refetches. Every entry
 * keeps its page URL and revision id, so answers can cite it and a later run
 * can tell what changed. The index is rebuilt from every file in
 * assets/almanac/ on each run (Odyssey's included).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseGuidePage } from './guide-parse.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHAR_DIR = path.join(ROOT, 'assets', 'characters', 'individual')
const args = process.argv.slice(2)
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
const OUT_DIR = path.resolve(flag('--out') ?? path.join(ROOT, 'assets', 'almanac'))
const LANGS = (flag('--lang') ?? 'zh') === 'all' ? ['zh', 'en'] : [flag('--lang') ?? 'zh']
const ONLY = flag('--only')?.split(',')
const REFRESH = args.includes('--refresh')
const INDEX_ONLY = args.includes('--index-only')

const SOURCES = {
  zh: {
    api: 'https://clocktower-wiki.gstonegames.com/api.php',
    page: (title) => `https://clocktower-wiki.gstonegames.com/index.php?title=${encodeURIComponent(title)}`,
    site: 'https://clocktower-wiki.gstonegames.com/',
    name: '钟楼百科（集石，官方中文 wiki）',
    editions: (edition) => edition !== 'odyssey',
    title: (c) => c.zh?.name,
    // This wiki answers 403 to self-identified bots; Node's default agent is accepted.
    headers: {},
  },
  en: {
    api: 'https://wiki.bloodontheclocktower.com/api.php',
    page: (title) => `https://wiki.bloodontheclocktower.com/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%2F/g, '/')}`,
    site: 'https://wiki.bloodontheclocktower.com/',
    name: 'Blood on the Clocktower Wiki (official)',
    editions: (edition) => ['tb', 'bmr', 'snv', 'experimental', 'fabled', 'loric'].includes(edition),
    title: (c) => c.en?.name,
    headers: { 'User-Agent': 'BotCCompanionBot/1.0 (build-guides.mjs; non-commercial)' },
  },
}
const LICENSE = 'No license stated by the site; © the publisher. Quoted for reference with a link to each source page.'

const norm = (id) => id.toLowerCase().replace(/[^a-z0-9]/g, '')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchPage(lang, id, title) {
  const dir = flag('--cache') ?? path.join(ROOT, 'node_modules', '.cache', 'build-guides', lang)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${norm(id)}.json`)
  if (!REFRESH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  await sleep(300)
  const url = `${SOURCES[lang].api}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext%7Crevid&redirects=1&format=json`
  const res = await fetch(url, { headers: SOURCES[lang].headers })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { throw new Error(`${lang} ${title}: HTTP ${res.status}, not JSON: ${text.slice(0, 80)}`) }
  fs.writeFileSync(file, text)
  return json
}

function readCharacters() {
  return fs.readdirSync(CHAR_DIR).filter((f) => f.endsWith('.json')).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(CHAR_DIR, f), 'utf8')))
}

const EDITION_NAMES = {
  tb: ['暗流涌动', 'Trouble Brewing'], bmr: ['黯月初升', 'Bad Moon Rising'], snv: ['梦殒春宵', 'Sects & Violets'],
  experimental: ['实验性角色', 'Experimental'], fabled: ['传奇角色', 'Fabled'], loric: ['奇遇角色', 'Loric'],
  huadengchushang: ['华灯初上', 'Hua Deng Chu Shang'], shanyuyulai: ['山雨欲来', 'Shan Yu Yu Lai'],
}

async function build(lang) {
  const source = SOURCES[lang]
  const byEdition = new Map()
  const report = { written: 0, missing: [], empty: [] }
  for (const c of readCharacters()) {
    if (!source.editions(c.edition) || (ONLY && !ONLY.includes(c.id))) continue
    const title = source.title(c)
    if (!title) { report.missing.push(`${c.id} (no ${lang} name)`); continue }
    const json = await fetchPage(lang, c.id, title)
    const wikitext = json.parse?.wikitext?.['*']
    if (!wikitext) { report.missing.push(`${c.id} (${title})`); continue }
    const entry = parseGuidePage(wikitext)
    const sections = Object.keys(entry).filter((key) => key !== 'tags' && key !== 'ability')
    if (!sections.length) { report.empty.push(`${c.id} (${title})`); continue }
    const ordered = { source: source.page(json.parse.title), revid: json.parse.revid, ...entry }
    if (!byEdition.has(c.edition)) byEdition.set(c.edition, {})
    byEdition.get(c.edition)[c.id] = ordered
    report.written++
  }
  const fetched = new Date().toISOString().slice(0, 10)
  for (const [edition, characters] of byEdition) {
    const file = path.join(OUT_DIR, `${edition}.${lang}.json`)
    const [nameZh, nameEn] = EDITION_NAMES[edition] ?? [edition, edition]
    // Keep the date when nothing changed, so reruns do not churn the files.
    const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
    const sameContent = previous && JSON.stringify(previous.characters) === JSON.stringify(characters)
    const out = {
      schema: 1, edition, language: lang, name_zh: nameZh, name_en: nameEn,
      source: source.site, source_name: source.name, license: LICENSE,
      fetched: sameContent ? previous.fetched : fetched,
      characters: Object.fromEntries(Object.entries(characters).sort(([a], [b]) => a.localeCompare(b))),
    }
    fs.writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`)
  }
  console.log(`${lang}: ${report.written} characters in ${byEdition.size} files; ${report.missing.length} without a page, ${report.empty.length} without guide sections`)
  for (const line of report.missing) console.log(`  no page  ${line}`)
  for (const line of report.empty) console.log(`  empty    ${line}`)
}

/**
 * assets/almanac/index.json: per file its edition, language, source, date,
 * size, glossary size and character ids — what the app needs synchronously
 * (does this character have a guide? does this edition have a glossary?)
 * without loading the file.
 */
export function buildIndex() {
  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json').sort()
  const index = { schema: 1, files: {} }
  for (const name of files) {
    const buffer = fs.readFileSync(path.join(OUT_DIR, name))
    const data = JSON.parse(buffer.toString('utf8'))
    const [edition, language] = name.replace(/\.json$/, '').split('.')
    index.files[name] = {
      edition, language,
      source: data.source ?? null,
      fetched: data.fetched ?? data.scraped ?? null,
      bytes: buffer.length,
      terminology: Object.keys(data.terminology ?? {}).length,
      characters: Object.keys(data.characters ?? {}).sort(),
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), `${JSON.stringify(index, null, 1)}\n`)
  console.log(`index: ${files.length} files`)
}

async function main() {
  if (!INDEX_ONLY) for (const lang of LANGS) await build(lang)
  buildIndex()
}

main().catch((e) => { console.error(e); process.exit(1) })
