import { defineConfig, devices } from '@playwright/test';
import * as crypto from 'crypto';

/**
 * Use a unique port for each worktree to avoid conflicts.
 * Port is derived from a hash of the current working directory.
 */
function getWorktreePort(): number {
  if (process.env['E2E_PORT']) {
    return parseInt(process.env['E2E_PORT'], 10);
  }
  // Create a deterministic port based on the working directory
  const hash = crypto.createHash('md5').update(process.cwd()).digest('hex');
  const portOffset = parseInt(hash.slice(0, 4), 16) % 1000;
  return 9000 + portOffset;
}

const E2E_PORT = getWorktreePort();
const E2E_MOCK_CNCJS_PORT = E2E_PORT + 1000;

// Export ports so fixtures.ts can use them
export { E2E_PORT, E2E_MOCK_CNCJS_PORT };

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env['CI'],
  /* Retry on CI only */
  retries: process.env['CI'] ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['list'],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: `http://localhost:${E2E_PORT}`,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Force headless in CI for performance */
    ...(process.env['CI'] ? { headless: true } : {}),
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports (uncomment if needed) */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Run your local dev server and mock CNCjs server before starting the tests */
  webServer: [
    {
      command: `npm run dev -- --port ${E2E_PORT}`,
      url: `http://localhost:${E2E_PORT}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 120 * 1000,
    },
    {
      command: `npx cross-env E2E_MOCK_CNCJS_PORT=${E2E_MOCK_CNCJS_PORT} npx tsx e2e/mock-cncjs-server.ts`,
      url: `http://localhost:${E2E_MOCK_CNCJS_PORT}/health`,
      reuseExistingServer: !process.env['CI'],
      timeout: 10 * 1000,
    },
  ],
});
