import { Page, Locator, expect } from '@playwright/test';
import { parseNumericValue } from './test-constants';
import * as crypto from 'crypto';

/**
 * Page Object Model for the EL400 DRO Simulator
 * Provides a clean API for E2E tests to interact with the DRO
 */
export class DROPage {
  readonly page: Page;
  private readonly mockServerPort: number;
  private readonly sessionId: string;

  // Display elements
  readonly xDisplay: Locator;
  readonly yDisplay: Locator;
  readonly zDisplay: Locator;

  // LED indicators
  readonly absLED: Locator;
  readonly incLED: Locator;
  readonly inchLED: Locator;
  readonly mmLED: Locator;
  readonly fnLED: Locator;

  // Axis buttons
  readonly xButton: Locator;
  readonly yButton: Locator;
  readonly zButton: Locator;

  // Zero buttons
  readonly x0Button: Locator;
  readonly y0Button: Locator;
  readonly z0Button: Locator;
  readonly distanceToGoButton: Locator;

  // Keypad buttons
  readonly key0: Locator;
  readonly key1: Locator;
  readonly key2: Locator;
  readonly key3: Locator;
  readonly key4: Locator;
  readonly key5: Locator;
  readonly key6: Locator;
  readonly key7: Locator;
  readonly key8: Locator;
  readonly key9: Locator;
  readonly keyDecimal: Locator;
  readonly keyMinus: Locator;
  readonly enterButton: Locator;
  readonly clearButton: Locator;

  // Function buttons
  readonly halfButton: Locator;
  readonly settingsButton: Locator;
  readonly absIncButton: Locator;
  readonly toggleUnitButton: Locator;
  readonly referenceButton: Locator;
  readonly functionButton: Locator;
  readonly boltHoleButton: Locator;
  readonly angleHoleButton: Locator;

  constructor(page: Page, mockServerPort: number = 8765, sessionId?: string) {
    this.page = page;
    this.mockServerPort = mockServerPort;
    this.sessionId = sessionId || `test-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

    // Initialize display elements using testids (values are in sr-only table)
    this.xDisplay = page.getByTestId('axis-value-x');
    this.yDisplay = page.getByTestId('axis-value-y');
    this.zDisplay = page.getByTestId('axis-value-z');

    // Initialize LED indicators using data-testid
    this.absLED = page.getByTestId('led-abs');
    this.incLED = page.getByTestId('led-inc');
    this.inchLED = page.getByTestId('led-inch');
    this.mmLED = page.getByTestId('led-mm');
    this.fnLED = page.getByTestId('led-fn');

    // Initialize axis buttons using data-testid
    this.xButton = page.getByTestId('axis-select-x');
    this.yButton = page.getByTestId('axis-select-y');
    this.zButton = page.getByTestId('axis-select-z');

    // Initialize zero buttons using data-testid
    this.x0Button = page.getByTestId('axis-zero-x');
    this.y0Button = page.getByTestId('axis-zero-y');
    this.z0Button = page.getByTestId('axis-zero-z');
    this.distanceToGoButton = page.getByTestId('btn-distance-to-go');

    // Initialize keypad using data-testid
    this.key0 = page.getByTestId('key-0');
    this.key1 = page.getByTestId('key-1');
    this.key2 = page.getByTestId('key-2');
    this.key3 = page.getByTestId('key-3');
    this.key4 = page.getByTestId('key-4');
    this.key5 = page.getByTestId('key-5');
    this.key6 = page.getByTestId('key-6');
    this.key7 = page.getByTestId('key-7');
    this.key8 = page.getByTestId('key-8');
    this.key9 = page.getByTestId('key-9');
    this.keyDecimal = page.getByTestId('key-decimal');
    this.keyMinus = page.getByTestId('key-sign');
    this.enterButton = page.getByTestId('key-enter');
    this.clearButton = page.getByTestId('key-clear');

    // Initialize function buttons using data-testid
    this.halfButton = page.getByTestId('btn-half');
    this.settingsButton = page.getByTestId('btn-settings');
    this.absIncButton = page.getByTestId('btn-abs-inc');
    this.toggleUnitButton = page.getByTestId('btn-toggle-unit');
    this.referenceButton = page.getByTestId('btn-reference');
    this.functionButton = page.getByTestId('btn-function');
    this.boltHoleButton = page.getByTestId('btn-bolt-circle');
    this.angleHoleButton = page.getByTestId('btn-angle-hole');
  }

  /**
   * Navigate to the DRO simulator connected to the mock CNCjs server.
   * @param options.skipBootMessage - Skip boot message via URL param (default: true)
   */
  async goto(options?: { skipBootMessage?: boolean; taperOn?: 'X' | 'Z' | 'Zprime' }) {
    const params = new URLSearchParams();
    params.set('source', 'cncjs');
    params.set('host', 'localhost');
    params.set('port', this.mockServerPort.toString());
    params.set('sessionId', this.sessionId);

    const skipBoot = options?.skipBootMessage !== false;
    if (skipBoot) {
      params.set('bootMessageMode', 'skip');
    }
    if (options?.taperOn) {
      params.set('taperOn', options.taperOn);
    }

    const url = `/?${params.toString()}`;
    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');

    // Wait for Socket.IO connection and boot sequence to complete
    // Initial display is blank until useEffect runs and sets display
    if (skipBoot) {
      await this.waitForAxisValue('X', 0);
    }
  }

  /**
   * Reload the page preserving current URL params.
   */
  async reload() {
    await this.page.reload();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Get the current numeric value displayed for an axis.
   * Throws if the display shows text instead of a number.
   */
  async getAxisDisplayPureNumberValue(axis: 'X' | 'Y' | 'Z', precision = 4): Promise<number> {
    const display = axis === 'X' ? this.xDisplay : axis === 'Y' ? this.yDisplay : this.zDisplay;
    const text = (await display.textContent()) || '';
    return parseNumericValue(text, axis, precision);
  }

  /**
   * Press a numeric key sequence to enter a value
   */
  async enterNumber(value: string) {
    for (const char of value) {
      if (char === '.') {
        await this.keyDecimal.click();
      } else if (char === '-') {
        await this.keyMinus.click();
      } else if (/\d/.test(char)) {
        const key = this[`key${char}` as keyof this] as Locator;
        await key.click();
      }
    }
  }

  /**
   * Check if a LED is currently on
   */
  async isLEDOn(led: Locator): Promise<boolean> {
    // The color classes are on the span child element, not the button
    const span = led.locator('span').first();
    const classes = await span.getAttribute('class');
    // LED "on" state is indicated by text-red-400 class
    return classes?.includes('text-red-400') || false;
  }

  /**
   * Wait for an axis to reach a specific numeric value.
   * Uses polling to handle async updates (e.g., from Socket.IO events).
   *
   * @param axis - The axis to check
   * @param expected - The expected value
   * @param timeout - Maximum time to wait in ms (default: 500)
   * @param displayPrecision - Number of decimal places expected in display (default: 4)
   */
  async waitForAxisValue(
    axis: 'X' | 'Y' | 'Z',
    expected: number,
    timeout = 500,
    displayPrecision = 4
  ): Promise<void> {
    await expect
      .poll(async () => {
        try {
          return await this.getAxisDisplayPureNumberValue(axis, displayPrecision);
        } catch {
          // Return NaN during polling to keep retrying until display shows valid number
          return NaN;
        }
      }, { timeout })
      .toBeCloseTo(expected, displayPrecision);
  }

  /**
   * Zero a specific axis
   */
  async zeroAxis(axis: 'X' | 'Y' | 'Z') {
    const button = axis === 'X' ? this.x0Button : axis === 'Y' ? this.y0Button : this.z0Button;
    await button.click();
  }

  /**
   * Select an axis
   */
  async selectAxis(axis: 'X' | 'Y' | 'Z') {
    const button = axis === 'X' ? this.xButton : axis === 'Y' ? this.yButton : this.zButton;
    await button.click();
  }

  /**
   * Toggle between ABS and INC modes
   */
  async toggleAbsInc() {
    await this.absIncButton.click();
  }

  /**
   * Toggle between INCH and mm units
   */
  async toggleInchMm() {
    await this.toggleUnitButton.click();
  }

  /**
   * Check if currently in ABS mode
   */
  async isAbsMode(): Promise<boolean> {
    return await this.isLEDOn(this.absLED);
  }

  /**
   * Check if currently in INC mode
   */
  async isIncMode(): Promise<boolean> {
    return await this.isLEDOn(this.incLED);
  }

  /**
   * Check if currently in INCH units
   */
  async isInchUnits(): Promise<boolean> {
    return await this.isLEDOn(this.inchLED);
  }

  /**
   * Check if currently in mm units
   */
  async isMmUnits(): Promise<boolean> {
    return await this.isLEDOn(this.mmLED);
  }

  /**
   * Simulate encoder movement for an axis.
   * Calls the mock CNCjs server HTTP API to update position.
   *
   * @param axis - The axis to move ('X', 'Y', or 'Z')
   * @param value - The new position value to simulate (in mm)
   */
  async simulateEncoderAbsoluteMove(axis: 'X' | 'Y' | 'Z', value: number): Promise<void> {
    const response = await fetch(
      `http://localhost:${this.mockServerPort}/api/encoder-move?sessionId=${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ axis, value }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to simulate encoder move: ${response.statusText}`);
    }
  }

  /**
   * Check if Fn LED is on (function mode active)
   */
  async isFnModeActive(): Promise<boolean> {
    return await this.isLEDOn(this.fnLED);
  }

  /**
   * Get the raw text displayed for an axis (for text assertions)
   */
  async getAxisRawText(axis: 'X' | 'Y' | 'Z'): Promise<string> {
    const display = axis === 'X' ? this.xDisplay : axis === 'Y' ? this.yDisplay : this.zDisplay;
    const text = await display.textContent();
    return text?.trim() || '';
  }

  /**
   * Wait for an axis to display a specific numeric value.
   * Uses polling to handle async updates (e.g., from Socket.IO events).
   *
   * @param axis - The axis to check
   * @param expected - The expected numeric value
   * @param precision - Number of decimal places for comparison (default: 4)
   * @param timeout - Maximum time to wait in ms (default: 500)
   * @param displayPrecision - Number of decimal places expected in display (default: 4)
   */
  async waitForAxisPureNumberValue(
    axis: 'X' | 'Y' | 'Z',
    expected: number,
    precision = 4,
    timeout = 500,
    displayPrecision = 4
  ): Promise<void> {
    await expect
      .poll(async () => {
        try {
          return await this.getAxisDisplayPureNumberValue(axis, displayPrecision);
        } catch {
          // Return NaN during polling to keep retrying until display shows valid number
          return NaN;
        }
      }, { timeout })
      .toBeCloseTo(expected, precision);
  }

  /**
   * Wait for an axis to display specific text.
   * Uses polling to handle async updates.
   *
   * @param axis - The axis to check
   * @param expected - The expected text value
   * @param timeout - Maximum time to wait in ms (default: 500)
   */
  async waitForAxisPureTextValue(
    axis: 'X' | 'Y' | 'Z',
    expected: string,
    timeout = 500
  ): Promise<void> {
    await expect
      .poll(() => this.getAxisRawText(axis), { timeout })
      .toBe(expected);
  }

  /**
   * Simulate relative encoder movement for an axis.
   * Calls the mock CNCjs server HTTP API to add delta to current position.
   *
   * @param axis - The axis to move ('X', 'Y', or 'Z')
   * @param delta - The delta value to add to current position (in mm)
   */
  async simulateEncoderRelativeMove(axis: 'X' | 'Y' | 'Z', delta: number): Promise<void> {
    const response = await fetch(
      `http://localhost:${this.mockServerPort}/api/encoder-move-relative?sessionId=${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ axis, delta }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to simulate relative encoder move: ${response.statusText}`);
    }
  }

  /**
   * Simulate crossing the encoder reference mark for an axis (US-012).
   *
   * Moves the mock encoder to the reference-mark machine position, then invokes
   * the in-app test hook that latches the mark. This mirrors the operator
   * jogging the axis across the encoder's index pulse on real hardware.
   *
   * @param axis - The axis whose reference mark is crossed
   * @param markMachinePositionMm - Machine position of the mark in mm (default 0)
   */
  async simulateEncoderRefMark(
    axis: 'X' | 'Y' | 'Z',
    markMachinePositionMm = 0
  ): Promise<void> {
    await this.simulateEncoderAbsoluteMove(axis, markMachinePositionMm);
    // Wait for the position update to propagate to the DRO store, then latch.
    const hookKey = '__el400CrossReferenceMark';
    await this.page.waitForFunction(
      (key) => typeof (window as unknown as Record<string, unknown>)[key] === 'function',
      hookKey
    );
    await this.page.evaluate(
      ({ key, a }) => {
        const fn = (window as unknown as Record<string, ((axis: string) => void) | undefined>)[key];
        if (fn) fn(a);
      },
      { key: hookKey, a: axis }
    );
  }

  /**
   * Real-user jog path (US-012): move the mock encoder so the axis lands on the
   * reference-mark machine position, WITHOUT invoking the in-app test hook.
   *
   * The mock CNCjs server emits a position update, the app dispatches
   * MILL_STATE_CHANGED, and the reference reducer detects the jog crossing the
   * mark and latches the datum — exactly as a human jogging a connected mill (or
   * the debug panel) would trigger it. This proves the latch needs no test hook.
   *
   * @param axis - The axis to jog
   * @param markMachinePositionMm - Machine position of the mark in mm
   */
  async jogAcrossEncoderRefMark(
    axis: 'X' | 'Y' | 'Z',
    markMachinePositionMm: number
  ): Promise<void> {
    await this.simulateEncoderAbsoluteMove(axis, markMachinePositionMm);
  }

  /**
   * Configure the `tAPEr on` axis (Section 6.2) by reloading with the taperOn
   * URL param, then re-establish the connection. Call before entering the
   * Taper function (US-045).
   */
  async setTaperOnAxis(axis: 'X' | 'Z' | 'Zprime'): Promise<void> {
    await this.goto({ taperOn: axis });
  }

  /**
   * Enter the Taper function via the function menu: open the menu, step right
   * to the `tAPEr` entry, then confirm. Mirrors the lathe-function entry path
   * used for polar coordinates.
   */
  async enterTaperFunction(): Promise<void> {
    await this.functionButton.click();
    // Ring: center, circle, line, linear, polar, taper => 5 right presses.
    for (let i = 0; i < 5; i++) {
      await this.key6.click();
    }
    await this.waitForAxisPureTextValue('X', 'tAPEr');
    await this.enterButton.click();
  }
}
