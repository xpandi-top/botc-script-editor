import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const isNative = Capacitor.isNativePlatform()

// ── Async adapter (Preferences on native, localStorage on web) ────

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isNative) {
      const { value } = await Preferences.get({ key })
      return value
    }
    return localStorage.getItem(key)
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isNative) {
      syncCache.set(key, value)
      await Preferences.set({ key, value })
    } else {
      localStorage.setItem(key, value)
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isNative) {
      syncCache.delete(key)
      await Preferences.remove({ key })
    } else {
      localStorage.removeItem(key)
    }
  },
}

// ── Sync cache for native (pre-loaded before React renders) ───────
//
// On native the async Preferences API can't be called synchronously.
// We pre-load all known keys into `syncCache` in nativeInit before
// mounting React, so existing sync read paths work without refactoring.

const syncCache = new Map<string, string | null>()

/**
 * Preload a set of keys from Preferences into the sync cache.
 * Must be called (and awaited) before ReactDOM.createRoot on native.
 */
export async function preloadStorage(keys: string[]): Promise<void> {
  if (!isNative) return
  await Promise.all(
    keys.map(async (key) => {
      const { value } = await Preferences.get({ key })
      syncCache.set(key, value)
    }),
  )
}

/**
 * Migrate any existing localStorage data into Preferences (one-time,
 * runs on first native launch after installing the update).
 * Clears localStorage after migration so the data lives in one place.
 */
export async function migrateLegacyStorage(keys: string[]): Promise<void> {
  if (!isNative) return
  for (const key of keys) {
    // If Preferences already has data for this key, skip
    const { value: existing } = await Preferences.get({ key })
    if (existing !== null) continue

    // Check if localStorage still has a value (first-time migration)
    const legacy = localStorage.getItem(key)
    if (legacy !== null) {
      await Preferences.set({ key, value: legacy })
      syncCache.set(key, legacy)
      localStorage.removeItem(key)
    }
  }
}

/**
 * Synchronous read/write shim.
 * - Web: direct localStorage (unchanged behaviour)
 * - Native: reads from pre-loaded syncCache; writes fire async to Preferences
 *           and update the cache immediately so subsequent sync reads are current.
 */
export const storageSync = {
  getItem(key: string): string | null {
    if (isNative) return syncCache.get(key) ?? null
    return localStorage.getItem(key)
  },

  setItem(key: string, value: string): void {
    if (isNative) {
      syncCache.set(key, value)
      // fire-and-forget — React state is already updated synchronously
      Preferences.set({ key, value }).catch(() => {})
    } else {
      localStorage.setItem(key, value)
    }
  },

  removeItem(key: string): void {
    if (isNative) {
      syncCache.delete(key)
      Preferences.remove({ key }).catch(() => {})
    } else {
      localStorage.removeItem(key)
    }
  },
}
