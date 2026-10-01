/**
 * Playwright — BURGER HOME orders, live tracking, favorites (Phase 5).
 */
import { test, expect } from '@playwright/test';

const STOREFRONT_PORT = Number(process.env.STOREFRONT_PORT ?? 3100);
const API_PORT = Number(process.env.API_PORT ?? 4000);

test.describe('storefront-web orders tracking favorites', () => {
  test.use({ baseURL: `http://localhost:${STOREFRONT_PORT}` });

  test('confirmation tracking CTA lands on live tracking', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    const card = page.locator('[data-ff-product]').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('link', { name: /özelleştir|boyut|porsiyon/i }).click();
    await page.locator('[data-ff-add-to-cart]').click();
    await expect(page.getByText('Sepete eklendi.')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('link', { name: 'Sepete git', exact: true }).click();
    await page.getByRole('link', { name: /ödemeye geç/i }).click();
    await expect(page.locator('[data-ff-surface="checkout"]')).toBeVisible({ timeout: 20_000 });
    const pay = page.locator('[data-ff-pay]');
    await expect(pay).toBeEnabled({ timeout: 20_000 });
    await pay.click();
    await expect(page).toHaveURL(/\/payment\//, { timeout: 20_000 });
    const providerPaymentId = await page.evaluate(() => sessionStorage.getItem('ff_provider_payment_id'));
    expect(providerPaymentId).toBeTruthy();
    const webhook = await page.request.post(`http://localhost:${API_PORT}/api/v1/integrations/iyzico/webhook`, {
      data: { providerPaymentId, status: 'PAID' },
    });
    expect(webhook.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/orders\/.+\/confirmation/, { timeout: 20_000 });
    await page.getByRole('link', { name: /siparişi takip et/i }).click();
    await expect(page.locator('[data-ff-surface="tracking"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-ff-stepper], [data-ff-negative-status], [data-ff-pickup]')).toBeVisible();
    for (const width of [1920, 1024, 390] as const) {
      await page.setViewportSize({ width, height: width >= 768 ? 1080 : 844 });
      await page.screenshot({
        path: `../../docs/storefront-rebuild/screenshots/tracking-${width}.png`,
        fullPage: true,
      });
    }
  });

  test('account favorites empty state and PDP favorite for signed-in customer', async ({ page }) => {
    test.setTimeout(90_000);
    const phone = `555${Date.now().toString().slice(-7)}`;
    await page.goto('/auth');
    await page.getByPlaceholder(/ornek@alanadi.com/i).fill(phone);
    await page.locator('[data-ff-auth-submit="otp"]').click();
    await expect(page.locator('[data-ff-otp-form]')).toBeVisible({ timeout: 10_000 });
    await page.getByLabel('OTP kodu').fill('000000');
    await page.getByRole('button', { name: /kodu doğrula/i }).click();
    await expect(page.locator('[data-ff-surface="account"]')).toBeVisible({ timeout: 20_000 });
    await page.goto('/account/favorites');
    await expect(page.locator('[data-ff-surface="favorites"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-ff-favorites-empty]')).toBeVisible();
    await page.goto('/');
    const card = page.locator('[data-ff-product]').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('link', { name: /özelleştir|boyut|porsiyon/i }).click();
    await expect(page.locator('[data-ff-favorite-toggle]')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-ff-favorite-toggle]').click();
    await page.goto('/account/favorites');
    await expect(page.locator('[data-ff-favorite-card]')).toBeVisible({ timeout: 15_000 });
    for (const width of [1920, 1024, 390] as const) {
      await page.setViewportSize({ width, height: width >= 768 ? 1080 : 844 });
      await page.screenshot({
        path: `../../docs/storefront-rebuild/screenshots/favorites-${width}.png`,
        fullPage: true,
      });
    }
  });

  test('captures tracking and orders screenshots', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/orders');
    await expect(page.locator('[data-ff-surface="orders"], [data-ff-surface="auth"]')).toBeVisible({
      timeout: 15_000,
    });
    const widths = [1920, 1024, 390] as const;
    for (const width of widths) {
      await page.setViewportSize({ width, height: width >= 768 ? 1080 : 844 });
      await page.screenshot({
        path: `../../docs/storefront-rebuild/screenshots/orders-${width}.png`,
        fullPage: true,
      });
    }
  });
});
