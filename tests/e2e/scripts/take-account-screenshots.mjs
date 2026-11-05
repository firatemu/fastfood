import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const outDir = '/home/azem/.gemini/antigravity/brain/b67d8589-7803-4388-8ca3-29becfd041fe/account-screenshots';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
page.on('response', (res) => {
  if (res.url().includes('/api/v1/')) {
    console.log('API RES:', res.status(), res.request().method(), res.url());
  }
});

console.log('Navigating to register page on localhost:3110...');
await page.goto('http://localhost:3110/auth', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);

// Click "Kayıt Ol"
await page.getByRole('button', { name: 'Kayıt Ol' }).click();
await page.waitForTimeout(500);

const testPhone = `0555${Math.floor(1000000 + Math.random() * 9000000)}`;
console.log('Registering test user with phone:', testPhone);

await page.locator('input[autoComplete="given-name"]').fill('Ahmet');
await page.locator('input[autoComplete="family-name"]').fill('Yılmaz');
await page.locator('input[name="registerPhone"], input[placeholder="05XX XXX XX XX"]').last().fill(testPhone);
await page.locator('input[autoComplete="new-password"]').fill('Sifre123456!');
await page.locator('input[type="checkbox"]').first().check();

await page.locator('[data-ff-auth-submit="register"]').click();

await page.waitForURL(/\/account/, { timeout: 15000 });
console.log('Successfully registered and reached account! Current URL:', page.url());
await page.waitForTimeout(2000); // Wait for profile fetch to populate

const routes = [
  { name: '01-account-main', url: 'http://localhost:3110/account' },
  { name: '02-account-addresses', url: 'http://localhost:3110/account/addresses' },
  { name: '03-account-favorites', url: 'http://localhost:3110/account/favorites' },
  { name: '04-account-notifications', url: 'http://localhost:3110/account/notifications' },
  { name: '05-account-club', url: 'http://localhost:3110/account/club' },
  { name: '06-account-spin', url: 'http://localhost:3110/account/spin' },
  { name: '07-account-support', url: 'http://localhost:3110/account/support' },
  { name: '08-account-security', url: 'http://localhost:3110/account/security' },
  { name: '09-account-settings', url: 'http://localhost:3110/account/settings' },
  { name: '10-account-table', url: 'http://localhost:3110/account/table' },
];

for (const r of routes) {
  try {
    console.log(`Taking screenshot for ${r.name} (${r.url})...`);
    await page.goto(r.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Wait for the account content or shell to appear
    await page.waitForTimeout(2000);
    const filePath = path.join(outDir, `${r.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved screenshot: ${filePath}`);
  } catch (err) {
    console.error(`Error capturing ${r.name}:`, err.message);
  }
}

await browser.close();
console.log('All screenshots captured successfully in', outDir);
