#!/usr/bin/env node
/**
 * Export and summarize answer feedback (docs/AI-ARCHITECTURE-OFFLINE-FIRST.md §19).
 *
 *   npm run feedback                    # last 7 days from the deployed D1 (wrangler login needed)
 *   npm run feedback -- --days 30
 *   npm run feedback -- --local         # the local dev database (wrangler dev)
 *   npm run feedback -- --file x.jsonl  # summarize an earlier export
 *   npm run feedback -- --csv form.csv  # the Google Form's responses (Sheets → Download → CSV)
 *
 * Writes .feedback/feedback-<date>.jsonl (all rows) and
 * .feedback/eval-drafts-<date>.json (👎 answers as draft eval cases), and
 * prints the summary. .feedback/ is not committed: it holds user questions.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { evalDrafts, formatSummary, rowsFromFormCsv, summarize } from './feedbackReport.mjs'

const args = process.argv.slice(2)
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
const days = Number(flag('--days') ?? 7)
const file = flag('--file')
const csv = flag('--csv')
const outDir = path.resolve('.feedback')
const stamp = new Date().toISOString().slice(0, 10)

function fetchRows() {
  const since = Date.now() - days * 86_400_000
  const sql = `SELECT id, created_at, kind, rating, reasons, comment, language, route, provider, model, prompt_version, build, question, payload FROM ai_feedback WHERE created_at >= ${since} ORDER BY created_at`
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'botc-library', args.includes('--local') ? '--local' : '--remote', '--json', '--command', sql], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  return JSON.parse(out).flatMap((result) => result.results ?? [])
}

const rows = csv ? rowsFromFormCsv(fs.readFileSync(csv, 'utf8'))
  : file ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
  : fetchRows()

fs.mkdirSync(outDir, { recursive: true })
if (!file && !csv) fs.writeFileSync(path.join(outDir, `feedback-${stamp}.jsonl`), rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''))
const drafts = evalDrafts(rows)
fs.writeFileSync(path.join(outDir, `eval-drafts-${stamp}.json`), `${JSON.stringify(drafts, null, 2)}\n`)
console.log(formatSummary(summarize(rows)))
console.log(`\n${drafts.length} draft eval cases → .feedback/eval-drafts-${stamp}.json${file || csv ? '' : `\nAll rows → .feedback/feedback-${stamp}.jsonl`}`)
