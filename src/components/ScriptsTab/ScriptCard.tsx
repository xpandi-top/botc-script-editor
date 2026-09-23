import { Box, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import { useT } from '../../context/I18nContext'
import type { EditableScript, Language } from '../../types'

type Props = {
  script: EditableScript
  isActive: boolean
  isBuiltIn: boolean
  language: Language
  onSelect: () => void
}

export function ScriptCard({ script, isActive, isBuiltIn, language, onSelect }: Props) {
  const { t } = useT()
  const title = language === 'zh' && script.titleZh ? script.titleZh : script.title
  const source = ['tb', 'bmr', 'snv'].includes(script.slug) ? t('official') : isBuiltIn ? t('community') : t('nav_mine')
  const subtitle = `${script.author || source} · ${script.characters.length} ${t('library_roles')}${script.version ? ` · v${script.version}` : ''}`
  return <Box component="button" type="button" onClick={onSelect} aria-pressed={isActive} title={`${title}\n${subtitle}`}
    sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%', minWidth: 0, textAlign: 'left', font: 'inherit',
      p: 1, minHeight: 58, border: 0, borderRadius: 2, cursor: 'pointer', color: 'text.primary',
      bgcolor: isActive ? 'action.selected' : 'transparent', borderLeft: '3px solid', borderLeftColor: isActive ? 'primary.main' : 'transparent',
      '&:hover': { bgcolor: 'action.hover' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 } }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', minWidth: 0 }}>
      <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: isActive ? 700 : 500 }}>{title}</Typography>
      {isActive && <CheckIcon sx={{ fontSize: 16, flexShrink: 0 }} />}
    </Box>
    <Typography variant="caption" noWrap sx={{ color: 'text.secondary', maxWidth: '100%' }}>{subtitle}</Typography>
  </Box>
}
