import {
  ADMIN_PAGE_PERMISSION_SLUGS,
  ADMIN_PAGE_SUPPORTED_ACTIONS,
  adminPagePermission,
  type AdminPageAction,
  type AdminPageKey,
} from '@fastfood/domain-types';

const ROLE_NAMES: Record<string, string> = {
  SUPER_ADMIN: 'Süper yönetici',
  BRANCH_ADMIN: 'Şube yöneticisi',
  BRANCH_USER: 'Şube personeli',
  COURIER: 'Kurye',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: 'Merkezden tüm şubeleri ve sistem ayarlarını yönetir.',
  BRANCH_ADMIN: 'Kendi şubesindeki personeli ve operasyon izinlerini yönetir.',
  BRANCH_USER: 'Yalnızca atandığı şubede, kendisine verilen işlemleri yürütür.',
  COURIER: 'Kurye teslimat akışlarına erişir.',
};

const PAGE_NAMES: Record<AdminPageKey, string> = {
  dash: 'Genel bakış',
  orders: 'Siparişler',
  kitchen: 'Mutfak',
  couriers: 'Kurye ve teslimat',
  products: 'Ürünler',
  categories: 'Kategoriler',
  modifiers: 'Modifiye grupları',
  allergens: 'Alerjenler',
  media: 'Ürün medyaları',
  'branch-list': 'Şubeler',
  'service-areas': 'Servis alanları',
  availability: 'Ürün müsaitliği',
  'customer-list': 'Müşteriler',
  loyalty: 'Sadakat',
  promotions: 'Promosyonlar',
  payments: 'Ödemeler',
  refunds: 'İadeler',
  reports: 'Raporlar',
  users: 'Kullanıcılar',
  roles: 'Roller ve yetkiler',
  audit: 'Denetim kaydı',
  settings: 'Ayarlar',
};

const ACTION_NAMES: Record<AdminPageAction, string> = {
  view: 'Görüntüle',
  create: 'Ekle',
  update: 'Güncelle',
  delete: 'Sil',
};

export const ACCESS_PAGE_MATRIX = (Object.keys(ADMIN_PAGE_PERMISSION_SLUGS) as AdminPageKey[]).map(
  (page) => ({
    key: page,
    slug: ADMIN_PAGE_PERMISSION_SLUGS[page],
    name: PAGE_NAMES[page],
    actions: ADMIN_PAGE_SUPPORTED_ACTIONS[page].map((action) => ({
      action,
      label: ACTION_NAMES[action],
      code: adminPagePermission(page, action),
    })),
  }),
);

function pagePermission(code: string) {
  const match = /^admin\.page\.(.+)\.(view|create|update|delete)$/.exec(code);
  if (!match?.[1] || !match[2]) return null;
  const page = ACCESS_PAGE_MATRIX.find((entry) => entry.slug === match[1]);
  if (!page) return null;
  return { page, action: match[2] as AdminPageAction };
}

const AREAS: Record<string, string> = {
  catalog: 'Katalog',
  branches: 'Şubeler',
  orders: 'Siparişler',
  payments: 'Ödemeler',
  loyalty: 'Sadakat',
  customers: 'Müşteriler',
  promotions: 'Kampanyalar',
  reports: 'Raporlar',
  couriers: 'Kuryeler',
  audit: 'Denetim kayıtları',
  users: 'Personel ve roller',
  settings: 'Ayarlar',
};

const PERMISSIONS: Record<string, string> = {
  'catalog.products.read': 'Ürünleri görüntüleme',
  'catalog.products.write': 'Ürün oluşturma ve düzenleme',
  'catalog.prices.write': 'Ürün fiyatlarını düzenleme',
  'catalog.media.write': 'Ürün görsellerini yönetme',
  'branches.read': 'Şubeleri görüntüleme',
  'branches.write': 'Şube oluşturma ve düzenleme',
  'branches.service_areas.write': 'Hizmet bölgelerini düzenleme',
  'orders.read': 'Siparişleri görüntüleme',
  'orders.update_status': 'Sipariş durumunu güncelleme',
  'orders.reassign_branch': 'Siparişi başka şubeye atama',
  'payments.read': 'Ödemeleri görüntüleme',
  'payments.refund': 'İade oluşturma',
  'loyalty.read': 'Sadakat bilgilerini görüntüleme',
  'loyalty.settings.write': 'Sadakat ayarlarını düzenleme',
  'customers.read': 'Müşterileri görüntüleme',
  'promotions.read': 'Kampanyaları görüntüleme',
  'promotions.write': 'Kampanyaları yönetme',
  'reports.read': 'Raporları görüntüleme',
  'couriers.read': 'Kuryeleri görüntüleme',
  'couriers.assign': 'Teslimatı kuryeye atama',
  'couriers.write': 'Kurye hesaplarını yönetme',
  'audit.read': 'Denetim kayıtlarını görüntüleme',
  'users.read': 'Personeli ve rolleri görüntüleme',
  'users.write': 'Personele rol atama',
  'settings.read': 'İşletme ayarlarını görüntüleme',
  'settings.write': 'İşletme ayarlarını düzenleme',
};

export function roleName(role: { code: string; name: string }): string {
  return ROLE_NAMES[role.code] ?? role.name;
}

export function roleDescription(role: { code: string; description?: string | null }): string {
  return ROLE_DESCRIPTIONS[role.code] ?? role.description ?? 'Sistemde tanımlı erişim rolü.';
}

export function permissionName(code: string): string {
  const page = pagePermission(code);
  if (page)
    return `${page.page.name} · ${page.page.actions.find((action) => action.action === page.action)?.label ?? 'İşlem'}`;
  return PERMISSIONS[code] ?? 'Tanımlı erişim izni';
}

export function permissionArea(code: string): string {
  const page = pagePermission(code);
  if (page) return page.page.name;
  return AREAS[code.split('.')[0] ?? ''] ?? 'Diğer alanlar';
}

export function permissionKind(code: string): string {
  const page = pagePermission(code);
  if (page)
    return page.page.actions.find((action) => action.action === page.action)?.label ?? 'İşlem';
  const action = code.split('.').at(-1);
  if (action === 'read') return 'Görüntüleme';
  if (action === 'write') return 'Yönetme';
  if (action === 'refund') return 'İade';
  if (action === 'assign' || action === 'reassign_branch') return 'Atama';
  if (action === 'update_status') return 'Durum güncelleme';
  return 'Diğer işlem';
}
