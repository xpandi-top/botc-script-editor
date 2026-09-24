/**
 * MdText — the small Markdown subset AI answers use, without a dependency:
 * headings, lists (nested), tables, block quotes, code blocks, rules, and
 * inline **bold**, *italic* / _italic_, `code` and links. Long words and URLs
 * wrap inside the bubble; tables and code scroll horizontally. Leftover
 * <think> tags from reasoning models are dropped.
 */
import { Box, Divider, Link, Typography } from '@mui/material'
import { Fragment, memo, type ReactNode } from 'react'
import { splitInlineList, stripThinking } from '../../lib/ai/modelText'

const SAFE_URL = /^https?:\/\//i

/** A readable, shortened label for a long (often percent-encoded) URL. */
function urlLabel(url: string): string {
  let label = url
  try { label = decodeURI(url) } catch { /* keep encoded */ }
  label = label.replace(/^https?:\/\//i, '')
  return label.length > 48 ? `${label.slice(0, 30)}…${label.slice(-14)}` : label
}

function link(href: string, children: ReactNode, key: string | number) {
  if (!SAFE_URL.test(href)) return <Fragment key={key}>{children}</Fragment>
  return (
    <Link key={key} href={href} target="_blank" rel="noopener noreferrer" sx={{ wordBreak: 'break-all' }}>
      {children}
    </Link>
  )
}

// `code`, [text](url), **bold**, *italic*, bare http(s) URLs (stopping at spaces and CJK punctuation).
const INLINE = /(`[^`]+`)|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|(https?:\/\/[^\s<>()（）【】「」，。、；！？"']+)/g

export function inline(raw: string): ReactNode[] {
  // _italic_ only when it stands alone (not inside ids like high_priestess).
  const text = raw.replace(/(^|[\s(（【「])_([^_\n]+?)_(?=$|[\s.,;:!?)）。，；：！？】」])/g, '$1*$2*')
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > last) out.push(text.slice(last, m.index))
    const key = m.index!
    if (m[1]) {
      out.push(<Box key={key} component="code" sx={{ fontFamily: 'monospace', fontSize: '0.78em', bgcolor: 'action.hover', px: 0.4, borderRadius: 0.5, wordBreak: 'break-all' }}>{m[1].slice(1, -1)}</Box>)
    } else if (m[2]) {
      out.push(link(m[3], inline(m[2]), key))
    } else if (m[4]) {
      out.push(<strong key={key}>{inline(m[4])}</strong>)
    } else if (m[5]) {
      out.push(<em key={key}>{inline(m[5])}</em>)
    } else if (m[6]) {
      out.push(link(m[6], urlLabel(m[6]), key))
    }
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
const isSeparator = (row: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(row)

function Table({ rows, id }: { rows: string[]; id: number }) {
  const header = rows.length > 1 && isSeparator(rows[1]) ? cells(rows[0]) : null
  const body = (header ? rows.slice(2) : rows).filter((r) => !isSeparator(r)).map(cells)
  const cellSx = { border: '1px solid', borderColor: 'divider', px: 0.6, py: 0.3, verticalAlign: 'top', textAlign: 'left' } as const
  return (
    <Box key={id} sx={{ overflowX: 'auto', my: 0.5, maxWidth: '100%' }}>
      <Box component="table" sx={{ borderCollapse: 'collapse', fontSize: '0.95em', minWidth: '100%' }}>
        {header && (
          <thead><tr>{header.map((c, i) => <Box component="th" key={i} sx={{ ...cellSx, fontWeight: 700, bgcolor: 'action.hover' }}>{inline(c)}</Box>)}</tr></thead>
        )}
        <tbody>
          {body.map((row, r) => <tr key={r}>{row.map((c, i) => <Box component="td" key={i} sx={cellSx}>{inline(c)}</Box>)}</tr>)}
        </tbody>
      </Box>
    </Box>
  )
}

export const MdText = memo(function MdText({ text }: { text: string }) {
  const lines = splitInlineList(stripThinking(text)).split('\n')
  const nodes: ReactNode[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      const code: string[] = []
      while (++i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i])
      nodes.push(<Box key={i} component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75em', bgcolor: 'action.hover', p: 0.75, borderRadius: 1, overflowX: 'auto', my: 0.5, whiteSpace: 'pre' }}>{code.join('\n')}</Box>)
      continue
    }
    if (trimmed.startsWith('|')) {
      const rows: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++])
      i--
      nodes.push(<Table key={i} id={i} rows={rows} />)
      continue
    }
    if (trimmed.startsWith('>')) {
      const quote: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) quote.push(lines[i++].trim().replace(/^>\s?/, ''))
      i--
      nodes.push(<Box key={i} sx={{ borderLeft: '3px solid', borderColor: 'divider', pl: 1, my: 0.5, color: 'text.secondary' }}><MdText text={quote.join('\n')} /></Box>)
      continue
    }
    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      nodes.push(
        <Typography key={i} component="div" sx={{ fontWeight: 700, fontSize: level <= 2 ? '0.9rem' : '0.82rem', mt: nodes.length ? 1 : 0, mb: 0.2, lineHeight: 1.4 }}>
          {inline(heading[2])}
        </Typography>,
      )
      continue
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      nodes.push(<Divider key={i} sx={{ my: 0.75 }} />)
      continue
    }
    const bullet = line.match(/^(\s*)([-*+•]|\d+[.)])\s+(.*)$/)
    if (bullet) {
      const depth = Math.min(3, Math.floor(bullet[1].replace(/\t/g, '  ').length / 2))
      const marker = /\d/.test(bullet[2]) ? bullet[2].replace(')', '.') : '•'
      nodes.push(
        <Box key={i} sx={{ display: 'flex', gap: 0.5, ml: 1 + depth * 1.5, lineHeight: 1.5 }}>
          <Box component="span" sx={{ flexShrink: 0, minWidth: marker === '•' ? 0 : 16 }}>{marker}</Box>
          <Box component="span" sx={{ minWidth: 0 }}>{inline(bullet[3])}</Box>
        </Box>,
      )
      continue
    }
    if (!trimmed) {
      nodes.push(<Box key={i} sx={{ height: '0.35em' }} />)
      continue
    }
    nodes.push(<Box key={i} sx={{ lineHeight: 1.5 }}>{inline(line)}</Box>)
  }
  return <Box sx={{ minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{nodes}</Box>
})
