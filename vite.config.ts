import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command, mode }) => {
  const isNative = mode === 'native'

  // Security warning: client_secret baked into bundle is visible in plain text.
  // Acceptable for self-hosted instances; warn loudly for public builds.
  if (command === 'build' && process.env.VITE_GOOGLE_CLIENT_SECRET) {
    console.warn(
      '\x1b[33m[security] VITE_GOOGLE_CLIENT_SECRET is set — it will be embedded in the ' +
      'JS bundle in plain text. Anyone who downloads the built files can read it. ' +
      'For public deployments, use a server-side OAuth proxy instead.\x1b[0m'
    )
  }

  return {
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/utils/**', 'src/hooks/**', 'src/lib/**', 'src/components/**'],
        exclude: ['src/components/StorytellerSub/useStoryteller.ts'],
      },
    },
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
          globPatterns: ['**/*.{js,css,html,ico,png,woff2}'],
          globIgnores: ['botcCompanion.svg'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
    } : {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React + MUI/Emotion MUST be in the same chunk.
            // Splitting them causes a module-init race: vendor-mui's top-level
            // code accesses React internals (e.g. AsyncMode) before vendor-react
            // has finished setting them up → "Cannot set properties of undefined".
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/scheduler') ||
              id.includes('node_modules/@mui/') ||
              id.includes('node_modules/@emotion/')
            ) {
              return 'vendor'
            }
          },
        },
      },
    },
  }
})
