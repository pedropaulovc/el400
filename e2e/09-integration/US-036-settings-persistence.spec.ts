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
   * Unit preference persists across page reload.
   */
  test('should persist unit preference across page reload', async ({ dro }) => {
    // Install clock to control time-based operations
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });

    // Verify starting in inch mode (default)
    await expect(await dro.isInchUnits()).toBe(true);

    // Switch to mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);

    // Fast forward to ensure any debounced saves complete (settings have 300ms debounce)
    await dro.page.clock.fastForward(500);

    // Reload the page using dro.reload() to preserve localStorage
    await dro.reload();

    // Verify still in mm mode
    await expect(await dro.isMmUnits()).toBe(true);
    await expect(await dro.isInchUnits()).toBe(false);
  });

  /**
   * Default settings are loaded on first visit.
   */
  test('should load default settings on first visit', async ({ dro }) => {
    // Default unit should be inch
    await expect(await dro.isInchUnits()).toBe(true);

    // Default mode should be ABS
    await expect(await dro.isAbsMode()).toBe(true);
  });

  /**
   * Settings are stored in localStorage.
   */
  test('should store settings in localStorage', async ({ dro }) => {
    // Install clock to control time-based operations
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });

    // Toggle unit to mm
    await dro.toggleInchMm();

    // Fast forward to ensure debounced save completes
    await dro.page.clock.fastForward(500);

    // Check localStorage
    const settings = await dro.page.evaluate(() => {
      return localStorage.getItem('el400-dro-non-volatile-memory');
    });

    expect(settings).toBeTruthy();
    const parsed = JSON.parse(settings!);
    // Zustand persist middleware wraps state in { state: {...}, version: 0 }
    expect(parsed.state.nvMem.defaultUnit).toBe('mm');
  });

  /**
   * Corrupted localStorage falls back to defaults.
   */
  test('should handle corrupted localStorage gracefully', async ({ dro }) => {
    // Set corrupted localStorage
    await dro.page.evaluate(() => {
      localStorage.setItem('el400-dro-non-volatile-memory', 'invalid json {{{');
    });

    // Reload page
    await dro.reload();

    // Should fall back to defaults
    await expect(await dro.isInchUnits()).toBe(true);
    await expect(await dro.isAbsMode()).toBe(true);
  });

  /**
   * Settings persistence across multiple toggles.
   */
  test('should persist settings through multiple changes', async ({ dro }) => {
    // Install clock to control time-based operations
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });

    // Start with defaults (inch)
    await expect(await dro.isInchUnits()).toBe(true);

    // Toggle to mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);

    // Fast forward to ensure save completes
    await dro.page.clock.fastForward(300);

    // Toggle back to inch
    await dro.toggleInchMm();
    await expect(await dro.isInchUnits()).toBe(true);

    // Fast forward to ensure save completes
    await dro.page.clock.fastForward(300);

    // Reload
    await dro.reload();

    // Should be inch after reload
    await expect(await dro.isInchUnits()).toBe(true);
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
