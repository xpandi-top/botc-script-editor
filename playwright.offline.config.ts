import { defineConfig, devices } from '@playwright/test'

/**
 * Offline smoke test against the production build (dist/) and its service
 * worker. The spec starts and stops `vite preview` itself, so it can take the
 * server away as well as the network.
 *
 *   npm run build && npm run test:e2e:offline
 *   BOTC_E2E_WEBGPU=1 npm run test:e2e:offline   # also the local model (downloads ~0.4 GB)
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /offline\.spec\.ts/,
  reporter: 'list',
  timeout: 120_000,
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
    // Real GPU for the opt-in WebGPU test (headless Chromium otherwise gets a
    // software adapter without shader-f16).
    launchOptions: { args: ['--enable-unsafe-webgpu', '--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [])] },
  },
})
