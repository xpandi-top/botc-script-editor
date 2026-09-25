/**
 * Problem reports from the app (src/lib/feedback/report.ts), read back from
 * the feedback form's responses and pointed at the files to fix
 * (docs/FEEDBACK.md). Used by scripts/feedback-reports.mjs; pure except for
 * reading the repo under `root`.
 */
import fs from 'node:fs'
import path from 'node:path'

/** Same marker as REPORT_JSON_MARKER in src/lib/feedback/report.ts. */
export const REPORT_JSON_MARKER = '--- botc-report-json ---'

/** RFC 4180 CSV, as Google Sheets downloads it. */
export function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((f) => f !== ''))
}

/** A report from a form answer, or undefined for a free-text answer. */
export function parseReportText(text) {
  const json = text.split(REPORT_JSON_MARKER)[1]
  if (!json) return undefined
  try {
    const report = JSON.parse(json)
    return report?.v === 1 && report.target ? report : undefined
  } catch {
    return undefined
  }
}

/**
 * The form's responses: each row as { row, submittedAt, report } for an app
 * report, or { row, submittedAt, text } for an answer typed in the form.
 */
export function entriesFromCsv(csv) {
  const [header = [], ...records] = parseCsv(csv.replace(/^﻿/, ''))
  const timeCol = header.findIndex((h) => /timestamp|时间戳/i.test(h))
  return records.map((cells, index) => {
    const row = index + 2 // the sheet's row number, after the header
    const stamp = timeCol === -1 ? '' : cells[timeCol] ?? ''
    const answers = cells.filter((_, i) => i !== timeCol)
    const withReport = answers.find((cell) => cell.includes(REPORT_JSON_MARKER))
    const report = withReport ? parseReportText(withReport) : undefined
    // The report's own time is exact (UTC); the sheet's is in the sheet's time zone.
    const submittedAt = report?.at ?? toIso(stamp) ?? null
    if (report) return { row, submittedAt, report }
    const text = answers.filter(Boolean).sort((a, b) => b.length - a.length)[0] ?? ''
    return { row, submittedAt, text: text.trim() }
  }).filter((entry) => entry.report || entry.text)
}

function toIso(stamp) {
  const time = Date.parse(stamp)
  return Number.isNaN(time) ? undefined : new Date(time).toISOString()
}

// ── Where to look ────────────────────────────────────────────────────────────

/** The component behind each report button (FeedbackButton surfaces). */
export const SURFACE_FILES = {
  'characters/detail': 'src/components/CharacterRevisionPanel.tsx',
  'scripts/sheet-popup': 'src/components/SheetArticle.tsx',
  'scripts/toolbar': 'src/components/tabs/ScriptsTab.tsx',
  'storyteller/seat': 'src/components/StorytellerSub/Arena/ArenaSeatPlayerModal.tsx',
  'storyteller/ability': 'src/components/StorytellerSub/Arena/ArenaSeatPlayerModalParts.tsx',
  'storyteller/sidebar': 'src/components/StorytellerHelper.tsx',
  'app/scripts': 'src/components/tabs/ScriptsTab.tsx',
  'app/characters': 'src/components/tabs/CharactersTab.tsx',
  'app/storyteller': 'src/components/StorytellerHelper.tsx',
  'app/analytics': 'src/components/tabs/AnalyticsTab.tsx',
  'app/printstudio': 'src/components/PrintStudio/PrintStudioPage.tsx',
  'app/settings': 'src/components/tabs/SettingsTab.tsx',
}

/** Code behind each part a report can point at. */
export const PART_FILES = {
  script: {
    characters: ['src/components/tabs/ScriptEditor.tsx', 'src/components/SheetArticle.tsx'],
    night: ['src/components/ScriptsTab/NightOrderPreview.tsx', 'assets/characters/night-order.json'],
    info: ['src/components/SheetArticle.tsx'],
    sheet: ['src/components/SheetArticle.tsx', 'src/components/PrintOptionsDialog.tsx'],
    export: ['src/components/PrintOptionsDialog.tsx', 'src/components/PrintPreviewPage.tsx'],
  },
  storyteller: {
    night: ['src/components/StorytellerSub/Arena/ArenaSeatPlayerModal.tsx', 'src/components/StorytellerSub/Arena/ArenaSeat.tsx', 'assets/characters/night-order.json'],
    seat: ['src/components/StorytellerSub/Arena/ArenaSeat.tsx', 'src/components/StorytellerSub/Arena/ArenaSeatPlayerModal.tsx'],
    reminders: ['src/components/StorytellerSub/Arena/ArenaSeatPlayerModal.tsx', 'src/components/StorytellerSub/Arena/ArenaSeatComponents.tsx'],
    nomination: ['src/components/StorytellerSub/Arena/ArenaCenterNominationSheet.tsx', 'src/components/StorytellerSub/Arena/NominationVoteList.tsx'],
    setup: ['src/components/StorytellerSub/Modals/ModalsNewGame.tsx', 'src/components/StorytellerSub/Modals/AssignmentCenter.tsx'],
    log: ['src/components/StorytellerSub/LeftLogPanel.tsx', 'src/components/StorytellerSub/Arena/AggregatedLogModal.tsx', 'src/utils/logI18n.ts'],
    timer: ['src/components/StorytellerSub/Arena/PhaseControlPanel.tsx', 'src/components/StorytellerSub/BgmBar.tsx'],
  },
}

/** Files whose text a selection or a quoted text is looked up in. */
const TEXT_GLOBS = [
  ['assets/locales', /\.json$/],
  ['assets/characters/individual', /\.json$/],
  ['assets/almanac', /\.(en|zh)\.json$/],
  ['assets/scripts', /\.json$/],
  ['assets/scripts/community', /\.json$/],
  ['src/components/Tutorial', /\.ts$/],
  ['src/utils', /^logI18n\.ts$/],
]

const exists = (root, file) => fs.existsSync(path.join(root, file))
const readJson = (root, file) => { try { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) } catch { return undefined } }

/** Up to `max` places where `text` (or its first line) appears, as "file:line". */
export function findText(root, text, max = 8) {
  const needle = text?.split('\n').map((l) => l.trim()).find((l) => l.length >= 2)?.slice(0, 80)
  if (!needle) return []
  const found = []
  for (const [dir, pattern] of TEXT_GLOBS) {
    let names = []
    try { names = fs.readdirSync(path.join(root, dir)).filter((n) => pattern.test(n)).sort() } catch { continue }
    for (const name of names) {
      const file = `${dir}/${name}`
      const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n')
      lines.forEach((line, i) => { if (found.length < max && line.includes(needle)) found.push(`${file}:${i + 1}`) })
      if (found.length >= max) return found
    }
  }
  return found
}

function almanacFiles(root, id) {
  const index = readJson(root, 'assets/almanac/index.json')
  return Object.entries(index?.files ?? {}).filter(([, f]) => f.characters?.includes(id)).map(([name]) => `assets/almanac/${name}`)
}

const quote = (text) => JSON.stringify(text)

function characterLocate(root, id, report, out) {
  const file = `assets/characters/individual/${id}.json`
  const snapshot = report.target.type === 'character' ? report.snapshot : report.snapshot?.character
  const edits = snapshot?.localEdits ?? []
  if (edits.includes('custom')) {
    out.notes.push('A custom character made on the user\'s device: not in the repo.')
    return
  }
  if (!exists(root, file)) {
    out.notes.push(`${file} does not exist: a character from an imported pack or a script's own definitions.`)
    return
  }
  out.files.push(file)
  const parts = report.parts ?? []
  if (parts.includes('almanac')) out.files.push(...almanacFiles(root, id))
  if (parts.includes('jinx')) out.files.push('assets/jinxes.json', 'assets/locales/en.jinxes.json', 'assets/locales/zh.jinxes.json')
  if (parts.includes('icon')) {
    const icon = fs.readdirSync(path.join(root, 'assets/icons')).find((n) => n.replace(/\.[^.]+$/, '') === id)
    out.files.push(icon ? `assets/icons/${icon}` : `assets/icons/ (no icon for ${id})`)
  }
  if (parts.includes('night')) out.files.push('assets/characters/night-order.json')
  if (edits.length) out.notes.push(`The user had local edits (${edits.join(', ')}): check the text they saw against the repo before changing it.`)

  // Has the repo text changed since? Then it may already be fixed.
  const data = readJson(root, file)
  if (data && snapshot) {
    const changed = ['en', 'zh'].flatMap((lang) => [
      snapshot.name?.[lang] && data[lang]?.name && snapshot.name[lang] !== data[lang].name ? `${lang} name` : '',
      snapshot.ability?.[lang] && !snapshot.pinnedByScript && data[lang]?.ability && snapshot.ability[lang] !== data[lang].ability ? `${lang} ability` : '',
    ]).filter(Boolean)
    if (changed.length) out.notes.push(`Changed in the repo since the report (${changed.join(', ')}): may already be fixed.`)
  }

  const expected = report.expected
  const issues = report.issues ?? []
  if (expected && parts.includes('ability') && (issues.includes('wrong') || issues.includes('translation'))) {
    const lang = /[一-鿿]/.test(expected) ? 'zh' : 'en'
    out.commands.push(`npm run add-revision -- ${id} --${lang} ${quote(expected)} --note ${quote(`${report.id}: ${report.comment ?? 'user report'}`)}`)
  }
  if (parts.includes('ability')) out.commands.push(`npm run check-abilities   # compare ${id} with the official and 集石 texts`)
  if (parts.includes('reminders')) out.commands.push('npm run sync-reminders   # add -- --write to update')
  if (parts.includes('almanac')) out.commands.push('npm run build:guides -- --refresh')
  if (String(snapshot?.edition ?? '').startsWith('community-')) out.notes.push('Community pack character: see scripts/community-packs.json and `npm run import:packs`.')
}

/** The files, commands and notes that help fix a report. */
export function locate(root, report) {
  const out = { files: [], commands: [], notes: [], matches: [] }
  const { target } = report
  const surface = SURFACE_FILES[report.surface]
  if (surface) out.files.push(surface)

  if (target.type === 'character') characterLocate(root, target.id, report, out)
  if (target.type === 'storyteller') {
    for (const part of report.parts ?? []) out.files.push(...(PART_FILES.storyteller[part] ?? []))
    if (target.characterId) characterLocate(root, target.characterId, report, out)
  }
  if (target.type === 'script') {
    const snapshot = report.snapshot ?? {}
    const file = ['assets/scripts', 'assets/scripts/community'].map((dir) => `${dir}/${snapshot.sourceFile}`).find((f) => snapshot.sourceFile && exists(root, f))
    if (snapshot.origin === 'user') out.notes.push('The user\'s own script: not in the repo (the snapshot has its characters).')
    else if (file) out.files.push(file)
    for (const part of report.parts ?? []) out.files.push(...(PART_FILES.script[part] ?? []))
    if (snapshot.origin === 'community') out.notes.push('Imported community script: see docs/COMMUNITY-CONTENT.md and `npm run import:scripts`.')
  }
  if (report.surface?.startsWith('crash/') || report.errors?.length) {
    out.notes.push(`Errors: ${(report.errors ?? []).map((e) => e.message).join(' | ') || 'none recorded'}`)
  }
  // Quoted text: the selection, else a quote in a translation note, is looked up in the
  // locale and data files; places in the files above come first.
  const quoted = (report.issues ?? []).includes('translation') ? report.comment?.match(/[「“"]([^」”"]{2,80})[」”"]/)?.[1] : undefined
  const needle = report.selection || quoted
  if (needle) {
    const own = (match) => out.files.some((file) => match.startsWith(`${file}:`))
    out.matches = findText(root, needle, 40).sort((a, b) => Number(own(b)) - Number(own(a))).slice(0, 8)
  }
  out.files = [...new Set(out.files)]
  out.commands = [...new Set(out.commands)]
  return out
}

// ── Output ───────────────────────────────────────────────────────────────────

const TARGET_TEXT = { character: 'Character', script: 'Script', storyteller: 'Storyteller', page: 'Page' }

export function summarize(entries) {
  const reports = entries.filter((e) => e.report)
  const count = (key) => reports.reduce((acc, e) => {
    for (const k of [].concat(key(e.report))) acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  return {
    total: entries.length,
    reports: reports.length,
    freeText: entries.length - reports.length,
    byTarget: count((r) => r.target.type),
    byIssue: count((r) => (r.issues?.length ? r.issues : ['(none)'])),
    byBuild: count((r) => r.app?.build ?? '?'),
  }
}

const counts = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ')

/** Markdown for an agent or a person: a summary, then each report with where to look. */
export function formatMarkdown(entries, { handled = 0 } = {}) {
  const s = summarize(entries)
  const lines = [
    `# Feedback reports (${s.reports} from the app, ${s.freeText} typed in the form${handled ? `, ${handled} already handled` : ''})`,
    '',
    s.reports ? `By target: ${counts(s.byTarget)}  \nBy issue: ${counts(s.byIssue)}  \nBy build: ${counts(s.byBuild)}` : '',
    '',
  ]
  for (const entry of entries) {
    const r = entry.report
    if (!r) continue
    lines.push(`## ${r.id} · ${TARGET_TEXT[r.target.type] ?? r.target.type}: ${r.label}${r.parts?.length ? ` — ${r.parts.join(', ')}` : ''}`)
    lines.push('')
    if (r.issues?.length) lines.push(`- Issue: ${r.issues.join(', ')}`)
    if (r.comment) lines.push(`- Note: ${r.comment}`)
    if (r.expected) lines.push(`- Should be: ${r.expected}`)
    if (r.selection) lines.push(`- Selected text: “${r.selection}”`)
    lines.push(`- Where: ${r.surface} · ${r.app?.language} · build ${r.app?.build} · ${entry.submittedAt ?? r.at} · sheet row ${entry.row}`)
    const where = entry.locate
    if (where?.files.length) lines.push(`- Files: ${where.files.map((f) => `\`${f}\``).join(', ')}`)
    if (where?.matches.length) lines.push(`- Text found at: ${where.matches.map((f) => `\`${f}\``).join(', ')}`)
    for (const note of where?.notes ?? []) lines.push(`- ${note}`)
    for (const command of where?.commands ?? []) lines.push(`- \`${command}\``)
    lines.push('')
  }
  const free = entries.filter((e) => !e.report)
  if (free.length) {
    lines.push('## Typed in the form', '')
    for (const e of free) lines.push(`- (row ${e.row}, ${e.submittedAt ?? '?'}) ${e.text.replace(/\s+/g, ' ').slice(0, 500)}`)
    lines.push('')
  }
  return lines.join('\n')
}
