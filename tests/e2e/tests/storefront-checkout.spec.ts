/**
 * Playwright — BURGER HOME checkout, payment status, confirmation (Phase 3).
 */
import { test, expect } from '@playwright/test';

const STOREFRONT_PORT = Number(process.env.STOREFRONT_PORT ?? 3100);
const API_PORT = Number(process.env.API_PORT ?? 4000);

test.describe('storefront-web checkout and payment', () => {
  test.use({ baseURL: `http://localhost:${STOREFRONT_PORT}` });

  test('home → pdp → cart → checkout → payment → confirmation', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    const card = page.locator('[data-ff-product]').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('link', { name: /özelleştir|boyut|porsiyon/i }).click();
    await expect(page.locator('[data-ff-surface="product-detail"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-ff-add-to-cart]').click();
    await expect(page.getByText('Sepete eklendi.')).toBeVisible({ timeout: 10_000 });
    await page.goto('/checkout');
    await expect(page.locator('[data-ff-surface="checkout"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /siparişi tamamla/i })).toBeVisible();
    await page.locator('[data-ff-tip="2500"]').click();
    const pay = page.locator('[data-ff-pay]');
    await expect(pay).toBeEnabled({ timeout: 20_000 });
    await pay.click();
    await expect(page).toHaveURL(/\/payment\//, { timeout: 20_000 });
    await expect(page.locator('[data-ff-surface="payment-status"]')).toBeVisible({ timeout: 15_000 });
    const providerPaymentId = await page.evaluate(() => sessionStorage.getItem('ff_provider_payment_id'));
    expect(providerPaymentId).toBeTruthy();
    const webhook = await page.request.post(`http://localhost:${API_PORT}/api/v1/integrations/iyzico/webhook`, {
      data: { providerPaymentId, status: 'PAID' },
    });
    expect(webhook.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/orders\/.+\/confirmation/, { timeout: 20_000 });
    await expect(page.locator('[data-ff-surface="order-confirmation"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Afiyet olsun' })).toBeVisible();
  });

  test('captures checkout screenshots at required widths', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    const card = page.locator('[data-ff-product]').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('link', { name: /özelleştir|boyut|porsiyon/i }).click();
    const add = page.locator('[data-ff-add-to-cart]');
    await expect(add).toBeVisible({ timeout: 15_000 });
    if (await add.isEnabled()) {
      await add.click();
      await expect(page.getByText('Sepete eklendi.')).toBeVisible({ timeout: 10_000 });
    }
    await page.goto('/checkout');
    await expect(page.locator('[data-ff-surface="checkout"], [data-ff-shop-state="empty"]')).toBeVisible({
      timeout: 20_000,
    });
    const widths = [1920, 1024, 390] as const;
    for (const width of widths) {
      await page.setViewportSize({ width, height: width >= 768 ? 1080 : 844 });
      await expect(page.locator('[data-ff-shop-state="loading"]')).toHaveCount(0);
      await page.screenshot({
        path: `../../docs/storefront-rebuild/screenshots/checkout-${width}.png`,
        fullPage: true,
      });
    }
  });
});
