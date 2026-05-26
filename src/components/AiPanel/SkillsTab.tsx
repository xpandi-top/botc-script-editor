/**
 * SkillsTab — browsable skill cards for the current context.
 * Maps icon strings to MUI ReactNode via ICON_MAP.
 */

import React from 'react'
import { Box, Divider, Paper, Typography, alpha } from '@mui/material'
import TranslateIcon         from '@mui/icons-material/Translate'
import LightbulbIcon         from '@mui/icons-material/Lightbulb'
import AbcIcon               from '@mui/icons-material/Abc'
import AutoFixHighIcon       from '@mui/icons-material/AutoFixHigh'
import NightsStayIcon        from '@mui/icons-material/NightsStay'
import InfoOutlinedIcon      from '@mui/icons-material/InfoOutlined'
import ArticleIcon           from '@mui/icons-material/Article'
import TimelineIcon          from '@mui/icons-material/Timeline'
import BarChartIcon          from '@mui/icons-material/BarChart'
import ReviewsIcon           from '@mui/icons-material/Reviews'
import MenuBookIcon          from '@mui/icons-material/MenuBook'
import AnalyticsIcon         from '@mui/icons-material/Analytics'
import DescriptionIcon       from '@mui/icons-material/Description'
import QuestionMarkIcon      from '@mui/icons-material/QuestionMark'
import RateReviewIcon        from '@mui/icons-material/RateReview'
import CompareIcon           from '@mui/icons-material/Compare'
import GavelIcon             from '@mui/icons-material/Gavel'
import PsychologyIcon        from '@mui/icons-material/Psychology'
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt'
import SupportAgentIcon      from '@mui/icons-material/SupportAgent'
import VisibilityIcon        from '@mui/icons-material/Visibility'
import SummarizeIcon         from '@mui/icons-material/Summarize'
import TodayIcon             from '@mui/icons-material/Today'
import InsightsIcon          from '@mui/icons-material/Insights'
import HelpOutlineIcon       from '@mui/icons-material/Help'
import TuneIcon              from '@mui/icons-material/Tune'
import { SKILLS } from '../../lib/ai/skills'
import type { AiContext } from '../../lib/ai/types'
import type { Language } from '../../types'
import { useT } from '../../context/I18nContext'

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  translate:           <TranslateIcon fontSize="small" />,
  lightbulb:           <LightbulbIcon fontSize="small" />,
  abc:                 <AbcIcon fontSize="small" />,
  autofix:             <AutoFixHighIcon fontSize="small" />,
  nights:              <NightsStayIcon fontSize="small" />,
  info:                <InfoOutlinedIcon fontSize="small" />,
  article:             <ArticleIcon fontSize="small" />,
  timeline:            <TimelineIcon fontSize="small" />,
  barchart:            <BarChartIcon fontSize="small" />,
  bar_chart:           <BarChartIcon fontSize="small" />,
  reviews:             <ReviewsIcon fontSize="small" />,
  menu_book:           <MenuBookIcon fontSize="small" />,
  analytics:           <AnalyticsIcon fontSize="small" />,
  description:         <DescriptionIcon fontSize="small" />,
  question:            <QuestionMarkIcon fontSize="small" />,
  // New icons for added/updated skills
  rate_review:         <RateReviewIcon fontSize="small" />,
  compare:             <CompareIcon fontSize="small" />,
  gavel:               <GavelIcon fontSize="small" />,
  psychology:          <PsychologyIcon fontSize="small" />,
  signal_cellular_alt: <SignalCellularAltIcon fontSize="small" />,
  support_agent:       <SupportAgentIcon fontSize="small" />,
  visibility:          <VisibilityIcon fontSize="small" />,
  summarize:           <SummarizeIcon fontSize="small" />,
  after_today:         <TodayIcon fontSize="small" />,
  insights:            <InsightsIcon fontSize="small" />,
  help:                <HelpOutlineIcon fontSize="small" />,
  tune:                <TuneIcon fontSize="small" />,
}

function getIcon(name: string): React.ReactNode {
  return ICON_MAP[name] ?? <InfoOutlinedIcon fontSize="small" />
}

type Props = {
  context: AiContext
  loading: boolean
  handleSend: (override?: string, displayLabel?: string) => void
  language: Language
}

export function SkillsTab({ context, loading, handleSend, language }: Props) {
  const zh = language === 'zh'
  const { t } = useT()

  const available = SKILLS.filter((s) => s.forContexts.includes(context.type))
  const allContextTypes = ['character', 'script', 'storyteller', 'gamelog', 'analysis', 'general'] as const
  const disabled  = SKILLS.filter((s) =>
    !s.forContexts.includes(context.type) &&
    !allContextTypes.every((t) => s.forContexts.includes(t)),
  )

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Typography variant="caption" color="text.secondary">
        {t('ai_run_skill')}
      </Typography>

      {available.map((skill) => (
        <Paper
          key={skill.id}
          variant="outlined"
          sx={{
            p: 1, cursor: loading ? 'default' : 'pointer', borderRadius: 1.25,
            transition: 'all 0.15s',
            opacity: loading ? 0.6 : 1,
            '&:hover': loading ? {} : {
              borderColor: 'primary.main',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
            },
          }}
          onClick={() => !loading && handleSend(skill.prompt(context), zh ? skill.labelZh : skill.label)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
            <Box sx={{ color: 'primary.main', display: 'flex', flexShrink: 0 }}>
              {getIcon(skill.icon)}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
              {zh ? skill.labelZh : skill.label}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
            {zh ? skill.descZh : skill.desc}
          </Typography>
        </Paper>
      ))}

      {disabled.length > 0 && (
        <>
          <Divider sx={{ my: 0.25 }} />
          <Typography variant="caption" color="text.disabled">
            {t('ai_skills_context')}
          </Typography>
          {disabled.map((skill) => (
            <Paper key={skill.id} variant="outlined" sx={{ p: 1, borderRadius: 1.25, opacity: 0.4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                <Box sx={{ color: 'text.disabled', display: 'flex', flexShrink: 0 }}>
                  {getIcon(skill.icon)}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.secondary' }}>
                  {zh ? skill.labelZh : skill.label}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.35 }}>
                {zh ? skill.descZh : skill.desc}
              </Typography>
            </Paper>
          ))}
        </>
      )}
    </Box>
  )
}
