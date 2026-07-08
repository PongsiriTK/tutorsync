import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4519',
    trace: 'retain-on-failure',
  },
  webServer: {
    // Dedicated port + no reuse: guarantees the suite tests THIS app even if
    // another dev server is running elsewhere on the machine.
    command: 'npm run build && npm run preview -- --port 4519 --strictPort',
    port: 4519,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile', testMatch: /mobile\.spec\.js/, use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', testMatch: /desktop\.spec\.js/, use: { viewport: { width: 1440, height: 900 } } },
  ],
})
