import { test as base } from '@playwright/test';
import { DROPage } from './dro-page';

/**
 * Custom fixtures for EL400 DRO E2E tests
 */
type DROFixtures = {
  dro: DROPage;
};

/**
 * Extend base test with DRO page fixture
 * Usage:
 *   import { test, expect } from '../helpers/fixtures';
 *   test('my test', async ({ dro }) => { ... });
 */
export const test = base.extend<DROFixtures>({
  dro: async ({ page }, use) => {
    const dro = new DROPage(page);
    await dro.goto();
    await use(dro);
  },
});

export { expect } from '@playwright/test';
