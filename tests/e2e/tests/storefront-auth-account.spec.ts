/**
 * Playwright — BURGER HOME auth, account, profile, addresses, settings, logout.
 */
import { test, expect } from '@playwright/test';

const STOREFRONT_PORT = Number(process.env.STOREFRONT_PORT ?? 3100);

test.describe('storefront-web auth and account', () => {
  test.use({ baseURL: `http://localhost:${STOREFRONT_PORT}` });

  test('unauthenticated account routes to auth', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
    await expect(page.locator('[data-ff-surface="auth"]')).toBeVisible();
  });

  test('unauthenticated cart routes to auth', async ({ page }) => {
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/auth\?next=%2Fcart/, { timeout: 15_000 });
    await expect(page.locator('[data-ff-surface="auth"]')).toBeVisible();
  });

  test('OTP login reaches account', async ({ page }) => {
    test.setTimeout(60_000);
    const phone = `555${Date.now().toString().slice(-7)}`;
    await page.goto('/auth');
    await expect(page.locator('[data-ff-surface="auth"]')).toBeVisible();
    await page.getByPlaceholder(/ornek@alanadi.com/i).fill(phone);
    await page.locator('[data-ff-auth-submit="otp"]').click();
    await expect(page.locator('[data-ff-otp-form]')).toBeVisible({ timeout: 10_000 });
    await page.getByLabel('OTP kodu').fill('000000');
    await page.getByRole('button', { name: /kodu doğrula/i }).click();
    await expect(page.locator('[data-ff-surface="account"]')).toBeVisible({ timeout: 20_000 });
  });

  test('password register and login reach account', async ({ page }) => {
    test.setTimeout(60_000);
    const email = `pw.${Date.now()}@example.com`;
    await page.goto('/auth?tab=register');
    await page.getByRole('button', { name: /kayıt ol/i }).click();
    await page.locator('[data-ff-register-form] input[type="email"]').fill(email);
    await page.locator('[data-ff-register-form] input[type="password"]').fill('correct-horse');
    await page.locator('[data-ff-register-form] input[type="checkbox"]').first().check();
    await page.locator('[data-ff-auth-submit="register"]').click();
    await expect(page.locator('[data-ff-surface="account"]')).toBeVisible({ timeout: 20_000 });
    await page.locator('[data-ff-logout]').click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await page.goto('/auth');
    await page.getByPlaceholder(/ornek@alanadi.com/i).fill(email);
    await page.locator('input[type="password"]').fill('correct-horse');
    await page.locator('[data-ff-auth-submit="password"]').click();
    await expect(page.locator('[data-ff-surface="account"]')).toBeVisible({ timeout: 20_000 });
  });

  test('guest cart survives login merge', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    const card = page.locator('[data-ff-product]').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('link', { name: /özelleştir|boyut|porsiyon/i }).click();
    await page.locator('[data-ff-add-to-cart]').click();
    await expect(page.getByText('Sepete eklendi.')).toBeVisible({ timeout: 10_000 });
    const phone = `555${Date.now().toString().slice(-7)}`;
    await page.goto('/auth');
    await page.getByPlaceholder(/ornek@alanadi.com/i).fill(phone);
    await page.locator('[data-ff-auth-submit="otp"]').click();
    await page.getByLabel('OTP kodu').fill('000000');
    await page.getByRole('button', { name: /kodu doğrula/i }).click();
    await expect(page.locator('[data-ff-surface="account"]')).toBeVisible({ timeout: 20_000 });
    await page.goto('/cart');
    await expect(page.locator('[data-ff-surface="cart"], [data-ff-cart-line]').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('account profile, address, settings, logout', async ({ page }) => {
    test.setTimeout(90_000);
    const email = `acc.${Date.now()}@example.com`;
    await page.goto('/auth?tab=register');
    await page.getByRole('button', { name: /kayıt ol/i }).click();
    await page.locator('[data-ff-register-form] input[type="email"]').fill(email);
    await page.locator('[data-ff-register-form] input[type="password"]').fill('correct-horse');
    await page.locator('[data-ff-register-form] input[type="checkbox"]').first().check();
    await page.locator('[data-ff-auth-submit="register"]').click();
    await expect(page.locator('[data-ff-surface="account"]')).toBeVisible({ timeout: 20_000 });
    await page.locator('[data-ff-profile-form] input').first().fill('Azem Test');
    await page.locator('[data-ff-profile-save]').click();
    await expect(page.getByText('Profil kaydedildi.')).toBeVisible();
    await page.goto('/account/addresses');
    await expect(page.locator('[data-ff-surface="account-addresses"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-ff-address-form] input').nth(1).fill('Azem Test');
    await page.locator('[data-ff-address-form] input').nth(2).fill('+905551112233');
    await page.locator('[data-ff-address-form] input').nth(3).fill('Moda Caddesi 1');
    await page.getByRole('button', { name: /adresi kaydet/i }).click();
    await expect(page.locator('[data-ff-address-card]').first()).toBeVisible({ timeout: 15_000 });
    await page.goto('/account/settings');
    await expect(page.locator('[data-ff-surface="account-settings"]')).toBeVisible();
    await page.locator('[data-ff-newsletter]').click();
    await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible({ timeout: 10_000 });
    await page.locator('[data-ff-logout]').click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('captures auth and account screenshots', async ({ page }) => {
    test.setTimeout(60_000);
    const widths = [1920, 1024, 390] as const;
    await page.goto('/auth');
    await expect(page.locator('[data-ff-surface="auth"]')).toBeVisible({ timeout: 15_000 });
    for (const width of widths) {
      await page.setViewportSize({ width, height: width >= 768 ? 1080 : 844 });
      await page.screenshot({
        path: `../../docs/storefront-rebuild/screenshots/auth-${width}.png`,
        fullPage: true,
      });
    }
    const email = `shot.${Date.now()}@example.com`;
    await page.goto('/auth?tab=register');
    await page.locator('[data-ff-register-form] input[type="email"]').fill(email);
    await page.locator('[data-ff-register-form] input[type="password"]').fill('correct-horse');
    await page.locator('[data-ff-register-form] input[type="checkbox"]').first().check();
    await page.locator('[data-ff-auth-submit="register"]').click();
    await expect(page.locator('[data-ff-surface="account"]')).toBeVisible({ timeout: 20_000 });
    for (const width of widths) {
      await page.setViewportSize({ width, height: width >= 768 ? 1080 : 844 });
      await page.screenshot({
        path: `../../docs/storefront-rebuild/screenshots/account-${width}.png`,
        fullPage: true,
      });
    }
  });
});
