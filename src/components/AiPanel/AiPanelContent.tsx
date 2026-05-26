/**
 * AiPanelContent — main shell (~130 lines).
 * Composes Header, SettingsPanel, context badge, quick chips, tabs.
 */

import { Box, Chip, Divider, Tab, Tabs, alpha } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import TranslateIcon    from '@mui/icons-material/Translate'
import LightbulbIcon    from '@mui/icons-material/Lightbulb'
import AbcIcon          from '@mui/icons-material/Abc'
import AutoFixHighIcon  from '@mui/icons-material/AutoFixHigh'
import NightsStayIcon   from '@mui/icons-material/NightsStay'
import ArticleIcon      from '@mui/icons-material/Article'
import ReviewsIcon      from '@mui/icons-material/Reviews'
import AnalyticsIcon    from '@mui/icons-material/Analytics'
import MenuBookIcon     from '@mui/icons-material/MenuBook'
import type { ReactElement } from 'react'
import { Header }        from './Header'
import { SettingsPanel } from './SettingsPanel'
import { ChatTab }       from './ChatTab'
import { SkillsTab }     from './SkillsTab'
import { LogTab }        from './LogTab'
import { useAiPanel }    from './useAiPanel'
import { getChipSkills } from '../../lib/ai/skills'
import type { AiPanelContentProps, PanelTab } from './types'
import { useT } from '../../context/I18nContext'

// Icon map for chip skills (subset)
const CHIP_ICON_MAP: Record<string, ReactElement> = {
  translate:   <TranslateIcon sx={{ fontSize: '0.82rem' }} />,
  lightbulb:   <LightbulbIcon sx={{ fontSize: '0.82rem' }} />,
  abc:         <AbcIcon sx={{ fontSize: '0.82rem' }} />,
  autofix:     <AutoFixHighIcon sx={{ fontSize: '0.82rem' }} />,
  nights:      <NightsStayIcon sx={{ fontSize: '0.82rem' }} />,
  info:        <InfoOutlinedIcon sx={{ fontSize: '0.82rem' }} />,
  article:     <ArticleIcon sx={{ fontSize: '0.82rem' }} />,
  reviews:     <ReviewsIcon sx={{ fontSize: '0.82rem' }} />,
  analytics:   <AnalyticsIcon sx={{ fontSize: '0.82rem' }} />,
  menu_book:   <MenuBookIcon sx={{ fontSize: '0.82rem' }} />,
}

export function AiPanelContent({ open, onClose, context, callbacks, variant = 'side' }: AiPanelContentProps) {
  const { t, tpl } = useT()
  const panel = useAiPanel({ open, context, callbacks, variant })
  const {
    settings, patchSettings, showSettings, setShowSettings,
    activeTab, setActiveTab, messages, setMessages, input, setInput,
    loading, autoApply, setAutoApply, fillLog, bottomRef, inputRef,
    effectiveCtx, apiKey, doApplyFill, undoFill, handleSend, downloadLog, clearMessages,
  } = panel

  const zh         = effectiveCtx.language === 'zh'
  const chipSkills = getChipSkills(effectiveCtx)
  const hasCtx     = effectiveCtx.type !== 'general'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      <Header
        variant={variant}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        hasMessages={messages.length > 0}
        onClear={clearMessages}
        onClose={onClose}
        language={effectiveCtx.language}
      />

      <SettingsPanel settings={settings} patchSettings={patchSettings} showSettings={showSettings} />

      {/* ── Context badge ─────────────────────────────────────────── */}
      {hasCtx && (
        <Box sx={{ px: 1.5, pt: 0.5, pb: 0.25, flexShrink: 0 }}>
          <Chip
            size="small"
            icon={<InfoOutlinedIcon sx={{ fontSize: '12px !important' }} />}
            label={`${effectiveCtx.type} › ${effectiveCtx.title || '(unnamed)'}`}
            variant="outlined"
            sx={{
              fontSize: '0.65rem', height: 19, maxWidth: '100%',
              '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
            }}
          />
        </Box>
      )}

      {/* ── Quick-action chips ───────────────────────────────────── */}
      {chipSkills.length > 0 && (
        <Box sx={{ px: 1.5, py: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5, flexShrink: 0 }}>
          {chipSkills.map((skill) => (
            <Chip
              key={skill.id}
              icon={CHIP_ICON_MAP[skill.icon]}
              label={zh ? skill.labelZh : skill.label}
              size="small" variant="outlined"
              onClick={() => handleSend(skill.prompt(effectiveCtx), zh ? skill.labelZh : skill.label)}
              disabled={loading}
              sx={{
                fontSize: '0.65rem', height: 22, cursor: 'pointer',
                '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
                '& .MuiChip-icon': { fontSize: '0.82rem' },
              }}
            />
          ))}
        </Box>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Tabs
          value={activeTab}
          onChange={(_: unknown, v: unknown) => setActiveTab(v as PanelTab)}
          sx={{ minHeight: 32, '& .MuiTabs-indicator': { height: 2 } }}
        >
          <Tab value="chat"   label={t('chat')}
            sx={{ minHeight: 32, py: 0, fontSize: '0.72rem', textTransform: 'none', flex: 1 }} />
          <Tab value="skills" label={t('ai_skills')}
            sx={{ minHeight: 32, py: 0, fontSize: '0.72rem', textTransform: 'none', flex: 1 }} />
          <Tab value="log"    label={tpl('log_tab_n', fillLog.length)}
            sx={{ minHeight: 32, py: 0, fontSize: '0.72rem', textTransform: 'none', flex: 1 }} />
        </Tabs>
      </Box>

      {/* ── Tab content ──────────────────────────────────────────── */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'chat' && (
          <ChatTab
            messages={messages} loading={loading}
            input={input} setInput={setInput}
            autoApply={autoApply} setAutoApply={setAutoApply}
            handleSend={handleSend} doApplyFill={doApplyFill}
            setMessages={setMessages}
            context={context} apiKey={apiKey}
            bottomRef={bottomRef} inputRef={inputRef}
            language={effectiveCtx.language}
          />
        )}
        {activeTab === 'skills' && (
          <SkillsTab
            context={effectiveCtx} loading={loading}
            handleSend={handleSend} language={effectiveCtx.language}
          />
        )}
        {activeTab === 'log' && (
          <>
            <LogTab
              fillLog={fillLog} undoFill={undoFill}
              downloadLog={downloadLog} language={effectiveCtx.language}
            />
            <Divider />
          </>
        )}
      </Box>

      {activeTab === 'chat' && <Divider sx={{ flexShrink: 0 }} />}
    </Box>
  )
}
