#!/usr/bin/env node
/**
 * Sync reminder tokens with the official sources, in both languages.
 *
 *   node scripts/sync-reminders.mjs [--cache <dir>] [--write]
 *
 * English: the official release data (ThePandemoniumInstitute/botc-release,
 * resources/data/roles.json) — `reminders` (with repeats: one entry per
 * physical token) and `remindersGlobal`.
 * Chinese: the official Chinese wiki (clocktower-wiki.gstonegames.com), the
 * "提示标记" section of each character's page. Chinese names are matched to
 * the English tokens in order (duplicates share a name); a character whose
 * counts do not line up is reported, not guessed.
 *
 * Without --write it only prints the report. With --write it updates
 * assets/characters/individual/*.json: top-level `reminders` /
 * `remindersGlobal` (English) and `zh.reminders` / `zh.remindersGlobal`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(ROOT, 'assets', 'characters', 'individual')
const ROLES_URL = 'https://raw.githubusercontent.com/ThePandemoniumInstitute/botc-release/main/resources/data/roles.json'
const WIKI_API = 'https://clocktower-wiki.gstonegames.com/api.php'

const args = process.argv.slice(2)
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
const WRITE = args.includes('--write')
const CACHE = flag('--cache') ?? path.join(ROOT, 'node_modules', '.cache', 'sync-reminders')
fs.mkdirSync(CACHE, { recursive: true })

const norm = (id) => id.toLowerCase().replace(/[^a-z0-9]/g, '')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function cached(name, load) {
  const file = path.join(CACHE, name)
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8')
  const text = await load()
  fs.writeFileSync(file, text)
  return text
}

/**
 * Token names in the 提示标记 section: its top-level "* name" lines (or, on
 * pages without bullets, the lines that are not 放置时机/条件 notes), markup
 * and counts such as "（共3枚）" removed. "A&B&C" lists one name per token.
 */
export function zhReminderNames(wikitext) {
  const start = wikitext.search(/==\s*提示标记\s*==/)
  if (start === -1) return null
  const rest = wikitext.slice(start).replace(/^==\s*提示标记\s*==/, '')
  const end = rest.search(/\n==[^=]/)
  const lines = (end === -1 ? rest : rest.slice(0, end)).split('\n').map((line) => line.trim()).filter(Boolean)
  const bullets = lines.filter((line) => /^\*(?!\*)/.test(line))
  return (bullets.length ? bullets : lines.filter((line) => !/[：:]/.test(line)))
    .flatMap((line) => {
      const count = Number(line.match(/共\s*(\d+)\s*枚/)?.[1] ?? 1)
      const names = line.replace(/^\*\s*/, '')
        .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
        .replace(/'{2,}/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/[（(][^)）]*[）)]$/, '')
        .trim()
        .split(/\s*[&＆]\s*/)
      return names.flatMap((name) => Array(count).fill(name))
    })
    .filter((name) => name && name !== '无')
}

/**
 * Chinese names the wiki does not give one per English token: its list is
 * longer (the Al-Hadikhia's choice tokens, the Lunatic's "is the Lunatic"
 * note), shorter (the Revolutionary's second token) or absent (the Bootlegger).
 */
const ZH_OVERRIDES = {
  alhadikhia: { 1: '1', 2: '2', 3: '3' },
  lunatic: { Chosen: '被选择' },
  revolutionary: { 'Register Falsely?': '被当作其他', Aligned: '同阵营' },
  bootlegger: { '?': '？' },
}

const unique = (list) => [...new Set(list)]

/** The character's wiki page source ('' when there is none). */
async function wikiText(id, zhName) {
  const raw = await cached(`${norm(id)}.json`, async () => {
    await sleep(250)
    const res = await fetch(`${WIKI_API}?action=parse&page=${encodeURIComponent(zhName)}&prop=wikitext&redirects=1&format=json`)
    return res.text()
  })
  try { return JSON.parse(raw).parse?.wikitext?.['*'] ?? '' } catch { return '' }
}

/**
 * Characters from Chinese editions have no official English tokens: the
 * Chinese names come from the wiki and these are our English translations,
 * following the official wording where one exists (死亡 = Dead, 保留能力 =
 * Has Ability as for the Vigormortis, …).
 */
const CHINESE_EDITIONS = ['huadengchushang', 'shanyuyulai']
/**
 * Our ability version differs from the wiki's: keep our tokens, translated.
 * (Empty since 2026-09: the 暴君 now follows the wiki's current version.)
 */
const KEEP_TRANSLATED = {}
const EN_FOR_ZH = {
  死亡: 'Dead', 醉酒: 'Drunk', 中毒: 'Poisoned', 失去能力: 'No Ability', 没有能力: 'No Ability', 死于今日: 'Died Today',
  得知: 'Know', 保护: 'Safe', 获得能力: 'Has Ability', 重获能力: 'Has Ability', 保留能力: 'Has Ability',
  已提名: 'Nominated', 已猜测: 'Guess Used', 是恶魔: 'Is The Demon', 熟客: 'Regular', 判罚: 'Sentenced',
  是变脸师: 'Is The Face Changer', 是叫花子: 'Is The Pauper', 是悟道者: 'Is The Enlightened One',
  恃宠而骄: 'Spoiled', 警惕: 'Alert', 蛊毒: 'Gu Poison', 改变方向: 'Switch Direction', 已生效: 'Triggered',
  以为存活: 'Registers Alive', 被魅惑: 'Charmed', 善良中毒: 'Good Poisoned', 爪牙死亡: 'Minion Died',
  乞讨: 'Begging', 太子: 'Prince', 微醺: 'Tipsy', 不共戴天: 'Sworn Enemy', 已触发: 'Used', 捣蛋: 'Mischief', 暴虐: 'Tyranny',
  巡防戍卫: 'Patrolled', 蛊: 'Gu', 在场: 'In Play', 不在场: 'Not In Play',
  是: 'Yes', 否: 'No', 得知过是: 'Learnt Yes', 得知过否: 'Learnt No', 客死他乡: 'Died Abroad',
}

/**
 * The wiki does not always list tokens in the official order, so common
 * words are matched first (first matching rule wins; digits must agree) and
 * only the rest are paired in order.
 */
const HINTS = [
  [/^Dead$/, /^死亡$/], [/Poison/, /中毒/], [/^Drunk/, /醉酒/], [/Chosen/, /被选择/], [/^No Ability$/, /失去能力/],
  [/Not Voted/, /未投票/], [/Voted/, /已投票/], [/Not Nominated/, /未提名/], [/Nominated/, /已提名/],
  [/About To Die/, /即将/], [/Died Today/, /今日/], [/Lunch/, /饱餐/], [/Attacks/, /攻击/],
]
const ZH_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

export function pairNames(english, chinese) {
  const map = new Map()
  const free = [...chinese]
  const take = (en, zh) => { map.set(en, zh); free.splice(free.indexOf(zh), 1) }
  for (const en of english) {
    const hint = HINTS.find(([pattern]) => pattern.test(en))
    const digit = en.match(/\d/)?.[0]
    if (!hint && !digit) continue
    let candidates = free
    if (hint) candidates = candidates.filter((zh) => hint[1].test(zh))
    if (digit) candidates = candidates.filter((zh) => zh.includes(digit) || zh.includes(ZH_DIGITS[+digit]))
    if (candidates.length === 1) take(en, candidates[0])
  }
  for (const en of english) if (!map.has(en)) take(en, free[0])
  return map
}

async function main() {
  const official = JSON.parse(await cached('roles.json', async () => (await fetch(ROLES_URL)).text()))
  const byId = new Map(official.map((r) => [norm(r.id), r]))
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()
  const report = { updated: [], unchanged: [], zhMissing: [], zhMismatch: [], notOfficial: [], pairs: {} }

  for (const file of files) {
    const character = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'))
    const role = byId.get(norm(character.id))
    if (KEEP_TRANSLATED[character.id]) {
      const before = JSON.stringify(character.zh?.reminders ?? [])
      character.zh.reminders = (character.reminders ?? []).map((name) => KEEP_TRANSLATED[character.id][name])
      report.pairs[character.id] = KEEP_TRANSLATED[character.id]
      if (before === JSON.stringify(character.zh.reminders)) report.unchanged.push(character.id)
      else {
        report.updated.push(`${character.id}: zh ${before} → ${JSON.stringify(character.zh.reminders)}`)
        if (WRITE) fs.writeFileSync(path.join(DIR, file), `${JSON.stringify(character, null, 2)}\n`)
      }
      continue
    }
    if (!role && CHINESE_EDITIONS.includes(character.edition) && character.zh?.name) {
      const names = zhReminderNames(await wikiText(character.id, character.zh.name))
      const untranslated = unique(names ?? []).filter((name) => !EN_FOR_ZH[name])
      if (!names?.length) report.zhMissing.push(`${character.id} (${character.zh.name}, ${character.edition})`)
      else if (untranslated.length) report.zhMismatch.push(`${character.id} (${character.zh.name}): no English for ${JSON.stringify(untranslated)}`)
      else {
        const before = JSON.stringify([character.reminders ?? [], character.zh.reminders ?? []])
        character.reminders = names.map((name) => EN_FOR_ZH[name])
        character.zh.reminders = names
        report.pairs[character.id] = Object.fromEntries(names.map((name) => [EN_FOR_ZH[name], name]))
        const after = JSON.stringify([character.reminders, character.zh.reminders])
        if (before === after) report.unchanged.push(character.id)
        else {
          report.updated.push(`${character.id}: ${before} → ${after}`)
          if (WRITE) fs.writeFileSync(path.join(DIR, file), `${JSON.stringify(character, null, 2)}\n`)
        }
      }
      continue
    }
    if (!role) { report.notOfficial.push(character.id); continue }
    const reminders = role.reminders ?? []
    const remindersGlobal = role.remindersGlobal ?? []
    const english = unique([...reminders, ...remindersGlobal])

    let zhMap = null
    const zhName = character.zh?.name
    if (english.length && zhName) {
      const names = zhReminderNames(await wikiText(character.id, zhName))
      const override = ZH_OVERRIDES[character.id]
      if (override) zhMap = new Map(english.map((name) => [name, override[name]]))
      else if (!names) report.zhMissing.push(`${character.id} (${zhName})`)
      else if (unique(names).length !== english.length) report.zhMismatch.push(`${character.id} (${zhName}): en ${JSON.stringify(english)} zh ${JSON.stringify(unique(names))}`)
      else zhMap = pairNames(english, unique(names))
    }

    if (zhMap) report.pairs[character.id] = Object.fromEntries(zhMap)
    const before = JSON.stringify([character.reminders ?? [], character.remindersGlobal ?? [], character.zh?.reminders ?? [], character.zh?.remindersGlobal ?? []])
    character.reminders = reminders
    if (remindersGlobal.length) character.remindersGlobal = remindersGlobal
    else delete character.remindersGlobal
    // English lives at the top level; a stale en block override would win over it.
    if (character.en) { delete character.en.reminders; delete character.en.remindersGlobal }
    if (character.zh) {
      if (zhMap) {
        character.zh.reminders = reminders.map((name) => zhMap.get(name))
        if (remindersGlobal.length) character.zh.remindersGlobal = remindersGlobal.map((name) => zhMap.get(name))
        else delete character.zh.remindersGlobal
      } else if (!english.length) {
        delete character.zh.reminders
        delete character.zh.remindersGlobal
      }
    }
    const after = JSON.stringify([character.reminders ?? [], character.remindersGlobal ?? [], character.zh?.reminders ?? [], character.zh?.remindersGlobal ?? []])
    if (before === after) { report.unchanged.push(character.id); continue }
    report.updated.push(`${character.id}: ${before} → ${after}`)
    if (WRITE) fs.writeFileSync(path.join(DIR, file), `${JSON.stringify(character, null, 2)}\n`)
  }

  console.log(`characters with official or wiki tokens: ${report.updated.length + report.unchanged.length} (${report.updated.length} ${WRITE ? 'updated' : 'to update'}, ${report.unchanged.length} unchanged)`)
  console.log(`Chinese names: ${report.zhMissing.length} pages without a 提示标记 section, ${report.zhMismatch.length} needing review`)
  for (const line of report.zhMismatch) console.log(`  mismatch ${line}`)
  for (const line of report.zhMissing) console.log(`  missing  ${line}`)
  if (!WRITE) console.log('\n(dry run; pass --write to update the character files)')
  fs.writeFileSync(path.join(CACHE, 'report.json'), JSON.stringify(report, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
