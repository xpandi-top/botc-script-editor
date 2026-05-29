import type { StorytellerContext } from '../useStoryteller'
import type { ConsoleSection } from '../types'
import { Box, Typography, Button, Select, MenuItem, FormControl, InputLabel, Accordion, AccordionSummary, AccordionDetails } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { MonoText } from '../../../components/ui'

export function RightConsoleGame({
  ctx,
  toggleConsoleSection,
}: {
  ctx: StorytellerContext
  toggleConsoleSection: (section: ConsoleSection) => void
}) {
  const { language, onSelectScript, scriptOptions, activeScriptSlug, text, activeConsoleSections, setDialogState, setShowExportModal } = ctx

  return (
    <Accordion
      expanded={activeConsoleSections.has('game')}
      onChange={() => toggleConsoleSection('game')}
      sx={{ boxShadow: 'none', '&:before': { display: 'none' }, bgcolor: 'transparent' }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {text.gameSection}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>{text.script}</InputLabel>
            <Select
              value={activeScriptSlug ?? scriptOptions[0]?.slug ?? ''}
              label={text.script}
              onChange={(e) => onSelectScript?.(String(e.target.value))}
            >
              {scriptOptions.map((s) => (
                <MenuItem key={s.slug} value={s.slug}>
                  {language === 'zh' ? (s.titleZh || s.title) : s.title}
                  {s.version && (
                    <MonoText component="span" sx={{ ml: 0.75, color: 'text.secondary' }}>
                      v{s.version}
                    </MonoText>
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" onClick={() => setDialogState({ kind: 'restartGame' })}>
              {text.restartGame}
            </Button>
            <Button size="small" variant="outlined" onClick={() => setShowExportModal(true)}>
              {text.exportJson}
            </Button>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}
