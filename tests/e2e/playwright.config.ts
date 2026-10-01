import { defineConfig, devices } from '@playwright/test';

const PORT_STOREFRONT = Number(process.env.STOREFRONT_PORT ?? 3100);
const PORT_ADMIN = Number(process.env.ADMIN_PORT ?? 3101);
const PORT_API = Number(process.env.API_PORT ?? 4000);

export const TARGETS = {
  storefront: `http://localhost:${PORT_STOREFRONT}`,
  admin: `http://localhost:${PORT_ADMIN}`,
  api: `http://localhost:${PORT_API}`,
} as const;

/**
 * Phase 0 Playwright foundation config.
 *
 * The Playwright runner expects the API + storefront + admin servers to be
 * already running on their canonical ports. Run them yourself first via:
 *
 *   pnpm infra:up
 *   pnpm db:migrate:deploy && pnpm db:seed
 *   pnpm build
 *   pnpm dev:api     # or `pnpm --filter @fastfood/api start`
 *   pnpm dev:storefront
 *   pnpm dev:admin
 *   pnpm --filter @fastfood/e2e-web test
 *
 * Or use the helper script:
 *   pnpm e2e:web:local
 *
 * The previous auto-launcher (`webServer: [...]`) was removed because Next.js
 * requires a successful `next build` before `next start` will run, and the
 * auto-launcher could not reliably chain that across three apps.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: TARGETS.storefront,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
