import { useEffect, useState } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Box, CircularProgress, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  getAlmanacTerminology,
  getEditionCredit,
  getEditionCreditName,
} from '../catalog'
import type { AlmanacTerm } from '../catalog'
import type { Language } from '../types'
import { editionLabels } from '../catalog'
import { useT } from '../context/I18nContext'

type GlossarySection = { edition: string; label: string; terms: Array<[string, AlmanacTerm]> }

/**
 * Rules glossary for the character packs on a roster — Odyssey defines its own
 * vocabulary (审判日, 变量X, 死亡延迟, 旅行者隔绝原则, …) that a storyteller has to
 * be able to look up mid-game.
 *
 * Terms are fetched from the (lazy, per-edition) almanac when this mounts, so
 * render it behind a tab or a collapsed panel rather than eagerly.
 */
export function EditionGlossary({
  editions,
  language,
}: {
  editions: string[]
  language: Language
}) {
  const { t } = useT()
  const [sections, setSections] = useState<GlossarySection[] | null>(null)
  const key = editions.join(',')

  useEffect(() => {
    let cancelled = false
    setSections(null)
    Promise.all(
      editions.map(async (edition): Promise<GlossarySection> => {
        const terminology = await getAlmanacTerminology(edition, language)
        const credit = getEditionCredit(edition)
        const label = credit
          ? getEditionCreditName(credit, language)
          : editionLabels[language][edition] ?? edition
        return { edition, label, terms: Object.entries(terminology) }
      }),
    ).then((result) => {
      if (!cancelled) setSections(result.filter((section) => section.terms.length > 0))
    })
    return () => { cancelled = true }
    // `key` stands in for the array identity so a new array with the same
    // editions doesn't refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, language])

  if (sections === null) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5 }}>
        <CircularProgress size={14} />
        <Typography variant="caption" color="text.secondary">{t('loading')}</Typography>
      </Box>
    )
  }

  if (sections.length === 0) {
    return (
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', p: 1.5, fontStyle: 'italic' }}>
        {t('no_glossary_for_this_script')}
      </Typography>
    )
  }

  return (
    <Box>
      {sections.map((section) => (
        <Box key={section.edition} sx={{ mb: 1 }}>
          {sections.length > 1 && (
            <Typography
              variant="caption"
              sx={{
                display: 'block', px: 1, py: 0.5, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                fontSize: '0.7rem', color: 'text.secondary',
              }}
            >
              {section.label}
            </Typography>
          )}
          {section.terms.map(([id, term]) => (
            <Accordion
              key={id}
              disableGutters
              elevation={0}
              square
              sx={{
                '&:before': { display: 'none' },
                borderBottom: '1px solid',
                borderBottomColor: 'divider',
                bgcolor: 'transparent',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon fontSize="small" />}
                sx={{ minHeight: 0, px: 1, '& .MuiAccordionSummary-content': { my: 0.75 } }}
              >
                <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  {term.title}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 1, pt: 0, pb: 1.25 }}>
                <Typography
                  variant="body2"
                  sx={{ fontSize: '0.78rem', lineHeight: 1.6, whiteSpace: 'pre-line', color: 'text.secondary' }}
                >
                  {term.text}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ))}
    </Box>
  )
}
