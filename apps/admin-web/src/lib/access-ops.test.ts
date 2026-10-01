import { describe, expect, it } from 'vitest';

import {
  a5ResourceScope,
  a5ScopeTag,
  auditActorId,
  canAssignRole,
  canPatchSetting,
  classifySetting,
  displaySettingValue,
  filterAuditLogs,
  filterStaffUsers,
  groupPermissions,
  parseSettingJson,
  permissionGroup,
  settingLooksSecret,
  sumSalesReport,
} from './access-ops';
import { isA5Path, isOpsShellPath } from './admin-routes';

describe('isA5Path', () => {
  it('covers reports/users/roles/audit/settings', () => {
    expect(isA5Path('/reports')).toBe(true);
    expect(isA5Path('/users')).toBe(true);
    expect(isA5Path('/roles')).toBe(true);
    expect(isA5Path('/audit')).toBe(true);
    expect(isA5Path('/settings')).toBe(true);
    expect(isA5Path('/customers')).toBe(false);
    expect(isOpsShellPath('/reports')).toBe(true);
  });
});

describe('a5 scope', () => {
  it('does not treat reports as branch-scoped', () => {
    expect(a5ResourceScope('/reports')).toBe('GLOBAL_ANALYTICS');
    expect(a5ScopeTag('/reports')).toBe('Küresel raporlar');
    expect(a5ScopeTag('/users')).toBe('Erişim yönetimi');
    expect(a5ScopeTag('/settings')).toBe('Sistem ayarları');
    expect(a5ResourceScope('/orders')).toBeNull();
  });
});

describe('sales report mapping', () => {
  it('sums the report payload without inventing days', () => {
    const totals = sumSalesReport([
      { day: '2026-09-18', orderCount: 2, grossMinor: '100', refundedMinor: '10', netMinor: '90' },
      { day: '2026-09-19', orderCount: 3, grossMinor: '50', refundedMinor: '0', netMinor: '50' },
    ]);
    expect(totals.orderCount).toBe(5);
    expect(totals.grossMinor).toBe(150n);
    expect(totals.refundedMinor).toBe(10n);
    expect(totals.netMinor).toBe(140n);
  });
});

describe('users / roles', () => {
  it('filters staff and guards assign payload', () => {
    const rows = [
      {
        id: '01900000-0000-7000-8000-aaaaaaaaaaaa',
        displayName: 'Ada',
        primaryIdentifier: 'ada@fastfood.local',
        status: 'ACTIVE',
        roleCodes: ['BRANCH_MANAGER'],
      },
      {
        id: '01900000-0000-7000-8000-bbbbbbbbbbbb',
        displayName: 'Bor',
        status: 'DISABLED',
        roleCodes: ['SUPER_ADMIN'],
      },
    ];
    expect(filterStaffUsers(rows, { q: 'ada', status: '' }).map((r) => r.id)).toEqual([
      '01900000-0000-7000-8000-aaaaaaaaaaaa',
    ]);
    expect(
      canAssignRole({
        userId: '01900000-0000-7000-8000-aaaaaaaaaaaa',
        roleId: '01900000-0000-7000-8000-cccccccccccc',
        existingRoleCodes: ['BRANCH_MANAGER'],
        roleCode: 'SUPER_ADMIN',
      }),
    ).toBe(true);
    expect(
      canAssignRole({
        userId: '01900000-0000-7000-8000-aaaaaaaaaaaa',
        roleId: '01900000-0000-7000-8000-cccccccccccc',
        existingRoleCodes: ['SUPER_ADMIN'],
        roleCode: 'SUPER_ADMIN',
      }),
    ).toBe(false);
  });

  it('groups permissions from backend codes only', () => {
    expect(permissionGroup('catalog.products.read')).toBe('catalog.products');
    expect(permissionGroup('orders.read')).toBe('orders');
    const grouped = groupPermissions([
      { code: 'orders.read' },
      { code: 'catalog.products.write' },
      { code: 'catalog.products.read' },
    ]);
    expect(grouped.map((g) => g.group)).toEqual(['catalog.products', 'orders']);
    expect(grouped[0]?.items.map((i) => i.code)).toEqual([
      'catalog.products.read',
      'catalog.products.write',
    ]);
  });
});

describe('audit filter / redaction helpers', () => {
  it('filters actor/action/resource without requiring a payload field', () => {
    const rows = [
      {
        id: '1',
        action: 'role.granted',
        actorUserId: 'actor-1',
        resourceType: 'role',
        resourceId: 'r1',
      },
      {
        id: '2',
        action: 'order.transitioned',
        actorUserId: 'actor-2',
        resourceType: 'order',
        resourceId: 'o9',
      },
    ];
    expect(auditActorId(rows[0] ?? { id: 'missing' })).toBe('actor-1');
    expect(
      filterAuditLogs(rows, { q: '', action: 'role.granted', actor: '', resource: '' }).map(
        (r) => r.id,
      ),
    ).toEqual(['1']);
    expect(
      filterAuditLogs(rows, { q: '', action: '', actor: 'actor-2', resource: '' }).map((r) => r.id),
    ).toEqual(['2']);
  });
});

describe('settings classification', () => {
  it('redacts secrets and blocks patch on immutable/secret keys', () => {
    expect(
      classifySetting({ key: 'loyalty.points_per_try_minor', category: 'loyalty', mutable: true }),
    ).toBe('CUSTOMER_BEHAVIOR_AFFECTING');
    expect(classifySetting({ key: 'ops.poll_seconds', mutable: true })).toBe('SAFE_OPERATIONAL');
    expect(classifySetting({ key: 'payment.iyzico_secret', mutable: true })).toBe(
      'SECURITY_SENSITIVE',
    );
    expect(settingLooksSecret('oauth.client_secret')).toBe(true);
    expect(canPatchSetting({ key: 'loyalty.points_per_try_minor', mutable: true })).toBe(true);
    expect(canPatchSetting({ key: 'api_key', mutable: true })).toBe(false);
    expect(canPatchSetting({ key: 'ops.poll_seconds', mutable: false })).toBe(false);
    expect(displaySettingValue({ key: 'fcm.server_key', valueJson: 'abc' })).toContain('gizli');
    expect(parseSettingJson('true')).toEqual({ ok: true, value: true });
    expect(parseSettingJson('{')).toEqual({ ok: false });
  });
});
