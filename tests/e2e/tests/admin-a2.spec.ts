import { existsSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const ROUTES = '/home/azem/projects/fastfood/apps/admin-web/src/lib/admin-routes.ts';
const OPS = '/home/azem/projects/fastfood/apps/admin-web/src/lib/catalog-ops.ts';
const PRODUCTS = '/home/azem/projects/fastfood/apps/admin-web/src/app/catalog/products/page.tsx';
const EDITOR =
  '/home/azem/projects/fastfood/apps/admin-web/src/app/catalog/products/[productId]/page.tsx';
const MEDIA = '/home/azem/projects/fastfood/apps/admin-web/src/app/catalog/media/page.tsx';
const SHELL = '/home/azem/projects/fastfood/apps/admin-web/src/components/ops/ops-shell.tsx';

test.describe('Admin A2 catalog contracts', () => {
  test('catalog routes use OpsShell and not A0 scaffold', () => {
    expect(readFileSync(ROUTES, 'utf8')).toContain('isA2Path');
    expect(readFileSync(ROUTES, 'utf8')).toContain("pathname.startsWith('/catalog/')");
    expect(readFileSync(SHELL, 'utf8')).toContain('Küresel katalog');
    expect(readFileSync(PRODUCTS, 'utf8')).not.toContain('AdminPage');
    expect(readFileSync(PRODUCTS, 'utf8')).not.toContain('ff-admin-banner');
  });

  test('fifth catalog route media supports file upload and URL attach', () => {
    expect(existsSync(MEDIA)).toBe(true);
    const media = readFileSync(MEDIA, 'utf8');
    expect(media).toContain('admin/products/${productId}/media');
    expect(media).toContain('type="file"');
    expect(media).toContain('media/upload');
    expect(readFileSync(EDITOR, 'utf8')).toContain('type="file"');
    expect(readFileSync(PRODUCTS, 'utf8')).toContain('type="file"');
  });

  test('product editor uses GET/PATCH and does not invent variants', () => {
    const editor = readFileSync(EDITOR, 'utf8');
    expect(editor).toContain('admin/products/${productId}');
    expect(editor).toContain('PATCH');
    expect(editor).not.toContain('kcal');
    expect(editor).not.toContain('allergenIds');
    expect(readFileSync(OPS, 'utf8')).toContain("GLOBAL_MASTER_DATA");
    expect(readFileSync(OPS, 'utf8')).toContain('modifierBoundsValid');
  });
});
