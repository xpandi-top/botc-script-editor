import { useMemo, useState } from 'react'
import { Box, Collapse, Divider, IconButton, Paper, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
// @ts-ignore — Vite ?raw import
import raw from '../../docs/CHANGELOG.md?raw'
import { useT } from '../context/I18nContext'
import { parseChangelog, type ChangelogRelease } from '../lib/changelog'

interface Props {
  onClose: () => void
  language: 'en' | 'zh'
}

// ── Minimal markdown renderer for this changelog's structure ──────────────────

function renderInline(text: string) {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  )
}

function MarkdownLines({ lines }: { lines: string[] }) {
  const elements: React.ReactNode[] = []
  let key = 0
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // HR
    if (/^---+$/.test(line.trim())) {
      if (inList) { inList = false }
      elements.push(<Divider key={key++} sx={{ my: 1.5, borderColor: 'divider' }} />)
      continue
    }

    // H1
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      inList = false
      elements.push(
        <Typography key={key++} variant="h5" sx={{ fontWeight: 800, mb: 0.5, mt: 0 }}>
          {line.slice(2)}
        </Typography>
      )
      continue
    }

    // H3 — Added / Fixed / Changed / Security / Tests
    if (line.startsWith('### ')) {
      inList = false
      const label = line.slice(4)
      const colorMap: Record<string, string> = {
        Added: 'success.main', Fixed: 'error.main', Changed: 'info.main',
        Security: 'warning.main', Tests: 'text.secondary',
      }
      const color = colorMap[label] ?? 'text.secondary'
      elements.push(
        <Typography key={key++} variant="overline"
          sx={{ display: 'block', fontWeight: 700, fontSize: '0.65rem', color, mt: 1.25, mb: 0.25, letterSpacing: '0.08em' }}
        >
          {label}
        </Typography>
      )
      continue
    }

    // Bullet list item
    if (line.startsWith('- ')) {
      if (!inList) inList = true
      elements.push(
        <Box key={key++} component="li"
          sx={{ fontSize: '0.82rem', lineHeight: 1.55, mb: 0.4, ml: 1.5, listStyleType: 'disc', display: 'list-item' }}
        >
          {renderInline(line.slice(2))}
        </Box>
      )
      continue
    }

    // Blank line — end list, add small gap
    if (line.trim() === '') {
      inList = false
      continue
    }

    // Regular paragraph
    inList = false
    elements.push(
      <Typography key={key++} variant="body2" sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 0.5 }}>
        {renderInline(line)}
      </Typography>
    )
  }

  return <>{elements}</>
}

function ReleasePanel({
  release,
  expanded,
  onToggle,
}: {
  release: ChangelogRelease
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useT()
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ mb: 1, overflow: 'hidden', borderColor: expanded ? 'primary.light' : 'divider' }}
    >
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        sx={{
          width: '100%',
          border: 0,
          bgcolor: expanded ? 'rgba(133,63,34,0.06)' : 'background.paper',
          color: 'text.primary',
          px: { xs: 1.25, sm: 1.5 },
          py: 1.15,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          textAlign: 'left',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
            {release.date ?? release.label}
          </Typography>
          {release.title !== release.date && (
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.25 }}>
              {release.title}
            </Typography>
          )}
        </Box>
        {release.isLatest && (
          <Box component="span" sx={{ fontSize: '0.65rem', fontWeight: 800, px: 0.75, py: '2px', borderRadius: 1, bgcolor: 'primary.main', color: 'primary.contrastText', flexShrink: 0 }}>
            {t('latest_release')}
          </Box>
        )}
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none', px: { xs: 1.5, sm: 2 }, py: 1.5 }}>
          <MarkdownLines lines={release.lines} />
        </Box>
      </Collapse>
    </Paper>
  )
}

// ── Page component ────────────────────────────────────────────────────────────

export function ChangelogPage({ onClose }: Props) {
  const { t } = useT()
  const parsed = useMemo(() => parseChangelog(raw as string), [])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(parsed.releases[0] ? [parsed.releases[0].id] : []))
  const toggleRelease = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 1400,
      bgcolor: 'background.default',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Paper elevation={2} square sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
        <IconButton size="small" onClick={onClose} sx={{ mr: 0.5 }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
          {t('changelog')}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 4 }, py: 3, maxWidth: 720, mx: 'auto', width: '100%' }}>
        {parsed.title && (
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, mt: 0 }}>
            {parsed.title}
          </Typography>
        )}
        <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none', mb: 2 }}>
          <MarkdownLines lines={parsed.introLines} />
        </Box>
        {parsed.releases.map((release) => (
          <ReleasePanel
            key={release.id}
            release={release}
            expanded={expanded.has(release.id)}
            onToggle={() => toggleRelease(release.id)}
          />
        ))}
      </Box>
    </Box>
  )
}
