import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.starlingworld.app',
  appName: 'StarlingWorld',
  webDir: 'dist',
  backgroundColor: '#03050b',
  ios: {
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#03050b',
      showSpinner: false,
    },
  },
}

export default config
