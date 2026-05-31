export const CHANGELOG_SEEN_KEY = 'botc-changelog-seen-release'

export type ChangelogRelease = {
  id: string
  label: string
  date: string | null
  title: string
  isLatest: boolean
  lines: string[]
}

export type ParsedChangelog = {
  title: string | null
  introLines: string[]
  releases: ChangelogRelease[]
}

function releaseId(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, ' ')
}

function splitReleaseLabel(label: string) {
  const normalized = label.trim()
  const withoutLatest = normalized.replace(/\s*\(latest\)\s*$/i, '').trim()
  const match = withoutLatest.match(/^(\d{4}-\d{2}-\d{2})(?:\s+[—-]\s+(.+))?$/)
  return {
    date: match?.[1] ?? null,
    title: match?.[2]?.trim() || withoutLatest,
    isLatest: /\(latest\)\s*$/i.test(normalized),
  }
}

export function parseChangelog(markdown: string): ParsedChangelog {
  const lines = markdown.split('\n')
  let title: string | null = null
  const introLines: string[] = []
  const releases: ChangelogRelease[] = []
  const idCounts = new Map<string, number>()
  let current: ChangelogRelease | null = null

  for (const line of lines) {
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      title = line.slice(2).trim()
      continue
    }

    if (line.startsWith('## ')) {
      const label = line.slice(3).trim()
      const parts = splitReleaseLabel(label)
      const baseId = releaseId(label)
      const seenCount = idCounts.get(baseId) ?? 0
      idCounts.set(baseId, seenCount + 1)
      current = {
        id: seenCount === 0 ? baseId : `${baseId}#${seenCount + 1}`,
        label,
        date: parts.date,
        title: parts.title,
        isLatest: parts.isLatest,
        lines: [],
      }
      releases.push(current)
      continue
    }

    if (current) current.lines.push(line)
    else introLines.push(line)
  }

  return { title, introLines, releases }
}

export function getLatestChangelogReleaseId(markdown: string): string | null {
  return parseChangelog(markdown).releases[0]?.id ?? null
}
