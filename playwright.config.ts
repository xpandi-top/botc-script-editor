import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E config.
 * Runs against the Vite preview server (production build).
 *
 * Run:
 *   npm run test:e2e          # headless
 *   npm run test:e2e:ui       # Playwright UI mode
 *   npm run test:e2e:headed   # headed (visible browser)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',

  use: {
    // Dev server (npm run dev) uses base '/' — no sub-path needed.
    // Production preview uses /botc-script-editor/ but dev is simpler for tests.
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'mobile-android',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 393, height: 851 },
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  // Build + serve production bundle before running tests.
  // Comment out webServer to target an already-running server.
  webServer: {
    // Dev server: fast startup, no build step, base path is '/'
    // For CI you can switch to: 'npm run build && npm run preview'
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
