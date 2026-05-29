#!/usr/bin/env node

import { spawn } from 'node:child_process'

const includeE2e = process.argv.includes('--e2e')

const steps = [
  ['i18n strict check', 'npm', ['run', 'i18n:check:strict']],
  ['unit tests', 'npm', ['test']],
  ['production build', 'npm', ['run', 'build']],
]

if (includeE2e) {
  steps.push(
    ['desktop e2e', 'npm', ['run', 'test:e2e:desktop']],
    ['mobile e2e', 'npm', ['run', 'test:e2e:mobile']],
  )
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
