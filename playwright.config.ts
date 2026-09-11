import { defineConfig, devices } from '@playwright/test';

// E2E runs against the built app served by `vite preview`. Feed fetching is
// stubbed at the network layer inside tests (route interception of /relay), so
// the suite is deterministic and needs no live feeds or deployed worker.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [
    ['line'],
    ['@serenity-js/playwright-test', { crew: ['@serenity-js/console-reporter'] }],
  ],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
