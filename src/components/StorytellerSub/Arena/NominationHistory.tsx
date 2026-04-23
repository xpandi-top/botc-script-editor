// @ts-nocheck
import React from 'react'
import { Box, Typography, Select, MenuItem } from '@mui/material'

interface NominationHistoryProps {
  voteHistory: any[]
  historyFilter: 'all' | 'exile' | 'nomination'
  setHistoryFilter: (v: 'all' | 'exile' | 'nomination') => void
  language: string
}

export function NominationHistory({
  voteHistory,
  historyFilter,
  setHistoryFilter,
  language,
}: NominationHistoryProps) {
  const nominatorsToday = [...new Set(voteHistory.map((r: any) => r.actor))]
  const nomineesToday = [...new Set(voteHistory.map((r: any) => r.target))]

  const filteredHistory = voteHistory
    .filter((r: any) => {
      if (historyFilter === 'all') return true
      if (historyFilter === 'exile') return r.isExile
      return !r.isExile
    })
    .sort((a: any, b: any) => {
      const voteDiff = (b.voteCount ?? 0) - (a.voteCount ?? 0)
      if (voteDiff !== 0) return voteDiff
      return (b.createdAt ?? 0) - (a.createdAt ?? 0)
    })

  return (
    <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            {language === 'zh' ? '今日提名者' : 'Today Nominators'}:
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
            {language === 'zh' ? '今日被提名者' : 'Today Nominees'}:
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
          {language === 'zh' ? '提名记录' : 'Nominations'}
        </Typography>
        <Select size="small" value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value as 'all' | 'exile' | 'nomination')} sx={{ minWidth: 90, fontSize: '0.75rem' }}>
          <MenuItem value="all">{language === 'zh' ? '全部' : 'All'}</MenuItem>
          <MenuItem value="exile">{language === 'zh' ? '放逐' : 'Exile'}</MenuItem>
          <MenuItem value="nomination">{language === 'zh' ? '提名' : 'Nomination'}</MenuItem>
        </Select>
      </Box>

      {filteredHistory.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{language === 'zh' ? '暂无记录' : 'None yet'}</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5, maxHeight: 150, overflow: 'auto' }}>
          {filteredHistory.map((record: any) => {
            const passed = !record.failed && record.passed
            const actionTag = record.isExile ? (language === 'zh' ? '放逐' : '提名') : (language === 'zh' ? '提名' : '提名')
            const voterList = record.voters && record.voters.length > 0
              ? `(${record.voters.map((v: number) => `#${v}`).join(',')})`
              : ''
            return (
              <Box key={record.id} sx={{
                p: 0.5,
                borderRadius: 1,
                bgcolor: passed ? 'success.light' : 'error.light',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flexWrap: 'wrap'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                  #{record.actor} {actionTag} #{record.target}{' '}
                  {record.failed
                    ? (language === 'zh' ? '失败' : 'Failed')
                    : `${record.voteCount}/${record.requiredVotes}`
                  }{voterList}
                </Typography>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}