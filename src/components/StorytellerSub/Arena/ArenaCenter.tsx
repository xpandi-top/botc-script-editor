import type { StorytellerContext } from '../useStoryteller'
import { Box, IconButton, Select, MenuItem, FormControl, Tooltip } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import DeleteIcon from '@mui/icons-material/Delete'
import { ArenaCenterContent } from './ArenaCenterContent'
import { ArenaCenterNominationSheet } from './ArenaCenterNominationSheet'

export function ArenaCenter({ ctx }: { ctx: StorytellerContext }) {
  const {
    days, currentDay, goToNextDay, goToPreviousDay, setSelectedDayId,
    language, setDialogState,
  } = ctx

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        // width: '100%',
        // height: '100%',
        width: 700,
        height: 600,
        // maxHeight: '80%',
        // maxWidth: '80%',
        zIndex: 5,
        padding: `max(160px, calc((8dvh) / 2))`,
        alignItems: 'center',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, pb: 0.5, borderBottom: '1px solid', borderBottomColor: 'divider', flexShrink: 0 }}>
        <IconButton size="large" onClick={(e) => { e.stopPropagation(); goToPreviousDay() }} title={language === 'zh' ? '上一天' : 'Previous day'}>
          <ArrowBackIcon />
        </IconButton>
        <FormControl size="medium" >
          <Select
            value={currentDay.id}
            onChange={(e) => setSelectedDayId(e.target.value)}
            renderValue={(id) => { const d = days.find((d: any) => d.id === id); return d ? `Day ${d.day}` : '' }}
            sx={{ fontSize: '1.25rem', fontWeight: 700, color: 'primary.main', '& .MuiSelect-select': { py: 0.25 } }}
          >
            {days.map((d: any) => (
              <MenuItem key={d.id} value={d.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, pr: 0.5 }}>
                <span style={{ flex: 1 }}>Day {d.day}</span>
                {days.length > 1 && (
                  <Tooltip title={language === 'zh' ? '删除此天' : 'Delete this day'}>
                    <IconButton
                      size="small"
                      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setDialogState({ kind: 'deleteDay', dayId: d.id, dayNum: d.day }) }}
                      sx={{ p: 0.25, flexShrink: 0, color: 'error.main', opacity: 0.7, '&:hover': { opacity: 1 } }}
                    >
                      <DeleteIcon sx={{ fontSize: '0.85rem' }} />
                    </IconButton>
                  </Tooltip>
                )}
              </MenuItem>
            ))}
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