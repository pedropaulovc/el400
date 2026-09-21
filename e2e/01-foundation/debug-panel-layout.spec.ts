import { type Page, type Locator } from '@playwright/test';
import { test, expect } from '../helpers/fixtures';

/**
 * Debug controls reserve 320px. At compact widths the simulator must not be
 * magnified: squeezing the axis grid made Zero X intercept Select X even when
 * the debug panel itself did not cover either control.
 */

const VIEWPORTS = [
  { name: '1366x768 (common laptop)', width: 1366, height: 768 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1600x1100 (magnified desktop)', width: 1600, height: 1100 },
];

/**
 * Returns true if `target`'s center point is the topmost element there (i.e.
 * nothing — like the debug panel — is painted over it). This is exactly what
 * a real user click hit-tests, so it proves the control is reachable.
 */
async function centerIsClickable(page: Page, target: Locator): Promise<boolean> {
  const box = await target.boundingBox();
  if (!box) return false;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return page.evaluate(
    ({ cx, cy, testid }) => {
      const top = document.elementFromPoint(cx, cy);
      if (!top) return false;
      // The control itself, or a descendant of it, must be on top.
      const owner = top.closest(`[data-testid="${testid}"]`);
      return owner !== null;
    },
    { cx, cy, testid: (await target.getAttribute('data-testid')) ?? '' },
  );
}

test.describe('debug panel layout (?source=debug)', () => {
  for (const vp of VIEWPORTS) {
    test(`axis selection + keypad stay usable at ${vp.name}`, async ({ page, dro }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await dro.goto({ source: 'debug' });

      // Control case: the debug panel is actually present.
      const panel = page.getByTestId('debug-control-panel');
      await expect(panel).toBeVisible();

      const selectX = page.getByTestId('axis-select-x');
      const zeroX = page.getByTestId('axis-zero-x');
      const key9 = page.getByTestId('key-9');
      const fnButton = page.getByTestId('btn-function');
      for (const control of [selectX, zeroX, key9, fnButton]) {
        await expect(control).toBeVisible();
        await expect.poll(() => centerIsClickable(page, control)).toBe(true);
      }

      await selectX.click();
      await key9.click();
      await dro.enterButton.click();
      await dro.waitForAxisValue('X', 9);
      await zeroX.click();
      await dro.waitForAxisValue('X', 0);
      await fnButton.click();
      await dro.waitForAxisPureTextValue('X', 'CEntrE');
    });
  }

  test('non-debug mode reserves no extra space (?source=manual)', async ({ page }) => {
    await page.goto('/?source=manual');
    const main = page.getByTestId('app-main');
    await expect(main).toBeVisible();
    await expect(page.getByTestId('debug-control-panel')).toHaveCount(0);
  });
});
