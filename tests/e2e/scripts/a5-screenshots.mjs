import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from '@playwright/test';

const outDir = '/home/azem/projects/fastfood/docs/admin-rebuild/a5-screenshots';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('pageerror', (err) => console.error('PAGEERROR', err.message));

await page.goto('http://localhost:3101/login', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Giriş yap' }).click();
await page.locator('.ops-shell').waitFor({ timeout: 15000 });

const shots = [
  ['reports', 'http://localhost:3101/reports', 1920, 1024, 390],
  ['users', 'http://localhost:3101/users', 1920, 1024, 390],
  ['roles', 'http://localhost:3101/roles', 1920, 1024, 390],
  ['audit', 'http://localhost:3101/audit', 1920, 1024, 390],
  ['settings', 'http://localhost:3101/settings', 1920, 1024, 390],
  ['a4-customers', 'http://localhost:3101/customers', 1920],
];

for (const width of [1920, 1024, 390]) {
  const height = width === 390 ? 844 : 1080;
  await page.setViewportSize({ width, height });
  for (const [name, url, ...allowed] of shots) {
    const sizes = allowed.length ? allowed : [1920, 1024, 390];
    if (!sizes.includes(width)) continue;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page
      .locator('.ops-page, .ff-admin-scaffold, .ops-shell, .ff-admin-login')
      .first()
      .waitFor({
        timeout: 15000,
      });
    const file = path.join(outDir, `${name}-${width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('wrote', file);
  }
}

await browser.close();
