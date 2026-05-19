// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React, { useMemo } from 'react'
import { Box, Button, Typography, TextField, Chip, Paper } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { uniqueStrings } from '../constants'
import { characterById } from '../../../catalog'

export function RightConsoleTags({ ctx, toggleConsoleSection }: { ctx: StorytellerContext, toggleConsoleSection: any }) {
  const {
    language, text, activeConsoleSections,
    customTagPool, setCustomTagPool, loadTagsPreset, setLoadTagsPreset,
    clearUnusedCustomTags, currentScriptCharacters, currentDay,
  } = ctx
  const isOpen = activeConsoleSections?.has('tags')

  // ── Script-derived reminder tags ─────────────────────────────────────────
  const scriptReminderTags = useMemo(() => {
    const inPlayIds = (currentDay?.seats ?? []).map((s: any) => s.characterId).filter(Boolean)
    const ids = new Set<string>([...(currentScriptCharacters ?? []), ...inPlayIds])
    const tags = new Set<string>()
    for (const id of ids) {
      const char = characterById[id]
      ;(char?.reminders ?? []).forEach((r: string) => tags.add(r))
      ;(char?.remindersGlobal ?? []).forEach((r: string) => tags.add(r))
    }
    return [...tags].sort()
  }, [currentScriptCharacters, currentDay?.seats])

  const defaultTags = language === 'zh'
    ? ['死亡', '处决', '旅行者', '无投票权']
    : ['Dead', 'Executed', 'Traveler', 'No vote']

  const zh = language === 'zh'

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Button fullWidth onClick={() => toggleConsoleSection('tags')} sx={{ justifyContent: 'space-between', textTransform: 'none' }}>
        <Typography variant="body2">{text.tagSettings}</Typography>
        {isOpen ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      </Button>
      {isOpen && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {/* Public tags */}
          <Box>
            <Typography variant="caption" color="text.secondary">{text.defaultTags}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {defaultTags.map((tag) => (
                <Chip key={`default-${tag}`} label={tag} size="small" />
              ))}
            </Box>
          </Box>

          {/* Script reminder tags (from characters in script / in play) */}
          {scriptReminderTags.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                <Typography variant="caption" color="text.secondary">
                  {zh ? '剧本提醒标记' : 'Script reminders'}
                </Typography>
                <Button size="small" sx={{ fontSize: '0.65rem', py: 0, minWidth: 0 }}
                  onClick={() => setCustomTagPool((cur: string[]) => uniqueStrings([...cur, ...scriptReminderTags]))}>
                  {zh ? '全部加入' : 'Add all'}
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {scriptReminderTags.map((tag) => {
                  const inPool = (customTagPool ?? []).includes(tag)
                  return (
                    <Chip key={`sr-${tag}`} label={tag} size="small" clickable
                      color={inPool ? 'primary' : 'default'}
                      variant={inPool ? 'filled' : 'outlined'}
                      onClick={() => {
                        if (inPool) setCustomTagPool((cur: string[]) => cur.filter((t: string) => t !== tag))
                        else setCustomTagPool((cur: string[]) => uniqueStrings([...cur, tag]))
                      }} />
                  )
                })}
              </Box>
            </Box>
          )}

          {/* Manual preset load */}
          <Box>
            <Typography variant="caption" color="text.secondary">{text.loadPredefinedTags}</Typography>
            <TextField
              size="small" fullWidth multiline rows={2}
              placeholder={zh ? '逗号分隔标签...' : 'Comma-separated tags...'}
              value={loadTagsPreset ?? ''}
              onChange={(e) => setLoadTagsPreset(e.target.value)}
            />
            <Button size="small" onClick={() => {
              const tags = loadTagsPreset?.split(',').map((t: string) => t.trim()).filter(Boolean) ?? []
              setCustomTagPool((cur: string[]) => uniqueStrings([...cur, ...tags]))
              setLoadTagsPreset('')
            }} sx={{ mt: 0.5 }}>{text.loadPreset}</Button>
          </Box>

          {/* Tag pool */}
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
                  onDelete={() => setCustomTagPool((cur: string[]) => cur.filter((t: string) => t !== tag))}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  )
}
