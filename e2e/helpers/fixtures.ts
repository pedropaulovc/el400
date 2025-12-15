import { test as base } from '@playwright/test';
import { DROPage } from './dro-page';
import { MockCncjsServer } from './mock-cncjs-server';

const MOCK_CNCJS_PORT = 8765;

/**
 * Custom fixtures for EL400 DRO E2E tests
 */
type DROFixtures = {
  dro: DROPage;
  mockCncjs: MockCncjsServer;
  droWithCncjs: DROPage;
};

/**
 * Extend base test with DRO fixtures.
 *
 * Available fixtures:
 *   - `dro`: DROPage in manual mode (no encoder simulation)
 *   - `droWithCncjs`: DROPage connected to mock CNCjs server (supports simulateEncoderMove)
 *   - `mockCncjs`: Raw MockCncjsServer for custom setup
 *
 * Usage:
 *   import { test, expect } from '../helpers/fixtures';
 *
 *   // Manual mode (default):
 *   test('my test', async ({ dro }) => { ... });
 *
 *   // With CNCjs for encoder simulation:
 *   test('encoder test', async ({ droWithCncjs }) => {
 *     await droWithCncjs.simulateEncoderMove('X', 10);
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
   */
  mockCncjs: async ({}, provide) => {
    const server = new MockCncjsServer(MOCK_CNCJS_PORT);
    await server.start();
    await provide(server);
    await server.stop();
  },

  /**
   * DROPage pre-wired with mock CNCjs server for encoder simulation.
   * The page is already navigated and connected to the mock server.
   * Use simulateEncoderMove() to simulate encoder movements.
   */
  droWithCncjs: async ({ page, mockCncjs }, provide) => {
    const dro = new DROPage(page);
    dro.setMockServer(mockCncjs);
    await dro.goto({ cncjs: { host: 'localhost', port: mockCncjs.getPort() } });
    await provide(dro);
  },
});

export { expect } from '@playwright/test';
