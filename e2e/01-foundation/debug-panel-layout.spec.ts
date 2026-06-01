import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Regression: the debug control panel (?source=debug) is a 320px fixed
 * right-side overlay. Before the fix, nothing reserved that width in the main
 * layout, so at common laptop widths the panel sat on top of the simulator's
 * keypad and right-hand controls, making them unclickable.
 *
 * The fix reserves the panel width (pr-80) on <main> only in debug mode, so
 * front-panel controls are never covered at any viewport width.
 */

const VIEWPORTS = [
  { name: '1366x768 (common laptop)', width: 1366, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1920x1080', width: 1920, height: 1080 },
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
    test(`keypad + right controls stay clickable at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/?source=debug');

      // Control case: the debug panel is actually present.
      const panel = page.getByTestId('debug-control-panel');
      await expect(panel).toBeVisible();

      // Right-edge front-panel controls that the panel used to cover.
      const key9 = page.getByTestId('key-9');
      const fnButton = page.getByTestId('btn-function');

      await expect(key9).toBeVisible();
      await expect(fnButton).toBeVisible();

      // Not covered by the panel -> a real click lands on them.
      expect(await centerIsClickable(page, key9)).toBe(true);
      expect(await centerIsClickable(page, fnButton)).toBe(true);

      // And they actually respond to a click (no interception error).
      await key9.click({ timeout: 2000 });
      await fnButton.click({ timeout: 2000 });
    });
  }

  test('non-debug mode reserves no extra space (?source=manual)', async ({ page }) => {
    await page.goto('/?source=manual');
    const main = page.getByTestId('app-main');
    await expect(main).toBeVisible();
    // The reservation class is debug-only.
    await expect(main).not.toHaveClass(/pr-80/);
    await expect(page.getByTestId('debug-control-panel')).toHaveCount(0);
  });
});
