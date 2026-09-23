#!/usr/bin/env node
/**
 * Writes the portable catalog snapshot used by the API worker.
 *
 *   node scripts/build-catalog.mjs                      # → <repo>/worker/src/generated/catalog.json
 *   node scripts/build-catalog.mjs --out some/file.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCatalogData } from './catalog-data.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const outIdx = process.argv.indexOf('--out')
const out = outIdx !== -1 ? path.resolve(process.argv[outIdx + 1]) : path.join(repoRoot, 'worker/src/generated/catalog.json')

const data = buildCatalogData(repoRoot)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(data))
const kb = (fs.statSync(out).size / 1024).toFixed(0)
console.log(`catalog: ${data.characters.length} characters, ${data.jinxes.length} jinxes, ${data.scripts.length} scripts → ${path.relative(process.cwd(), out)} (${kb} KB)`)
