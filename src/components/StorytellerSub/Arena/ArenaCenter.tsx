import { Box, IconButton, Select, MenuItem, FormControl } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { ArenaCenterContent } from './ArenaCenterContent'
import { ArenaCenterNominationSheet } from './ArenaCenterNominationSheet'

export function ArenaCenter({ ctx }: { ctx: any }) {
  const {
    days, currentDay, goToNextDay, goToPreviousDay, setSelectedDayId,
    language,
  } = ctx

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '80%',
        height: '80%',
        minWidth: 0,
        minHeight: 0,
        maxHeight: '80%',
        maxWidth: '80%',
        zIndex: 5, 
        padding: 20,
        alignItems: 'center',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, pb: 0.5, borderBottom: '1px solid rgba(23,32,42,0.08)', flexShrink: 0 }}>
        <IconButton size="large" onClick={(e) => { e.stopPropagation(); goToPreviousDay() }} title={language === 'zh' ? '上一天' : 'Previous day'}>
          <ArrowBackIcon />
        </IconButton>
        <FormControl size="medium" >
          <Select
            value={currentDay.id}
            onChange={(e) => setSelectedDayId(e.target.value)}
            sx={{ fontSize: '1.25rem', fontWeight: 700, color: 'primary.main', '& .MuiSelect-select': { py: 0.25 } }}
          >
            {days.map((d: any) => <MenuItem key={d.id} value={d.id}>Day {d.day}</MenuItem>)}
          </Select>
        </FormControl>
        <IconButton size="large" onClick={(e) => { e.stopPropagation(); goToNextDay() }} title={language === 'zh' ? '下一天' : 'Next day'}>
          <ArrowForwardIcon />
        </IconButton>
      </Box>
      <Box sx={{ 
        maxHeight: '80%',
        maxWidth: '80%',
        display: 'flex', flex: 1, gap: 1, overflow: 'auto',flexDirection: 'column'}}>
        <ArenaCenterContent ctx={ctx} />
        <ArenaCenterNominationSheet ctx={ctx} />
      </Box>
     </Box>
  )
}