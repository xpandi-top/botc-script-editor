#!/usr/bin/env node
/**
 * Import the community (民间) character packs listed in
 * scripts/community-packs.json (docs/COMMUNITY-CONTENT.md).
 *
 *   npm run import:packs                       report only, every pack
 *   npm run import:packs -- --only hp,lotr     some packs
 *   npm run import:packs -- --write            write them
 *
 * Writing a pack replaces its previous import: its character files
 * (assets/characters/individual, edition community-<key>), icons
 * (assets/icons, 400×400 PNG8 via ImageMagick `magick`, as for Odyssey), night
 * order entries (assets/characters/night-order.json) and credit
 * (assets/editions.json). Downloads are cached in
 * node_modules/.cache/import-packs/; --refresh fetches again.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  alignByMap, alignByOrder, characterFile, commonSuffix, editionCredit, existingCopies, insertNightOrder, localId, nameClashes, packEntries, removeFromNightOrder,
} from './pack-import.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
const ONLY = flag('--only')?.split(',').map((s) => s.trim())
const WRITE = args.includes('--write')
const REFRESH = args.includes('--refresh')
const CACHE = path.join(ROOT, 'node_modules', '.cache', 'import-packs')
const CHAR_DIR = path.join(ROOT, 'assets', 'characters', 'individual')
const ICON_DIR = path.join(ROOT, 'assets', 'icons')
const NIGHT_FILE = path.join(ROOT, 'assets', 'characters', 'night-order.json')
const EDITIONS_FILE = path.join(ROOT, 'assets', 'editions.json')

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''))
const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const cacheName = (url) => url.replace(/^https?:\/\//, '').replace(/[?#].*$/, '').replace(/[^a-zA-Z0-9._-]+/g, '_')

async function download(url, { binary = false } = {}) {
  fs.mkdirSync(CACHE, { recursive: true })
  const file = path.join(CACHE, cacheName(url))
  if (REFRESH || !fs.existsSync(file)) {
    await sleep(200)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  return binary ? file : fs.readFileSync(file, 'utf8')
}

const config = readJson(path.join(ROOT, 'scripts', 'community-packs.json'))
const packs = config.packs.filter((p) => !ONLY || ONLY.includes(p.key))
const existingFiles = fs.readdirSync(CHAR_DIR).filter((f) => f.endsWith('.json')).map((f) => readJson(path.join(CHAR_DIR, f)))

let nightOrder = readJson(NIGHT_FILE)
const editions = readJson(EDITIONS_FILE)
let problems = 0

for (const pack of packs) {
  const { meta, characters: all } = packEntries(JSON.parse(await download(pack.json)))
  const suffix = commonSuffix(all.map((c) => c.id))
  // Copies of characters the app already has stay out of the pack.
  const copies = existingCopies(all, existingFiles.filter((f) => f.edition !== pack.edition))
  const characters = all.filter((c) => !copies.has(c.id))
  const idOf = new Map(characters.map((c) => [c.id, localId(pack.key, c.id, suffix)]))

  let pairs = new Map()
  const notes = []
  if (pack.translation?.json) {
    const translated = packEntries(JSON.parse(await download(pack.translation.json))).characters
    const aligned = alignByOrder(characters, translated)
    pairs = aligned.pairs
    if (translated.length !== characters.length) notes.push(`translation has ${translated.length} characters, pack ${characters.length}`)
    if (aligned.mismatches.length) notes.push(`not translated (team differs at that position): ${aligned.mismatches.join(', ')}`)
  } else if (pack.translation?.map) {
    const aligned = alignByMap(characters, readJson(path.join(ROOT, pack.translation.map)))
    pairs = aligned.pairs
    if (aligned.unknown.length) notes.push(`map entries naming no character: ${aligned.unknown.join(', ')}`)
  }

  const files = characters.map((c) => characterFile(c, { id: idOf.get(c.id), edition: pack.edition, language: pack.language, translation: pairs.get(c.id) }))
  const others = existingFiles.filter((f) => f.edition !== pack.edition)
  const taken = files.filter((f) => others.some((o) => o.id === f.id)).map((f) => f.id)
  const dupes = files.map((f) => f.id).filter((id, i, all) => all.indexOf(id) !== i)
  const wakers = characters.map((c) => ({ id: idOf.get(c.id), firstNight: c.firstNight, otherNight: c.otherNight }))
  const noReminder = files.filter((f, i) => {
    const c = characters[i]
    const text = (field) => f.en?.[field] || f.zh?.[field]
    return (c.firstNight > 0 && !text('firstNightReminder')) || (c.otherNight > 0 && !text('otherNightReminder'))
  }).map((f) => f.id)
  const noIcon = characters.filter((c) => !(Array.isArray(c.image) ? c.image[0] : c.image)).map((c) => idOf.get(c.id))
  const teams = files.reduce((acc, f) => ({ ...acc, [f.team]: (acc[f.team] ?? 0) + 1 }), {})

  console.log(`\n${pack.key} · ${pack.name_zh} / ${pack.name_en} · ${meta.name ?? ''} by ${meta.author ?? pack.author_en}`)
  console.log(`  ${files.length} characters ${JSON.stringify(teams)} · ids ${files[0]?.id} … · translated ${pairs.size}/${files.length}`)
  for (const note of notes) console.log(`  note: ${note}`)
  for (const [source, local] of copies) console.log(`  left out, same as existing ${local}: ${all.find((c) => c.id === source).name}`)
  for (const clash of nameClashes(files, others)) console.log(`  same name as an existing character: ${clash}`)
  if (noReminder.length) console.log(`  wakes without a night reminder: ${noReminder.join(', ')}`)
  if (noIcon.length) console.log(`  no icon: ${noIcon.join(', ')}`)
  if (taken.length || dupes.length) { problems++; console.log(`  ERROR ids taken: ${[...taken, ...dupes].join(', ')}`); continue }

  if (!WRITE) continue
  // Replace the previous import of this pack.
  const previous = existingFiles.filter((f) => f.edition === pack.edition).map((f) => f.id)
  for (const id of previous) {
    fs.rmSync(path.join(CHAR_DIR, `${id}.json`), { force: true })
    fs.rmSync(path.join(ICON_DIR, `${id}.png`), { force: true })
  }
  nightOrder = removeFromNightOrder(nightOrder, previous)
  for (const [i, file] of files.entries()) {
    writeJson(path.join(CHAR_DIR, `${file.id}.json`), file)
    const image = Array.isArray(characters[i].image) ? characters[i].image[0] : characters[i].image
    if (!image) continue
    const src = await download(image, { binary: true })
    execFileSync('magick', [src, '-resize', '400x400', '-strip', '-dither', 'FloydSteinberg', '-colors', '256', `PNG8:${path.join(ICON_DIR, `${file.id}.png`)}`])
  }
  nightOrder = insertNightOrder(nightOrder, wakers)
  editions[pack.edition] = editionCredit(pack)
  console.log(`  wrote ${files.length} characters and icons`)
}

if (WRITE) {
  writeJson(NIGHT_FILE, nightOrder)
  writeJson(EDITIONS_FILE, editions)
  console.log('\nUpdated night-order.json and editions.json. Run npm run verify.')
} else {
  console.log('\nReport only; add --write to write the packs.')
}
process.exit(problems ? 1 : 0)
