// @ts-nocheck
import React from 'react'
import { Box, Button, ToggleButton, ToggleButtonGroup } from '@mui/material'

export function ArenaQuickStrip({ ctx }: { ctx: any }) {
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
        {language === 'zh' ? '日志' : 'Log'}
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