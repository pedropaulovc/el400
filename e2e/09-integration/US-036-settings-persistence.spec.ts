import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-036 Settings Persistence
 *
 * Tests that settings are persisted to localStorage and survive page reloads.
 *
 * @see project/user-stories/09-integration/US-036-settings-persistence.md
 */
test.describe('US-036: Settings Persistence', () => {
  test.beforeEach(async ({ dro }) => {
    // Clear localStorage on the current page (dro fixture already navigated)
    await dro.page.evaluate(() => {
      localStorage.clear();
    });
    // Reload to apply cleared state
    await dro.reload();
  });

  /**
   * Controller-confirmed units survive reconnecting on page reload.
   */
  test('should retain controller-confirmed units across page reload', async ({ dro }) => {
    // The connected fixture explicitly seeds the controller in G20.
    await expect(await dro.isInchUnits()).toBe(true);

    await dro.toggleInchMm();
    await expect.poll(() => dro.isMmUnits()).toBe(true);
    await expect.poll(() => dro.page.evaluate(() => {
      const settings = localStorage.getItem('el400-dro-non-volatile-memory');
      return settings ? JSON.parse(settings).state.nvMem.defaultUnit : null;
    })).toBe('mm');

    // Reconnect to the same mock session, whose controller is now in G21.
    await dro.reload();

    await expect(await dro.isMmUnits()).toBe(true);
    await expect(await dro.isInchUnits()).toBe(false);
  });

  test.describe('standalone local preferences', () => {
    test.use({ droSource: 'manual' });

    test('should persist unit preference across page reload', async ({ dro }) => {
      await expect(await dro.isInchUnits()).toBe(true);
      await dro.toggleInchMm();
      await expect(await dro.isMmUnits()).toBe(true);

      await dro.reload();

      await expect(await dro.isMmUnits()).toBe(true);
      await expect(await dro.isInchUnits()).toBe(false);
    });

    test('should load default settings on first visit', async ({ dro }) => {
      await expect(await dro.isInchUnits()).toBe(true);
      await expect(await dro.isAbsMode()).toBe(true);
    });

    test('should store settings in localStorage', async ({ dro }) => {
      await dro.toggleInchMm();

      const settings = await dro.page.evaluate(() => {
        return localStorage.getItem('el400-dro-non-volatile-memory');
      });

      expect(settings).toBeTruthy();
      const parsed = JSON.parse(settings!);
      // Zustand persist middleware wraps state in { state: {...}, version: 0 }.
      expect(parsed.state.nvMem.defaultUnit).toBe('mm');
    });

    test('should handle corrupted localStorage gracefully', async ({ dro }) => {
      await dro.page.evaluate(() => {
        localStorage.setItem('el400-dro-non-volatile-memory', 'invalid json {{{');
      });

      await dro.reload();

      await expect(await dro.isInchUnits()).toBe(true);
      await expect(await dro.isAbsMode()).toBe(true);
    });

    test('should persist settings through multiple changes', async ({ dro }) => {
      await expect(await dro.isInchUnits()).toBe(true);
      await dro.toggleInchMm();
      await expect(await dro.isMmUnits()).toBe(true);
      await dro.toggleInchMm();
      await expect(await dro.isInchUnits()).toBe(true);

      await dro.reload();

      await expect(await dro.isInchUnits()).toBe(true);
    });
  });

  test.describe('controller unit authority', () => {
    test.use({ droSource: 'cncjs', workingUnit: 'G21' });

    test('should override a conflicting local inch preference with controller G21', async ({ dro }) => {
      await dro.page.evaluate(() => {
        localStorage.setItem('el400-dro-non-volatile-memory', JSON.stringify({
          state: { nvMem: { defaultUnit: 'inch' } },
          version: 0,
        }));
      });

      // Hydrate the conflicting preference, then await controller readiness.
      await dro.reload();

      await expect(await dro.isMmUnits()).toBe(true);
      await expect(await dro.isInchUnits()).toBe(false);
      const settings = await dro.page.evaluate(() => {
        return localStorage.getItem('el400-dro-non-volatile-memory');
      });
      expect(JSON.parse(settings!).state.nvMem.defaultUnit).toBe('mm');

      await dro.reload();

      await expect(await dro.isMmUnits()).toBe(true);
      await expect(await dro.isInchUnits()).toBe(false);
    });
  });

  /**
   * AC35.6: The DRO works as a CNCjs widget embedded in an iframe.
   * localStorage must work in same-origin context.
   */
  test('should work in same-origin context', async ({ dro }) => {
    // Verify localStorage is available (page is already navigated by beforeEach/dro fixture)
    const hasLocalStorage = await dro.page.evaluate(() => {
      try {
        localStorage.setItem('test', 'value');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    });

    expect(hasLocalStorage).toBe(true);
  });
});
