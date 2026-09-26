import { Button, Tooltip } from '@mui/material'
import { useT } from '../../context/I18nContext'
import type { Language } from '../../types'

/** Compact 中 / EN switch for toolbars where a full select does not fit. */
export function LanguageToggle({ language, onLanguageChange }: { language: Language; onLanguageChange: (language: Language) => void }) {
  const { t } = useT()
  return <Tooltip title={t('toggle_language')}>
    <Button size="small" variant="outlined" aria-label={`${t('toggle_language')}: ${t('lang_switch')}`}
      onClick={() => onLanguageChange(language === 'zh' ? 'en' : 'zh')}
      sx={{ minWidth: 40, px: 1, fontWeight: 700 }}>
      {t('lang_switch')}
    </Button>
  </Tooltip>
}
