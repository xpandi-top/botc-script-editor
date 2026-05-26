/**
 * CloudSyncSection — Google Drive sync panel extracted from SettingsTab.
 */
import { useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Stack, Typography,
} from '@mui/material'
import CloudIcon from '@mui/icons-material/Cloud'
import CloudOffIcon from '@mui/icons-material/CloudOff'
import CloudSyncIcon from '@mui/icons-material/CloudSync'
import { Capacitor } from '@capacitor/core'
import type { CloudSyncState } from '../../hooks/useCloudSync'
import {
  getClientId, saveClientId, clearClientId,
  getClientSecret, saveClientSecret, clearClientSecret,
  getRedirectUri, isElectronConfigured,
} from '../../lib/googleAuth'
import type { Language } from '../../types'
import { useT } from '../../context/I18nContext'
import { makeTpl } from '../../lib/t'

export function CloudSyncSection({ cloud, language }: {
  cloud: CloudSyncState
  language: Language
}) {
  const { t } = useT()
  const tpl = makeTpl(language)
  const [clientIdInput, setClientIdInput] = useState(() => getClientId())
  const [clientSecretInput, setClientSecretInput] = useState(() => getClientSecret())
  const [clientIdSaved, setClientIdSaved] = useState(false)

  // Android: always pre-configured (SHA-1 verified, no secret needed)
  // Electron: pre-configured only when ELECTRON_CLIENT_ID baked into build
  // Web: user must enter credentials
  const isNative = Capacitor.isNativePlatform() || isElectronConfigured()
  const hasClientId = isNative || !!getClientId()
  const isPreConfigured = isNative || !!(
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() &&
    (import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string | undefined)?.trim()
  )

  const isBusy = cloud.connected && (cloud.status === 'pulling' || cloud.status === 'pushing' || cloud.status === 'syncing')
  const isError = cloud.connected && cloud.status === 'error'

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {cloud.connected ? <CloudSyncIcon /> : <CloudOffIcon />}
        {t('google_drive_sync')}
      </Typography>

      {/* Auth error */}
      {!cloud.connected && cloud.status === 'error' && cloud.errorMessage && (
        <Alert severity="error" sx={{ mb: 2, maxWidth: 520 }}>
          <strong>{t('connection_failed')}:</strong>{' '}
          {cloud.errorMessage}
          {!isNative && cloud.errorMessage.includes('redirect_uri_mismatch') && (
            <Box sx={{ mt: 0.5 }}>
              {t('gdrive_redirect_note')}
              {' '}<code style={{ fontSize: '0.75rem' }}>{getRedirectUri()}</code>
            </Box>
          )}
        </Alert>
      )}

      {/* Redirect URI display — web only */}
      {!cloud.connected && !isNative && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5, maxWidth: 520 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {t('gdrive_add_uri_note')}
          </Typography>
          <Box component="code" sx={{ fontSize: '0.8rem', wordBreak: 'break-all', color: 'text.primary', fontWeight: 600 }}>
            {getRedirectUri()}
          </Box>
        </Box>
      )}

      {/* Credentials — web only; Android uses hardcoded client ID verified by APK SHA-1 */}
      {!cloud.connected && !isNative && (
        isPreConfigured ? (
          <Alert severity="success" sx={{ mb: 2, maxWidth: 520 }}>
            {t('gdrive_preconfigured_note')}
          </Alert>
        ) : (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, maxWidth: 520 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {t('configure_your_own_google_oauth2_credentials')}
              {' '}
              <Box component="a"
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank" rel="noopener noreferrer"
                sx={{ color: 'info.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                {t('open_cloud_console')}
              </Box>
            </Typography>

            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Client ID</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }}>
              <Box
                component="input"
                placeholder="…apps.googleusercontent.com"
                value={clientIdInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setClientIdInput(e.target.value); setClientIdSaved(false) }}
                sx={{
                  flex: 1, minWidth: 220,
                  border: '1px solid', borderColor: 'divider', borderRadius: 1,
                  px: 1.25, py: '6px', fontSize: '0.8rem',
                  bgcolor: 'background.paper', color: 'text.primary', outline: 'none',
                  '&:focus': { borderColor: 'primary.main' },
                  fontFamily: 'monospace',
                }}
              />
              <Button size="small" variant="outlined" disabled={!clientIdInput.trim()}
                onClick={() => { saveClientId(clientIdInput); setClientIdSaved(true) }}>
                {t('save')}
              </Button>
              {hasClientId && (
                <Button size="small" color="error" variant="outlined"
                  onClick={() => { clearClientId(); setClientIdInput(''); setClientIdSaved(false) }}>
                  {t('clear')}
                </Button>
              )}
            </Stack>

            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Client Secret</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Box
                component="input"
                type="password"
                placeholder="GOCSPX-…"
                value={clientSecretInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientSecretInput(e.target.value)}
                sx={{
                  flex: 1, minWidth: 220,
                  border: '1px solid', borderColor: 'divider', borderRadius: 1,
                  px: 1.25, py: '6px', fontSize: '0.8rem',
                  bgcolor: 'background.paper', color: 'text.primary', outline: 'none',
                  '&:focus': { borderColor: 'primary.main' },
                  fontFamily: 'monospace',
                }}
              />
              <Button size="small" variant="outlined" disabled={!clientSecretInput.trim()}
                onClick={() => { saveClientSecret(clientSecretInput); setClientIdSaved(true) }}>
                {t('save')}
              </Button>
              {getClientSecret() && (
                <Button size="small" color="error" variant="outlined"
                  onClick={() => { clearClientSecret(); setClientSecretInput('') }}>
                  {t('clear')}
                </Button>
              )}
            </Stack>

            {clientIdSaved && (
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                {t('saved_register_this_redirect_uri_in_cloud_console')}
                {' '}
                <Box component="code" sx={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {getRedirectUri()}
                </Box>
              </Typography>
            )}
          </Box>
        )
      )}

      {/* Connected status banner */}
      {cloud.connected ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{
            p: 2, borderRadius: 2, border: '2px solid',
            borderColor: isError ? 'error.main' : isBusy ? 'primary.main' : 'success.main',
            bgcolor: isError ? 'error.light' : isBusy ? 'primary.light' : 'success.light',
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isBusy ? (
                <>
                  <CloudSyncIcon sx={{ fontSize: 36, color: 'primary.light' }} />
                  <CircularProgress size={44} thickness={3} sx={{ position: 'absolute', color: 'primary.main' }} />
                </>
              ) : isError ? (
                <CloudOffIcon sx={{ fontSize: 36, color: 'error.dark' }} />
              ) : (
                <CloudIcon sx={{ fontSize: 36, color: 'success.dark' }} />
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isError ? 'error.dark' : isBusy ? 'primary.light' : 'success.dark' }}>
                {isBusy
                  ? (cloud.status === 'pulling' ? t('pulling_from_drive') : t('pushing_to_drive'))
                  : isError ? t('sync_failed')
                  : t('connected_google_drive')}
              </Typography>
              {cloud.userInfo && (
                <Typography variant="body2" sx={{ fontWeight: 600, color: isError ? 'error.dark' : isBusy ? 'primary.light' : 'success.dark' }}>
                  {cloud.userInfo.name} · {cloud.userInfo.email}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: isError ? 'error.dark' : isBusy ? 'primary.light' : 'success.dark', opacity: 0.85 }}>
                {isError
                  ? (cloud.errorMessage ?? (t('check_network_or_reconnect')))
                  : cloud.lastSynced
                    ? tpl('last_synced_time', cloud.lastSynced.toLocaleString())
                    : (t('data_stored_privately_in_your_google_drive'))}
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button variant="contained" size="small"
              startIcon={isBusy ? <CircularProgress size={14} color="inherit" /> : <CloudSyncIcon />}
              onClick={() => void cloud.syncNow()} disabled={isBusy}>
              {t('sync_now')}
            </Button>
            <Button variant="outlined" size="small" color="error" startIcon={<CloudOffIcon />} onClick={cloud.disconnect}>
              {t('disconnect')}
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 480 }}>
            {t('gdrive_appdatafolder_note')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
            {t('gdrive_connect_desc')}
          </Typography>
          <Button variant="contained" startIcon={<CloudIcon />}
            onClick={() => void cloud.connect()}
            disabled={!isNative && !isPreConfigured && (!hasClientId || !getClientSecret())}
            sx={{ alignSelf: 'flex-start' }}>
            {t('connect_google_drive')}
          </Button>
          {!isNative && !isPreConfigured && (!hasClientId || !getClientSecret()) && (
            <Typography variant="caption" color="text.secondary">
              {t('save_both_client_id_and_client_secret_above_first')}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
}
