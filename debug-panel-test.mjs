import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

// Navigate to debug mode
await page.goto('http://localhost:5173/?source=debug');

// Wait for the page to load
await page.waitForLoadState('networkidle');

console.log('Page loaded. Press Ctrl+C to close the browser...');

// Keep the browser open
await new Promise(() => {});
