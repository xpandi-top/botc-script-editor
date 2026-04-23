import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

export async function initNative() {
  if (!Capacitor.isNativePlatform()) return

  try {
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#f6f1e7' })
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch (_) {
    // StatusBar not available on all platforms (e.g. iPad without status bar)
  }
}
