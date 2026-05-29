#!/usr/bin/env node

import { spawn } from 'node:child_process'

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
  ['unit tests', 'npm', ['test']],
  ['production build', 'npm', ['run', 'build']],
  ['bundle budget', 'npm', ['run', 'bundle:check']],
]

if (includeE2e) {
  steps.push(
    ['desktop e2e', 'npm', ['run', 'test:e2e:desktop']],
    ['mobile e2e', 'npm', ['run', 'test:e2e:mobile']],
  )
}

if (includeNative) {
  steps.push(['native build', 'npm', ['run', 'build:native']])
}

function runStep([label, command, args]) {
  return new Promise((resolve, reject) => {
    console.log(`\n==> ${label}`)
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${label} failed with exit code ${code}`))
    })
  })
}

for (const step of steps) {
  await runStep(step)
}

console.log('\n✓ Verification passed.')
