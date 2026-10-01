/**
 * Playwright — BURGER HOME PDP + cart (Phase 2).
 */
import { test, expect } from '@playwright/test';

const STOREFRONT_PORT = Number(process.env.STOREFRONT_PORT ?? 3100);

test.describe('storefront-web product and cart', () => {
  test.use({ baseURL: `http://localhost:${STOREFRONT_PORT}` });

  test('home customize navigates to product detail', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('[data-ff-product]').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('link', { name: /özelleştir|boyut|porsiyon/i }).click();
    await expect(page).toHaveURL(/\/products\//);
    await expect(page.locator('[data-ff-surface="product-detail"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /sepete ekle/i })).toBeVisible();
  });

  test('add to cart updates badge and opens login when guest', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    const card = page.locator('[data-ff-product]').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('link', { name: /özelleştir|boyut|porsiyon/i }).click();
    await expect(page.locator('[data-ff-surface="product-detail"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-ff-add-to-cart]').click();
    await expect(page.getByText('Sepete eklendi.')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('link', { name: /sepet/i }).first().click();
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
    await expect(page.locator('[data-ff-surface="auth"]')).toBeVisible();
  });

  test('guest cart route opens login', async ({ page }) => {
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
    await expect(page.locator('[data-ff-surface="auth"]')).toBeVisible();
  });

  test('captures pdp and cart screenshots at required widths', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    const card = page.locator('[data-ff-product]').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('link', { name: /özelleştir|boyut|porsiyon/i }).click();
    await expect(page.locator('[data-ff-surface="product-detail"]')).toBeVisible({ timeout: 15_000 });
    const add = page.locator('[data-ff-add-to-cart]');
    if (await add.isEnabled()) {
      await add.click();
      await expect(page.getByText('Sepete eklendi.')).toBeVisible({ timeout: 10_000 });
    }
    const pdpUrl = page.url();
    const widths = [1920, 1024, 390] as const;
    for (const width of widths) {
      await page.setViewportSize({ width, height: width >= 768 ? 1080 : 844 });
      await page.goto(pdpUrl);
      await expect(page.locator('[data-ff-surface="product-detail"]')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('[data-ff-add-to-cart]')).toBeVisible();
      await expect(page.locator('[data-ff-shop-state="loading"]')).toHaveCount(0);
      await page.screenshot({
        path: `../../docs/storefront-rebuild/screenshots/pdp-${width}.png`,
        fullPage: true,
      });
      await page.goto('/cart');
      await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
      await expect(page.locator('[data-ff-surface="auth"]')).toBeVisible({ timeout: 15_000 });
      await page.screenshot({
        path: `../../docs/storefront-rebuild/screenshots/cart-${width}.png`,
        fullPage: true,
      });
    }
  });
});
