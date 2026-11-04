import { test, expect } from '@playwright/test';

// CNCjs @trendmicro/react-iframe defaults: same-origin, scripts and popups,
// but no allowfullscreen and no allow-popups-to-escape-sandbox.
const sandbox = 'allow-forms allow-modals allow-popups allow-same-origin allow-scripts';

test('keyboard-activated browser fullscreen tracks entry, explicit exit and browser exit', async ({ page }) => {
  await page.goto('/?source=manual');
  const entry = page.getByRole('button', { name: 'Enter fullscreen' });
  await expect(entry).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  await entry.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.fullscreenElement === document.documentElement)).toBe(true);
  await page.getByRole('button', { name: 'Exit fullscreen' }).click();
  await expect(entry).toHaveAttribute('aria-pressed', 'false');
  await entry.click();
  await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible();
  // Browser-owned exit (e.g. Esc) must update the control without a button click.
  await page.evaluate(() => document.exitFullscreen());
  await expect(entry).toHaveAttribute('aria-pressed', 'false');
});

test('CNCjs-style same-origin iframe works without allowfullscreen; blocked embed has usable authenticated fallback', async ({ page, baseURL }) => {
  await page.goto('/?source=manual');
  const url = new URL('/?source=manual&token=test-session-token&serialport=%2Fdev%2FttyUSB0#readout', baseURL).href;
  await page.setContent(`<iframe title="EL400" sandbox="${sandbox}" src="${url.replace(/&/g, '&amp;')}"></iframe>`);
  const dro = page.frameLocator('iframe');
  // The default fullscreen allowlist is self, so the stock same-origin embed
  // is allowed even though CNCjs does not supply an allowfullscreen attribute.
  await dro.getByRole('button', { name: 'Enter fullscreen' }).click();
  await expect(dro.getByRole('button', { name: 'Exit fullscreen' })).toHaveAttribute('aria-pressed', 'true');
  await dro.getByRole('button', { name: 'Exit fullscreen' }).click();
  await expect(dro.getByRole('button', { name: 'Enter fullscreen' })).toBeEnabled();

  // Model a restrictive embedding ancestor without changing CNCjs itself.
  await page.setContent(`<iframe title="EL400" sandbox="${sandbox}" allow="fullscreen 'none'" src="${url.replace(/&/g, '&amp;')}"></iframe>`);
  await expect(dro.getByRole('button', { name: 'Enter fullscreen' })).toBeDisabled();
  await expect(dro.getByRole('region', { name: 'Display controls' }).getByRole('status')).toContainText('blocked by this page’s permissions');
  const link = dro.getByRole('link', { name: 'Open EL400 in new tab' });
  await expect(link).toHaveAttribute('href', url);
  const popupPromise = page.waitForEvent('popup');
  await link.click();
  const popup = await popupPromise;
  await popup.waitForURL(url);
  expect(new URL(popup.url()).origin).toBe(new URL(baseURL!).origin);
  expect(new URL(popup.url()).searchParams.get('token')).toBe('test-session-token');
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  expect(await popup.evaluate(() => document.fullscreenElement)).toBeNull();
  await popup.getByRole('button', { name: 'Enter fullscreen' }).click();
  await expect(popup.getByRole('button', { name: 'Exit fullscreen' })).toHaveAttribute('aria-pressed', 'true');
  await popup.getByRole('button', { name: 'Exit fullscreen' }).click();
});
