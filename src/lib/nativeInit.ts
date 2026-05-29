import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { preloadStorage, migrateLegacyStorage } from './storage'
import { STORAGE_KEY, USER_SCRIPTS_KEY, SCRIPT_META_KEY, DEFAULT_ST_NAME_KEY } from '../components/StorytellerSub/constants'
import { BOTC_SCRIPT_FOLDERS_KEY } from '../components/tabs/ScriptsTab.constants'
import { CUSTOM_CHARACTERS_KEY, REVISION_OVERRIDES_KEY } from '../catalog'
import { LAST_SYNC_KEY, USER_INFO_KEY } from '../hooks/useCloudSync'
import { CLIENT_ID_STORAGE_KEY, CLIENT_SECRET_STORAGE_KEY } from './googleAuth'

/** All localStorage keys the app uses — must be preloaded on native. */
const ALL_STORAGE_KEYS = [
  // Storyteller state (current + legacy migration sources)
  STORAGE_KEY,
  'botc-storyteller-companion-v4',
  'botc-storyteller-companion-v3',
  // Scripts & characters
  USER_SCRIPTS_KEY,
  SCRIPT_META_KEY,
  BOTC_SCRIPT_FOLDERS_KEY,
  CUSTOM_CHARACTERS_KEY,
  REVISION_OVERRIDES_KEY,
  // Cloud sync
  LAST_SYNC_KEY,
  USER_INFO_KEY,
  CLIENT_ID_STORAGE_KEY,
  CLIENT_SECRET_STORAGE_KEY,
  // UI preferences
  'botc-active-tab',
  'botc-ui-language',
  'botc-theme-mode',
  'botc-font-settings-v2',
  'botc-bgm-custom-tracks',
  DEFAULT_ST_NAME_KEY,
]

export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  // 1. Migrate any existing localStorage data into Preferences (one-time)
  await migrateLegacyStorage(ALL_STORAGE_KEYS)

  // 2. Pre-load all keys into the sync cache so React reads appear synchronous
  await preloadStorage(ALL_STORAGE_KEYS)

  // 3. Configure native UI chrome
  try {
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#f6f1e7' })
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch (_) {
    // StatusBar not available on all platforms (e.g. iPad without status bar)
  }
}
