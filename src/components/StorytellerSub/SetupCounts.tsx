import { Box, Tooltip, Typography } from '@mui/material'
import { useT } from '../../context/I18nContext'

const visuallyHidden = { border: 0, clip: 'rect(0 0 0 0)', height: '1px', margin: '-1px', overflow: 'hidden', padding: 0, position: 'absolute', whiteSpace: 'nowrap', width: '1px' } as const
const TEAMS = ['townsfolk', 'outsider', 'minion', 'demon'] as const
const TEAM_COLORS: Record<typeof TEAMS[number], string> = { townsfolk: '#2e6ec4', outsider: '#7c4dbf', minion: '#c45c2e', demon: '#b91c1c' }

/** "7镇0外2爪1恶" / "7T 0O 2M 1D" — the setup for this player count, spelled out in the tooltip. */
export function SetupCounts({ dist, fontSize = 'clamp(0.75rem, 1.6vw, 0.95rem)' }: {
  dist: Record<typeof TEAMS[number], number>
  fontSize?: string
}) {
  const { t } = useT()
  const initial = { townsfolk: t('team_initial_townsfolk'), outsider: t('team_initial_outsider'), minion: t('team_initial_minion'), demon: t('team_initial_demon') }
  const names = { townsfolk: t('townsfolk'), outsider: t('outsider'), minion: t('minion'), demon: t('demon') }
  const summary = `${t('st_setup_counts')}: ${TEAMS.map(team => `${names[team]} ${dist[team]}`).join(' · ')}`
  return <Tooltip title={summary}>
    <Box component="span" sx={{ display: 'inline-flex', columnGap: 0.5, whiteSpace: 'nowrap' }}>
      <Box component="span" sx={visuallyHidden}>{summary}</Box>
      {TEAMS.map(team => <Typography key={team} component="span" aria-hidden sx={{ fontSize, fontWeight: 700, color: TEAM_COLORS[team], fontVariantNumeric: 'tabular-nums' }}>
        {dist[team]}{initial[team]}
      </Typography>)}
    </Box>
  </Tooltip>
}
