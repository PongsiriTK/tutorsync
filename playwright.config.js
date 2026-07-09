import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    // TS_BASE_URL lets the cloud harness point at a separately-served build.
    baseURL: process.env.TS_BASE_URL || 'http://localhost:4519',
    trace: 'retain-on-failure',
  },
  // The default guest-mode webServer; the cloud harness serves its own build,
  // so skip this when a live API is configured.
  webServer: process.env.TS_E2E_API ? undefined : {
    // Dedicated port + no reuse: guarantees the suite tests THIS app even if
    // another dev server is running elsewhere on the machine.
    command: 'npm run build && npm run preview -- --port 4519 --strictPort',
    port: 4519,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile', testMatch: /mobile\.spec\.js/, use: { viewport: { width: 390, height: 844 } } },
    { name: 'calendar', testMatch: /calendar\.spec\.js/, use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', testMatch: /desktop\.spec\.js/, use: { viewport: { width: 1440, height: 900 } } },
    // cloud project only runs when a live backend URL is provided:
    //   TS_E2E_API=http://localhost:8791 npx playwright test --project=cloud
    // mobile width so it reuses the mobile bottom-nav selectors.
    { name: 'cloud', testMatch: /cloud\.spec\.js/, use: { viewport: { width: 390, height: 844 } } },
  ],
})
