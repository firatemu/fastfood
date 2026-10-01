/**
 * Playwright — Phase 7 Builder, branches, deals, legal, search.
 */
import { test, expect } from '@playwright/test';

const STOREFRONT_PORT = Number(process.env.STOREFRONT_PORT ?? 3100);

test.describe('storefront-web completeness', () => {
  test.use({ baseURL: `http://localhost:${STOREFRONT_PORT}` });

  test('C builder configure add to cart', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/builder');
    await expect(page.locator('[data-ff-surface="builder"]')).toBeVisible({ timeout: 20_000 });
    await page.locator('[data-ff-add-to-cart]').click();
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
    await expect(page.locator('[data-ff-surface="auth"]')).toBeVisible({ timeout: 15_000 });
  });

  test('E branches and deals discovery', async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto('/branches');
    await expect(page.locator('[data-ff-surface="branches"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-ff-branch]').first()).toBeVisible();
    await page.goto('/deals');
    await expect(page.locator('[data-ff-surface="deals"]')).toBeVisible({ timeout: 15_000 });
  });

  test('search to pdp', async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto('/search?q=burger');
    await expect(page.locator('[data-ff-surface="search"]')).toBeVisible({ timeout: 20_000 });
    const card = page.locator('[data-ff-product]').first();
    await expect(card).toBeVisible();
    await card.getByRole('link').first().click();
    await expect(page.locator('[data-ff-surface="product-detail"]')).toBeVisible({ timeout: 15_000 });
  });

  test('legal allergen section', async ({ page }) => {
    await page.goto('/legal#alerjen-rehberi');
    await expect(page.locator('[data-ff-surface="legal"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#alerjen-rehberi')).toHaveCount(1);
    await expect(page.locator('#alerjen-sozlugu')).toBeVisible();
  });

  test('table QR continuity still works', async ({ page }) => {
    await page.goto('/table/bhx7k2m9q4wp');
    await expect(page.locator('[data-ff-dining-banner], [data-ff-surface="golden-home"]')).toBeVisible({
      timeout: 20_000,
    });
  });

  test('captures phase 7 screenshots at required widths', async ({ page }) => {
    test.setTimeout(120_000);
    const widths = [1920, 1024, 390] as const;
    const routes = [
      ['/builder', 'builder'],
      ['/branches', 'branches'],
      ['/deals', 'deals'],
      ['/legal', 'legal'],
      ['/search?q=burger', 'search'],
    ] as const;
    for (const width of widths) {
      await page.setViewportSize({ width, height: width >= 768 ? 1080 : 844 });
      for (const [route, name] of routes) {
        await page.goto(route);
        await expect(page.locator(`[data-ff-surface="${name}"]`)).toBeVisible({ timeout: 20_000 });
        await page.screenshot({
          path: `../../docs/storefront-rebuild/screenshots/${name}-${width}.png`,
          fullPage: true,
        });
      }
    }
  });
});
