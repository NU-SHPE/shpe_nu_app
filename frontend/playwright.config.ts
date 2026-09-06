import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests run against the real production web build (`expo export -p web`)
 * served as a static SPA — the same artifact Vercel ships. They exercise only
 * the unauthenticated surface (render, client-side validation, routing); they
 * do NOT hit Firebase, so no real project or credentials are needed. `npm test`
 * builds first, then runs these; `npm run test:e2e` assumes `dist/` exists.
 */
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run serve:web',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
