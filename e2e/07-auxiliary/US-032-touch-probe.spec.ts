import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-032 Touch Probe (manual §10.1)
 *
 * Probe contacts are fired through the mock CNCjs server's probe-trigger /
 * probe-clear endpoints, which set the GRBL `pn` pin state and broadcast
 * controller:state. The REAL CncjsMillAdapter parses that pin state into
 * MillState.probe.triggered and dispatches MILL_STATE_CHANGED - the same path a
 * physical probe input takes. No window hooks or forced state.
 *
 * @see project/user-stories/07-auxiliary/US-032-touch-probe.md
 */
test.describe('US-032: Touch Probe', () => {
  /**
   * AC 32.4 / 32.7 / 32.8 / 32.10: Probe Edge sets the axis datum at the contact
   * edge, lights the trigger indicator, and exits on C.
   */
  test('Probe Edge sets the axis datum at the contact', async ({ dro }) => {
    await dro.toggleInchMm(); // work in mm
    expect(await dro.isMmUnits()).toBe(true);

    // Fn -> ProbE -> ENT -> (Edge default) ENT -> select X.
    await dro.openProbeMenu();
    await dro.enterButton.click(); // confirm Edge
    await dro.xButton.click(); // axis X
    expect(await dro.isFnModeActive()).toBe(true);

    // Approach the edge at X=50, then make contact.
    await dro.simulateEncoderAbsoluteMove('X', 50.0);
    await dro.simulateProbeContact();

    // Datum set: X reads 0 at the edge.
    await dro.waitForAxisValue('X', 0.0);
    // Visual indication on trigger (AC 32.8).
    await expect(dro.page.getByTestId('led-probe').locator('span').first()).toHaveClass(/text-red-400/);

    // C exits the probe function (AC 32.10).
    await dro.clearButton.click();
    expect(await dro.isFnModeActive()).toBe(false);
  });

  /**
   * AC 32.6: Inside diameter = travel + probe tip diameter.
   * Edges at X=10 and X=60 with a 6 mm probe -> (60-10)+6 = 56 mm.
   */
  test('Inside diameter measurement adds the probe diameter', async ({ dro }) => {
    await dro.toggleInchMm();

    await dro.openProbeMenu();
    // Cycle edge -> midpoint -> inside.
    await dro.key6.click();
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'inS dE');
    await dro.enterButton.click();

    // Enter 6 mm probe tip diameter.
    await dro.waitForAxisPureTextValue('X', 'Prb d A');
    await dro.enterNumber('6');
    await dro.enterButton.click();
    await dro.xButton.click();

    // First inside wall at X=10.
    await dro.simulateEncoderAbsoluteMove('X', 10.0);
    await dro.simulateProbeContact();
    await dro.simulateProbeClear();

    // Opposite wall at X=60.
    await dro.simulateEncoderAbsoluteMove('X', 60.0);
    await dro.simulateProbeContact();

    // Inside diameter = (60 - 10) + 6 = 56 mm.
    await dro.waitForAxisValue('X', 56.0);
  });

  /**
   * AC 32.2 / 32.3: Freeze mode halts the display on contact and resumes after
   * the probe clears. Configured via the `dro F` DRO type (URL seeded).
   */
  test('Freeze mode halts the display on probe contact', async ({ dro }) => {
    await dro.goto({ probeDroType: 'freeze' });
    await dro.toggleInchMm();

    // Normal counting up to X=25.
    await dro.simulateEncoderAbsoluteMove('X', 25.0);
    await dro.waitForAxisValue('X', 25.0);

    // Probe contact freezes the display.
    await dro.simulateProbeContact();
    await dro.waitForAxisValue('X', 25.0);

    // Continue moving while triggered: display stays frozen at 25.
    await dro.simulateEncoderAbsoluteMove('X', 30.0);
    await dro.waitForAxisValue('X', 25.0);

    // Probe clears: counting resumes at the current position.
    await dro.simulateProbeClear();
    await dro.waitForAxisValue('X', 30.0);
  });
});
