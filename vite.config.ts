import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// The commit a build came from, for AI answer traces (src/lib/ai/trace.ts).
function buildId(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return 'unknown' }
}

export default defineConfig(({ command, mode, isPreview }) => {
  const isNative = mode === 'native'
  // `vite preview` serves the production build, so it needs the production base.
  const production = command === 'build' || Boolean(isPreview)

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
    define: { __BUILD_ID__: JSON.stringify(buildId()) },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      globals: true,
      // Tests opt in to the API (vi.stubEnv); the build default is the public worker.
      env: { VITE_API_URL: 'off' },
      // worker/ has its own package and test runner (cd worker && npm test)
      exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', 'worker/**', '.claude/**'],
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
          scope: production ? '/botc-script-editor/' : '/',
          start_url: production ? '/botc-script-editor/' : '/',
          icons: [
            { src: 'favicon.png', sizes: '192x192', type: 'image/png' },
            { src: 'favicon.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          // Keep the app shell fast for GitHub Pages/deal links. Character
          // icons and large fonts are runtime-cached when requested instead of
          // being mandatory first-install precache entries.
          // wiki-chunks.json: rules and wiki excerpts behind offline answers
          // (src/lib/wikiSearch.ts), ready offline after the first visit.
          // Character guides (assets/almanac, ~3 MB) are cached per edition
          // on first use instead (see runtimeCaching).
          globPatterns: ['**/*.{js,css,html,ico,webmanifest}', 'wiki-chunks.json'],
          globIgnores: ['botcCompanion.svg', '**/webllm*.js', '**/almanac-*.js'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              // Optional local inference code is cached only after explicit use.
              urlPattern: /\/assets\/webllm[^/]*\.js$/,
              handler: 'CacheFirst',
              options: { cacheName: 'webllm-runtime', expiration: { maxEntries: 8 } },
            },
            {
              // One chunk per edition and language (assets/almanac/*.json), hashed.
              // Module imports send Origin; a server's `Vary: Origin` must not split the cache.
              urlPattern: /\/assets\/almanac-[^/]*\.js$/,
              handler: 'CacheFirst',
              options: { cacheName: 'almanac', expiration: { maxEntries: 40 }, matchOptions: { ignoreVary: true } },
            },
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
    // Web build: scoped base path; native/electron build: relative paths (file:// protocol)
    base: isNative ? './' : (production ? '/botc-script-editor/' : '/'),
    build: isNative ? {
      outDir: 'dist-native',
    } : {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/@mlc-ai/')) return 'webllm-runtime'
            // Character guides: a named chunk per file, cached on first use (not precached).
            const almanac = id.match(/\/assets\/almanac\/([^/]+)\.json$/)?.[1]
            if (almanac && almanac !== 'index') return `almanac-${almanac}`
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
