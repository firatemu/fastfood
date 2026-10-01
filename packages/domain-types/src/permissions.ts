/** Explicit, stable identifiers for the Admin menu pages. */
export const ADMIN_PAGE_PERMISSION_SLUGS = {
  dash: 'dashboard',
  orders: 'orders',
  kitchen: 'kitchen',
  couriers: 'couriers',
  products: 'catalog.products',
  categories: 'catalog.categories',
  modifiers: 'catalog.modifiers',
  allergens: 'catalog.allergens',
  media: 'catalog.media',
  'branch-list': 'branches',
  'service-areas': 'branches.service_areas',
  availability: 'branches.availability',
  'customer-list': 'customers',
  loyalty: 'loyalty',
  promotions: 'promotions',
  payments: 'payments',
  refunds: 'refunds',
  reports: 'reports',
  users: 'users',
  roles: 'roles',
  audit: 'audit',
  settings: 'settings',
} as const;

export type AdminPageKey = keyof typeof ADMIN_PAGE_PERMISSION_SLUGS;
export type AdminPageSlug = (typeof ADMIN_PAGE_PERMISSION_SLUGS)[AdminPageKey];
export const ADMIN_PAGE_ACTIONS = ['view', 'create', 'update', 'delete'] as const;
export type AdminPageAction = (typeof ADMIN_PAGE_ACTIONS)[number];
export type AdminPagePermissionCode = `admin.page.${AdminPageSlug}.${AdminPageAction}`;

/** Only actions supported by the current page/API are registered for grant. */
export const ADMIN_PAGE_SUPPORTED_ACTIONS: Record<AdminPageKey, readonly AdminPageAction[]> = {
  dash: ['view'],
  orders: ['view', 'update'],
  kitchen: ['view', 'update'],
  couriers: ['view', 'create', 'update'],
  products: ['view', 'create', 'update', 'delete'],
  categories: ['view', 'create', 'update'],
  modifiers: ['view', 'create', 'update', 'delete'],
  allergens: ['view', 'create', 'update', 'delete'],
  media: ['view', 'create', 'update', 'delete'],
  'branch-list': ['view', 'create', 'update'],
  'service-areas': ['view', 'create', 'update', 'delete'],
  availability: ['view', 'update'],
  'customer-list': ['view'],
  loyalty: ['view'],
  promotions: ['view', 'create', 'update'],
  payments: ['view'],
  refunds: ['view', 'create'],
  reports: ['view'],
  users: ['view', 'create', 'update'],
  roles: ['view', 'update'],
  audit: ['view'],
  settings: ['view', 'update'],
};

export function adminPagePermission(
  page: AdminPageKey,
  action: AdminPageAction,
): AdminPagePermissionCode {
  return `admin.page.${ADMIN_PAGE_PERMISSION_SLUGS[page]}.${action}`;
}

export const CANONICAL_ADMIN_PAGE_PERMISSION_CODES = Object.keys(
  ADMIN_PAGE_PERMISSION_SLUGS,
).flatMap((page) => {
  const key = page as AdminPageKey;
  return ADMIN_PAGE_SUPPORTED_ACTIONS[key].map((action) => adminPagePermission(key, action));
}) as AdminPagePermissionCode[];

const LEGACY_PAGE_PERMISSION_IMPLICATIONS: Record<
  AdminPageSlug,
  Partial<Record<AdminPageAction, readonly string[]>>
> = {
  dashboard: { view: ['orders.read', 'reports.read'] },
  orders: { view: ['orders.read'], update: ['orders.update_status'] },
  kitchen: { view: ['orders.read'], update: ['orders.update_status'] },
  couriers: {
    view: ['couriers.read'],
    create: ['couriers.write'],
    update: ['couriers.assign'],
  },
  'catalog.products': {
    view: ['catalog.products.read'],
    create: ['catalog.products.write'],
    update: ['catalog.products.write'],
    delete: ['catalog.products.write'],
  },
  'catalog.categories': {
    view: ['catalog.products.read'],
    create: ['catalog.products.write'],
    update: ['catalog.products.write'],
  },
  'catalog.modifiers': {
    view: ['catalog.products.read'],
    create: ['catalog.products.write'],
    update: ['catalog.products.write'],
    delete: ['catalog.products.write'],
  },
  'catalog.allergens': {
    view: ['catalog.products.read'],
    create: ['catalog.products.write'],
    update: ['catalog.products.write'],
    delete: ['catalog.products.write'],
  },
  'catalog.media': {
    view: ['catalog.products.read'],
    create: ['catalog.media.write'],
    update: ['catalog.media.write'],
    delete: ['catalog.media.write'],
  },
  branches: {
    view: ['branches.read'],
    create: ['branches.write'],
    update: ['branches.write'],
  },
  'branches.service_areas': {
    view: ['branches.read'],
    create: ['branches.service_areas.write'],
    update: ['branches.service_areas.write'],
    delete: ['branches.service_areas.write'],
  },
  'branches.availability': { view: ['branches.read'], update: ['branches.service_areas.write'] },
  customers: { view: ['customers.read'] },
  loyalty: { view: ['loyalty.read'] },
  promotions: {
    view: ['promotions.read'],
    create: ['promotions.write'],
    update: ['promotions.write'],
  },
  payments: { view: ['payments.read'] },
  refunds: { view: ['payments.read'], create: ['payments.read', 'payments.refund'] },
  reports: { view: ['reports.read'] },
  users: { view: ['users.read'], create: ['users.write'], update: ['users.write'] },
  roles: { view: ['users.read'], update: ['users.write'] },
  audit: { view: ['audit.read'] },
  settings: { view: ['settings.read'], update: ['settings.write'] },
};

/** Keep the existing domain-specific API permissions aligned with page grants. */
export function expandAdminPagePermissions(permissionCodes: Iterable<string>): Set<string> {
  const effective = new Set(permissionCodes);
  for (const code of [...effective]) {
    const match = /^admin\.page\.(.+)\.(view|create|update|delete)$/.exec(code);
    if (!match?.[1] || !match[2]) continue;
    const implications =
      LEGACY_PAGE_PERMISSION_IMPLICATIONS[match[1] as AdminPageSlug]?.[match[2] as AdminPageAction];
    implications?.forEach((permission) => effective.add(permission));
  }
  return effective;
}

/**
 * Permission codes are stable dotted-lower-case strings. Admin page keys are
 * explicitly registered here and documented in documents 02 and 39.
 */
export const Permissions = {
  CatalogProductsRead: 'catalog.products.read',
  CatalogProductsWrite: 'catalog.products.write',
  CatalogPricesWrite: 'catalog.prices.write',
  CatalogMediaWrite: 'catalog.media.write',

  BranchesRead: 'branches.read',
  BranchesWrite: 'branches.write',
  ServiceAreasWrite: 'branches.service_areas.write',

  OrdersRead: 'orders.read',
  OrdersUpdateStatus: 'orders.update_status',
  OrdersReassignBranch: 'orders.reassign_branch',

  PaymentsRead: 'payments.read',
  PaymentsRefund: 'payments.refund',

  LoyaltyRead: 'loyalty.read',
  LoyaltySettingsWrite: 'loyalty.settings.write',

  CustomersRead: 'customers.read',

  PromotionsRead: 'promotions.read',
  PromotionsWrite: 'promotions.write',

  ReportsRead: 'reports.read',

  CouriersRead: 'couriers.read',
  CouriersAssign: 'couriers.assign',
  CouriersWrite: 'couriers.write',

  AuditRead: 'audit.read',

  UsersRead: 'users.read',
  UsersWrite: 'users.write',

  SettingsRead: 'settings.read',
  SettingsWrite: 'settings.write',
  BranchAdminAssign: 'users.branch_admin.assign',
} as const;

export type PermissionCode =
  | (typeof Permissions)[keyof typeof Permissions]
  | AdminPagePermissionCode;
