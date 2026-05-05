// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React, { useState } from 'react'
import { Box, Button, Typography, Paper, Chip, Accordion, AccordionSummary, AccordionDetails, Grid, IconButton } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DeleteIcon from '@mui/icons-material/Delete'
import EventIcon from '@mui/icons-material/Event'
import HowToVoteIcon from '@mui/icons-material/HowToVote'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import SaveAsIcon from '@mui/icons-material/SaveAs'
import DownloadIcon from '@mui/icons-material/Download'

export function RightConsoleRecords({ ctx, toggleConsoleSection }: { ctx: StorytellerContext, toggleConsoleSection: any }) {
  const { language, text, gameRecords = [], setGameRecords, activeConsoleSections, loadGameRecord, exportRecordJson, saveGame } = ctx
  const isOpen = activeConsoleSections?.has('records')

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Button fullWidth onClick={() => toggleConsoleSection('records')} sx={{ justifyContent: 'space-between', textTransform: 'none' }}>
        <Typography variant="body2">
          {language === 'zh' ? '历史记录' : 'Game Records'} ({gameRecords.length})
        </Typography>
        {isOpen ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
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
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {rec.savedDays && (
                        <IconButton size="small" onClick={() => loadGameRecord(rec)} title={language === 'zh' ? '加载' : 'Load'}>
                          <FolderOpenIcon sx={{ fontSize: '1.1rem' }} />
                        </IconButton>
                      )}
                      <IconButton size="small" onClick={() => {
                        const name = window.prompt(language === 'zh' ? '输入新文件名：' : 'Enter new file name:', rec.recordName)
                        if (name) saveGame(name)
                      }} title={language === 'zh' ? '另存' : 'Save As'}>
                        <SaveAsIcon sx={{ fontSize: '1.1rem' }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => exportRecordJson(rec)} title={language === 'zh' ? '导出' : 'Export'}>
                        <DownloadIcon sx={{ fontSize: '1.1rem' }} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setGameRecords((cur: any[]) => cur.filter((r) => r.id !== rec.id))} title={language === 'zh' ? '删除' : 'Delete'}>
                        <DeleteIcon sx={{ fontSize: '1.1rem' }} />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip size="small" icon={<EventIcon sx={{ fontSize: '0.85rem' }} />} label={`${rec.days?.length ?? 1} ${language === 'zh' ? '天' : 'd'}`} />
                      <Chip size="small" icon={<HowToVoteIcon sx={{ fontSize: '0.85rem' }} />} label={`${totalVotes} ${language === 'zh' ? '票' : 'votes'}`} />
                      <Chip size="small" icon={<AutoFixHighIcon sx={{ fontSize: '0.85rem' }} />} label={`${totalSkills} ${language === 'zh' ? '技' : 'skills'}`} />
                      {rec.scriptTitle && <Chip size="small" icon={<AutoStoriesIcon sx={{ fontSize: '0.85rem' }} />} label={rec.scriptTitle} />}
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
