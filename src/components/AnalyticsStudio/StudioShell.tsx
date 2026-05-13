import { useState } from 'react'
import { Box, Tab, Tabs, Typography } from '@mui/material'
import BarChartIcon from '@mui/icons-material/BarChart'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import GroupIcon from '@mui/icons-material/Group'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import ListAltIcon from '@mui/icons-material/ListAlt'
import { StudioFilterBar } from './StudioFilterBar'
import { useAnalyticsFilter } from './useAnalyticsFilter'
import { useKpiSummary, useScriptStats, usePlayerStats, useCharStats, useStorytellerStats } from './useStats'
import { OverviewSection } from './sections/OverviewSection'
import { ScriptsSection } from './sections/ScriptsSection'
import { PlayersSection } from './sections/PlayersSection'
import { CharactersSection } from './sections/CharactersSection'
import { RecordsSection } from './sections/RecordsSection'
import type { GameRecord } from '../StorytellerSub/types'
import type { Language } from '../../types'

interface Props {
  records: GameRecord[]
  onRecordsChange: (next: GameRecord[]) => void
  language: Language
  onCreateRecord?: () => void
  onEditRecord?: (r: GameRecord) => void
}

const TABS = ['overview', 'scripts', 'players', 'characters', 'records'] as const
type StudioTab = typeof TABS[number]

export function StudioShell({ records, onRecordsChange, language, onCreateRecord, onEditRecord }: Props) {
  const zh = language === 'zh'
  const [activeTab, setActiveTab] = useState<StudioTab>('overview')
  const { filter, setFilter, filtered, activeCount, resetFilter, allScriptOptions, allPlayerOptions } = useAnalyticsFilter(records)

  const kpi = useKpiSummary(filtered)
  const scriptStats = useScriptStats(filtered)
  const playerStats = usePlayerStats(filtered)
  const charStats = useCharStats(filtered, language)
  const storytellerStats = useStorytellerStats(filtered)

  const tabDefs: Array<{ key: StudioTab; label: string; labelZh: string; icon: React.ReactNode }> = [
    { key: 'overview',    label: 'Overview',    labelZh: '概览',   icon: <BarChartIcon sx={{ fontSize: '1rem' }} /> },
    { key: 'scripts',     label: 'Scripts',     labelZh: '剧本',   icon: <AutoStoriesIcon sx={{ fontSize: '1rem' }} /> },
    { key: 'players',     label: 'Players',     labelZh: '玩家',   icon: <GroupIcon sx={{ fontSize: '1rem' }} /> },
    { key: 'characters',  label: 'Characters',  labelZh: '角色',   icon: <EmojiEventsIcon sx={{ fontSize: '1rem' }} /> },
    { key: 'records',     label: 'Records',     labelZh: '记录',   icon: <ListAltIcon sx={{ fontSize: '1rem' }} /> },
  ]

  return (
    <Box>
      {/* Filter bar */}
      <StudioFilterBar
        filter={filter}
        setFilter={setFilter}
        resetFilter={resetFilter}
        activeCount={activeCount}
        scriptOptions={allScriptOptions}
        playerOptions={allPlayerOptions}
        language={language}
      />

      {/* Filtered count badge */}
      {activeCount > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, textAlign: 'right' }}>
          {zh ? `显示 ${filtered.length} / ${records.length} 局` : `Showing ${filtered.length} of ${records.length} games`}
        </Typography>
      )}

      {/* Studio tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { minHeight: 40, py: 0.75, fontSize: { xs: '0.7rem', sm: '0.8rem' }, fontWeight: 600, textTransform: 'none' },
          }}
        >
          {tabDefs.map((t) => (
            <Tab
              key={t.key}
              value={t.key}
              label={zh ? t.labelZh : t.label}
              icon={t.icon as React.ReactElement}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      {/* Section content */}
      {activeTab === 'overview' && (
        <OverviewSection kpi={kpi} scriptStats={scriptStats} playerStats={playerStats} charStats={charStats} storytellerStats={storytellerStats} language={language} records={filtered} />
      )}
      {activeTab === 'scripts' && (
        <ScriptsSection scriptStats={scriptStats} language={language} records={filtered} />
      )}
      {activeTab === 'players' && (
        <PlayersSection playerStats={playerStats} language={language} records={filtered} />
      )}
      {activeTab === 'characters' && (
        <CharactersSection charStats={charStats} language={language} records={filtered} />
      )}
      {activeTab === 'records' && (
        <RecordsSection records={records} filteredRecords={filtered} onRecordsChange={onRecordsChange} language={language} onCreateRecord={onCreateRecord} onEditRecord={onEditRecord} />
      )}
    </Box>
  )
}
