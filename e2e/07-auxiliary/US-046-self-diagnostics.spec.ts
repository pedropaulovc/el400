import { test, expect } from '../helpers/fixtures';

/**
 * US-046: Self-Diagnostics Mode
 * Manual Reference: Section 11.1 Self Diagnostics Mode
 * Priority: P5
 *
 * Entry is the real ▲ (8) key pressed during the boot/version message — no window
 * hook or forced state. The boot message auto-dismisses after 1s, so the clock is
 * frozen while we press ▲. The encoder step is driven by a real mock-encoder move
 * (the same MILL_STATE_CHANGED path a physical scale uses).
 */
test.describe('US-046: Self-Diagnostics Mode', () => {
  test.describe.configure({ mode: 'serial' });

  /** Boot with the version message shown, then press ▲ to enter diagnostics. */
  async function enterDiagnostics(dro: import('../helpers/dro-page').DROPage) {
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });
    await dro.goto({ skipBootMessage: false });
    // Version message must be on screen before ▲ enters diagnostics.
    await dro.waitForAxisPureTextValue('X', 'EL400');
    await dro.key8.click();
  }

  test('AC 46.1/46.2: ▲ during boot enters memory diagnostics, RAM passes', async ({ dro }) => {
    await enterDiagnostics(dro);
    await dro.waitForAxisPureTextValue('X', 'rAmPASS');
  });

  test('AC 46.4: keyboard diagnostic echoes the pressed key', async ({ dro }) => {
    await enterDiagnostics(dro);
    await dro.key1.click(); // memory -> display
    await dro.key1.click(); // display -> keyboard
    await dro.key5.click(); // echo
    await expect.poll(() => dro.getAxisRawText('X')).toContain('5');
  });

  test('AC 46.6/46.7: double C exits diagnostics to the normal screen', async ({ dro }) => {
    await enterDiagnostics(dro);
    await dro.clearButton.click(); // exit current step
    await dro.clearButton.click(); // exit diagnostics
    await dro.waitForAxisValue('X', 0);
  });
});
