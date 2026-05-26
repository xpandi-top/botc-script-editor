#!/usr/bin/env node
/**
 * Upload macOS DMGs and Android APK to a GitHub release.
 *
 * Usage:
 *   node scripts/github-release.mjs [--tag v0.1.0] [--create] [--clobber]
 *
 * Flags:
 *   --tag <tag>   Release tag (default: v<version> from package.json)
 *   --create      Create the release + tag if it doesn't exist
 *   --clobber     Overwrite existing assets with same name
 *
 * Requirements:
 *   gh CLI authenticated: gh auth login
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── Config ────────────────────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))

const args = process.argv.slice(2)
const getFlag = (flag) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : null
}
const hasFlag = (flag) => args.includes(flag)

const VERSION = pkg.version
const TAG     = getFlag('--tag') ?? `v${VERSION}`
const CREATE  = hasFlag('--create')
const CLOBBER = hasFlag('--clobber')

const ASSETS = [
  resolve(ROOT, `release/BOTC Storyteller-${VERSION}-arm64.dmg`),
  resolve(ROOT, `release/BOTC Storyteller-${VERSION}.dmg`),
  resolve(ROOT, 'android/app/build/outputs/apk/debug/app-debug.apk'),
]

const RELEASE_NOTES = `## BOTC Storyteller ${TAG}

### Download

| Platform | File | Notes |
|----------|------|-------|
| macOS Apple Silicon | \`BOTC Storyteller-${VERSION}-arm64.dmg\` | Right-click → Open on first launch |
| macOS Intel | \`BOTC Storyteller-${VERSION}.dmg\` | Right-click → Open on first launch |
| Android | \`app-debug.apk\` | Enable "Install unknown apps" in Settings first |

### macOS install
1. Download DMG for your chip (arm64 = Apple Silicon M1/M2/M3/M4, x64 = Intel)
2. Open DMG → drag app to Applications
3. First launch: right-click → Open (bypasses Gatekeeper for unsigned app)
   Or run: \`xattr -cr "/Applications/BOTC Storyteller.app"\`

### Android install
1. Download \`app-debug.apk\` to your device
2. Settings → Security → enable "Install unknown apps" for your browser/Files app
3. Tap the APK → Install`

// ── Helpers ───────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts }).trim()
}

function checkGh() {
  try {
    run('gh auth status', { silent: true })
  } catch {
    console.error('❌  gh CLI not authenticated. Run: gh auth login')
    process.exit(1)
  }
}

function releaseExists(tag) {
  try {
    run(`gh release view ${tag}`, { silent: true })
    return true
  } catch {
    return false
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

checkGh()

// Validate assets exist
const missing = ASSETS.filter(f => !existsSync(f))
if (missing.length) {
  console.error('❌  Missing artifacts:')
  missing.forEach(f => console.error('   ', f))
  console.error('\nBuild first:')
  console.error('  npm run dist:mac          # macOS DMGs')
  console.error('  npm run android:build     # Android APK')
  process.exit(1)
}

console.log(`\n🚀  Releasing ${TAG} to GitHub...\n`)

// Create release if needed
if (!releaseExists(TAG)) {
  if (!CREATE) {
    console.error(`❌  Release ${TAG} does not exist. Re-run with --create to create it.`)
    process.exit(1)
  }
  console.log(`📝  Creating release ${TAG}...`)
  run(`gh release create ${TAG} --title "BOTC Storyteller ${TAG}" --notes ${JSON.stringify(RELEASE_NOTES)}`)
} else {
  console.log(`✅  Release ${TAG} exists — uploading assets...`)
}

// Upload assets
const clobberFlag = CLOBBER ? ' --clobber' : ''
for (const asset of ASSETS) {
  const name = asset.split('/').pop()
  console.log(`⬆️   Uploading ${name}...`)
  try {
    run(`gh release upload ${TAG} ${JSON.stringify(asset)}${clobberFlag}`)
    console.log(`✅  ${name}`)
  } catch (err) {
    console.error(`❌  Failed: ${name}`)
    console.error('    Retry manually:', `gh release upload ${TAG} "${asset}"${clobberFlag}`)
  }
}

console.log(`\n🎉  Done! View release at:`)
run(`gh release view ${TAG} --json url --jq '.url'`, { silent: false })
