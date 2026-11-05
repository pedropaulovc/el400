import { test as base } from '@playwright/test';
import { DROPage } from './dro-page';
import * as crypto from 'crypto';

// Port is derived the same way as in playwright.config.ts (deterministic based on cwd)
function getWorktreePort(): number {
  if (process.env['E2E_PORT']) {
    return parseInt(process.env['E2E_PORT'], 10);
  }
  const hash = crypto.createHash('md5').update(process.cwd()).digest('hex');
  const portOffset = parseInt(hash.slice(0, 4), 16) % 1000;
  return 9000 + portOffset;
}

const E2E_PORT = getWorktreePort();
const E2E_MOCK_CNCJS_PORT = E2E_PORT + 1000;

/**
 * Custom fixtures for EL400 DRO E2E tests
 */
type DROFixtures = {
  dro: DROPage;
};

type DROOptions = {
  droSource: 'cncjs' | 'manual';
  workingUnit: 'G20' | 'G21';
  controllerFirmware: 'grbl' | 'fluidnc';
};

/**
 * Extend base test with DRO fixtures.
 *
 * The mock CNCjs server runs globally (started by Playwright webServer config).
 * Each test gets a fresh DROPage with a unique sessionId for isolation.
 * Connected legacy scenarios explicitly start the controller in G20 (inches);
 * the server's unseeded default remains G21 and its $13 report units stay mm.
 * Use test.use({ workingUnit: 'G21' }) for a metric controller, or
 * test.use({ droSource: 'manual' }) for standalone preferences/local datums.
 *
 * Usage:
 *   import { test, expect } from '../helpers/fixtures';
 *
 *   test('my test', async ({ dro }) => {
 *     await dro.simulateEncoderAbsoluteMove('X', 10);
 *     await dro.waitForAxisValue('X', 0.3937);
 *   });
 */
export const test = base.extend<DROFixtures & DROOptions>({
  droSource: ['cncjs', { option: true }],
  workingUnit: ['G20', { option: true }],
  controllerFirmware: ['grbl', { option: true }],
  /**
   * DROPage using the selected source and initial controller working units.
   * Session seeding happens once; goto/reload must preserve controller changes.
   *
   * Note: The fixture clears localStorage and performs an initial dro.goto().
   * Tests that need different boot behavior should first arrange any desired
   * localStorage or other boot state, then call dro.goto() again.
   */
  dro: async ({ page, droSource, workingUnit, controllerFirmware }, use) => {
    // Clear localStorage before each test to ensure isolation
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); });

    const dro = new DROPage(page, E2E_MOCK_CNCJS_PORT, undefined, droSource);
    if (droSource === 'cncjs') await dro.seedController(workingUnit, controllerFirmware);
    // Connected scenarios await native join, confirmed units, and fresh WPos.
    await dro.goto();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(dro);
  },
});

export { expect } from '@playwright/test';
