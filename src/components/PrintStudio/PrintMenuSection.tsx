import { useId, type ReactNode } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

/**
 * Collapsible group in the print settings panels. Groups are separated by a
 * rule rather than boxed, so a long panel reads as one list of headings.
 */
export function PrintMenuSection({ title, children, defaultExpanded = true }: {
  title: string
  children: ReactNode
  defaultExpanded?: boolean
}) {
  const id = useId()
  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters elevation={0} square
      sx={{ bgcolor: 'transparent', borderBottom: '1px solid', borderColor: 'divider', '&::before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />} id={`${id}-heading`} aria-controls={`${id}-content`}
        sx={{ minHeight: 44, px: 0, '& .MuiAccordionSummary-content': { my: 1 } }}>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails id={`${id}-content`} sx={{ px: 0, pt: 0, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>{children}</AccordionDetails>
    </Accordion>
  )
}
