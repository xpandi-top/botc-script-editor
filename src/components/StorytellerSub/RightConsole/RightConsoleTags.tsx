// @ts-nocheck
import React from 'react'
import { Box, Button, Typography, TextField, Chip, IconButton, Paper } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { uniqueStrings } from '../constants'

export function RightConsoleTags({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { language, text, activeConsoleSections, customTagPool, setCustomTagPool, loadTagsPreset, setLoadTagsPreset, clearUnusedCustomTags } = ctx
  const isOpen = activeConsoleSections?.has('tags')

  const defaultTags = language === 'zh'
    ? ['死亡', '处决', '旅人', '无投票权']
    : ['Dead', 'Executed', 'Traveler', 'No vote']
  const stTags = language === 'zh'
    ? ['醉酒', '中毒', '保护']
    : ['Drunk', 'Poisoned', 'Protected']

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Button fullWidth onClick={() => toggleConsoleSection('tags')} sx={{ justifyContent: 'space-between', textTransform: 'none' }}>
        <Typography variant="body2">{text.tagSettings}</Typography>
        <span>{isOpen ? '▼' : '▶'}</span>
      </Button>
      {isOpen && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">{text.defaultTags}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {defaultTags.map((tag) => (
                <Chip key={`default-${tag}`} label={tag} size="small" />
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">{text.loadPredefinedTags}</Typography>
            <TextField
              size="small"
              fullWidth
              multiline
              rows={2}
              placeholder={language === 'zh' ? '逗号分隔标签...' : 'Comma-separated tags...'}
              value={loadTagsPreset ?? ''}
              onChange={(e) => setLoadTagsPreset(e.target.value)}
            />
            <Button size="small" onClick={() => {
              const tags = loadTagsPreset?.split(',').map((t: string) => t.trim()).filter(Boolean) ?? []
              setCustomTagPool((cur: string[]) => uniqueStrings([...cur, ...tags]))
              setLoadTagsPreset('')
            }} sx={{ mt: 0.5 }}>{text.loadPreset}</Button>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">{text.tagPool}</Typography>
              <Button size="small" onClick={clearUnusedCustomTags}>{text.clearUnusedTags}</Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(customTagPool ?? []).map((tag: string) => (
                <Chip
                  key={`tagpool-${tag}`}
                  label={tag}
                  size="small"
                  onDelete={() => setCustomTagPool((cur: string[]) => cur.filter((t) => t !== tag))}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  )
}