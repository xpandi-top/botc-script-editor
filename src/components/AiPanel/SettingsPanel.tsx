/**
 * SettingsPanel — collapsible provider/model/key configuration.
 */

import { WebLlmSettings } from './WebLlmSettings'
import { Box, Collapse, MenuItem, Select, Tab, Tabs, TextField, Chip } from '@mui/material'
import {
  PROVIDER_MODELS, PROVIDER_LABELS, getDefaultModel,
  type AiProvider, type AiSettings,
} from '../../lib/aiSettings'

type Props = {
  settings: AiSettings
  patchSettings: (patch: Partial<AiSettings>) => void
  showSettings: boolean
  busy?: boolean
}

export function SettingsPanel({ settings, patchSettings, showSettings, busy }: Props) {
  const models  = PROVIDER_MODELS[settings.provider]
  const apiKey  = settings.provider === 'webllm' ? '' : settings.keys[settings.provider]

  return (
    <Collapse in={showSettings}>
      <Box sx={{
        px: 1.5, py: 1,
        bgcolor: 'action.hover',
        borderBottom: '1px solid', borderColor: 'divider',
        flexShrink: 0,
      }}>
        <Tabs
          value={settings.provider}
          onChange={(_: unknown, v: unknown) => {
            const p = v as AiProvider
            patchSettings({ provider: p, model: getDefaultModel(p) })
          }}
          variant="fullWidth"
          sx={{ mb: 1, minHeight: 26, '& .MuiTabs-indicator': { height: 2 } }}
        >
          {(['webllm', 'groq', 'openrouter', 'gemini'] as AiProvider[]).map((p) => (
            <Tab
              disabled={busy} key={p} value={p} label={PROVIDER_LABELS[p]}
              sx={{ minHeight: 26, py: 0, fontSize: '0.65rem', textTransform: 'none' }}
            />
          ))}
        </Tabs>

        <Select
          size="small" fullWidth disabled={busy}
          value={settings.model}
          onChange={(e) => patchSettings({ model: e.target.value })}
          sx={{ mb: 1, fontSize: '0.75rem' }}
        >
          {models.map((m) => (
            <MenuItem key={m.id} value={m.id} sx={{ fontSize: '0.75rem' }}>
              {m.label}
              {m.free && (
                <Chip label="free" size="small" color="success" sx={{ ml: 1, height: 14, fontSize: '0.58rem' }} />
              )}
            </MenuItem>
          ))}
        </Select>

        {settings.provider === 'webllm' ? <WebLlmSettings model={settings.model} /> : <TextField
          size="small" fullWidth type="password"
          label={`${PROVIDER_LABELS[settings.provider]} API Key`}
          value={apiKey ?? ''}
          onChange={(e) =>
            patchSettings({ keys: { [settings.provider]: e.target.value } as AiSettings['keys'] })
          }
          placeholder="Stored in localStorage only"
          sx={{ '& input': { fontSize: '0.75rem' } }}
        />}
      </Box>
    </Collapse>
  )
}
