import { test, expect } from '../helpers/fixtures';

/**
 * US-048: Screen Reader Support — E2E.
 *
 * Drives the real app through the public accessibility tree. Playwright's
 * getByRole / getByLabel resolve names exactly as a screen reader would and
 * exclude aria-hidden subtrees, so these assertions exercise the same surface
 * assistive technology consumes. The `dro` fixture has already navigated and
 * awaited the idle boot barrier.
 */
test.describe('US-048: Screen Reader Support', () => {
  test('AC 48.1: interactive controls expose sr-only accessible names', async ({ dro }) => {
    const { page } = dro;

    await expect(page.getByRole('button', { name: 'Select X axis' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select Y axis' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select Z axis' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zero X axis' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abs/Inc' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle units' })).toBeVisible();
  });

  test('AC 48.2: directional keypad keys carry arrow hints in their names', async ({ dro }) => {
    const { page } = dro;

    await expect(page.getByRole('button', { name: '8 (Up)' })).toBeVisible();
    await expect(page.getByRole('button', { name: '2 (Down)' })).toBeVisible();
    await expect(page.getByRole('button', { name: '4 (Left)' })).toBeVisible();
    await expect(page.getByRole('button', { name: '6 (Right)' })).toBeVisible();
    // Non-directional digits keep a bare numeric name.
    await expect(page.getByRole('button', { name: '5', exact: true })).toBeVisible();
  });

  test('AC 48.3: axis positions are exposed via an aria-live table', async ({ dro }) => {
    const { page } = dro;

    const table = page.getByRole('table', { name: 'Axis positions' });
    await expect(table).toBeAttached();

    const xCell = page.getByTestId('axis-value-x');
    await expect(xCell).toHaveAttribute('aria-live', 'polite');
    await expect(xCell).toHaveAttribute('aria-atomic', 'true');
  });

  test('AC 48.3: zeroing an axis updates its live-region value', async ({ dro }) => {
    const { page } = dro;

    await page.getByRole('button', { name: 'Zero X axis' }).click();

    const xCell = page.getByTestId('axis-value-x');
    // Announced value collapses to a formatted zero.
    await expect(xCell).toHaveText(/^-?0(\.0+)?$/);
  });

  test('AC 48.4: indicators are grouped into labelled fieldsets', async ({ dro }) => {
    const { page } = dro;

    await expect(page.getByRole('group', { name: 'Positioning mode' })).toBeAttached();
    await expect(page.getByRole('group', { name: 'Measurement units' })).toBeAttached();
    await expect(page.getByRole('group', { name: 'Status' })).toBeAttached();
  });

  test('AC 48.5: LED indicators are disabled radios reflecting current state', async ({ dro }) => {
    const { page } = dro;

    const absRadio = page.getByTestId('led-abs').locator('input[type="radio"]');
    const incRadio = page.getByTestId('led-inc').locator('input[type="radio"]');

    await expect(absRadio).toBeDisabled();
    await expect(absRadio).toBeChecked();
    await expect(incRadio).not.toBeChecked();

    // Toggling positioning mode moves the checked radio.
    await page.getByRole('button', { name: 'Abs/Inc' }).click();
    await expect(absRadio).not.toBeChecked();
    await expect(incRadio).toBeChecked();
  });

  test('AC 48.6: axis selection reflects pressed state via aria-pressed', async ({ dro }) => {
    const { page } = dro;

    const yButton = page.getByRole('button', { name: 'Select Y axis' });
    await expect(yButton).toHaveAttribute('aria-pressed', 'false');

    await yButton.click();
    await expect(yButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Select X axis' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('AC 48.7: every major section has an sr-only heading', async ({ dro }) => {
    const { page } = dro;

    await expect(page.getByRole('heading', { name: 'Axis display', level: 2 })).toBeAttached();
    await expect(page.getByRole('heading', { name: 'Axis selection', level: 2 })).toBeAttached();
    await expect(page.getByRole('heading', { name: 'Numeric keypad', level: 2 })).toBeAttached();
    await expect(page.getByRole('heading', { name: 'Primary functions', level: 2 })).toBeAttached();
    await expect(page.getByRole('heading', { name: 'Secondary functions', level: 2 })).toBeAttached();
  });

  test('AC 48.8: decorative chrome is hidden from the accessibility tree', async ({ dro }) => {
    const { page } = dro;

    // The brand logo image must remain reachable by its accessible name.
    await expect(page.getByRole('img', { name: 'Electronica Logo' })).toBeAttached();

    // The decorative PowerLED and housing edges must be aria-hidden, so getByRole
    // finds nothing meaningful inside them. We assert via the DOM that the
    // PowerLED's outer wrapper carries aria-hidden and is excluded from the tree.
    const powerLedHidden = await page.evaluate(() => {
      const lamp = Array.from(document.querySelectorAll<HTMLElement>('div')).find(
        (d) => d.style.background.includes('radial-gradient')
      );
      if (!lamp) return null;
      let node: HTMLElement | null = lamp;
      while (node && node.tagName !== 'BODY') {
        if (node.getAttribute('aria-hidden') === 'true') return true;
        node = node.parentElement;
      }
      return false;
    });
    expect(powerLedHidden).toBe(true);

    // The seven-segment visual display duplicates the live-region value and must
    // be aria-hidden to avoid double announcement.
    await expect(page.getByTestId('axis-display-x')).toHaveAttribute('aria-hidden', 'true');
  });
});
