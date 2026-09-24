import { defineConfig, devices } from '@playwright/test'

/**
 * Offline smoke test against the production build (dist/) and its service
 * worker. The spec starts and stops `vite preview` itself, so it can take the
 * server away as well as the network.
 *
 *   npm run build && npm run test:e2e:offline
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /offline\.spec\.ts/,
  reporter: 'list',
  timeout: 120_000,
  use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
})
