import { Box, IconButton, Select, MenuItem, FormControl } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { ArenaCenterLeft } from './ArenaCenterLeft'
import { ArenaCenterRight } from './ArenaCenterRight'
import { ArenaCenterNominationSheet } from './ArenaCenterNominationSheet'

export function ArenaCenter({ ctx }: { ctx: any }) {
  const {
    days, currentDay, goToNextDay, goToPreviousDay, setSelectedDayId,
    showInfoPanel, setShowInfoPanel,
    portraitOverride, setPortraitOverride,
    language,
  } = ctx

  const effectivePortrait = portraitOverride !== null ? portraitOverride : (typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false)

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: showInfoPanel ? '1fr auto' : '1fr',
        gap: 1,
        width: '100%',
        height: '100%',
      }}
    >
      <Box sx={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, pb: 0.5, borderBottom: '1px solid rgba(23,32,42,0.08)' }}>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); goToPreviousDay() }} title={language === 'zh' ? '上一天' : 'Previous day'}>
          <ArrowBackIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <Select
            value={currentDay.id}
            onChange={(e) => setSelectedDayId(e.target.value)}
            sx={{ fontSize: '1rem', fontWeight: 700, color: 'primary.main', '& .MuiSelect-select': { py: 0.25 } }}
          >
            {days.map((d: any) => <MenuItem key={d.id} value={d.id}>Day {d.day}</MenuItem>)}
          </Select>
        </FormControl>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); goToNextDay() }} title={language === 'zh' ? '下一天' : 'Next day'}>
          <ArrowForwardIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setShowInfoPanel((v: boolean) => !v) }}
          sx={{ ml: 1, border: '1px solid', borderColor: showInfoPanel ? 'primary.main' : 'divider', bgcolor: showInfoPanel ? 'rgba(133,63,34,0.1)' : 'transparent' }}
        >
          {showInfoPanel ? '⊟' : '⊞'}
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            if (portraitOverride === null) setPortraitOverride(true)
            else if (portraitOverride === true) setPortraitOverride(false)
            else setPortraitOverride(null)
          }}
          sx={{ border: '1px solid', borderColor: portraitOverride !== null ? 'primary.main' : 'divider', bgcolor: portraitOverride !== null ? 'rgba(133,63,34,0.1)' : 'transparent' }}
        >
          {portraitOverride === null ? '⇄' : effectivePortrait ? '⬜' : '⬛'}
        </IconButton>
      </Box>

      <ArenaCenterLeft ctx={ctx} />
      {showInfoPanel && <ArenaCenterRight ctx={ctx} />}
      <ArenaCenterNominationSheet ctx={ctx} />
    </Box>
  )
}