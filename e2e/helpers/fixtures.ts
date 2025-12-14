import { test as base } from '@playwright/test';
import { DROPage } from './dro-page';
import { MockCncjsServer } from './mock-cncjs-server';

/**
 * Custom fixtures for EL400 DRO E2E tests
 */
type DROFixtures = {
  dro: DROPage;
  droWithMock: DROPage;
  mockCncjs: MockCncjsServer;
};

/**
 * Extend base test with DRO page fixture
 * Usage:
 *   import { test, expect } from '../helpers/fixtures';
 *   test('my test', async ({ dro }) => { ... });
 */
export const test = base.extend<DROFixtures>({
  dro: async ({ page }, provide) => {
    const dro = new DROPage(page);
    await dro.goto();
    await provide(dro);
  },

  /**
   * DRO page fixture with MockAdapter enabled.
   * Use this fixture when tests need to call simulateEncoderMove.
   * Usage:
   *   test('my test', async ({ droWithMock }) => {
   *     await droWithMock.simulateEncoderMove('X', 10);
   *   });
   */
  droWithMock: async ({ page }, provide) => {
    const dro = new DROPage(page);
    await page.goto('/?source=mock');
    await page.waitForLoadState('networkidle');
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
