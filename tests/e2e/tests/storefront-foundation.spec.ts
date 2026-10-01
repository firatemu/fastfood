/**
 * Playwright — BURGER HOME Golden Home + reserved rebuild scaffold.
 */
import { test, expect, request } from '@playwright/test';

const STOREFRONT_PORT = Number(process.env.STOREFRONT_PORT ?? 3100);
const ADMIN_PORT = Number(process.env.ADMIN_PORT ?? 3101);
const API_PORT = Number(process.env.API_PORT ?? 4000);

test.describe('storefront-web golden home', () => {
  test.use({ baseURL: `http://localhost:${STOREFRONT_PORT}` });

  test('boots BURGER HOME golden home with catalog and shell', async ({ page }) => {
    const response = await page.goto('/');
    expect(response, 'storefront / responded').not.toBeNull();
    expect(response!.status()).toBeLessThan(400);

    await expect(page.getByAltText('BURGER HOME').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-ff-surface="golden-home"]')).toHaveCount(1);
    await expect(page.locator('#menu-catalog')).toHaveCount(1);
    await expect(page.locator('[data-ff-product]').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /tüm lezzetler/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sepet/i }).first()).toBeVisible();
    await expect(page.getByRole('search')).toBeVisible();
    await expect(page.locator('iframe.stitch-raw-frame')).toHaveCount(0);
    await expect(page.locator('[data-theme="storefront"]')).toHaveCount(0);
  });

  test('product add-to-cart control is reachable', async ({ page }) => {
    await page.goto('/');
    const add = page.getByRole('button', { name: /sepete ekle/i }).first();
    await expect(add).toBeVisible({ timeout: 15_000 });
    await expect(add).toBeEnabled();
  });

  test('header search is reachable at desktop breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.getByRole('search')).toBeVisible();
    await expect(page.getByLabel(/menüde ara/i)).toBeVisible();
  });

  test('responsive shell follows Stitch breakpoints', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('[data-ff-surface="golden-home"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('search')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Birincil' })).toHaveCount(0);

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('search')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Birincil' })).toHaveCount(0);

    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(page.getByRole('navigation', { name: 'Birincil' })).toBeVisible();
  });

  test('captures golden home screenshots at required widths', async ({ page }) => {
    test.setTimeout(90_000);
    const widths = [1920, 1440, 1024, 768, 390, 375] as const;
    for (const width of widths) {
      await page.setViewportSize({ width, height: width >= 768 ? 1080 : 844 });
      await page.goto('/');
      await expect(page.locator('[data-ff-product]').first()).toBeVisible({ timeout: 15_000 });
      await page.screenshot({
        path: `../../docs/storefront-rebuild/screenshots/home-${width}.png`,
        fullPage: true,
      });
    }
  });
});

test.describe('storefront reserved routes are live customer pages', () => {
  test.use({ baseURL: `http://localhost:${STOREFRONT_PORT}` });

  test('phase 7 routes are not rebuild scaffolds', async ({ page }) => {
    const routes = [
      ['/search', 'search'],
      ['/address', 'address'],
      ['/legal', 'legal'],
      ['/deals', 'deals'],
      ['/builder', 'builder'],
      ['/branches', 'branches'],
    ] as const;
    for (const [route, surface] of routes) {
      const response = await page.goto(route);
      expect(response, `${route} responded`).not.toBeNull();
      expect(response!.status(), `${route} status`).toBeLessThan(400);
      await expect(page.locator('[data-ff-surface="storefront-rebuild-scaffold"]')).toHaveCount(0);
      await expect(page.locator(`[data-ff-surface="${surface}"]`)).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('iframe.stitch-raw-frame')).toHaveCount(0);
    }
  });
});

test.describe('admin-web login smoke', () => {
  test.use({ baseURL: `http://localhost:${ADMIN_PORT}` });

  test('boots login page with operations theme', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response, 'admin /login responded').not.toBeNull();
    expect(response!.status()).toBeLessThan(400);

    await expect(page.getByRole('heading', { name: /FASTFOOD Ops/i })).toBeVisible();
    await expect(page.getByText(/Personel girişi/i)).toBeVisible();
    await expect(page.locator('html[data-theme="operations"]')).toHaveCount(1);
    await expect(page.getByLabel(/E-posta|kullanıcı/i)).toBeVisible();
  });
});

test.describe('api foundation', () => {
  test('serves /api/v1/version under the global prefix', async () => {
    const apiContext = await request.newContext({
      baseURL: `http://localhost:${API_PORT}`,
    });
    const response = await apiContext.get('/api/v1/version');
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { apiPrefix: string; version: string };
    expect(body.apiPrefix).toBe('/api/v1');
    expect(body.version).toMatch(/^0\.0\.0-phase0/);
    await apiContext.dispose();
  });

  test('serves storefront home merchandising envelope', async () => {
    const apiContext = await request.newContext({
      baseURL: `http://localhost:${API_PORT}`,
    });
    const response = await apiContext.get('/api/v1/storefront/home');
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { data?: { products?: unknown[] } };
    expect(Array.isArray(body.data?.products)).toBe(true);
    await apiContext.dispose();
  });
});
