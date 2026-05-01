import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { preloadStorage, migrateLegacyStorage } from './storage'

/** All localStorage keys the app uses — must be preloaded on native. */
const ALL_STORAGE_KEYS = [
  'botc-storyteller-companion-v5',
  'botc-storyteller-companion-v4', // legacy migration source
  'botc-storyteller-companion-v3', // legacy migration source
  'BOTC_USER_SCRIPTS',
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
