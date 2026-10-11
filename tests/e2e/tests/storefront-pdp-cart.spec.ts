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


  test('header badge revalidates when the cart changes in another tab', async ({ context }) => {
    test.setTimeout(120_000);
    const page = await context.newPage();
    const phone = `0555${Date.now().toString().slice(-7)}`;
    await page.goto('/auth?tab=register');
    const form = page.locator('[data-ff-register-form]').first();
    await expect(form).toBeVisible({ timeout: 15_000 });
    const fields = form.locator('input');
    await fields.nth(0).fill('Regresyon');
    await fields.nth(1).fill('Test');
    await fields.nth(2).fill(phone);
    await fields.nth(3).fill('correct-horse-battery');
    await form.locator('input[type="checkbox"]').first().check();
    await page.locator('[data-ff-auth-submit="register"]').click();
    await expect(page.locator('[data-ff-surface="account"]')).toBeVisible({ timeout: 30_000 });

    await page.goto('/');
    const card = page.locator('[data-ff-product]').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('link', { name: /özelleştir|boyut|porsiyon/i }).click();
    await page.locator('[data-ff-add-to-cart]').click();
    await expect(page.getByText('Sepete eklendi.')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-ff-cart-count]')).toHaveText('1', { timeout: 15_000 });

    const other = await context.newPage();
    await other.goto('/cart');
    await expect(other.locator('[data-ff-cart-line]').first()).toBeVisible({ timeout: 20_000 });
    await other.getByRole('button', { name: /boşalt|temizle/i }).first().click();
    await expect(other.getByText('Sepetin boş')).toBeVisible({ timeout: 20_000 });
    await other.close();

    await page.locator('[data-ff-cart]').click();
    await expect(page).toHaveURL(/\/cart/, { timeout: 15_000 });
    await expect(page.getByText('Sepetin boş')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-ff-cart-count]')).toHaveCount(0, { timeout: 20_000 });
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
