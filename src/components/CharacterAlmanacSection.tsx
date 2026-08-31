import { useEffect, useState } from 'react'
import { Box, CircularProgress, Collapse, Divider, Link, Typography } from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { CompactButton } from './ui'
import { getAlmanacEntry, hasAlmanac } from '../catalog'
import type { AlmanacCharacterEntry } from '../catalog'
import type { Language } from '../types'
import { useT } from '../context/I18nContext'
import type { UiKey } from '../lib/t'

/** Prose fields rendered in order, with the ui key used for each heading. */
const SECTIONS: Array<{ field: keyof AlmanacCharacterEntry; label: UiKey }> = [
  { field: 'summary', label: 'almanac_summary' },
  { field: 'howto', label: 'almanac_howto' },
  { field: 'examples', label: 'almanac_examples' },
  { field: 'rules', label: 'almanac_rules' },
  { field: 'reminder_details', label: 'almanac_reminder_details' },
  { field: 'tips', label: 'almanac_tips' },
  { field: 'bluffing', label: 'almanac_bluffing' },
  { field: 'flavor', label: 'almanac_flavor' },
]

/**
 * Collapsible almanac panel for a character. The almanac file is fetched the
 * first time the panel is opened, not on mount — the files are large and most
 * characters are never expanded.
 */
export function CharacterAlmanacSection({
  characterId,
  edition,
  language,
}: {
  characterId: string
  edition: string
  language: Language
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [entry, setEntry] = useState<AlmanacCharacterEntry | null>(null)
  const [loading, setLoading] = useState(false)

  // Collapse and drop the previous character's prose when the selection changes.
  useEffect(() => {
    setOpen(false)
    setEntry(null)
  }, [characterId])

  useEffect(() => {
    if (!open || entry) return
    let cancelled = false
    setLoading(true)
    getAlmanacEntry(characterId, language)
      .then((result) => { if (!cancelled) setEntry(result) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, entry, characterId, language])

  if (!hasAlmanac(edition)) return null

  const shown = SECTIONS.filter(({ field }) => typeof entry?.[field] === 'string' && entry[field])

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 1 }} />
      <CompactButton
        size="small"
        onClick={() => setOpen((v) => !v)}
        startIcon={open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      >
        {t('almanac')}
      </CompactButton>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">{t('loading')}</Typography>
            </Box>
          )}

          {!loading && shown.length === 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
              {t('no_almanac_for_this_character')}
            </Typography>
          )}

          {shown.map(({ field, label }) => (
            <Box key={field}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                {t(label)}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: '0.8rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}
              >
                {entry?.[field] as string}
              </Typography>
            </Box>
          ))}

          {!loading && entry?.source && (
            <Link
              href={entry.source}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('almanac_source')}
            </Link>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}
