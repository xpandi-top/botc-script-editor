#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: npm run verify -- [options]

Options:
  --e2e       Also run desktop and mobile Playwright smoke tests.
  --native    Also run the native Vite build.
  --platform  Alias for --native.
`)
  process.exit(0)
}

const includeE2e = process.argv.includes('--e2e')
const includeNative = process.argv.includes('--native') || process.argv.includes('--platform')

const steps = [
  ['i18n strict check', 'npm', ['run', 'i18n:check:strict']],
  ['core boundary type check', 'npm', ['run', 'core:check']],
  ['unit tests', 'npm', ['test']],
  ['production build', 'npm', ['run', 'build']],
  ['bundle budget', 'npm', ['run', 'bundle:check']],
  // Regenerating needs a Gemini key, so stale embeddings only warn.
  ['character embeddings up to date', 'node', ['scripts/build-embeddings.mjs', '--check'], { warnOnly: true }],
]

// The API worker has its own dependencies (cd worker && npm install).
if (existsSync('worker/node_modules')) {
  steps.push(
    ['worker type check', 'npm', ['--prefix', 'worker', 'run', 'typecheck']],
    ['worker tests (API + MCP)', 'npm', ['--prefix', 'worker', 'test']],
  )
} else {
  console.log('Skipping worker tests: run `npm install` in worker/ to include them.')
}

if (includeE2e) {
  steps.push(
    ['desktop e2e', 'npm', ['run', 'test:e2e:desktop']],
    ['mobile e2e', 'npm', ['run', 'test:e2e:mobile']],
  )
}

if (includeNative) {
  steps.push(['native build', 'npm', ['run', 'build:native']])
}

function runStep([label, command, args, { warnOnly = false } = {}]) {
  return new Promise((resolve, reject) => {
    console.log(`\n==> ${label}`)
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else if (warnOnly) {
        console.warn(`  ⚠ ${label}: check failed (exit code ${code}), continuing`)
        resolve()
      } else reject(new Error(`${label} failed with exit code ${code}`))
    })
  })
}

for (const step of steps) {
  await runStep(step)
}

console.log('\n✓ Verification passed.')
