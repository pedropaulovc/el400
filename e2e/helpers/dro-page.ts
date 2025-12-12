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
  readonly calibrateButton: Locator;
  readonly centerButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize display elements using semantic queries
    this.xDisplay = page.getByRole('region', { name: 'X axis position' });
    this.yDisplay = page.getByRole('region', { name: 'Y axis position' });
    this.zDisplay = page.getByRole('region', { name: 'Z axis position' });

    // Initialize LED indicators using data-testid
    this.absLED = page.getByTestId('led-abs');
    this.incLED = page.getByTestId('led-inc');
    this.inchLED = page.getByTestId('led-inch');
    this.mmLED = page.getByTestId('led-mm');

    // Initialize axis buttons using data-testid
    this.xButton = page.getByTestId('axis-select-x');
    this.yButton = page.getByTestId('axis-select-y');
    this.zButton = page.getByTestId('axis-select-z');

    // Initialize zero buttons using data-testid
    this.x0Button = page.getByTestId('axis-zero-x');
    this.y0Button = page.getByTestId('axis-zero-y');
    this.z0Button = page.getByTestId('axis-zero-z');
    this.zeroAllButton = page.getByTestId('btn-zero-all');

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
    this.calibrateButton = page.getByTestId('btn-calibrate');
    this.centerButton = page.getByTestId('btn-center');
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
    // Click on the ABS LED to toggle (it's a radio button)
    await this.absLED.click();
  }

  /**
   * Toggle between INCH and mm units
   */
  async toggleInchMm() {
    // Click on the INCH LED to toggle (it's a radio button)
    // If currently in INCH, this will switch to mm and vice versa
    const isInch = await this.isInchUnits();
    if (isInch) {
      await this.mmLED.click();
    } else {
      await this.inchLED.click();
    }
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
