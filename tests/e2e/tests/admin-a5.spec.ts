import { existsSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const ROUTES = '/home/azem/projects/fastfood/apps/admin-web/src/lib/admin-routes.ts';
const ACCESS = '/home/azem/projects/fastfood/apps/admin-web/src/lib/access-ops.ts';
const SHELL = '/home/azem/projects/fastfood/apps/admin-web/src/components/ops/ops-shell.tsx';
const REPORTS = '/home/azem/projects/fastfood/apps/admin-web/src/app/reports/page.tsx';
const USERS = '/home/azem/projects/fastfood/apps/admin-web/src/app/users/page.tsx';
const ROLES = '/home/azem/projects/fastfood/apps/admin-web/src/app/roles/page.tsx';
const AUDIT = '/home/azem/projects/fastfood/apps/admin-web/src/app/audit/page.tsx';
const SETTINGS = '/home/azem/projects/fastfood/apps/admin-web/src/app/settings/page.tsx';
const REPORTING = '/home/azem/projects/fastfood/apps/api/src/modules/reporting/reporting.controller.ts';

test.describe('Admin A5 analytics/access/system contracts', () => {
  test('A5 routes use OpsShell and not A0 scaffold', () => {
    expect(readFileSync(ROUTES, 'utf8')).toContain('isA5Path');
    expect(readFileSync(SHELL, 'utf8')).toContain('a5ScopeTag');
    expect(readFileSync(ACCESS, 'utf8')).toContain('Küresel raporlar');
    expect(readFileSync(REPORTS, 'utf8')).not.toContain('AdminPage');
    expect(readFileSync(USERS, 'utf8')).not.toContain('ff-admin-banner');
    expect(existsSync(ROLES)).toBe(true);
  });

  test('reports stay global with no invented export or date picker', () => {
    const page = readFileSync(REPORTS, 'utf8');
    expect(page).toContain('admin/reports/sales');
    expect(page).toContain('dışa aktarma API yok');
    expect(page).not.toContain('type="date"');
    expect(page).not.toContain('download');
    expect(readFileSync(REPORTING, 'utf8')).not.toContain('Query');
  });

  test('users assign is confirm-gated and roles remain catalog-only', () => {
    expect(readFileSync(USERS, 'utf8')).toContain('admin/users');
    expect(readFileSync(USERS, 'utf8')).toContain('ConfirmDialog');
    expect(readFileSync(USERS, 'utf8')).toContain('canAssignRole');
    expect(readFileSync(ROLES, 'utf8')).toContain('permission atama API yok');
    expect(readFileSync(ROLES, 'utf8')).not.toContain('method: \'PATCH\'');
  });

  test('audit has no payload dump and settings redact secrets', () => {
    expect(readFileSync(AUDIT, 'utf8')).not.toContain('r.payload');
    expect(readFileSync(AUDIT, 'utf8')).toContain('ham payload yok');
    expect(readFileSync(SETTINGS, 'utf8')).toContain('canPatchSetting');
    expect(readFileSync(ACCESS, 'utf8')).toContain('SECURITY_SENSITIVE');
    expect(readFileSync(ACCESS, 'utf8')).toContain('gizli — gösterilmez');
  });
});
