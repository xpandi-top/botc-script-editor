/**
 * Reading problem reports back (scripts/feedback-triage.mjs, used by
 * `npm run feedback:reports`, docs/FEEDBACK.md): reports from the form's
 * responses CSV, pointed at the files, text and commands that fix them.
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { initialScripts } from '../catalog'
import { characterRequest, scriptRequest } from '../lib/feedback/snapshot'
import { feedbackReport, reportText, REPORT_JSON_MARKER, type FeedbackReport } from '../lib/feedback/report'
import { entriesFromCsv, formatMarkdown, locate, PART_FILES, REPORT_JSON_MARKER as TRIAGE_MARKER, SURFACE_FILES } from '../../scripts/feedback-triage.mjs'

const root = path.resolve(__dirname, '../..')
const report = (fields: Partial<Parameters<typeof feedbackReport>[0]> = {}): FeedbackReport => feedbackReport({
  language: 'zh', ...characterRequest('washerwoman', 'characters/detail'), issues: ['translation'], parts: ['ability'], ...fields,
})

describe('triage', () => {
  it('reads the marker the app writes', () => {
    expect(TRIAGE_MARKER).toBe(REPORT_JSON_MARKER)
  })

  const csvCell = (text: string) => `"${text.replace(/"/g, '""')}"`

  it('reads reports and typed answers from the responses CSV, and points at the files', () => {
    const fromCharacter = report({ comment: '翻译不对', expected: '首夜，你会得知两名玩家……', selection: '洗衣妇' })
    const script = initialScripts.find((s) => s.slug === 'trouble_brewing') ?? initialScripts[0]
    const fromScript = feedbackReport({ language: 'en', ...scriptRequest(script, 'scripts/toolbar'), issues: ['missing'], parts: ['night'] })
    const csv = [
      'Timestamp,Detailed Description of the Bug or Feature Suggestion:',
      `9/25/2026 10:00:00,${csvCell(reportText(fromCharacter))}`,
      `9/25/2026 11:00:00,${csvCell(reportText(fromScript))}`,
      '9/25/2026 12:00:00,The timer is too quiet',
    ].join('\n')
    const entries = entriesFromCsv(csv)
    expect(entries).toHaveLength(3)
    expect(entries[0].report.id).toBe(fromCharacter.id)
    expect(entries[2]).toMatchObject({ row: 4, text: 'The timer is too quiet' })

    const where = locate(root, entries[0].report)
    expect(where.files).toEqual(['src/components/CharacterRevisionPanel.tsx', 'assets/characters/individual/washerwoman.json'])
    expect(where.commands[0]).toMatch(/^npm run add-revision -- washerwoman --zh "首夜，你会得知两名玩家……" --note "fb-/)
    expect(where.matches.some((m: string) => m.startsWith('assets/characters/individual/washerwoman.json:'))).toBe(true)

    const scriptWhere = locate(root, entries[1].report)
    expect(scriptWhere.files).toContain('src/components/ScriptsTab/NightOrderPreview.tsx')
    expect(scriptWhere.files.some((f: string) => f.startsWith('assets/scripts/'))).toBe(true)

    const markdown = formatMarkdown(entries.map((e: { report?: FeedbackReport }) => (e.report ? { ...e, locate: locate(root, e.report) } : e)))
    expect(markdown).toContain(`## ${fromCharacter.id} · Character: Washerwoman / 洗衣妇 (washerwoman) — ability`)
    expect(markdown).toContain('## Typed in the form')
  })

  it('names only files that exist', () => {
    const files = [...Object.values(SURFACE_FILES), ...Object.values(PART_FILES).flatMap((parts) => Object.values(parts as Record<string, string[]>).flat())] as string[]
    for (const file of files) expect(fs.existsSync(path.join(root, file)), file).toBe(true)
  })
})
