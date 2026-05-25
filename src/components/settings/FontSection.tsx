/**
 * FontPicker and LivePreview — extracted from SettingsTab.
 */
import { Box, Paper, Typography } from '@mui/material'
import type { FontOption } from '../../hooks/useFontSettings'
import type { Language } from '../../types'
import { useT } from '../../context/I18nContext'

// ── FontPicker ────────────────────────────────────────────────────────────────

export function FontPicker({
  label, labelZh, options, selectedId, onSelect, language,
}: {
  label: string
  labelZh: string
  options: FontOption[]
  selectedId: string
  onSelect: (id: string) => void
  language: Language
}) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
        {language === 'zh' ? labelZh : label}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {options.map((opt) => {
          const selected = opt.id === selectedId
          return (
            <Paper
              key={opt.id}
              elevation={selected ? 2 : 0}
              onClick={() => onSelect(opt.id)}
              sx={{
                px: 2, py: 1.25,
                minWidth: 150,
                maxWidth: 220,
                cursor: 'pointer',
                border: '1.5px solid',
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? 'primary.main' : 'background.paper',
                borderRadius: 1.5,
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: selected ? 'primary.main' : 'text.secondary', boxShadow: 2 },
              }}
            >
              <Typography sx={{
                fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em',
                color: selected ? 'primary.contrastText' : 'text.secondary', mb: 0.5,
              }}>
                {language === 'zh' ? opt.labelZh : opt.label}
              </Typography>
              <Typography sx={{
                fontFamily: `${opt.css}, Georgia, serif`,
                fontSize: '0.92rem', lineHeight: 1.4,
                color: selected ? 'primary.contrastText' : 'text.primary',
              }}>
                {language === 'zh' ? opt.sampleZh : opt.sample}
              </Typography>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}

// ── LivePreview ───────────────────────────────────────────────────────────────

export function LivePreview({
  enBodyCss, enDisplayCss, zhCss,
}: {
  language: Language
  enBodyCss: string
  enDisplayCss: string
  zhCss: string
}) {
  const { t } = useT()

  const previewCards = [
    {
      key: 'en-body', label: t('english_body'),
      fontFamily: `${enBodyCss}, Georgia, serif`,
      title: 'The Storyteller speaks in shadow.',
      body: 'Tonight, the Demon strikes again. Trust no one. Nominations are open — required votes: 7.',
      isLarge: false,
    },
    {
      key: 'en-display', label: t('english_title'),
      fontFamily: `${enDisplayCss}, Georgia, serif`,
      title: 'Blood on the Clocktower',
      body: 'Trouble Brewing · Sects & Violets',
      isLarge: true,
    },
    {
      key: 'zh-body', label: t('chinese_body'),
      fontFamily: `${zhCss}, "PingFang SC", sans-serif`,
      title: '说书人在黑暗中低语。',
      body: '今晚，恶魔再度出击。提名现已开放，所需票数为七票。',
      isLarge: false,
    },
    {
      key: 'zh-display', label: t('chinese_title'),
      fontFamily: `${zhCss}, "PingFang SC", sans-serif`,
      title: '染·钟楼谜团',
      body: '暗流涌动 · 梦陨春宵',
      isLarge: true,
    },
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
      {previewCards.map((card) => (
        <Box key={card.key} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem', fontWeight: 600 }}>
            {card.label}
          </Typography>
          <Typography sx={{
            fontFamily: card.fontFamily,
            fontSize: card.isLarge ? '1.4rem' : '0.875rem',
            lineHeight: card.isLarge ? 1.25 : 1.5,
            fontWeight: card.isLarge ? 600 : 400,
            mb: 0.5, color: 'text.primary',
          }}>
            {card.title}
          </Typography>
          <Typography sx={{
            fontFamily: card.fontFamily,
            fontSize: card.isLarge ? '0.875rem' : '0.78rem',
            color: 'text.secondary', lineHeight: 1.4,
          }}>
            {card.body}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
