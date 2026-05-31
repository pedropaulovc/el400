import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-002 Sign Convention and Axis Direction
 *
 * Drives the tool's-eye sign convention end to end through real user actions:
 * table motion is emitted via the mock CNCjs server's relative-move endpoint
 * (`dro.simulateTableMove`, the same MILL_STATE_CHANGED path a physical jog
 * uses), and Direction changes go through the real setup menu
 * (`dro.setAxisDirection`, no window hooks / forced state).
 *
 * Values are asserted in MILLIMETRES (the tests toggle to mm with the real
 * in/mm key) so the spec's clean magnitudes hold; the default unit is inches.
 *
 * Covers AC 2.1 (tool's-eye +X under default Direction), AC 2.2 (Direction flips
 * the sign), AC 2.6 (negative shows a leading minus, positive shows none).
 *
 * @see project/user-stories/01-foundation/US-002-sign-convention.md
 */
test.describe('US-002: Sign Convention and Axis Direction', () => {
  // Setup-menu Direction changes commit to persisted nvMem; run serially so
  // parallel workers do not race on shared localStorage.
  test.describe.configure({ mode: 'serial' });

  /**
   * AC 2.1: Under the default (LEFT / normal) Direction, table motion that moves
   * the tool in +X / +Y INCREASES the displayed value (tool's-eye view).
   * Parametrised across X and Y so a single-axis implementation is exposed.
   */
  for (const axis of ['X', 'Y'] as const) {
    test(`AC 2.1: tool's-eye +${axis} (table-left) is positive under default Direction`, async ({ dro }) => {
      await dro.toggleInchMm(); // work in mm so magnitudes match the spec
      expect(await dro.isMmUnits()).toBe(true);

      await dro.zeroAxis(axis);
      await dro.waitForAxisValue(axis, 0);

      await dro.simulateTableMove(axis, 'left', 10);
      await dro.waitForAxisValue(axis, 10);

      // A positive reading carries no leading minus.
      const text = await dro.getAxisRawText(axis);
      expect(text.startsWith('-')).toBe(false);
    });
  }

  /**
   * AC 2.1 (companion): table-right under the default Direction DECREASES the
   * displayed value, so a positive datum reads negative after moving right.
   */
  test('AC 2.1: table-right under default Direction is negative', async ({ dro }) => {
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    await dro.zeroAxis('X');
    await dro.waitForAxisValue('X', 0);

    await dro.simulateTableMove('X', 'right', 7.5);
    await dro.waitForAxisValue('X', -7.5);
  });

  /**
   * AC 2.2: changing the per-axis Direction to riGht flips the displayed sign.
   * The SAME table-left motion that read +10 under default now reads -10.
   * The Direction change is committed BEFORE zeroing/moving so it must apply to
   * the live readout, not just a setup screen label.
   */
  test('AC 2.2: Direction = riGht flips the sign of the same motion', async ({ dro }) => {
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    await dro.setAxisDirection('X', 'riGht');
    await dro.zeroAxis('X');
    await dro.waitForAxisValue('X', 0);

    await dro.simulateTableMove('X', 'left', 10);
    // Standard convention gives +10; the riGht Direction flips it to -10.
    await dro.waitForAxisValue('X', -10);
  });

  /**
   * AC 2.2 (round-trip): toggling Direction back to LEFT restores the standard
   * sign — proves the flip is a real toggle, not a one-way latch, and that a
   * subsequent encoder update reflects the restored Direction.
   */
  test('AC 2.2: toggling Direction back to LEFT restores the standard sign', async ({ dro }) => {
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    await dro.setAxisDirection('X', 'riGht');
    await dro.zeroAxis('X');
    await dro.simulateTableMove('X', 'left', 4);
    await dro.waitForAxisValue('X', -4);

    await dro.setAxisDirection('X', 'LEFT');
    await dro.zeroAxis('X');
    await dro.simulateTableMove('X', 'left', 4);
    await dro.waitForAxisValue('X', 4);
  });

  /**
   * AC 2.2 (isolation): flipping X's Direction must NOT affect Y. A lazy global
   * sign flag would fail this.
   */
  test('AC 2.2: Direction is per-axis — flipping X leaves Y standard', async ({ dro }) => {
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    await dro.setAxisDirection('X', 'riGht');

    await dro.zeroAxis('X');
    await dro.zeroAxis('Y');
    await dro.waitForAxisValue('X', 0);
    await dro.waitForAxisValue('Y', 0);

    await dro.simulateTableMove('X', 'left', 6);
    await dro.simulateTableMove('Y', 'left', 6);

    await dro.waitForAxisValue('X', -6); // flipped
    await dro.waitForAxisValue('Y', 6); // standard, unaffected
  });

  /**
   * AC 2.2 (persistence): the flipped Direction must apply to EVERY subsequent
   * encoder update, not just the first move after the toggle. A one-shot impl
   * that flipped only the next reading would pass the basic flip test but fail
   * here on the second, cumulative jog.
   */
  test('AC 2.2: flipped Direction persists across successive jogs', async ({ dro }) => {
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    await dro.setAxisDirection('X', 'riGht');
    await dro.zeroAxis('X');
    await dro.waitForAxisValue('X', 0);

    // First jog: table-left 3 -> standard +3, flipped -3.
    await dro.simulateTableMove('X', 'left', 3);
    await dro.waitForAxisValue('X', -3);

    // Second jog (no re-toggle): another table-left 5, cumulative table-left 8.
    // Flip must still apply -> -8, proving it is a persisted setting.
    await dro.simulateTableMove('X', 'left', 5);
    await dro.waitForAxisValue('X', -8);

    // A table-right jog under the flip moves the reading toward zero / positive.
    await dro.simulateTableMove('X', 'right', 10);
    await dro.waitForAxisValue('X', 2);
  });

  /**
   * AC 2.2 (units): a Direction flip composes correctly with the inch/mm unit
   * transform. Done entirely in the DEFAULT inch unit so a flipped 25.4 mm move
   * must read exactly -1.0000 inch — catching an impl that applies the sign in
   * the wrong order relative to unit conversion or only handles mm.
   */
  test('AC 2.2: Direction flip is correct in inch units', async ({ dro }) => {
    // Stay in the default inch unit (US-001 AC 1.3); confirm it.
    expect(await dro.isInchUnits()).toBe(true);

    await dro.setAxisDirection('X', 'riGht');
    await dro.zeroAxis('X');
    await dro.waitForAxisValue('X', 0);

    // 25.4 mm table-left = +1 inch standard; flipped -> -1.0000 inch.
    await dro.simulateTableMove('X', 'left', 25.4);
    await dro.waitForAxisPureNumberValue('X', -1, 4);
    expect((await dro.getAxisRawText('X')).startsWith('-')).toBe(true);
  });

  /**
   * AC 2.6: a negative value is shown with a leading '-'; positive values have
   * no sign. Verified on the raw display text, and the negative is produced by a
   * real motion (table-right under default Direction) — tying 2.6 to the sign
   * convention, not a hard-coded string.
   */
  test('AC 2.6: negative shows a leading minus, positive shows none', async ({ dro }) => {
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    await dro.zeroAxis('Y');
    await dro.waitForAxisValue('Y', 0);

    // Move right -> negative reading.
    await dro.simulateTableMove('Y', 'right', 3.25);
    await dro.waitForAxisValue('Y', -3.25);
    expect((await dro.getAxisRawText('Y')).startsWith('-')).toBe(true);

    // Move back left past zero -> positive reading, no sign.
    await dro.simulateTableMove('Y', 'left', 6.5);
    await dro.waitForAxisValue('Y', 3.25);
    expect((await dro.getAxisRawText('Y')).startsWith('-')).toBe(false);
  });
});
