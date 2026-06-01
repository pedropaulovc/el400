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
  async goto(options?: { skipBootMessage?: boolean; taperOn?: 'X' | 'Z' | 'Zprime'; probeDroType?: 'transmit' | 'freeze' }) {
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
    if (options?.probeDroType) {
      params.set('probeDroType', options.probeDroType);
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
   * Simulate a touch-probe contact (US-032).
   *
   * Hits the mock CNCjs server's probe-trigger endpoint, which sets the GRBL
   * pin state to 'P' and broadcasts controller:state. The REAL CncjsMillAdapter
   * parses that pin state into MillState.probe.triggered and dispatches
   * MILL_STATE_CHANGED - the same path a physical probe input takes. No window
   * hook, no forced state.
   */
  async simulateProbeContact(): Promise<void> {
    const response = await fetch(
      `http://localhost:${this.mockServerPort}/api/probe-trigger?sessionId=${this.sessionId}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) {
      throw new Error(`Failed to simulate probe contact: ${response.statusText}`);
    }
  }

  /**
   * Release the touch probe (pin state back to open). Pair with
   * simulateProbeContact to produce a fresh rising edge for the next capture.
   */
  async simulateProbeClear(): Promise<void> {
    const response = await fetch(
      `http://localhost:${this.mockServerPort}/api/probe-clear?sessionId=${this.sessionId}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) {
      throw new Error(`Failed to clear probe: ${response.statusText}`);
    }
  }

  /** Open the probe sub-function menu: Fn -> ProbE -> ENT. */
  async openProbeMenu(): Promise<void> {
    await this.functionButton.click();
    // Ring: center, circle, line, linear, polar, taper, probe => 6 right presses.
    for (let i = 0; i < 6; i++) {
      await this.key6.click();
    }
    await this.waitForAxisPureTextValue('X', 'ProbE');
    await this.enterButton.click();
    await this.waitForAxisPureTextValue('X', 'Prob Ed');
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
   * Simulate an encoder signal loss on an axis (US-042).
   * Calls the mock CNCjs server, which emits the lost signal on controller:state.
   * The CncjsMillAdapter normalizes it into MillState.encoderSignal and fires
   * MILL_STATE_CHANGED — the real signal-loss path, no in-app test hook.
   *
   * @param axis - The axis whose encoder signal drops ('X', 'Y', or 'Z')
   */
  async simulateEncoderSignalLoss(axis: 'X' | 'Y' | 'Z'): Promise<void> {
    await this.setEncoderSignal(axis, 'lost');
  }

  /**
   * Restore a previously dropped encoder signal on an axis (US-042).
   *
   * @param axis - The axis whose encoder signal is restored
   */
  async simulateEncoderSignalRestore(axis: 'X' | 'Y' | 'Z'): Promise<void> {
    await this.setEncoderSignal(axis, 'ok');
  }

  private async setEncoderSignal(axis: 'X' | 'Y' | 'Z', signal: 'ok' | 'lost'): Promise<void> {
    const response = await fetch(
      `http://localhost:${this.mockServerPort}/api/encoder-signal?sessionId=${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ axis, signal }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to set encoder signal: ${response.statusText}`);
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
   * Move the workpiece table in the operator's stated direction (US-002).
   *
   * The spec describes motion in the tool's-eye convention: looking down from the
   * cutting tool onto the work, a table moving LEFT makes the tool effectively
   * move in the +X direction, which under the STANDARD (default `normal`/`LEFT`)
   * Direction setting INCREASES the displayed value. This helper turns that
   * human "table-left/right" wording into the raw encoder delta a real jog would
   * emit, then drives it through the mock CNCjs server's relative-move endpoint
   * (the same MILL_STATE_CHANGED path a physical encoder uses).
   *
   * Mapping (default Direction): `'left'` => +magnitude machine delta (display
   * goes positive), `'right'` => -magnitude. The per-axis Direction parameter,
   * applied downstream as a display-only sign, is what flips the observed sign
   * for a `riGht`-configured axis — this helper deliberately does NOT bake that
   * in, so a Direction-flip test exercises the production transform, not the
   * helper.
   *
   * @param axis - The axis to move
   * @param direction - Table motion in the tool's-eye frame
   * @param magnitudeMm - Distance moved, in millimetres (always positive)
   */
  async simulateTableMove(
    axis: 'X' | 'Y' | 'Z',
    direction: 'left' | 'right',
    magnitudeMm: number
  ): Promise<void> {
    const delta = direction === 'left' ? magnitudeMm : -magnitudeMm;
    await this.simulateEncoderRelativeMove(axis, delta);
  }

  /**
   * Set the per-axis counting Direction (US-002, manual section 6.2 `dir`) by
   * driving the REAL setup menu: open setup, pick the axis, scroll to the
   * Direction parameter, cycle its choice to the requested label, then exit.
   *
   * Mirrors the `gotoSC` navigation pattern in US-021. No window hooks, no forced
   * state — only the buttons an operator presses.
   *
   * Label contract (manual section 6.2 `dir`, pinned in the spec under
   * "Setup-Menu Label Contract"): the seven-segment panel has no uppercase `T`
   * glyph, so the manual's "LEFT" renders as `LEFt` (lowercase t). The Direction
   * parameter's choice labels are `LEFt` (normal / LEFT) and `riGht` (reversed /
   * riGht). This helper accepts the operator-facing 'LEFT' | 'riGht' wording from
   * the spec scenarios and maps it to those exact 7-segment labels.
   *
   * @param axis - Axis whose Direction is being configured
   * @param target - Desired Direction in the spec's operator wording
   */
  async setAxisDirection(axis: 'X' | 'Y' | 'Z', target: 'LEFT' | 'riGht'): Promise<void> {
    const targetLabel = target === 'LEFT' ? 'LEFt' : 'riGht';
    await this.settingsButton.click();
    await this.waitForAxisPureTextValue('X', 'SELECt');
    await this.selectAxis(axis);
    // Scroll (down) through the parameter list until the Direction parameter is
    // highlighted. It renders one of its two choice labels; recognise it by
    // matching exactly `LEFt` or `riGht`. (Do NOT match the global Z-depth param,
    // whose labels are `dEP nEG` / `dEP PoS`.)
    const isDirectionLabel = (t: string) => t === 'LEFt' || t === 'riGht';
    let guard = 0;
    while (!isDirectionLabel(await this.getAxisRawText(axis))) {
      await this.key2.click();
      guard += 1;
      if (guard > 30) {
        throw new Error('Direction parameter not found in setup menu after 30 steps');
      }
    }
    // Cycle the choice (left/right keys) until the requested label is shown.
    const matchesTarget = (t: string) => t === targetLabel;
    guard = 0;
    while (!matchesTarget(await this.getAxisRawText(axis))) {
      await this.key6.click();
      guard += 1;
      if (guard > 4) {
        throw new Error(`Direction choice "${target}" not reachable by cycling`);
      }
    }
    // Exit setup back to the idle readout via the terminal `End` item + ent,
    // the canonical exit (US-039 AC 39.7). Walk to End rather than hard-coding a
    // press count, since the registry grows as setup stories land.
    guard = 0;
    while ((await this.getAxisRawText(axis)) !== 'End') {
      await this.key2.click();
      guard += 1;
      if (guard > 30) {
        throw new Error('End item not found while exiting setup');
      }
    }
    await this.enterButton.click();
  }

  /**
   * Set the keypad lock (US-043, manual §6.2 `LoC`) by driving the REAL setup
   * menu: open setup, pick X (the SELECT prompt asks for an axis even for global
   * params), scroll to the `LoC` parameter, cycle its choice to the requested
   * label, then exit via the terminal End item + ent.
   *
   * Works whether or not the panel is already locked: while locked the gate keeps
   * the wrench/setup key and all in-setup navigation live (the unlock path), so
   * the same helper can both lock and unlock. No window hooks, no forced state.
   *
   * Label contract (manual §6.2): the parameter renders `LoC oFF` (value 'off')
   * and `LoC on` (value 'on') — the seven-segment panel has no lowercase f pair,
   * so OFF renders `oFF`.
   *
   * @param target - 'on' to lock the panel, 'off' to unlock
   */
  async setKeypadLock(target: 'on' | 'off'): Promise<void> {
    const targetLabel = target === 'on' ? 'LoC on' : 'LoC oFF';
    const isLockLabel = (t: string) => t === 'LoC oFF' || t === 'LoC on';

    await this.settingsButton.click();
    await this.waitForAxisPureTextValue('X', 'SELECt');
    await this.selectAxis('X');

    // Scroll down to the LoC parameter.
    let guard = 0;
    while (!isLockLabel(await this.getAxisRawText('X'))) {
      await this.key2.click();
      guard += 1;
      if (guard > 30) throw new Error('LoC parameter not found in setup menu after 30 steps');
    }

    // Cycle the choice until the requested label is shown.
    guard = 0;
    while ((await this.getAxisRawText('X')) !== targetLabel) {
      await this.key6.click();
      guard += 1;
      if (guard > 4) throw new Error(`LoC choice "${targetLabel}" not reachable by cycling`);
    }

    // Exit setup via the terminal End item + ent (US-039 AC 39.7).
    guard = 0;
    while ((await this.getAxisRawText('X')) !== 'End') {
      await this.key2.click();
      guard += 1;
      if (guard > 30) throw new Error('End item not found while exiting setup');
    }
    await this.enterButton.click();
  }

  /**
   * Enable the Near-Zero Warning (US-024) through the REAL setup menu: open
   * setup, pick an axis (ZERO AP is global, so any axis works), scroll to the
   * `ZERO AP` parameter, cycle its choice to `bU22 on`, then exit via End + ent.
   *
   * Mirrors `setAxisDirection`'s navigation discipline — only the buttons an
   * operator presses, no window hooks. The 7-segment panel renders the BU22
   * "buzz" toggle as `bU22 on` / `bU22 oF` (no 'Z' glyph).
   */
  async enableZeroApproachWarning(): Promise<void> {
    await this.settingsButton.click();
    await this.waitForAxisPureTextValue('X', 'SELECt');
    await this.selectAxis('X');

    const isZeroApLabel = (t: string) => t === 'bU22 on' || t === 'bU22 oF';
    let guard = 0;
    while (!isZeroApLabel(await this.getAxisRawText('X'))) {
      await this.key2.click();
      guard += 1;
      if (guard > 40) throw new Error('ZERO AP parameter not found in setup menu');
    }
    guard = 0;
    while ((await this.getAxisRawText('X')) !== 'bU22 on') {
      await this.key6.click();
      guard += 1;
      if (guard > 4) throw new Error('bU22 on choice not reachable by cycling');
    }
    guard = 0;
    while ((await this.getAxisRawText('X')) !== 'End') {
      await this.key2.click();
      guard += 1;
      if (guard > 40) throw new Error('End item not found while exiting setup');
    }
    await this.enterButton.click();
  }

  /**
   * Set the per-axis radius/diameter measurement mode (US-041, manual section 6.2
   * `rAd` / `diA`) by driving the REAL setup menu: open setup, pick the axis,
   * scroll to the rAd/diA parameter, cycle its choice to the requested label, then
   * exit via the terminal `End` item + ent.
   *
   * Mirrors `setAxisDirection`. No window hooks, no forced state — only the buttons
   * an operator presses. The parameter renders `rAd` (radius / 1:1) and `diA`
   * (diameter / ×2); those two labels appear on no other parameter, so they
   * uniquely identify the item while scrolling.
   *
   * @param axis - Axis whose measurement mode is being configured
   * @param target - Desired mode label: 'rAd' (radius) or 'diA' (diameter)
   */
  async setMeasurementMode(axis: 'X' | 'Y' | 'Z', target: 'rAd' | 'diA'): Promise<void> {
    await this.settingsButton.click();
    await this.waitForAxisPureTextValue('X', 'SELECt');
    await this.selectAxis(axis);
    // Scroll (down) through the parameter list until the measurement-mode
    // parameter is highlighted; recognise it by its `rAd` / `diA` labels.
    const isMeasurementLabel = (t: string) => t === 'rAd' || t === 'diA';
    let guard = 0;
    while (!isMeasurementLabel(await this.getAxisRawText(axis))) {
      await this.key2.click();
      guard += 1;
      if (guard > 30) {
        throw new Error('measurement-mode parameter not found in setup menu after 30 steps');
      }
    }
    // Cycle the choice (right key) until the requested label is shown.
    guard = 0;
    while ((await this.getAxisRawText(axis)) !== target) {
      await this.key6.click();
      guard += 1;
      if (guard > 4) {
        throw new Error(`measurement-mode choice "${target}" not reachable by cycling`);
      }
    }
    // Exit setup back to the idle readout via the terminal `End` item + ent.
    guard = 0;
    while ((await this.getAxisRawText(axis)) !== 'End') {
      await this.key2.click();
      guard += 1;
      if (guard > 30) {
        throw new Error('End item not found while exiting setup');
      }
    }
    await this.enterButton.click();
  }

  /**
   * Set the per-axis counting mode (US-040, manual section 6.2 `LinEAr` /
   * `AnGULAr`) by driving the REAL setup menu: open setup, pick the axis, scroll
   * to the counting-mode parameter (the first item), cycle its choice to the
   * requested label, then exit via the terminal `End` item + ent.
   *
   * Mirrors `setAxisDirection`. No window hooks, no forced state — only buttons.
   * Counting-mode renders `LinEAr` (linear) / `AnGULAr` (angular); these strings
   * appear on no other parameter, so they uniquely identify the item.
   *
   * @param axis - Axis whose counting mode is being configured
   * @param target - Desired mode label
   */
  async setAxisCountingMode(axis: 'X' | 'Y' | 'Z', target: 'LinEAr' | 'AnGULAr'): Promise<void> {
    await this.settingsButton.click();
    await this.waitForAxisPureTextValue('X', 'SELECt');
    await this.selectAxis(axis);
    // Counting-mode is the first parameter; scroll up (key8) until it is shown.
    const isCountingLabel = (t: string) => t === 'LinEAr' || t === 'AnGULAr';
    let guard = 0;
    while (!isCountingLabel(await this.getAxisRawText('X'))) {
      await this.key8.click();
      guard += 1;
      if (guard > 30) {
        throw new Error('counting-mode parameter not found in setup menu after 30 steps');
      }
    }
    // Cycle the choice until the requested label is shown.
    guard = 0;
    while ((await this.getAxisRawText('X')) !== target) {
      await this.key6.click();
      guard += 1;
      if (guard > 4) {
        throw new Error(`counting-mode choice "${target}" not reachable by cycling`);
      }
    }
    // Exit setup to the idle readout via the terminal `End` item + ent.
    guard = 0;
    while ((await this.getAxisRawText('X')) !== 'End') {
      await this.key2.click();
      guard += 1;
      if (guard > 30) {
        throw new Error('End item not found while exiting setup');
      }
    }
    await this.enterButton.click();
  }

  /**
   * Enter Distance-to-Go with a single-axis target (US-008), the function in
   * which the Near-Zero Warning is auto-enabled. Open distance-to-go, select the
   * axis, type the value, confirm, then press distance-to-go again to execute —
   * the readout then shows (target − current position).
   *
   * @param axis - axis to target
   * @param value - target value in the current display unit
   */
  async startDistanceToGo(axis: 'X' | 'Y' | 'Z', value: string): Promise<void> {
    await this.distanceToGoButton.click();
    await this.selectAxis(axis);
    await this.enterNumber(value);
    await this.enterButton.click();
    await this.distanceToGoButton.click();
  }

  /** Whether the Near-Zero Warning audio indicator is currently shown (US-024). */
  async isZeroApproachWarningVisible(): Promise<boolean> {
    return (await this.page.getByTestId('audio-indicator').count()) > 0;
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
