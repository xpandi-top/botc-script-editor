// @ts-nocheck
import React, { useState } from 'react'
import { Box, Button, Typography, Paper, Chip, Accordion, AccordionSummary, AccordionDetails, Grid } from '@mui/material'

export function RightConsoleRecords({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { language, text, gameRecords = [], setGameRecords, activeConsoleSections, loadGameRecord, exportRecordJson, saveGame } = ctx
  const isOpen = activeConsoleSections?.has('records')

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Button fullWidth onClick={() => toggleConsoleSection('records')} sx={{ justifyContent: 'space-between', textTransform: 'none' }}>
        <Typography variant="body2">
          {language === 'zh' ? '历史记录' : 'Game Records'} ({gameRecords.length})
        </Typography>
        <span>{isOpen ? '▼' : '▶'}</span>
      </Button>
      {isOpen && (
        <Box sx={{ mt: 1 }}>
          {gameRecords.length === 0 ? (
            <Typography variant="body2" color="text.secondary">{text.noCompletedGames}</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {gameRecords.map((rec: any) => {
                const date = new Date(rec.endedAt).toLocaleDateString()
                const totalVotes = rec.days?.reduce((s: number, d: any) => s + (d.votes ?? 0), 0) ?? 0
                const totalSkills = rec.days?.reduce((s: number, d: any) => s + (d.skills ?? 0), 0) ?? 0

                return (
                  <Paper key={rec.id} variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word', mb: 0.5 }}>
                      {rec.recordName ?? (rec.scriptTitle ? `${rec.scriptTitle} - ${date}` : date)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {rec.savedDays && (
                        <Button size="small" onClick={() => loadGameRecord(rec)}>
                          {language === 'zh' ? '📂 加载' : '📂 Load'}
                        </Button>
                      )}
                      <Button size="small" onClick={() => {
                        const name = window.prompt(language === 'zh' ? '输入新文件名：' : 'Enter new file name:', rec.recordName)
                        if (name) saveGame(name)
                      }}>
                        {language === 'zh' ? '💾 另存' : '💾 Save As'}
                      </Button>
                      <Button size="small" onClick={() => exportRecordJson(rec)}>
                        {language === 'zh' ? '📥 导出' : '📥 Export'}
                      </Button>
                      <Button size="small" color="error" onClick={() => setGameRecords((cur: any[]) => cur.filter((r) => r.id !== rec.id))}>
                        🗑
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip size="small" label={`📅 ${rec.days?.length ?? 1} ${language === 'zh' ? '天' : 'd'}`} />
                      <Chip size="small" label={`🗳 ${totalVotes} ${language === 'zh' ? '票' : 'votes'}`} />
                      <Chip size="small" label={`✨ ${totalSkills} ${language === 'zh' ? '技' : 'skills'}`} />
                      {rec.scriptTitle && <Chip size="small" label={`📖 ${rec.scriptTitle}`} />}
                    </Box>
                  </Paper>
                )
              })}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  )
}