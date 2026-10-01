import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from '@playwright/test';

const outDir = '/home/azem/projects/fastfood/docs/admin-rebuild/a4-screenshots';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('pageerror', (err) => console.error('PAGEERROR', err.message));

await page.goto('http://localhost:3101/login', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Giriş yap' }).click();
await page.locator('.ops-shell').waitFor({ timeout: 15000 });

await page.goto('http://localhost:3101/customers', { waitUntil: 'networkidle' });
await page.locator('table[aria-label="Müşteri tablosu"] tbody tr').first().click();
await page.waitForURL(/\/customers\/[^/]+$/, { timeout: 15000 });
const customerUrl = page.url();

await page.goto('http://localhost:3101/payments', { waitUntil: 'networkidle' });
let paymentUrl = 'http://localhost:3101/payments';
const payRow = page.locator('table[aria-label="Ödemeler"] tbody tr').first();
if ((await payRow.count()) > 0) {
  await payRow.click();
  await page.waitForURL(/\/payments\/[^/]+$/, { timeout: 15000 });
  paymentUrl = page.url();
}

const shots = [
  ['customers', 'http://localhost:3101/customers', 1920, 1024, 390],
  ['customer-detail', customerUrl, 1920, 1024, 390],
  ['loyalty', 'http://localhost:3101/loyalty', 1920, 1024, 390],
  ['promotions', 'http://localhost:3101/promotions', 1920, 1024, 390],
  ['payments', 'http://localhost:3101/payments', 1920, 1024, 390],
  ['payment-detail', paymentUrl, 1920, 1024, 390],
  ['refunds', 'http://localhost:3101/refunds', 1920, 1024, 390],
  ['a3-branches', 'http://localhost:3101/branches', 1920],
  ['a5-scaffold', 'http://localhost:3101/reports', 1920],
];

for (const width of [1920, 1024, 390]) {
  const height = width === 390 ? 844 : 1080;
  await page.setViewportSize({ width, height });
  for (const [name, url, ...allowed] of shots) {
    const sizes = allowed.length ? allowed : [1920, 1024, 390];
    if (!sizes.includes(width)) continue;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.locator('.ops-page, .ff-admin-scaffold, .ops-shell').first().waitFor({ timeout: 15000 });
    const file = path.join(outDir, `${name}-${width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('wrote', file);
  }
}

await browser.close();
