#!/usr/bin/env node
/**
 * Problem reports sent from the app (flag buttons, the header bug button),
 * read from the feedback form's responses and pointed at the files to fix
 * (docs/FEEDBACK.md).
 *
 *   npm run feedback:reports -- --csv responses.csv    # Sheets → File → Download → CSV
 *   npm run feedback:reports -- --url <csv url>        # a CSV link to the responses sheet
 *   npm run feedback:reports                           # FEEDBACK_SHEET_CSV_URL from the env or .env.local
 *
 * Options:
 *   --since YYYY-MM-DD   only reports sent on or after this day
 *   --id fb-…            only this report
 *   --all                also reports already handled (a commit message names their id)
 *   --json               print JSON instead of Markdown
 *
 * Always writes .feedback/reports-<date>.json (every report with where to
 * look). .feedback/ is not committed: it holds what users wrote.
 *
 * A report counts as handled once a commit message names its id
 * ("Fixes fb-260925-k3x9q"), so name it when you fix one.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { entriesFromCsv, formatMarkdown, locate } from './feedback-triage.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }

function envUrl() {
  if (process.env.FEEDBACK_SHEET_CSV_URL) return process.env.FEEDBACK_SHEET_CSV_URL
  try {
    const line = fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n').find((l) => l.startsWith('FEEDBACK_SHEET_CSV_URL='))
    return line?.slice('FEEDBACK_SHEET_CSV_URL='.length).trim().replace(/^["']|["']$/g, '') || undefined
  } catch { return undefined }
}

async function readCsv() {
  const file = flag('--csv')
  if (file) return fs.readFileSync(file, 'utf8')
  const url = flag('--url') ?? envUrl()
  if (!url) {
    console.error('No responses: pass --csv <file> or --url <csv url>, or set FEEDBACK_SHEET_CSV_URL (docs/FEEDBACK.md).')
    process.exit(1)
  }
  const res = await fetch(url, { redirect: 'follow' })
  const text = await res.text()
  if (!res.ok || /^\s*<!DOCTYPE html/i.test(text)) {
    console.error(`Could not download the responses (${res.status}). Is the sheet shared as "anyone with the link" or published as CSV?`)
    process.exit(1)
  }
  return text
}

/** Report ids named in commit messages. */
function handledIds() {
  try {
    const log = execFileSync('git', ['log', '--all', '--format=%B'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    return new Set(log.match(/fb-\d{6}-[a-z0-9]{5}/g) ?? [])
  } catch { return new Set() }
}

const since = flag('--since')
const onlyId = flag('--id')
const handled = handledIds()
const all = entriesFromCsv(await readCsv())
  .filter((e) => !since || (e.submittedAt ?? '') >= since)
  .filter((e) => !onlyId || e.report?.id === onlyId)
const open = args.includes('--all') || onlyId ? all : all.filter((e) => !(e.report && handled.has(e.report.id)))
const entries = open.map((e) => (e.report ? { ...e, handled: handled.has(e.report.id), locate: locate(root, e.report) } : e))

const outDir = path.join(root, '.feedback')
fs.mkdirSync(outDir, { recursive: true })
const out = path.join(outDir, `reports-${new Date().toISOString().slice(0, 10)}.json`)
fs.writeFileSync(out, `${JSON.stringify(entries, null, 2)}\n`)

if (args.includes('--json')) console.log(JSON.stringify(entries, null, 2))
else {
  console.log(formatMarkdown(entries, { handled: all.length - open.length }))
  console.log(`\nAll ${entries.length} → ${path.relative(root, out)}`)
}
