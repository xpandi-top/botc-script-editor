#!/usr/bin/env node
/**
 * What the AI assistant can answer from: coverage tables for the local
 * content (docs/AI-CONTENT.md) and its freshness against the official
 * sources. Prints Markdown.
 *
 *   node scripts/audit-ai-content.mjs [--online]
 *
 * Offline it reads the repository plus the caches the sync scripts leave
 * behind (node_modules/.cache/sync-reminders/roles.json, the official English
 * data; node_modules/.cache/build-guides/zh/*.json, the 集石 pages) — a
 * source without a cache is reported as not checked. --online fetches
 * roles.json when it is not cached and asks both wikis for the current
 * revision of every guide page (50 titles per request).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanInline } from './guide-parse.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ONLINE = process.argv.includes('--online')
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const norm = (id) => id.toLowerCase().replace(/[^a-z0-9]/g, '')
const plain = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/[\s\p{P}\p{S}]+/gu, '').toLowerCase()
const kb = (bytes) => `${Math.round(bytes / 1024)} KB`

const characters = fs.readdirSync(path.join(ROOT, 'assets/characters/individual')).filter((f) => f.endsWith('.json')).sort()
  .map((f) => read(`assets/characters/individual/${f}`))
const EDITIONS = ['tb', 'bmr', 'snv', 'experimental', 'fabled', 'loric', 'huadengchushang', 'shanyuyulai', 'odyssey']
const index = read('assets/almanac/index.json')
const guideFiles = Object.entries(index.files)
const jinxData = read('assets/jinxes.json')
const jinxes = Array.isArray(jinxData) ? jinxData : Object.values(jinxData)
const nightOrder = read('assets/characters/night-order.json')
const waking = new Set([...(nightOrder.first_night ?? []), ...(nightOrder.other_nights ?? [])])
const hasText = (s) => Boolean(s && !/No ability text/i.test(s))
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n')


// ── 1. Characters by edition ───────────────────────────────────────────────
const out = ['## 角色资料覆盖（按版本）', '']
const rows = []
for (const edition of EDITIONS) {
  const list = characters.filter((c) => c.edition === edition)
  const ids = new Set(list.map((c) => c.id))
  const guides = (lang) => guideFiles.filter(([, f]) => f.language === lang && f.edition === edition).reduce((n, [, f]) => n + f.characters.length, 0)
  rows.push([
    edition, list.length,
    list.filter((c) => hasText(c.en?.ability)).length,
    list.filter((c) => hasText(c.zh?.ability)).length,
    list.filter((c) => c.zh?.reminders?.length).length,
    list.filter((c) => waking.has(c.id)).length,
    jinxes.filter((j) => j.characters?.some((id) => ids.has(id))).length,
    guides('zh'), guides('en'),
  ])
}
out.push(table(['版本', '角色', '英文能力', '中文能力', '中文提示标记', '夜序中', '相克条目', '中文攻略', '英文攻略'], rows), '')

// ── 2. Guide sections ──────────────────────────────────────────────────────
out.push('## 攻略文件（assets/almanac）', '')
const SECTIONS = ['summary', 'howto', 'examples', 'rules', 'reminder_details', 'tips', 'bluffing', 'fighting', 'flavor']
out.push(table(['文件', '大小', '日期', '角色', ...SECTIONS], guideFiles.map(([name, f]) => {
  const data = read(`assets/almanac/${name}`)
  const entries = Object.values(data.characters ?? {})
  return [name, kb(f.bytes), f.fetched ?? '', f.characters.length, ...SECTIONS.map((s) => entries.filter((e) => typeof e[s] === 'string' && e[s].trim()).length)]
})), '')

// ── 3. Rules sources ───────────────────────────────────────────────────────
const wiki = read('public/wiki-chunks.json')
const pages = new Map()
for (const c of wiki.chunks) {
  const p = pages.get(c.page) ?? { url: c.url, n: 0, chars: 0, max: 0 }
  p.n++; p.chars += c.text.length; p.max = Math.max(p.max, c.text.length)
  pages.set(c.page, p)
}
out.push(`## Wiki 摘录（public/wiki-chunks.json，${wiki.builtAt?.slice(0, 10)}）`, '')
out.push(table(['页面', '语言', '块', '字符', '最大块'], [...pages].map(([page, p]) => [page, page.startsWith('zh-') ? 'zh' : 'en', p.n, p.chars, p.max])), '')

const rulesSrc = fs.readFileSync(path.join(ROOT, 'src/core/ai/rules.ts'), 'utf8')
const glossarySrc = fs.readFileSync(path.join(ROOT, 'src/core/ai/glossary.ts'), 'utf8')
const sectionCount = (block) => block.split(/\n\s*\n/).length - 2
const en = rulesSrc.match(/const EN = `([\s\S]*?)`\n/)?.[1] ?? ''
const zh = rulesSrc.match(/const ZH = `([\s\S]*?)`\n/)?.[1] ?? ''
out.push(`核心规则（src/core/ai/rules.ts）：英文 ${sectionCount(en)} 节 / ${en.length} 字符，中文 ${sectionCount(zh)} 节 / ${zh.length} 字符。` +
  `术语表（src/core/ai/glossary.ts）：${(glossarySrc.match(/^\s+'[^']+':\s+'/gm) ?? []).length} 条译名，${(glossarySrc.match(/^\s+\[\//gm) ?? []).length} 组检索别名。`, '')

// ── 4. Freshness ───────────────────────────────────────────────────────────
out.push('## 与官方来源的一致性', '')
const rolesCache = path.join(ROOT, 'node_modules/.cache/sync-reminders/roles.json')
let roles = fs.existsSync(rolesCache) ? JSON.parse(fs.readFileSync(rolesCache, 'utf8')) : null
if (!roles && ONLINE) roles = await (await fetch('https://raw.githubusercontent.com/ThePandemoniumInstitute/botc-release/main/resources/data/roles.json')).json()
if (roles) {
  const byId = new Map(roles.map((r) => [norm(r.id), r]))
  const official = characters.filter((c) => byId.has(norm(c.id)))
  const differ = official.filter((c) => plain(byId.get(norm(c.id)).ability) !== plain(c.en?.ability))
  // Spelling only: neighbour / neighbor, first / 1st, and / &.
  const canon = (s) => plain((s ?? '').replace(/neighbour/gi, 'neighbor').replace(/\bfirst\b/gi, '1st').replace(/\band\b/gi, '&'))
  const real = differ.filter((c) => canon(byId.get(norm(c.id)).ability) !== canon(c.en?.ability))
  out.push(`- 英文能力 vs 官方 roles.json：${official.length} 个官方角色，${differ.length} 个不同；去掉拼写差异（neighbour / first / and）后 ${real.length} 个${real.length ? `（${real.map((c) => c.id).join('、')}）` : ''}。`)
} else out.push('- 英文能力 vs 官方 roles.json：未检查（无缓存；`npm run sync-reminders` 或 `--online`）。')

const zhCache = path.join(ROOT, 'node_modules/.cache/build-guides/zh')
if (fs.existsSync(zhCache)) {
  let checked = 0
  const differ = []
  for (const c of characters) {
    const file = path.join(zhCache, `${norm(c.id)}.json`)
    if (!fs.existsSync(file)) continue
    const text = JSON.parse(fs.readFileSync(file, 'utf8')).parse?.wikitext?.['*']
    const section = text?.match(/==\s*角色能力\s*==\n([\s\S]*?)\n==[^=]/)?.[1]
    if (!section) continue
    checked++
    if (plain(cleanInline(section)) !== plain(c.zh?.ability)) differ.push(c.id)
  }
  out.push(`- 中文能力 vs 集石 wiki“角色能力”：检查 ${checked} 个，${differ.length} 个措辞不同${differ.length ? `（${differ.join('、')}）` : ''}。`)
} else out.push('- 中文能力 vs 集石 wiki：未检查（无缓存；先运行 `npm run build:guides`）。')

if (ONLINE) {
  for (const [lang, api] of [['zh', 'https://clocktower-wiki.gstonegames.com/api.php'], ['en', 'https://wiki.bloodontheclocktower.com/api.php']]) {
    const entries = guideFiles.filter(([, f]) => f.language === lang && f.edition !== 'odyssey')
      .flatMap(([name]) => Object.entries(read(`assets/almanac/${name}`).characters))
      .filter(([, e]) => e.source && e.revid)
    const title = (url) => decodeURIComponent(url.includes('title=') ? url.split('title=')[1] : url.split('/').pop()).replace(/_/g, ' ')
    const current = new Map()
    for (let i = 0; i < entries.length; i += 50) {
      const titles = entries.slice(i, i + 50).map(([, e]) => title(e.source)).join('|')
      const res = await fetch(`${api}?action=query&prop=revisions&rvprop=ids&titles=${encodeURIComponent(titles)}&format=json`,
        lang === 'en' ? { headers: { 'User-Agent': 'BotCCompanionBot/1.0 (audit-ai-content.mjs; non-commercial)' } } : {})
      for (const page of Object.values((await res.json()).query?.pages ?? {})) current.set(page.title, page.revisions?.[0]?.revid)
    }
    const stale = entries.filter(([, e]) => current.get(title(e.source)) && current.get(title(e.source)) !== e.revid).map(([id]) => id)
    out.push(`- ${lang} 攻略页面修订：${entries.length} 页，${stale.length} 页在 wiki 上已更新${stale.length ? `（${stale.join('、')}；\`npm run build:guides -- --refresh\`）` : ''}。`)
  }
} else out.push('- 攻略页面修订：未检查（`--online`）。')

console.log(out.join('\n'))
