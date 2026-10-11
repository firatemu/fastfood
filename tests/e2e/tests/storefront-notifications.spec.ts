/**
 * Playwright — BURGER HOME account-icon unread badge.
 *
 * The header is long-lived, so read state mutated on the notifications screen
 * has to invalidate it. The spin reward gives a deterministic server-side
 * notification without having to place an order.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const STOREFRONT_PORT = Number(process.env.STOREFRONT_PORT ?? 3100);

async function register(page: Page): Promise<void> {
  const phone = `0555${Date.now().toString().slice(-7)}`;
  await page.goto('/auth?tab=register');
  const form = page.locator('[data-ff-register-form]').first();
  await expect(form).toBeVisible({ timeout: 20_000 });
  const fields = form.locator('input');
  await fields.nth(0).fill('Bildirim');
  await fields.nth(1).fill('Test');
  await fields.nth(2).fill(phone);
  await fields.nth(3).fill('correct-horse-battery');
  await form.locator('input[type="checkbox"]').first().check();
  await page.locator('[data-ff-auth-submit="register"]').click();
  await expect(page.locator('[data-ff-surface="account"]')).toBeVisible({ timeout: 30_000 });
}

test.describe('storefront-web notification badge', () => {
  test.use({ baseURL: `http://localhost:${STOREFRONT_PORT}` });

  test('unread badge clears when the inbox marks notifications read', async ({ page }) => {
    test.setTimeout(120_000);
    await register(page);
    await expect(page.locator('[data-ff-unread]')).toHaveCount(0, { timeout: 20_000 });

    // Playing the spin creates a real IN_APP notification server-side.
    await page.goto('/account/spin');
    await expect(page.locator('[data-ff-surface="spin"]')).toBeVisible({ timeout: 25_000 });
    await page.getByRole('button', { name: /çarkı çevir/i }).click();
    await expect(page.locator('[data-ff-unread]')).toHaveCount(1, { timeout: 25_000 });

    // Marking read happens on another screen: the header must follow without
    // needing a navigation or a reload.
    await page.goto('/account/notifications');
    await expect(page.locator('[data-ff-surface="notifications"]')).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('[data-ff-notification="unread"]').first()).toBeVisible({
      timeout: 20_000,
    });
    await page.locator('[data-ff-notifications-read-all]').click();
    await expect(page.locator('[data-ff-notification="unread"]')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.locator('[data-ff-unread]')).toHaveCount(0, { timeout: 20_000 });
  });
});
