import {
  adminPagePermission,
  type AdminPageAction,
  type AdminPageKey,
  type AdminPagePermissionCode,
} from '@fastfood/domain-types';
import type { ReactNode } from 'react';

import { isRouteIdentifiedBranchPath } from './admin-routes';

export type AdminNavItemDef = {
  id: string;
  label: string;
  href: string;
  match?: 'exact' | 'prefix';
};

export type AdminNavSectionDef = {
  id: string;
  label: string;
  items: AdminNavItemDef[];
};

const NAV_PERMISSION_KEYS: Record<string, AdminPageKey> = {
  dash: 'dash',
  orders: 'orders',
  kitchen: 'kitchen',
  couriers: 'couriers',
  products: 'products',
  'home-slides': 'products',
  categories: 'categories',
  modifiers: 'modifiers',
  allergens: 'allergens',
  media: 'media',
  'branch-list': 'branch-list',
  'service-areas': 'service-areas',
  availability: 'availability',
  'customer-list': 'customer-list',
  loyalty: 'loyalty',
  promotions: 'promotions',
  payments: 'payments',
  refunds: 'refunds',
  reports: 'reports',
  users: 'users',
  roles: 'roles',
  audit: 'audit',
  settings: 'settings',
};

/**
 * Canonical Admin IA — mirrors the Operations AppShell reference.
 * Labels are Turkish for Ops staff UI consistency with existing screens.
 */
export const ADMIN_NAV_SECTIONS: AdminNavSectionDef[] = [
  {
    id: 'overview',
    label: 'Genel Bakış',
    items: [{ id: 'dash', label: 'Genel bakış', href: '/', match: 'exact' }],
  },
  {
    id: 'operations',
    label: 'Operasyon',
    items: [
      { id: 'orders', label: 'Siparişler', href: '/orders', match: 'prefix' },
      { id: 'kitchen', label: 'Mutfak', href: '/kitchen', match: 'exact' },
      { id: 'couriers', label: 'Kurye / Teslimat', href: '/couriers', match: 'exact' },
    ],
  },
  {
    id: 'catalog',
    label: 'Katalog',
    items: [
      { id: 'products', label: 'Ürünler', href: '/catalog/products', match: 'prefix' },
      {
        id: 'home-slides',
        label: 'Vitrin Slaytları',
        href: '/catalog/home-slides',
        match: 'exact',
      },
      { id: 'categories', label: 'Kategoriler', href: '/catalog/categories', match: 'exact' },
      { id: 'modifiers', label: 'Modifiye Grupları', href: '/catalog/modifiers', match: 'exact' },
      { id: 'allergens', label: 'Alerjenler', href: '/catalog/allergens', match: 'exact' },
      { id: 'media', label: 'Medya', href: '/catalog/media', match: 'exact' },
    ],
  },
  {
    id: 'branches',
    label: 'Şubeler',
    items: [
      { id: 'branch-list', label: 'Şubeler', href: '/branches', match: 'exact' },
      {
        id: 'service-areas',
        label: 'Servis Alanları',
        href: '/branches/service-areas',
        match: 'exact',
      },
      {
        id: 'availability',
        label: 'Ürün müsaitliği',
        href: '/branches/availability',
        match: 'exact',
      },
    ],
  },
  {
    id: 'customers',
    label: 'Müşteriler',
    items: [
      { id: 'customer-list', label: 'Müşteriler', href: '/customers', match: 'prefix' },
      { id: 'loyalty', label: 'Sadakat', href: '/loyalty', match: 'exact' },
    ],
  },
  {
    id: 'marketing',
    label: 'Pazarlama',
    items: [{ id: 'promotions', label: 'Promosyonlar', href: '/promotions', match: 'prefix' }],
  },
  {
    id: 'finance',
    label: 'Finans',
    items: [
      { id: 'payments', label: 'Ödemeler', href: '/payments', match: 'prefix' },
      { id: 'refunds', label: 'İadeler', href: '/refunds', match: 'exact' },
    ],
  },
  {
    id: 'reports',
    label: 'Raporlar',
    items: [{ id: 'reports', label: 'Raporlar', href: '/reports', match: 'exact' }],
  },
  {
    id: 'access',
    label: 'Erişim',
    items: [
      { id: 'users', label: 'Kullanıcılar', href: '/users', match: 'exact' },
      { id: 'roles', label: 'Roller ve Yetkiler', href: '/roles', match: 'exact' },
    ],
  },
  {
    id: 'system',
    label: 'Sistem',
    items: [
      { id: 'audit', label: 'Denetim Kaydı', href: '/audit', match: 'exact' },
      { id: 'settings', label: 'Ayarlar', href: '/settings', match: 'exact' },
    ],
  },
];

export function isNavActive(pathname: string, item: AdminNavItemDef): boolean {
  if (item.id === 'branch-list') {
    return pathname === '/branches' || isRouteIdentifiedBranchPath(pathname);
  }
  if (item.match === 'exact' || item.href === '/') {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function adminPageForPath(pathname: string): AdminPageKey | null {
  if (pathname === '/catalog') return 'products';
  for (const section of ADMIN_NAV_SECTIONS) {
    for (const item of section.items) {
      if (isNavActive(pathname, item)) return NAV_PERMISSION_KEYS[item.id] ?? null;
    }
  }
  return null;
}

export function adminPagePermissionForPath(
  pathname: string,
  action: AdminPageAction,
): AdminPagePermissionCode | null {
  const page = adminPageForPath(pathname);
  return page ? adminPagePermission(page, action) : null;
}

export type BreadcrumbItem = { label: string; href?: string };

export function breadcrumbsForPath(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: 'Ops', href: '/' }];
  if (pathname === '/') {
    crumbs.push({ label: 'Genel bakış' });
    return crumbs;
  }
  if (isRouteIdentifiedBranchPath(pathname)) {
    crumbs.push({ label: 'Şubeler' });
    crumbs.push({ label: 'Şubeler', href: '/branches' });
    crumbs.push({ label: 'Şube kaydı' });
    return crumbs;
  }
  for (const section of ADMIN_NAV_SECTIONS) {
    for (const item of section.items) {
      if (isNavActive(pathname, item)) {
        crumbs.push({ label: section.label });
        crumbs.push({ label: item.label });
        return crumbs;
      }
    }
  }
  crumbs.push({ label: pathname });
  return crumbs;
}

/** Optional icons keyed by nav item id — filled by shell. */
export type NavIconMap = Record<string, ReactNode>;
