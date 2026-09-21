import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

async function gotoSetupRow(
  dro: DROPage,
  matches: (text: string) => boolean,
  description: string,
  axis: 'X' | 'Y' | 'Z' = 'X',
) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis(axis);

  for (let step = 0; step < 80; step += 1) {
    if (matches(await dro.getAxisRawText('X'))) return;
    await dro.key2.click();
  }
  throw new Error(`${description} setup row not found`);
}

async function saveChangesAndExit(dro: DROPage) {
  for (let step = 0; step < 80; step += 1) {
    if ((await dro.getAxisRawText('X')).toLowerCase() === 'sau chg') break;
    await dro.key2.click();
  }
  expect((await dro.getAxisRawText('X')).toLowerCase()).toBe('sau chg');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StorEd');

  for (let step = 0; step < 80; step += 1) {
    if ((await dro.getAxisRawText('X')) === 'End') break;
    await dro.key2.click();
  }
  await dro.waitForAxisPureTextValue('X', 'End');
  await dro.enterButton.click();
  await dro.waitForReady('idle');
}

async function setBeep(dro: DROPage, enabled: boolean) {
  const target = enabled ? 'bEEP on' : 'bEEP oFF';
  await gotoSetupRow(dro, (text) => text.startsWith('bEEP'), 'bEEP');
  if ((await dro.getAxisRawText('X')) !== target) await dro.key6.click();
  await dro.waitForAxisPureTextValue('X', target);
  await saveChangesAndExit(dro);
}

async function setDisplayResolution(
  dro: DROPage,
  axis: 'X' | 'Y' | 'Z',
  target: 'dP 10.0' | 'dP 20.0' | 'dP 50.0',
) {
  await gotoSetupRow(dro, (text) => text.startsWith('dP'), 'dP', axis);
  for (let step = 0; step < 10; step += 1) {
    if ((await dro.getAxisRawText('X')) === target) break;
    await dro.key6.click();
  }
  await dro.waitForAxisPureTextValue('X', target);
  await saveChangesAndExit(dro);
}

async function captureOemBaseline(dro: DROPage) {
  await gotoSetupRow(dro, (text) => text === 'oEm mod', 'oEm mod');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'PASS');
  for (const key of [dro.key3, dro.key5, dro.key7, dro.key2, dro.key6]) {
    await key.click();
  }
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'oEm');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StorEd');

  while ((await dro.getAxisRawText('X')) !== 'End') {
    await dro.key2.click();
  }
  await dro.enterButton.click();
  await dro.waitForReady('idle');
}

async function programSdmStepOneX(dro: DROPage, value: string) {
  await dro.page.getByTestId('btn-sdm').click();
  await dro.waitForAxisPureTextValue('X', 'ProGrAn');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StEPno');
  await dro.enterButton.click();
  await dro.enterNumber(value);
  await dro.enterButton.click();
  await dro.enterButton.click();
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StEPno');
  await dro.clearButton.click();
  await dro.waitForReady('idle');
}

async function expectSdmStepOneX(dro: DROPage, expected: number) {
  await dro.page.getByTestId('btn-sdm').click();
  await dro.waitForAxisPureTextValue('X', 'ProGrAn');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StEPno');
  await dro.enterButton.click();
  await dro.waitForAxisPureNumberValue('X', expected);
}

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

    // Fast forward to allow async operations to complete
    await dro.page.clock.fastForward(100);

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

    // Fast forward to allow async operations to complete
    await dro.page.clock.fastForward(100);

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

    // Fast forward to allow async operations to complete
    await dro.page.clock.fastForward(100);

    // Toggle back to inch
    await dro.toggleInchMm();
    await expect(await dro.isInchUnits()).toBe(true);

    // Fast forward to allow async operations to complete
    await dro.page.clock.fastForward(100);

    // Reload
    await dro.reload();

    // Should be inch after reload
    await expect(await dro.isInchUnits()).toBe(true);
  });

  test('persists saved bEEP and dP settings across a debug-source reload', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await setBeep(dro, false);
    await setDisplayResolution(dro, 'X', 'dP 10.0');

    await dro.reload();
    await gotoSetupRow(dro, (text) => text.startsWith('bEEP'), 'bEEP');
    await dro.waitForAxisPureTextValue('X', 'bEEP oFF');
    await dro.clearButton.click();
    await dro.waitForReady('idle');

    await gotoSetupRow(dro, (text) => text.startsWith('dP'), 'dP');
    await dro.waitForAxisPureTextValue('X', 'dP 10.0');
  });

  test('restores only the selected axis from a persisted OEM baseline', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await setDisplayResolution(dro, 'X', 'dP 10.0');
    await captureOemBaseline(dro);

    // Cross a power-cycle, then make the selected axis, another axis, and a
    // global setting all distinctive. Reset OEM must restore only X.
    await dro.reload();
    await setDisplayResolution(dro, 'X', 'dP 50.0');
    await setDisplayResolution(dro, 'Y', 'dP 20.0');
    await setBeep(dro, false);
    await gotoSetupRow(dro, (text) => text === 'rSt oEm', 'rSt oEm', 'X');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'In ProG');
    await dro.waitForReady('idle');
    await dro.reload();

    await gotoSetupRow(dro, (text) => text.startsWith('dP'), 'X dP', 'X');
    await dro.waitForAxisPureTextValue('X', 'dP 10.0');
    await dro.clearButton.click();
    await dro.waitForReady('idle');

    await gotoSetupRow(dro, (text) => text.startsWith('dP'), 'Y dP', 'Y');
    await dro.waitForAxisPureTextValue('X', 'dP 20.0');
    await dro.clearButton.click();
    await dro.waitForReady('idle');

    await gotoSetupRow(dro, (text) => text.startsWith('bEEP'), 'bEEP');
    await dro.waitForAxisPureTextValue('X', 'bEEP oFF');
  });

  test('factory restore without an OEM snapshot preserves other axes, globals, and job data', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await setDisplayResolution(dro, 'X', 'dP 50.0');
    await setDisplayResolution(dro, 'Y', 'dP 20.0');
    await setBeep(dro, false);
    await programSdmStepOneX(dro, '4.2');

    await gotoSetupRow(dro, (text) => text === 'rSt oEm', 'rSt oEm', 'X');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'In ProG');
    await dro.waitForReady('idle');
    await dro.reload();

    await gotoSetupRow(dro, (text) => text.startsWith('dP'), 'X dP', 'X');
    await dro.waitForAxisPureTextValue('X', 'dP 5.0');
    await dro.clearButton.click();
    await dro.waitForReady('idle');

    await gotoSetupRow(dro, (text) => text.startsWith('dP'), 'Y dP', 'Y');
    await dro.waitForAxisPureTextValue('X', 'dP 20.0');
    await dro.clearButton.click();
    await dro.waitForReady('idle');

    await gotoSetupRow(dro, (text) => text.startsWith('bEEP'), 'bEEP');
    await dro.waitForAxisPureTextValue('X', 'bEEP oFF');
    await dro.clearButton.click();
    await dro.waitForReady('idle');
    await expectSdmStepOneX(dro, 4.2);
  });

  /**
   * AC35.6: settings remain live and persistent in a real same-origin iframe.
   */
  test('persists settings through a same-origin iframe reload', async ({ dro }) => {
    const current = new URL(dro.page.url());
    const widgetPath = `${current.pathname}${current.search}`;

    await dro.page.evaluate((src) => {
      document.body.replaceChildren();
      const frame = document.createElement('iframe');
      frame.title = 'EL400 settings widget';
      frame.src = src;
      document.body.appendChild(frame);
    }, widgetPath);

    const widget = dro.page.frameLocator('iframe[title="EL400 settings widget"]');
    await expect(widget.getByTestId('el400-simulator')).toHaveAttribute('data-dro-state', 'idle');
    await widget.getByRole('button', { name: 'Toggle units' }).click();
    await expect(widget.getByTestId('led-mm').locator('input')).toBeChecked();

    await dro.page.evaluate((src) => {
      const prior = document.querySelector('iframe');
      prior?.remove();
      const frame = document.createElement('iframe');
      frame.title = 'EL400 settings widget';
      frame.src = src;
      document.body.appendChild(frame);
    }, widgetPath);

    await expect(widget.getByTestId('el400-simulator')).toHaveAttribute('data-dro-state', 'idle');
    await expect(widget.getByTestId('led-mm').locator('input')).toBeChecked();
  });
});
