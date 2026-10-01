/**
 * Playwright — Phase 8 human-QA polish regressions.
 */
import { test, expect } from '@playwright/test';

const STOREFRONT_PORT = Number(process.env.STOREFRONT_PORT ?? 3100);

test.describe('storefront-web qa polish', () => {
  test.use({ baseURL: `http://localhost:${STOREFRONT_PORT}` });

  test('unknown route uses BURGER HOME recovery', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
    await expect(page.locator('[data-ff-surface="not-found"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /sayfa bulunamadı/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ana sayfa/i })).toBeVisible();
    await expect(page.getByText(/smash & co/i)).toHaveCount(0);
  });

  test('skip link and mobile essential chrome are present', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('a.ff-skip-link')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Izgarada' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: /arama sayfası/i })).toBeVisible();
    await expect(page.locator('[data-ff-cart]')).toBeVisible();
  });

  test('builder preview lists modifier names not object tags', async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto('/builder');
    await expect(page.locator('[data-ff-surface="builder"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('[object Object]')).toHaveCount(0);
  });

  test('zero search results keep the search surface', async ({ page }) => {
    await page.goto('/search?q=zzzz-no-such-burger-xyz');
    await expect(page.locator('[data-ff-surface="search"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-ff-search-q]')).toContainText('0 sonuç');
    await expect(page.locator('[data-ff-shop-state="empty"]')).toBeVisible();
  });

  test('header search query persists on /search', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/search?q=burger');
    await expect(page.locator('[data-ff-surface="search"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel(/menüde ara/i)).toHaveValue('burger');
  });
});
