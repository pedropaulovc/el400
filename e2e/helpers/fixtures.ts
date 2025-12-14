import { test as base } from '@playwright/test';
import { DROPage } from './dro-page';
import { MockCncjsServer } from './mock-cncjs-server';

/**
 * Custom fixtures for EL400 DRO E2E tests
 */
type DROFixtures = {
  dro: DROPage;
  mockCncjs: MockCncjsServer;
};

/**
 * Extend base test with DRO page fixture.
 * The DRO loads in manual mode by default, but supports MockAdapter
 * for tests that need encoder simulation via simulateEncoderMove().
 * 
 * Usage:
 *   import { test, expect } from '../helpers/fixtures';
 *   // Manual mode (default):
 *   test('my test', async ({ dro }) => { ... });
 *   
 *   // With MockAdapter for encoder simulation:
 *   test('encoder test', async ({ dro }) => { 
 *     await dro.goto({ source: 'mock' });
 *     await dro.simulateEncoderMove('X', 10);
 *   });
 */
export const test = base.extend<DROFixtures>({
  dro: async ({ page }, provide) => {
    const dro = new DROPage(page);
    await dro.goto();
    await provide(dro);
  },

  /**
   * Mock CNCjs server fixture for testing socket.io connections.
   * Automatically starts before test and stops after.
   * Usage:
   *   test('my test', async ({ page, mockCncjs }) => {
   *     await page.goto(`/?source=cncjs&host=localhost&port=${mockCncjs.getPort()}`);
   *   });
   */
  mockCncjs: async ({ baseURL: _baseURL }, provide) => {
    const server = new MockCncjsServer(8765);
    await server.start();
    await provide(server);
    await server.stop();
  },
});

export { expect } from '@playwright/test';
