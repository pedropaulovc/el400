import { test, expect } from '@playwright/test';

test('visual verification of simulator with logo', async ({ page }) => {
  await page.goto('/');
  
  // Wait for the simulator to be visible
  await expect(page.locator('.relative.rounded-2xl')).toBeVisible({ timeout: 15000 });

  // Take a screenshot of the entire simulator component
  // We locate the main container div that has the specific styling
  const housingEdge = page.locator('.relative.w-full.h-12').first();
  
  await housingEdge.screenshot({ path: 'simulator-with-logo.png' });
});
