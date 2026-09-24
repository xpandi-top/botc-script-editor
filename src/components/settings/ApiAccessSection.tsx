/**
 * ApiAccessSection — connects the app to the API worker (worker/): shows the
 * API/MCP URLs, manages personal access tokens for agents and moves library
 * data to/from the cloud library. Rendered unless the build sets VITE_API_URL=off.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import HubIcon from '@mui/icons-material/Hub'
import type { CloudSyncState } from '../../hooks/useCloudSync'
import { createToken, getApiUrl, importLibrary, listTokens, revokeToken, uploadLibrary, type ApiToken } from '../../lib/apiClient'
import { useT } from '../../context/I18nContext'
import { makeTpl } from '../../lib/t'
import type { Language } from '../../types'

function CopyField({ label, value }: { label: string; value: string }) {
  const { t } = useT()
  return (
    <Stack direction="row" spacing={1} sx={{ maxWidth: 560, alignItems: 'center' }}>
      <TextField size="small" fullWidth label={label} value={value} slotProps={{ input: { readOnly: true } }} />
      <Tooltip title={t('copy')}>
        <IconButton aria-label={t('copy')} onClick={() => { void navigator.clipboard?.writeText(value) }}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}

export function ApiAccessSection({ cloud, language }: { cloud: CloudSyncState; language: Language }) {
  const { t } = useT()
  const tpl = useMemo(() => makeTpl(language), [language])
  const apiUrl = getApiUrl()
  const [tokens, setTokens] = useState<ApiToken[] | null>(null)
  const [tokenName, setTokenName] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true)
    setMessage(null)
    try {
      await work()
    } catch (e) {
      setMessage({ severity: 'error', text: tpl('api_error', e instanceof Error ? e.message : String(e)) })
    } finally {
      setBusy(false)
    }
  }, [tpl])

  useEffect(() => {
    if (!cloud.connected) { setTokens(null); return }
    void run(async () => setTokens(await listTokens()))
    // Reload the list whenever the Google connection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloud.connected])

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HubIcon />
        {t('api_access')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 560 }}>
        {t('api_access_desc')}
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <CopyField label={t('api_endpoint')} value={apiUrl} />
        <CopyField label={t('api_mcp_endpoint')} value={`${apiUrl}/mcp`} />
      </Stack>

      {message && <Alert severity={message.severity} sx={{ mb: 2, maxWidth: 560 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      {!cloud.connected ? (
        <Alert severity="info" sx={{ maxWidth: 560 }}>{t('api_sign_in_hint')}</Alert>
      ) : (
        <Stack spacing={3} sx={{ maxWidth: 560 }}>
          <Box>
            <Typography variant="h6" gutterBottom>{t('api_tokens')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{t('api_tokens_desc')}</Typography>
            {newToken && (
              <Alert severity="warning" sx={{ mb: 1.5 }} onClose={() => setNewToken(null)}>
                {t('api_token_created')}
                <Box sx={{ mt: 1 }}><CopyField label={t('api_tokens')} value={newToken} /></Box>
              </Alert>
            )}
            <Stack spacing={1} sx={{ mb: 1.5 }}>
              {tokens?.length === 0 && <Typography variant="body2" color="text.secondary">{t('api_no_tokens')}</Typography>}
              {tokens?.map((token) => (
                <Stack key={token.id} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{token.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(token.createdAt).toLocaleDateString()}
                      {token.lastUsedAt ? ` · ${new Date(token.lastUsedAt).toLocaleString()}` : ''}
                    </Typography>
                  </Box>
                  <Button size="small" color="error" disabled={busy}
                    onClick={() => run(async () => { await revokeToken(token.id); setTokens(await listTokens()) })}>
                    {t('api_revoke')}
                  </Button>
                </Stack>
              ))}
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField size="small" label={t('api_token_name')} value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="Claude" />
              <Button variant="outlined" disabled={busy}
                onClick={() => run(async () => {
                  const created = await createToken(tokenName.trim() || 'Agent')
                  setNewToken(created.token)
                  setTokenName('')
                  setTokens(await listTokens())
                })}>
                {t('api_create_token')}
              </Button>
            </Stack>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>{t('api_library')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{t('api_library_desc')}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" disabled={busy}
                onClick={() => run(async () => {
                  const n = await uploadLibrary()
                  setMessage({ severity: 'success', text: tpl('api_upload_done', n.scripts, n.characters, n.records) })
                })}>
                {t('api_upload')}
              </Button>
              <Button variant="outlined" disabled={busy}
                onClick={() => run(async () => {
                  const n = await importLibrary()
                  setMessage({ severity: 'success', text: tpl('api_import_done', n.scripts, n.characters, n.records) })
                })}>
                {t('api_import')}
              </Button>
            </Stack>
          </Box>
        </Stack>
      )}
    </Box>
  )
}
