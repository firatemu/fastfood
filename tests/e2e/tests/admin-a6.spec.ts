import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const ROOT = '/home/azem/projects/fastfood';
const ADMIN = path.join(ROOT, 'apps/admin-web');
const ROUTES = path.join(ADMIN, 'src/lib/admin-routes.ts');
const SHELL = path.join(ADMIN, 'src/components/ops/ops-shell.tsx');
const ADMIN_SHELL = path.join(ADMIN, 'src/components/admin-shell.tsx');
const OPS_CSS = path.join(ADMIN, 'src/styles/admin-ops.css');
const OPS_UI = path.join(ADMIN, 'src/components/ops/ops-ui.tsx');
const KITCHEN = path.join(ADMIN, 'src/app/kitchen/page.tsx');
const KITCHEN_POLL = path.join(ADMIN, 'src/lib/kitchen-poll.ts');
const LOGIN = path.join(ADMIN, 'src/app/login/page.tsx');
const ACCESS = path.join(ADMIN, 'src/app/access-denied/page.tsx');
const NAV = path.join(ADMIN, 'src/lib/admin-nav.ts');
const SCREENSHOT_DIR = path.join(ROOT, 'docs/admin-rebuild/a6-screenshots');
const ADMIN_PORT = Number(process.env.ADMIN_PORT ?? 3101);
const APP_PAGES = path.join(ADMIN, 'src/app');

const PRODUCTION_PAGES = [
  'page.tsx',
  'orders/page.tsx',
  'orders/[orderId]/page.tsx',
  'kitchen/page.tsx',
  'couriers/page.tsx',
  'catalog/page.tsx',
  'catalog/products/page.tsx',
  'catalog/products/[productId]/page.tsx',
  'catalog/categories/page.tsx',
  'catalog/modifiers/page.tsx',
  'catalog/allergens/page.tsx',
  'catalog/media/page.tsx',
  'branches/page.tsx',
  'branches/[branchId]/page.tsx',
  'branches/service-areas/page.tsx',
  'branches/availability/page.tsx',
  'customers/page.tsx',
  'customers/[userId]/page.tsx',
  'loyalty/page.tsx',
  'promotions/page.tsx',
  'promotions/[promotionId]/page.tsx',
  'payments/page.tsx',
  'payments/[paymentId]/page.tsx',
  'refunds/page.tsx',
  'reports/page.tsx',
  'users/page.tsx',
  'roles/page.tsx',
  'audit/page.tsx',
  'settings/page.tsx',
];

function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsx(full));
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

test.describe('Admin A6 completeness contracts', () => {
  test('every production route module exists and is not A0 page chrome', () => {
    expect(existsSync(path.join(ADMIN, 'src/components/admin-page.tsx'))).toBe(false);
    for (const rel of PRODUCTION_PAGES) {
      const file = path.join(APP_PAGES, rel);
      expect(existsSync(file), rel).toBe(true);
      const text = readFileSync(file, 'utf8');
      expect(text).not.toContain('AdminPage');
      expect(text).not.toContain('ff-admin-banner');
      expect(text).not.toContain('visual rebuild pending');
    }
    expect(readFileSync(ROUTES, 'utf8')).toContain('isIntendedA0ScaffoldPath');
    expect(readFileSync(ADMIN_SHELL, 'utf8')).toContain('isOpsShellPath');
    expect(readFileSync(ADMIN_SHELL, 'utf8')).toContain('A0 rebuild scaffold');
    expect(readFileSync(SHELL, 'utf8')).toContain('Çıkış');
    expect(readFileSync(NAV, 'utf8')).toContain('/catalog/products');
  });

  test('390 topbar wraps and kitchen poll stays honest', () => {
    const css = readFileSync(OPS_CSS, 'utf8');
    expect(css).toContain('@media (max-width: 430px)');
    expect(css).toContain('.ops-sync__meta');
    expect(css).toContain('display: none');
    expect(readFileSync(OPS_UI, 'utf8')).toContain('ops-sync__meta');
    expect(readFileSync(KITCHEN_POLL, 'utf8')).toContain('8000');
    expect(readFileSync(KITCHEN, 'utf8')).toContain('document.hidden');
    expect(readFileSync(KITCHEN, 'utf8')).toContain('clearInterval');
    expect(readFileSync(KITCHEN, 'utf8')).not.toContain('WebSocket');
    expect(readFileSync(LOGIN, 'utf8')).toContain('Giriş yap');
    expect(readFileSync(ACCESS, 'utf8')).toContain('AccessDenied');
  });

  test('Admin source does not render PAN/CVV or password hashes', () => {
    const files = walkTsx(path.join(ADMIN, 'src'));
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/\bpasswordHash\b/);
      expect(text, file).not.toMatch(/\bcvv\b/i);
      expect(text, file).not.toMatch(/\bcardNumber\b/);
    }
  });
});

const SCREEN_ROUTES: { name: string; path: string }[] = [
  { name: 'dashboard', path: '/' },
  { name: 'orders', path: '/orders' },
  { name: 'kitchen', path: '/kitchen' },
  { name: 'products', path: '/catalog/products' },
  { name: 'branches', path: '/branches' },
  { name: 'availability', path: '/branches/availability' },
  { name: 'customers', path: '/customers' },
  { name: 'promotions', path: '/promotions' },
  { name: 'payments', path: '/payments' },
  { name: 'reports', path: '/reports' },
  { name: 'users', path: '/users' },
  { name: 'roles', path: '/roles' },
  { name: 'audit', path: '/audit' },
  { name: 'settings', path: '/settings' },
];

async function staffLogin(page: Page): Promise<void> {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /FASTFOOD Ops/i })).toBeVisible();
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  const mfa = page.getByRole('button', { name: 'Doğrula' });
  const shell = page.locator('.ops-shell');
  await Promise.race([
    shell.waitFor({ state: 'visible', timeout: 20_000 }),
    mfa.waitFor({ state: 'visible', timeout: 20_000 }),
  ]);
  if (await mfa.isVisible().catch(() => false)) {
    await mfa.click();
  }
  await expect(shell).toBeVisible({ timeout: 20_000 });
}

test.describe('Admin A6 live regression', () => {
  test.use({ baseURL: `http://localhost:${ADMIN_PORT}` });

  test('login, no A0 banner on production, 390 header does not overflow', async ({ page }) => {
    test.setTimeout(90_000);
    await staffLogin(page);
    await expect(page.locator('.ff-admin-banner')).toHaveCount(0);
    await expect(page.getByText('A0 rebuild scaffold')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Birincil navigasyon' })).toBeVisible();
    await expect(page.getByRole('main', { name: 'Yönetim içeriği' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Menüyü aç' })).toBeVisible();
    await expect(page.locator('.ops-topbar__title')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Çıkış' })).toBeVisible();
    const noOverflow = await page.locator('.ops-topbar').evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
    expect(noOverflow).toBe(true);
  });

  test('capture representative screenshots at 1920/1024/390', async ({ page }) => {
    test.setTimeout(180_000);
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await staffLogin(page);
    let orderPath: string | null = null;
    await page.goto('/kitchen');
    const kitchenOrder = page.locator('a[href^="/orders/"]').first();
    if (await kitchenOrder.isVisible().catch(() => false)) {
      orderPath = await kitchenOrder.getAttribute('href');
    }
    if (!orderPath) {
      await page.goto('/orders');
      const orderRow = page.locator('[data-clickable], tbody tr').first();
      if (await orderRow.isVisible().catch(() => false)) {
        await orderRow.click();
        if (page.url().includes('/orders/')) {
          orderPath = new URL(page.url()).pathname;
        }
      }
    }
    const shots = [...SCREEN_ROUTES];
    if (orderPath) shots.splice(3, 0, { name: 'order-detail', path: orderPath });
    for (const width of [1920, 1024, 390] as const) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      for (const shot of shots) {
        await page.goto(shot.path);
        await page.locator('.ops-shell').waitFor({ timeout: 20_000 });
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${shot.name}-${width}.png`),
          fullPage: true,
        });
      }
    }
    expect(existsSync(path.join(SCREENSHOT_DIR, 'dashboard-1920.png'))).toBe(true);
    expect(existsSync(path.join(SCREENSHOT_DIR, 'dashboard-390.png'))).toBe(true);
  });
});
