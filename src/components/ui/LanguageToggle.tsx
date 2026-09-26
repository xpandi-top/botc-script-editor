import { Button, Tooltip } from '@mui/material'
import { useT } from '../../context/I18nContext'
import type { Language } from '../../types'

/**
 * Compact language switch for toolbars where a full select does not fit.
 * Shows the language in use (中文 / EN); the tooltip names the one a click switches to.
 */
export function LanguageToggle({ language, onLanguageChange }: { language: Language; onLanguageChange: (language: Language) => void }) {
  const { t } = useT()
  const zh = language === 'zh'
  const next = zh ? 'English' : '中文'
  return <Tooltip title={`${t('toggle_language')} → ${next}`}>
    <Button size="small" variant="outlined" lang={zh ? 'zh' : 'en'}
      aria-label={`${t('language')}: ${zh ? '中文' : 'English'} · ${t('toggle_language')} → ${next}`}
      onClick={() => onLanguageChange(zh ? 'en' : 'zh')}
      sx={{ minWidth: 40, px: 1, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {zh ? '中文' : 'EN'}
    </Button>
  </Tooltip>
}
