export function OpsIcon({ name, label }: { name: string; label?: string }) {
  return (
    <span
      className="material-symbols-outlined ops-rail__icon"
      aria-hidden={label ? undefined : true}
      aria-label={label}
    >
      {name}
    </span>
  );
}

export const NAV_ICON: Record<string, string> = {
  dash: 'dashboard',
  orders: 'receipt_long',
  kitchen: 'soup_kitchen',
  couriers: 'two_wheeler',
  products: 'fastfood',
  'home-slides': 'slideshow',
  categories: 'category',
  modifiers: 'tune',
  allergens: 'warning',
  'branch-list': 'storefront',
  'service-areas': 'near_me',
  'service-map': 'map',
  availability: 'toggle_on',
  'customer-list': 'people',
  loyalty: 'loyalty',
  promotions: 'local_offer',
  payments: 'payments',
  refunds: 'undo',
  reports: 'monitoring',
  users: 'badge',
  roles: 'admin_panel_settings',
  audit: 'history_edu',
  settings: 'settings',
};
