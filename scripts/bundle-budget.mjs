#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST_DIR = 'dist'

const LIMITS = {
  mainGzipKiB: 360,
  vendorGzipKiB: 220,
  precacheMiB: 45,
  distMiB: 90,
  largestAssetMiB: 7,
}

function fail(message) {
  console.error(`  ✗ ${message}`)
  process.exitCode = 1
}

function bytesToKiB(bytes) {
  return bytes / 1024
}

function bytesToMiB(bytes) {
  return bytes / 1024 / 1024
}

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) out.push(...walk(path))
    else out.push({ path, size: stat.size })
  }
  return out
}

function gzipSize(path) {
  return gzipSync(readFileSync(path)).length
}

function largestMatchingAsset(files, pattern) {
  return files
    .filter(({ path }) => pattern.test(relative(DIST_DIR, path)))
    .sort((a, b) => b.size - a.size)[0]
}

function readPrecacheEntries(files) {
  const swPath = join(DIST_DIR, 'sw.js')
  if (!existsSync(swPath)) return []
  const sw = readFileSync(swPath, 'utf8')
  const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1])
  const byRelativePath = new Map(files.map((file) => [relative(DIST_DIR, file.path), file]))
  return urls.map((url) => byRelativePath.get(url)).filter(Boolean)
}

if (!existsSync(DIST_DIR)) {
  console.error(`✗ ${DIST_DIR}/ not found. Run npm run build first.`)
  process.exit(1)
}

const files = walk(DIST_DIR)
const distSize = files.reduce((sum, file) => sum + file.size, 0)
const largestAsset = files.reduce((largest, file) => file.size > largest.size ? file : largest, files[0])
const main = largestMatchingAsset(files, /^assets\/index-[^/]+\.js$/)
const vendor = largestMatchingAsset(files, /^assets\/vendor-[^/]+\.js$/)
const precacheEntries = readPrecacheEntries(files)
const precacheSize = precacheEntries.reduce((sum, file) => sum + file.size, 0)

const mainGzip = main ? gzipSize(main.path) : 0
const vendorGzip = vendor ? gzipSize(vendor.path) : 0

console.log('\n── Bundle budget ────────────────────────────────────────')
console.log(`  main gzip:       ${bytesToKiB(mainGzip).toFixed(2)} KiB`)
console.log(`  vendor gzip:     ${bytesToKiB(vendorGzip).toFixed(2)} KiB`)
console.log(`  precache size:   ${bytesToMiB(precacheSize).toFixed(2)} MiB (${precacheEntries.length} files)`)
console.log(`  dist size:       ${bytesToMiB(distSize).toFixed(2)} MiB`)
console.log(`  largest asset:   ${bytesToMiB(largestAsset.size).toFixed(2)} MiB (${relative(DIST_DIR, largestAsset.path)})`)

if (!main) fail('Main JS asset not found')
if (!vendor) fail('Vendor JS asset not found')
if (bytesToKiB(mainGzip) > LIMITS.mainGzipKiB) fail(`main gzip exceeds ${LIMITS.mainGzipKiB} KiB`)
if (bytesToKiB(vendorGzip) > LIMITS.vendorGzipKiB) fail(`vendor gzip exceeds ${LIMITS.vendorGzipKiB} KiB`)
if (bytesToMiB(precacheSize) > LIMITS.precacheMiB) fail(`precache exceeds ${LIMITS.precacheMiB} MiB`)
if (bytesToMiB(distSize) > LIMITS.distMiB) fail(`dist exceeds ${LIMITS.distMiB} MiB`)
if (bytesToMiB(largestAsset.size) > LIMITS.largestAssetMiB) fail(`largest asset exceeds ${LIMITS.largestAssetMiB} MiB`)

if (!process.exitCode) {
  console.log('\n✓ Bundle budget passed.')
}
