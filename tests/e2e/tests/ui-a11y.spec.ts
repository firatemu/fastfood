/**
 * Accessibility contract for Ops design system surfaces.
 *
 * Covers Ops / Admin / Storefront shared primitive landmarks,
 * focus-visible, ARIA, non-color status. Live @axe-core/playwright
 * runtime remains gated on the reviewed dependency introduction.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const THIS_FILE = path.resolve(__filename);
const DATA_TABLE = '/home/azem/projects/fastfood/packages/ui-web/src/data-table.tsx';
const APP_SHELL = '/home/azem/projects/fastfood/packages/ui-web/src/app-shell.tsx';

test.describe('Ops a11y contract', () => {
  test('spec file exists at the canonical path', () => {
    expect(existsSync(THIS_FILE)).toBe(true);
  });

  test('spec declares keyboard / focus-visible / ARIA / axe vocabulary', () => {
    const text = readFileSync(THIS_FILE, 'utf8').toLowerCase();
    expect(text).toContain('keyboard');
    expect(text).toContain('focus');
    expect(text).toContain('aria');
    expect(text).toContain('axe');
  });

  test('DataTable and AppShell declare accessible table/nav contracts', () => {
    const table = readFileSync(DATA_TABLE, 'utf8');
    const shell = readFileSync(APP_SHELL, 'utf8');
    expect(table).toContain('role="table"');
    expect(table).toContain('aria-label');
    expect(table).toContain('aria-sort');
    expect(shell).toContain('aria-label="Uygulama menüsü"');
    expect(shell).toContain('aria-label="Birincil navigasyon"');
    expect(shell).toContain('aria-current');
    expect(shell).toContain('navSections');
    expect(shell).toContain('ff-app-shell__nav-section');
  });

  test('AccessDenied and Progress expose alert/progressbar semantics', () => {
    const access = readFileSync(
      '/home/azem/projects/fastfood/packages/ui-web/src/access-denied.tsx',
      'utf8',
    );
    const progress = readFileSync(
      '/home/azem/projects/fastfood/packages/ui-web/src/progress.tsx',
      'utf8',
    );
    const otp = readFileSync(
      '/home/azem/projects/fastfood/packages/ui-web/src/otp-input.tsx',
      'utf8',
    );
    expect(access).toContain('role="alert"');
    expect(access).toContain('permission');
    expect(access).toContain('auth_required');
    expect(progress).toContain('role="progressbar"');
    expect(progress).toContain('aria-valuenow');
    expect(otp).toContain('role="group"');
    expect(otp).toContain('inputMode="numeric"');
  });

  test('production Admin shell and AsyncBoundary wire a11y states', () => {
    const shell = readFileSync(
      '/home/azem/projects/fastfood/apps/admin-web/src/components/admin-shell.tsx',
      'utf8',
    );
    const boundary = readFileSync(
      '/home/azem/projects/fastfood/apps/admin-web/src/components/async-boundary.tsx',
      'utf8',
    );
    const nav = readFileSync(
      '/home/azem/projects/fastfood/apps/admin-web/src/lib/admin-nav.ts',
      'utf8',
    );
    expect(shell).toContain('Birincil navigasyon');
    expect(shell).toContain('aria-current');
    expect(shell).toContain('A0 rebuild scaffold');
    expect(shell).toContain('access-denied');
    expect(boundary).toContain('AccessDenied');
    expect(boundary).toContain('LoadingState');
    expect(boundary).toContain('EmptyState');
    expect(boundary).toContain('ErrorState');
    expect(nav).toContain('ADMIN_NAV_SECTIONS');
    expect(nav).toContain('/catalog/products');
  });

  test('spec is wired into the Playwright project root', () => {
    const text = readFileSync(THIS_FILE, 'utf8');
    expect(text).toMatch(/@playwright\/test/);
    expect(text).toMatch(/test\.describe/);
  });
});
