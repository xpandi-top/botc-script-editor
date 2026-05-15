import { Box, Divider, IconButton, Paper, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
// @ts-ignore — Vite ?raw import
import raw from '../../docs/CHANGELOG.md?raw'

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

function ChangelogContent() {
  const lines = (raw as string).split('\n')
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

    // H2 — date entry
    if (line.startsWith('## ')) {
      inList = false
      const label = line.slice(3)
      const isLatest = /latest/i.test(label)
      elements.push(
        <Typography key={key++} variant="h6"
          sx={{ fontWeight: 700, mt: 2.5, mb: 0.5, color: isLatest ? 'primary.main' : 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}
        >
          {label}
          {isLatest && (
            <Box component="span" sx={{ fontSize: '0.65rem', fontWeight: 700, px: 0.75, py: '1px', borderRadius: 1, bgcolor: 'primary.main', color: 'primary.contrastText', verticalAlign: 'middle' }}>
              LATEST
            </Box>
          )}
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

// ── Page component ────────────────────────────────────────────────────────────

export function ChangelogPage({ onClose, language }: Props) {
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
          {language === 'zh' ? '更新日志' : 'Changelog'}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 4 }, py: 3, maxWidth: 720, mx: 'auto', width: '100%' }}>
        <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
          <ChangelogContent />
        </Box>
      </Box>
    </Box>
  )
}
