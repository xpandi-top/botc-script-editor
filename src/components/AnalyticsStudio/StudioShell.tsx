import type { IdentityBasis } from '../../utils/playerIdentity'
import { makeT } from '../../lib/t'
import { useState } from 'react'
import { Alert, Box, Button, IconButton, Tab, Tabs, Tooltip, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
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
import { makeTpl } from '../../lib/t'
import { FeedbackButton, useReportContext } from '../Feedback'

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
  const tpl = makeTpl(language)
  const t = makeT(language)
  const [basis, setBasis] = useState<IdentityBasis>('final')
  const [activeTab, setActiveTab] = useState<StudioTab>('overview')
  const { filter, setFilter, filtered, activeCount, resetFilter, allScriptOptions, allPlayerOptions } = useAnalyticsFilter(records)

  const kpi = useKpiSummary(filtered)
  const scriptStats = useScriptStats(filtered)
  const playerStats = usePlayerStats(filtered, basis)
  const charStats = useCharStats(filtered, language, basis)
  const storytellerStats = useStorytellerStats(filtered)

  // What problem reports see of the analytics: counts only, no player names.
  const reportContext = { section: activeTab, basis, games: filtered.length, total: records.length, filters: activeCount }
  useReportContext('analytics', reportContext)

  const tabDefs: Array<{ key: StudioTab; label: string; labelZh: string; icon: React.ReactNode }> = [
    { key: 'overview',    label: 'Overview',    labelZh: '概览',   icon: <BarChartIcon sx={{ fontSize: '1rem' }} /> },
    { key: 'scripts',     label: 'Scripts',     labelZh: '剧本',   icon: <AutoStoriesIcon sx={{ fontSize: '1rem' }} /> },
    { key: 'players',     label: 'Players',     labelZh: '玩家',   icon: <GroupIcon sx={{ fontSize: '1rem' }} /> },
    { key: 'characters',  label: 'Characters',  labelZh: '角色',   icon: <EmojiEventsIcon sx={{ fontSize: '1rem' }} /> },
    { key: 'records',     label: 'Records',     labelZh: '记录',   icon: <ListAltIcon sx={{ fontSize: '1rem' }} /> },
  ]

  return (
    <Box sx={{ minWidth: 0, overflowX: 'hidden' }}>
      {/* Filter bar — nothing to filter until there are records */}
      {records.length > 0 && <StudioFilterBar
        filter={filter}
        setFilter={setFilter}
        resetFilter={resetFilter}
        activeCount={activeCount}
        scriptOptions={allScriptOptions}
        playerOptions={allPlayerOptions}
        language={language}
      />}

      {/* Filtered count badge */}
      {activeCount > 0 && (
        <Typography variant="caption" role="status" color="text.secondary" sx={{ display: 'block', mb: 1, textAlign: 'right' }}>
          {tpl('showing_n_games_of_m', filtered.length, records.length)}
        </Typography>
      )}

      {/* Studio tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, display: 'flex', alignItems: 'center' }}>
        <Tabs
          aria-label={language === 'zh' ? '统计分类' : 'Analytics sections'}
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            flex: 1, minWidth: 0,
            '& .MuiTabs-indicator': { display: 'block', height: 3 },
            '& .MuiTab-root': {
              border: 0, borderRadius: 0, backgroundColor: 'transparent',
              '&.Mui-selected': { backgroundColor: 'transparent', color: 'text.primary', fontWeight: 700 },
              minHeight: { xs: 36, sm: 40 },
              py: { xs: 0.5, sm: 0.75 },
              px: { xs: 1, sm: 1.5 },
              minWidth: { xs: 44, sm: 'auto' },
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          {tabDefs.map((t) => (
            <Tab
              key={t.key}
              id={`analytics-tab-${t.key}`}
              aria-controls={`analytics-panel-${t.key}`}
              value={t.key}
              label={
                language === 'zh' ? t.labelZh : t.label
              }
              icon={t.icon as React.ReactElement}
              iconPosition="start"
            />
          ))}
        </Tabs>
        <FeedbackButton request={() => ({
          target: { type: 'analytics' }, surface: 'analytics/studio', label: t('analytics_title'), parts: [activeTab],
          snapshot: { ...reportContext, kpi },
        })} />
      </Box>

      {records.length > 0 && (activeTab === 'players' || activeTab === 'characters' || activeTab === 'overview') && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ToggleButtonGroup size="small" exclusive value={basis} aria-label={t('identity_basis')} onChange={(_, value) => value && setBasis(value)}>
            <ToggleButton value="initial">{t('identity_initial')}</ToggleButton>
            <ToggleButton value="final">{t('identity_final')}</ToggleButton>
          </ToggleButtonGroup>
          {/* The counting rules are long: keep them one tap away instead of under every tab. */}
          <Tooltip title={t('identity_stats_hint')} enterTouchDelay={0} leaveTouchDelay={6000}>
            <IconButton size="small" aria-label={`${t('identity_basis')}: ${t('identity_stats_hint')}`}><InfoOutlinedIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      )}
      {/* Section content */}
      <Box role="tabpanel" id={`analytics-panel-${activeTab}`} aria-labelledby={`analytics-tab-${activeTab}`}>
      {activeCount > 0 && filtered.length === 0 && (
        <Alert severity="info" sx={{ mb: 2, '& .MuiAlert-message': { minWidth: 0 } }}
          action={<Button color="inherit" size="small" onClick={resetFilter}>{t('reset_filters')}</Button>}>
          {t('analytics_no_filter_results')}
        </Alert>
      )}
      {activeTab === 'overview' && !(activeCount > 0 && filtered.length === 0) && (
        <OverviewSection kpi={kpi} scriptStats={scriptStats} playerStats={playerStats} charStats={charStats} storytellerStats={storytellerStats} language={language} records={filtered} onCreateRecord={records.length === 0 ? onCreateRecord : undefined} />
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
    </Box>
  )
}
