import { test as base } from '@playwright/test';
import { DROPage } from './dro-page';

const MOCK_CNCJS_PORT = 8765;

/**
 * Custom fixtures for EL400 DRO E2E tests
 */
type DROFixtures = {
  dro: DROPage;
};

/**
 * Extend base test with DRO fixtures.
 *
 * The mock CNCjs server runs globally (started by Playwright webServer config).
 * Each test gets a fresh DROPage with a unique sessionId for isolation.
 *
 * Usage:
 *   import { test, expect } from '../helpers/fixtures';
 *
 *   test('my test', async ({ dro }) => {
 *     await dro.simulateEncoderAbsoluteMove('X', 10);
 *     await dro.waitForAxisValue('X', 0.3937);
 *   });
 */
export const test = base.extend<DROFixtures>({
  /**
   * DROPage connected to the global mock CNCjs server.
   * Each test gets a unique sessionId for isolation.
   *
   * Note: The fixture clears localStorage and performs an initial dro.goto().
   * Tests that need different boot behavior should first arrange any desired
   * localStorage or other boot state, then call dro.goto() again.
   */
  dro: async ({ page }, use) => {
    // Clear localStorage before each test to ensure isolation
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); });

    const dro = new DROPage(page, MOCK_CNCJS_PORT);
    // Navigate with default settings (boot message skipped)
    await dro.goto();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(dro);
  },
});

export { expect } from '@playwright/test';
