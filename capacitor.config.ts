import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.hyp.botcstoryteller',
  appName: 'BOTC Storyteller',
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
    scrollEnabled: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f6f1e7',
  },
}

export default config
