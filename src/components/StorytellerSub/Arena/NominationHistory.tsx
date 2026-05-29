import type { DayState, VoteRecord } from '../types'
import type { Language } from '../../../types'
import { Box, Typography, Select, MenuItem, IconButton, useTheme } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import { makeT } from '../../../lib/t'

interface NominationHistoryProps {
  voteHistory: VoteRecord[]
  historyFilter: 'all' | 'exile' | 'nomination'
  setHistoryFilter: (v: 'all' | 'exile' | 'nomination') => void
  language: Language
  updateCurrentDay: (fn: (day: DayState) => DayState) => void
}

export function NominationHistory({
  voteHistory,
  historyFilter,
  setHistoryFilter,
  language,
  updateCurrentDay,
}: NominationHistoryProps) {
  const t = makeT(language)
  const muiTheme = useTheme()
  const isDark = muiTheme.palette.mode === 'dark'

  const passedBg   = isDark ? 'rgba(46,125,50,0.28)'   : 'rgba(200,230,201,1)'
  const passedText = isDark ? '#a5d6a7'                 : 'rgba(27,94,32,0.9)'
  const failedBg   = isDark ? 'rgba(211,47,47,0.28)'   : 'rgba(255,205,210,1)'
  const failedText = isDark ? '#ef9a9a'                 : 'rgba(183,28,28,0.9)'

  const nominatorsToday = [...new Set(voteHistory.map((record) => record.actor))]
  const nomineesToday = [...new Set(voteHistory.map((record) => record.target))]

  const filteredHistory = voteHistory
    .filter((record) => {
      if (historyFilter === 'all') return true
      if (historyFilter === 'exile') return record.isExile
      return !record.isExile
    })
    .sort((a, b) => {
      const voteDiff = (b.voteCount ?? 0) - (a.voteCount ?? 0)
      if (voteDiff !== 0) return voteDiff
      return Number(b.id) - Number(a.id)
    })

  return (
    <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            {t('today_nominators')}:
          </Typography>
          {nominatorsToday.length === 0 ? (
            <Typography variant="caption">—</Typography>
          ) : (
            nominatorsToday.map((seatNum: number) => (
              <Box key={seatNum} sx={{ height: 20, fontSize: '0.7rem', px: 0.5, border: '1px solid', borderRadius: 1, borderColor: 'primary.main', color: 'primary.main' }}>
                #{seatNum}
              </Box>
            ))
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            {t('today_nominees')}:
          </Typography>
          {nomineesToday.length === 0 ? (
            <Typography variant="caption">—</Typography>
          ) : (
            nomineesToday.map((seatNum: number) => (
              <Box key={seatNum} sx={{ height: 20, fontSize: '0.7rem', px: 0.5, border: '1px solid', borderRadius: 1, borderColor: 'secondary.main', color: 'secondary.main' }}>
                #{seatNum}
              </Box>
            ))
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {t('nominations')}
        </Typography>
        <Select size="small" value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value as 'all' | 'exile' | 'nomination')} sx={{ minWidth: 90, fontSize: '0.75rem' }}>
          <MenuItem value="all">{t('all')}</MenuItem>
          <MenuItem value="exile">{t('exile')}</MenuItem>
          <MenuItem value="nomination">{t('term_nomination')}</MenuItem>
        </Select>
      </Box>

      {filteredHistory.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t('none_yet')}</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5, maxHeight: 150, overflow: 'auto' }}>
          {filteredHistory.map((record: any) => {
            const passed = !record.failed && record.passed
            const actionTag = record.isExile ? t('exile') : t('term_nomination')
            const voterList = record.voters && record.voters.length > 0
              ? `(${record.voters.map((v: number) => `#${v}`).join(',')})`
              : ''
            return (
              <Box key={record.id} sx={{
                p: 0.5,
                borderRadius: 1,
                bgcolor: passed ? passedBg : failedBg,
                border: '1px solid',
                borderColor: passed ? (isDark ? 'rgba(46,125,50,0.55)' : 'rgba(46,125,50,0.25)') : (isDark ? 'rgba(211,47,47,0.55)' : 'rgba(211,47,47,0.25)'),
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flexWrap: 'wrap',
                flex: 1,
              }}>
                <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', flex: 1, color: passed ? passedText : failedText }}>
                  #{record.actor} {actionTag} {record.target === 0
                    ? <><AutoStoriesIcon sx={{ fontSize: '0.9rem', verticalAlign: 'middle', mr: 0.25 }} />{t('st')}</>
                    : `#${record.target}`}{' '}
                  {record.failed
                    ? (t('failed'))
                    : `${record.voteCount}/${record.requiredVotes}`
                  }{voterList}
                </Typography>
                <IconButton size="small" color="error" onClick={() => updateCurrentDay((day) => ({
                  ...day,
                  voteHistory: day.voteHistory.filter((voteRecord) => voteRecord.id !== record.id),
                }))}>
                  <DeleteIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
