import { existsSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const TOKENS = '/home/azem/projects/fastfood/apps/admin-web/src/styles/admin-stitch-tokens.css';
const OPS_CSS = '/home/azem/projects/fastfood/apps/admin-web/src/styles/admin-ops.css';
const SHELL = '/home/azem/projects/fastfood/apps/admin-web/src/components/ops/ops-shell.tsx';
const ADMIN_SHELL = '/home/azem/projects/fastfood/apps/admin-web/src/components/admin-shell.tsx';
const STATUS = '/home/azem/projects/fastfood/apps/admin-web/src/lib/order-status.ts';

test.describe('Admin A1 foundation contracts', () => {
  test('namespaced Stitch theme exists', () => {
    expect(existsSync(TOKENS)).toBe(true);
    const css = readFileSync(TOKENS, 'utf8');
    expect(css).toContain("[data-admin-theme='kitchen-fleet']");
    expect(css).toContain('#0d0f12');
    expect(css).toContain('#feb300');
    expect(css).toContain('#ff5722');
  });

  test('A1 shell does not restore ff-app-shell', () => {
    const shell = readFileSync(SHELL, 'utf8');
    expect(shell).not.toContain('ff-app-shell');
    expect(shell).toContain('Birincil navigasyon');
    expect(shell).toContain('aria-current');
    expect(readFileSync(ADMIN_SHELL, 'utf8')).toContain('isOpsShellPath');
    expect(readFileSync(ADMIN_SHELL, 'utf8')).toContain('A0 rebuild scaffold');
    const opsCss = readFileSync(OPS_CSS, 'utf8');
    expect(opsCss).toContain("[data-admin-theme='kitchen-fleet'].ops-shell");
    expect(opsCss).not.toContain("[data-admin-theme='kitchen-fleet'] .ops-shell {");
  });

  test('status labels are ops-safe not raw-only', () => {
    const text = readFileSync(STATUS, 'utf8');
    expect(text).toContain("PREPARING: 'Hazırlanıyor'");
    expect(text).toContain('allowedTransitions');
    expect(text).toContain('kdsLane');
  });
});
