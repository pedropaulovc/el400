import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-036 Settings Persistence
 *
 * Tests that settings are persisted to localStorage and survive page reloads.
 *
 * @see project/user-stories/09-integration/US-036-settings-persistence.md
 */
test.describe('US-036: Settings Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first, then clear localStorage (can't access localStorage on about:blank)
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    // Reload to apply cleared state
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  /**
   * Unit preference persists across page reload.
   */
  test('should persist unit preference across page reload', async ({ page, dro }) => {
    // Verify starting in inch mode (default)
    await expect(await dro.isInchUnits()).toBe(true);

    // Switch to mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);

    // Wait for debounced save (settings have 300ms debounce)
    await page.waitForTimeout(500);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

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
  test('should store settings in localStorage', async ({ page, dro }) => {
    // Toggle unit to mm
    await dro.toggleInchMm();

    // Wait for debounced save
    await page.waitForTimeout(500);

    // Check localStorage
    const settings = await page.evaluate(() => {
      return localStorage.getItem('el400-dro-settings');
    });

    expect(settings).toBeTruthy();
    const parsed = JSON.parse(settings!);
    expect(parsed.defaultUnit).toBe('mm');
  });

  /**
   * Corrupted localStorage falls back to defaults.
   */
  test('should handle corrupted localStorage gracefully', async ({ page, dro }) => {
    // Set corrupted localStorage
    await page.evaluate(() => {
      localStorage.setItem('el400-dro-settings', 'invalid json {{{');
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should fall back to defaults
    await expect(await dro.isInchUnits()).toBe(true);
    await expect(await dro.isAbsMode()).toBe(true);
  });

  /**
   * Settings persistence across multiple toggles.
   */
  test('should persist settings through multiple changes', async ({ page, dro }) => {
    // Start with defaults (inch)
    await expect(await dro.isInchUnits()).toBe(true);

    // Toggle to mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);

    // Wait for save
    await page.waitForTimeout(300);

    // Toggle back to inch
    await dro.toggleInchMm();
    await expect(await dro.isInchUnits()).toBe(true);

    // Wait for save
    await page.waitForTimeout(300);

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');

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
