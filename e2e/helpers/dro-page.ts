import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the EL400 DRO Simulator
 * Provides a clean API for E2E tests to interact with the DRO
 */
export class DROPage {
  readonly page: Page;

  // Display elements
  readonly xDisplay: Locator;
  readonly yDisplay: Locator;
  readonly zDisplay: Locator;

  // LED indicators
  readonly absLED: Locator;
  readonly incLED: Locator;
  readonly inchLED: Locator;
  readonly mmLED: Locator;

  // Axis buttons
  readonly xButton: Locator;
  readonly yButton: Locator;
  readonly zButton: Locator;

  // Zero buttons
  readonly x0Button: Locator;
  readonly y0Button: Locator;
  readonly z0Button: Locator;
  readonly zeroAllButton: Locator;

  // Mode buttons
  readonly absIncButton: Locator;
  readonly inchMmButton: Locator;

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

  // Function buttons
  readonly halfButton: Locator;
  readonly centerButton: Locator;
  readonly settingsButton: Locator;
  readonly calibrateButton: Locator;
  readonly dtgButton: Locator;
  readonly sdmButton: Locator;
  readonly boltCircleButton: Locator;
  readonly linearPatternButton: Locator;

  // Arrow keys
  readonly upArrow: Locator;
  readonly downArrow: Locator;
  readonly leftArrow: Locator;
  readonly rightArrow: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize display elements using semantic queries
    this.xDisplay = page.getByRole('region', { name: 'X axis position' });
    this.yDisplay = page.getByRole('region', { name: 'Y axis position' });
    this.zDisplay = page.getByRole('region', { name: 'Z axis position' });

    // Initialize LED indicators using semantic queries
    this.absLED = page.getByRole('radio', { name: /abs.*absolute mode/i });
    this.incLED = page.getByRole('radio', { name: /inc.*incremental mode/i });
    this.inchLED = page.getByRole('radio', { name: /inch.*inches/i });
    this.mmLED = page.getByRole('radio', { name: /mm.*millimeters/i });

    // Initialize axis buttons
    this.xButton = page.getByRole('button', { name: /^X$/i });
    this.yButton = page.getByRole('button', { name: /^Y$/i });
    this.zButton = page.getByRole('button', { name: /^Z$/i });

    // Initialize zero buttons
    this.x0Button = page.getByRole('button', { name: /X0/i });
    this.y0Button = page.getByRole('button', { name: /Y0/i });
    this.z0Button = page.getByRole('button', { name: /Z0/i });
    this.zeroAllButton = page.getByRole('button', { name: /Zero All/i });

    // Initialize mode buttons
    this.absIncButton = page.getByRole('button', { name: /ABS\/INC/i });
    this.inchMmButton = page.getByRole('button', { name: /INCH\/mm/i });

    // Initialize keypad
    this.key0 = page.getByRole('button', { name: /^0$/i });
    this.key1 = page.getByRole('button', { name: /^1$/i });
    this.key2 = page.getByRole('button', { name: /^2$/i });
    this.key3 = page.getByRole('button', { name: /^3$/i });
    this.key4 = page.getByRole('button', { name: /^4$/i });
    this.key5 = page.getByRole('button', { name: /^5$/i });
    this.key6 = page.getByRole('button', { name: /^6$/i });
    this.key7 = page.getByRole('button', { name: /^7$/i });
    this.key8 = page.getByRole('button', { name: /^8$/i });
    this.key9 = page.getByRole('button', { name: /^9$/i });
    this.keyDecimal = page.getByRole('button', { name: /\./i });
    this.keyMinus = page.getByRole('button', { name: /-/i });
    this.enterButton = page.getByRole('button', { name: /Enter|ENT/i });

    // Initialize function buttons
    this.halfButton = page.getByRole('button', { name: /Half|1\/2/i });
    this.centerButton = page.getByRole('button', { name: /Center/i });
    this.settingsButton = page.getByRole('button', { name: /Settings|Setup/i });
    this.calibrateButton = page.getByRole('button', { name: /Calibrate|CAL/i });
    this.dtgButton = page.getByRole('button', { name: /DTG|Distance/i });
    this.sdmButton = page.getByRole('button', { name: /SDM/i });
    this.boltCircleButton = page.getByRole('button', { name: /Bolt.*Circle|B\.C\./i });
    this.linearPatternButton = page.getByRole('button', { name: /Linear.*Pattern|LIN/i });

    // Initialize arrow keys
    this.upArrow = page.getByRole('button', { name: /Up|↑/i });
    this.downArrow = page.getByRole('button', { name: /Down|↓/i });
    this.leftArrow = page.getByRole('button', { name: /Left|←/i });
    this.rightArrow = page.getByRole('button', { name: /Right|→/i });
  }

  /**
   * Navigate to the DRO simulator
   */
  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the current value displayed for an axis
   */
  async getAxisValue(axis: 'X' | 'Y' | 'Z'): Promise<number> {
    const display = axis === 'X' ? this.xDisplay : axis === 'Y' ? this.yDisplay : this.zDisplay;
    const text = await display.textContent();
    return parseFloat(text?.replace(/[^\d.-]/g, '') || '0');
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
   * Press a button by name
   */
  async pressKey(keyName: string) {
    const button = this.page.getByRole('button', { name: new RegExp(keyName, 'i') });
    await button.click();
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
   * Wait for a specific display value
   */
  async waitForAxisValue(axis: 'X' | 'Y' | 'Z', value: number, timeout = 5000) {
    const display = axis === 'X' ? this.xDisplay : axis === 'Y' ? this.yDisplay : this.zDisplay;
    await expect(display).toContainText(value.toString(), { timeout });
  }

  /**
   * Simulate encoder movement (for testing position changes)
   * This is a placeholder - actual implementation depends on how the simulator
   * allows programmatic position updates
   */
  async simulateEncoderMove(axis: 'X' | 'Y' | 'Z', position: number) {
    // This would need to be implemented based on how the DRO simulator
    // exposes encoder input for testing purposes
    // For now, this is a placeholder that could use a test API
    await this.page.evaluate(
      ({ axis, position }) => {
        // @ts-expect-error - Test API
        if (window.testAPI?.setAxisPosition) {
          // @ts-expect-error - Test API
          window.testAPI.setAxisPosition(axis, position);
        }
      },
      { axis, position }
    );
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
    await this.inchMmButton.click();
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
}
