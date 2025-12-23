import { chromium } from '@playwright/test';

console.log('Opening browser...');

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 }
});
const page = await context.newPage();

try {
  // Navigate to built version
  console.log('Navigating to page...');
  await page.goto('http://localhost:4173/?source=debug', { waitUntil: 'networkidle' });

  // Wait for content
  await page.waitForTimeout(2000);

  // Take screenshot
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'debug-panel-screenshot.png', fullPage: true });

  console.log('Screenshot saved to: debug-panel-screenshot.png');

} finally {
  await browser.close();
  process.exit(0);
}
