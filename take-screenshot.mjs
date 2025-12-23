import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start dev server
console.log('Starting dev server...');
const devServer = spawn('npm', ['run', 'dev'], {
  shell: true,
  cwd: __dirname,
});

let serverReady = false;
devServer.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  if (output.includes('Local:')) {
    serverReady = true;
  }
});

devServer.stderr.on('data', (data) => {
  console.error(data.toString());
});

// Wait for server to be ready
await new Promise((resolve) => {
  const interval = setInterval(() => {
    if (serverReady) {
      clearInterval(interval);
      resolve();
    }
  }, 100);
});

console.log('\nServer ready! Opening browser...');

// Launch browser
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 }
});
const page = await context.newPage();

try {
  // Navigate to debug mode
  await page.goto('http://localhost:5173/?source=debug');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Wait a bit for animations
  await page.waitForTimeout(1000);

  // Take screenshot
  const screenshotPath = join(__dirname, 'debug-panel-screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(`\nScreenshot saved to: ${screenshotPath}`);

} catch (error) {
  console.error('Error taking screenshot:', error);
} finally {
  // Close browser
  await browser.close();

  // Kill dev server
  devServer.kill();

  console.log('\nDone!');
  process.exit(0);
}
