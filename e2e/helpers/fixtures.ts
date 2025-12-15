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
 * Extend base test with DRO fixtures.
 *
 * Available fixtures:
 *   - `dro`: DROPage connected to mock CNCjs server (supports simulateEncoderMove)
 *   - `mockCncjs`: Raw MockCncjsServer for custom setup
 *
 * Usage:
 *   import { test, expect } from '../helpers/fixtures';
 *
 *   test('my test', async ({ dro }) => {
 *     dro.simulateEncoderMove('X', 10);
 *     await dro.waitForAxisValue('X', 0.3937);
 *   });
 */
export const test = base.extend<DROFixtures>({
  /**
   * Mock CNCjs server fixture for testing socket.io connections.
   * Automatically starts before test and stops after.
   */
  // eslint-disable-next-line no-empty-pattern
  mockCncjs: async ({}, provide) => {
    const server = new MockCncjsServer();
    await server.start();
    await provide(server);
    await server.stop();
  },

  /**
   * DROPage pre-wired with mock CNCjs server for encoder simulation.
   * The page is already navigated and connected to the mock server.
   * Use simulateEncoderMove() to simulate encoder movements.
   */
  dro: async ({ page, mockCncjs }, provide) => {
    const dro = new DROPage(page);
    dro.setMockServer(mockCncjs);
    await dro.goto({ cncjs: { host: 'localhost', port: mockCncjs.getPort() } });
    await provide(dro);
  },
});

export { expect } from '@playwright/test';
