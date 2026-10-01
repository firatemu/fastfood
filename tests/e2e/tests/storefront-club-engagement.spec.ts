/**
 * Playwright — Phase 6 Club, spin, table QR, notifications, support.
 */
import { test, expect } from '@playwright/test';

const STOREFRONT_PORT = Number(process.env.STOREFRONT_PORT ?? 3100);
const API_PORT = Number(process.env.API_PORT ?? 4000);

async function register(page: import('@playwright/test').Page) {
  const email = `club.${Date.now()}@example.com`;
  await page.goto('/auth?tab=register');
  await page.getByRole('button', { name: /kayıt ol/i }).click();
  await page.locator('[data-ff-register-form] input[type="email"]').fill(email);
  await page.locator('[data-ff-register-form] input[type="password"]').fill('correct-horse');
  await page.locator('[data-ff-register-form] input[type="checkbox"]').first().check();
  await page.locator('[data-ff-auth-submit="register"]').click();
  await expect(page.locator('[data-ff-surface="account"]')).toBeVisible({ timeout: 20_000 });
}

test.describe('storefront-web club engagement', () => {
  test.use({ baseURL: `http://localhost:${STOREFRONT_PORT}` });

  test('A auth account club', async ({ page }) => {
    test.setTimeout(60_000);
    await register(page);
    await page.getByRole('link', { name: /burger home club/i }).click();
    await expect(page.locator('[data-ff-surface="club"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-ff-club-points]')).toBeVisible();
    await expect(page.locator('[data-ff-club-tier]')).toBeVisible();
  });

  test('B ateş çarkı server result', async ({ page }) => {
    test.setTimeout(60_000);
    await register(page);
    await page.goto('/account/spin');
    await expect(page.locator('[data-ff-surface="spin"]')).toBeVisible({ timeout: 15_000 });
    const spin = page.locator('[data-ff-spin]');
    if (await spin.isEnabled()) {
      await spin.click();
      await expect(page.locator('[data-ff-spin-result]')).toBeVisible({ timeout: 15_000 });
    } else {
      await expect(page.locator('[data-ff-spin-result], [data-ff-spin-state="blocked"]')).toBeVisible();
    }
  });

  test('C table QR context', async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto('/table/bhx7k2m9q4wp');
    await expect(page.locator('[data-ff-dining-banner], [data-ff-surface="golden-home"]')).toBeVisible({
      timeout: 20_000,
    });
    await page.goto('/table/not-a-real-table');
    await expect(page.locator('[data-ff-surface="table-invalid"]')).toBeVisible({ timeout: 15_000 });
  });

  test('D notifications mark read', async ({ page }) => {
    test.setTimeout(60_000);
    await register(page);
    await page.goto('/account/notifications');
    await expect(page.locator('[data-ff-surface="notifications"]')).toBeVisible({ timeout: 15_000 });
    const unread = page.locator('[data-ff-notification="unread"]').first();
    if (await unread.isVisible()) {
      await unread.click();
    }
    await expect(page.locator('[data-ff-surface="notifications"]')).toBeVisible();
  });

  test('E F support from account and checkout', async ({ page }) => {
    test.setTimeout(90_000);
    await register(page);
    await page.goto('/account/support');
    await expect(page.locator('[data-ff-surface="support"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-ff-support-input]').fill('Merhaba, sipariş sorum var.');
    await page.locator('[data-ff-support-send]').click();
    await expect(page.locator('[data-ff-support-message="CUSTOMER"]')).toBeVisible({ timeout: 10_000 });
    await page.goto('/');
    const card = page.locator('[data-ff-product]').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('link', { name: /özelleştir|boyut|porsiyon/i }).click();
    await page.locator('[data-ff-add-to-cart]').click();
    await page.goto('/checkout');
    await expect(page.locator('[data-ff-support-entry="checkout"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-ff-support-entry="checkout"]').click();
    await expect(page.locator('[data-ff-surface="support"]')).toBeVisible({ timeout: 15_000 });
  });

  test('E tracking support entry', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    const card = page.locator('[data-ff-product]').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('link', { name: /özelleştir|boyut|porsiyon/i }).click();
    await page.locator('[data-ff-add-to-cart]').click();
    await page.getByRole('link', { name: 'Sepete git', exact: true }).click();
    await page.getByRole('link', { name: /ödemeye geç/i }).click();
    await expect(page.locator('[data-ff-surface="checkout"]')).toBeVisible({ timeout: 20_000 });
    const pay = page.locator('[data-ff-pay]');
    await expect(pay).toBeEnabled({ timeout: 20_000 });
    await pay.click();
    await expect(page).toHaveURL(/\/payment\//, { timeout: 20_000 });
    const providerPaymentId = await page.evaluate(() => sessionStorage.getItem('ff_provider_payment_id'));
    const webhook = await page.request.post(`http://localhost:${API_PORT}/api/v1/integrations/iyzico/webhook`, {
      data: { providerPaymentId, status: 'PAID' },
    });
    expect(webhook.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/orders\/.+\/confirmation/, { timeout: 20_000 });
    await page.getByRole('link', { name: /siparişi takip et/i }).click();
    await expect(page.locator('[data-ff-surface="tracking"]')).toBeVisible({ timeout: 20_000 });
    await page.locator('[data-ff-support-entry="tracking"]').click();
    await expect(page).toHaveURL(/\/auth|\/account\/support/, { timeout: 15_000 });
  });

  test('captures club engagement screenshots', async ({ page }) => {
    test.setTimeout(60_000);
    await register(page);
    await page.goto('/account/club');
    await expect(page.locator('[data-ff-surface="club"]')).toBeVisible({ timeout: 15_000 });
    for (const width of [1920, 1024, 390] as const) {
      await page.setViewportSize({ width, height: width >= 768 ? 1080 : 844 });
      await page.screenshot({
        path: `../../docs/storefront-rebuild/screenshots/club-${width}.png`,
        fullPage: true,
      });
    }
  });
});
