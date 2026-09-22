import { Chip } from '@mui/material'
import { useT } from '../../../context/I18nContext'
import type { Alignment } from '../../../utils/seatAlignment'

export function AlignmentBadge({ alignment, onClick }: { alignment: Alignment | null; onClick?: () => void }) {
  const { t } = useT()
  return <Chip size="small" data-alignment={alignment ?? 'unset'}
    label={alignment ? t(alignment) : t('alignment_unset')}
    color={alignment === 'evil' ? 'error' : alignment === 'good' ? 'info' : 'default'}
    variant="outlined" onClick={onClick} sx={{ fontWeight: 700, height: 24 }} />
}
