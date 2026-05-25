// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React from 'react'
import { Box, Button, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useT } from '../../../context/I18nContext'

export function ArenaQuickStrip({ ctx }: { ctx: StorytellerContext }) {
  const { t } = useT()
  const { 
    activeRightPopup, setActiveRightPopup, 
    showRightPanel, setShowRightPanel, 
    currentDay, pickerMode, setPickerMode, 
    openSkillOverlay, goToNextDay, openEndGamePanel, exportGameJson, text 
  } = ctx

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
      <Button
        size="small"
        variant={activeRightPopup === 'log' ? 'contained' : 'outlined'}
        onClick={() => setActiveRightPopup((p) => p === 'log' ? null : 'log')}
      >
        {t('log')}
      </Button>

      {currentDay?.phase === 'nomination' && (
        <Button
          size="small"
          variant="outlined"
          onClick={() => setPickerMode('nominator')}
        >
          {text.quickNomination}
        </Button>
      )}

      <Button
        size="small"
        variant="outlined"
        onClick={openSkillOverlay}
      >
        {text.quickSkill}
      </Button>

      <Button
        size="small"
        variant="outlined"
        onClick={goToNextDay}
      >
        {text.nextDay}
      </Button>

      <Button
        size="small"
        variant="outlined"
        onClick={openEndGamePanel}
      >
        {text.endGame}
      </Button>

      <Button
        size="small"
        variant="outlined"
        onClick={exportGameJson}
      >
        {text.exportJson}
      </Button>

      <Button
        size="small"
        variant={showRightPanel ? 'contained' : 'outlined'}
        onClick={() => setShowRightPanel((c) => !c)}
      >
        {showRightPanel ? text.hidePanel : text.showPanel}
      </Button>
    </Box>
  )
}
