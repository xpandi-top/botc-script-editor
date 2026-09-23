import { Box, Typography } from '@mui/material'
import type { GameRecord } from '../StorytellerSub/types'
import type { Language } from '../../types'
import { getDisplayName } from '../../catalog'
import { recordPlayers } from '../../utils/playerIdentity'
import { makeT } from '../../lib/t'

export function IdentityHistoryView({ record, language }: { record: GameRecord; language: Language }) {
  const t = makeT(language)
  const players = recordPlayers(record)
  if (!players.length) return null
  const role = (id?: string | null) => id ? getDisplayName(id, language) : t('identity_unknown')
  const team = (value?: string | null) => value === 'good' ? t('good_short') : value === 'evil' ? t('evil_short') : t('identity_unknown')
  return <Box sx={{ my: 1.5 }}>
    <Typography variant="subtitle2">{t('identity_history')}</Typography>
    {players.map(p => {
      const changes = [...(record.savedDays ?? [])].sort((a, b) => a.day - b.day)
        .flatMap(d => (d.identityHistory?.changes ?? []).filter(c => c.seat === p.seat).map(c => ({ ...c, day: d.day })))
      return <Box key={p.seat} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>#{p.seat} {p.name}</Typography>
        <Typography variant="body2">{t('identity_initial')}: {role(p.initialCharacterId)} · {team(p.initialTeam)} → {t('identity_final')}: {role(p.finalCharacterId)} · {team(p.finalTeam)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {t('identity_roles')}: {p.characterChangeCount ?? t('identity_unknown')} · {t('identity_teams')}: {p.alignmentChangeCount ?? t('identity_unknown')}
        </Typography>
        {!!changes.length && <Box component="details" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
          <summary>{t('identity_history')} ({changes.length})</summary>
          {changes.map((c, i) => <Box key={i} sx={{ mt: 0.5 }}>
            {language === 'zh' ? `第 ${c.day} 天` : `Day ${c.day}`} · {c.phase === 'night' ? t('night_phase') : t('day_phase')} · {new Date(c.at).toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US')} · {role(c.from.characterId)} ({team(c.from.team)}) → {role(c.to.characterId)} ({team(c.to.team)})
          </Box>)}
        </Box>}
      </Box>
    })}
    {players.some(p => !p.historyComplete) && <Typography variant="caption" color="text.secondary">{t('identity_missing')}</Typography>}
  </Box>
}
