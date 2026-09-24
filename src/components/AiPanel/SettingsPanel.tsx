/**
 * SettingsPanel — how the assistant answers. Two main modes: online (the BOTC
 * hosted AI, no key) and local (answers from local data, plus an optional
 * model on this device). Using your own API key is an optional, advanced mode.
 */

import { HostedAiSettings } from './HostedAiSettings'
import { WebLlmSettings } from './WebLlmSettings'
import { Box, Chip, Collapse, MenuItem, Select, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useT } from '../../context/I18nContext'
import {
  PROVIDER_MODELS, PROVIDER_LABELS, aiModeOf, availableProviders, getDefaultModel,
  type AiMode, type AiSettings, type KeyedAiProvider,
} from '../../lib/aiSettings'

type Props = {
  settings: AiSettings
  patchSettings: (patch: Partial<AiSettings>) => void
  showSettings: boolean
  busy?: boolean
}

type Mode = AiMode
const KEYED: KeyedAiProvider[] = ['groq', 'openrouter', 'gemini']

export function SettingsPanel({ settings, patchSettings, showSettings, busy }: Props) {
  const { language } = useT()
  const zh = language === 'zh'
  const mode: Mode = aiModeOf(settings)
  const keyed = mode === 'byok' ? settings.provider as KeyedAiProvider : null
  // Raw value (not trimmed) so typing is not disturbed.
  const apiKey = keyed ? settings.keys[keyed] : ''
  const modes: Array<[Mode, string]> = [
    ...(availableProviders().includes('botc') ? [['online', zh ? '在线 · BOTC 免费' : 'Online · BOTC free'] as [Mode, string]] : []),
    ['local', zh ? '本地 · 离线' : 'Local · offline'],
    ['byok', zh ? '自带 Key（可选）' : 'Own key (optional)'],
  ]
  const choose = (next: Mode) => {
    const provider = next === 'online' ? 'botc' : next === 'local' ? 'webllm' : 'groq'
    patchSettings({ provider, model: getDefaultModel(provider) })
  }

  return (
    <Collapse in={showSettings}>
      <Box sx={{
        px: 1.5, py: 1,
        bgcolor: 'action.hover',
        borderBottom: '1px solid', borderColor: 'divider',
        flexShrink: 0,
      }}>
        <Tabs
          value={mode}
          onChange={(_: unknown, v: unknown) => choose(v as Mode)}
          variant="fullWidth"
          sx={{ mb: 1, minHeight: 26, '& .MuiTabs-indicator': { height: 2 } }}
        >
          {modes.map(([value, label]) => (
            <Tab
              disabled={busy} key={value} value={value} label={label}
              sx={{ minHeight: 26, py: 0, fontSize: '0.65rem', textTransform: 'none' }}
            />
          ))}
        </Tabs>

        {mode === 'online' && <HostedAiSettings />}

        {mode === 'local' && (
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="caption">
              {zh
                ? '不需要模型也能用：角色能力、角色包数量、相克、夜晚顺序、规则、开局配置、剧本组合都直接从本地资料和规则程序给出。下载下面的模型后，还能在本机生成解释。'
                : 'Works without a model: abilities, edition counts, jinxes, night order, rules, game setups and scripts come straight from local data and the rules engine. Download the model below to also get explanations generated on this device.'}
            </Typography>
            <Select
              size="small" fullWidth disabled={busy}
              value={settings.model}
              onChange={(e) => patchSettings({ model: e.target.value })}
              sx={{ fontSize: '0.75rem' }}
            >
              {PROVIDER_MODELS.webllm.map((m) => (
                <MenuItem key={m.id} value={m.id} sx={{ fontSize: '0.75rem' }}>{m.label}</MenuItem>
              ))}
            </Select>
            <WebLlmSettings model={settings.model} />
          </Box>
        )}

        {mode === 'byok' && keyed && (
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {zh ? '使用你自己的服务商账号与额度。Key 只保存在本机浏览器中。' : 'Uses your own provider account and quota. The key stays in this browser.'}
            </Typography>
            <Select
              size="small" fullWidth disabled={busy}
              value={keyed}
              onChange={(e) => { const p = e.target.value as KeyedAiProvider; patchSettings({ provider: p, model: getDefaultModel(p) }) }}
              sx={{ fontSize: '0.75rem' }}
            >
              {KEYED.map((p) => <MenuItem key={p} value={p} sx={{ fontSize: '0.75rem' }}>{PROVIDER_LABELS[p]}</MenuItem>)}
            </Select>
            <Select
              size="small" fullWidth disabled={busy}
              value={settings.model}
              onChange={(e) => patchSettings({ model: e.target.value })}
              sx={{ fontSize: '0.75rem' }}
            >
              {PROVIDER_MODELS[keyed].map((m) => (
                <MenuItem key={m.id} value={m.id} sx={{ fontSize: '0.75rem' }}>
                  {m.label}
                  {m.free && (
                    <Chip label="free" size="small" color="success" sx={{ ml: 1, height: 14, fontSize: '0.58rem' }} />
                  )}
                </MenuItem>
              ))}
            </Select>
            <TextField
              size="small" fullWidth type="password"
              label={`${PROVIDER_LABELS[keyed]} API Key`}
              value={apiKey ?? ''}
              onChange={(e) =>
                patchSettings({ keys: { [keyed]: e.target.value } as AiSettings['keys'] })
              }
              placeholder={zh ? '只保存在本机' : 'Stored on this device only'}
              sx={{ '& input': { fontSize: '0.75rem' } }}
            />
          </Box>
        )}
      </Box>
    </Collapse>
  )
}
