// @ts-nocheck
import React from 'react'
import { Box, Typography, Button, Select, MenuItem, FormControl, InputLabel, Accordion, AccordionSummary, AccordionDetails } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

export function RightConsoleGame({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { language, onSelectScript, scriptOptions, activeScriptSlug, text, activeConsoleSections, setDialogState, openNewGamePanel, exportGameJson, setShowExportModal } = ctx;

  return (
    <Accordion
      expanded={activeConsoleSections.has('game')}
      onChange={() => toggleConsoleSection('game')}
      sx={{ boxShadow: 'none', '&:before': { display: 'none' }, bgcolor: 'transparent' }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" fontWeight={600}>
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
              onChange={(e) => onSelectScript?.(e.target.value)}
            >
              {scriptOptions.map((s) => <MenuItem key={s.slug} value={s.slug}>{s.title}</MenuItem>)}
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
