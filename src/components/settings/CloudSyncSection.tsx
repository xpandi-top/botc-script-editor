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
import type { CloudSyncState } from '../../hooks/useCloudSync'
import {
  getClientId, saveClientId, clearClientId,
  getClientSecret, saveClientSecret, clearClientSecret,
  getRedirectUri,
} from '../../lib/googleAuth'
import type { Language } from '../../types'
import { makeT } from '../../lib/t'

export function CloudSyncSection({ cloud, language }: {
  cloud: CloudSyncState
  language: Language
}) {
  const t = makeT(language)
  const zh = language === 'zh'
  const [clientIdInput, setClientIdInput] = useState(() => getClientId())
  const [clientSecretInput, setClientSecretInput] = useState(() => getClientSecret())
  const [clientIdSaved, setClientIdSaved] = useState(false)

  const hasClientId = !!getClientId()
  const isPreConfigured = !!(
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
          <strong>{zh ? '连接失败' : 'Connection failed'}:</strong>{' '}
          {cloud.errorMessage}
          {cloud.errorMessage.includes('redirect_uri_mismatch') && (
            <Box sx={{ mt: 0.5 }}>
              {zh ? '请确认在 Google Cloud Console 中添加了完整的 Redirect URI：' : 'Ensure this exact Redirect URI is registered in Cloud Console:'}
              {' '}<code style={{ fontSize: '0.75rem' }}>{getRedirectUri()}</code>
            </Box>
          )}
        </Alert>
      )}

      {/* Redirect URI display */}
      {!cloud.connected && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5, maxWidth: 520 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {zh
              ? '在 Google Cloud Console → Authorized redirect URIs 中添加此地址：'
              : 'Add this URI to Google Cloud Console → Authorized redirect URIs:'}
          </Typography>
          <Box component="code" sx={{ fontSize: '0.8rem', wordBreak: 'break-all', color: 'primary.main', fontWeight: 600 }}>
            {getRedirectUri()}
          </Box>
        </Box>
      )}

      {/* Credentials */}
      {!cloud.connected && (
        isPreConfigured ? (
          <Alert severity="success" sx={{ mb: 2, maxWidth: 520 }}>
            {zh
              ? 'OAuth 凭据已由应用内置，无需手动配置。直接点击"连接 Google Drive"即可。'
              : 'OAuth credentials are pre-configured. Just click Connect Google Drive below.'}
          </Alert>
        ) : (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, maxWidth: 520 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {zh ? '需要自行配置 Google OAuth2 凭据。' : 'Configure your own Google OAuth2 credentials.'}
              {' '}
              <Box component="a"
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank" rel="noopener noreferrer"
                sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                {zh ? '打开 Cloud Console →' : 'Open Cloud Console →'}
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
                {zh ? '已保存。请在 Cloud Console 中添加 Redirect URI：' : 'Saved. Register this Redirect URI in Cloud Console:'}
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
                  <CloudSyncIcon sx={{ fontSize: 36, color: 'primary.dark' }} />
                  <CircularProgress size={44} thickness={3} sx={{ position: 'absolute', color: 'primary.main' }} />
                </>
              ) : isError ? (
                <CloudOffIcon sx={{ fontSize: 36, color: 'error.dark' }} />
              ) : (
                <CloudIcon sx={{ fontSize: 36, color: 'success.dark' }} />
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isError ? 'error.dark' : isBusy ? 'primary.dark' : 'success.dark' }}>
                {isBusy
                  ? (cloud.status === 'pulling' ? t('pulling_from_drive') : t('pushing_to_drive'))
                  : isError ? t('sync_failed')
                  : t('connected_google_drive')}
              </Typography>
              {cloud.userInfo && (
                <Typography variant="body2" sx={{ fontWeight: 600, color: isError ? 'error.dark' : isBusy ? 'primary.dark' : 'success.dark' }}>
                  {cloud.userInfo.name} · {cloud.userInfo.email}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: isError ? 'error.dark' : isBusy ? 'primary.dark' : 'success.dark', opacity: 0.85 }}>
                {isError
                  ? (cloud.errorMessage ?? (zh ? '请检查网络或重新授权' : 'Check network or reconnect'))
                  : cloud.lastSynced
                    ? (zh ? `上次同步：${cloud.lastSynced.toLocaleString()}` : `Last synced: ${cloud.lastSynced.toLocaleString()}`)
                    : (zh ? '数据安全存储在您的 Google Drive 中' : 'Data stored privately in your Google Drive')}
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
            {zh
              ? '数据存储在您的私有 Google Drive appDataFolder 中，仅本应用可见。本地更改会在 2 秒后自动同步。'
              : 'Data stored in your private Google Drive appDataFolder — only visible to this app. Local changes auto-sync after 2 s.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
            {zh
              ? '连接 Google Drive 后，脚本、自定义角色和版本覆盖将自动跨设备同步。数据完全私有，存储在您的 Drive 中。'
              : 'Connect Google Drive to automatically sync scripts, custom characters, and revision overrides across devices. Data stays fully private in your own Drive.'}
          </Typography>
          <Button variant="contained" startIcon={<CloudIcon />}
            onClick={() => void cloud.connect()}
            disabled={!isPreConfigured && (!hasClientId || !getClientSecret())}
            sx={{ alignSelf: 'flex-start' }}>
            {t('connect_google_drive')}
          </Button>
          {!isPreConfigured && (!hasClientId || !getClientSecret()) && (
            <Typography variant="caption" color="text.secondary">
              {zh ? '请先保存 Client ID 和 Client Secret。' : 'Save both Client ID and Client Secret above first.'}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
}
