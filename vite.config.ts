import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command, mode }) => {
  const isNative = mode === 'native'

  return {
    plugins: [
      react(),
      // Skip PWA plugin for native builds — Capacitor handles bundling
      ...(!isNative ? [VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'assets/icons/*.png'],
        manifest: {
          name: 'BOTC Storyteller Companion',
          short_name: 'BOTC',
          description: 'Blood on the Clocktower storyteller companion tool',
          theme_color: '#853f22',
          background_color: '#f6f1e7',
          display: 'standalone',
          orientation: 'any',
          scope: command === 'build' ? '/botc-script-editor/' : '/',
          start_url: command === 'build' ? '/botc-script-editor/' : '/',
          icons: [
            { src: 'favicon.png', sizes: '192x192', type: 'image/png' },
            { src: 'favicon.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /\/assets\/locales\/.+\.json$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'locales-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: /\/assets\/icons\/.+/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'icons-cache',
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      })] : []),
    ],
    // Web build: scoped base path; native build: root path (file:// protocol)
    base: isNative ? '/' : (command === 'build' ? '/botc-script-editor/' : '/'),
    build: isNative ? {
      outDir: 'dist-native',
    } : {},
  }
})
