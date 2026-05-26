import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'top.xpandi.botcstoryteller',
  appName: 'BOTC Companion',
  webDir: 'dist-native',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'Dark',
      backgroundColor: '#f6f1e7',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#f6f1e7',
      showSpinner: false,
    },
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f6f1e7',
  },
}

export default config
