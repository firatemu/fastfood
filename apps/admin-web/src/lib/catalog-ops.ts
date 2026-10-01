export type CatalogScope = 'GLOBAL_MASTER_DATA' | 'BRANCH_SCOPED' | 'MIXED';

export const CATALOG_SCOPE: CatalogScope = 'GLOBAL_MASTER_DATA';

export type CatalogProductRow = {
  id: string;
  name: string;
  slug?: string;
  categoryId?: string;
  isActive?: boolean;
  basePriceMinor?: string;
  displayOrder?: number;
};

export type ProductActiveFilter = '' | 'active' | 'inactive';
export type ProductSort = 'order' | 'name' | 'price';

export function filterCatalogProducts(
  rows: readonly CatalogProductRow[],
  opts: {
    q: string;
    categoryId: string;
    active: ProductActiveFilter;
    sort: ProductSort;
  },
): CatalogProductRow[] {
  const q = opts.q.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (opts.categoryId && row.categoryId !== opts.categoryId) return false;
    if (opts.active === 'active' && row.isActive === false) return false;
    if (opts.active === 'inactive' && row.isActive !== false) return false;
    if (!q) return true;
    return (
      row.name.toLowerCase().includes(q) ||
      (row.slug ?? '').toLowerCase().includes(q) ||
      row.id.toLowerCase().includes(q)
    );
  });
  return filtered.slice().sort((a, b) => {
    if (opts.sort === 'name') return a.name.localeCompare(b.name, 'tr');
    if (opts.sort === 'price') {
      const pa = Number(a.basePriceMinor ?? 0);
      const pb = Number(b.basePriceMinor ?? 0);
      return pa - pb;
    }
    return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
  });
}

export function modifierBoundsValid(min: number, max: number): boolean {
  return Number.isInteger(min) && Number.isInteger(max) && min >= 0 && max >= 0 && min <= max;
}

/** Parse a TRY major string (`99,90` / `99.90`) into a minor-unit decimal string. */
export function parseTryMajorToMinor(input: string): string | null {
  const trimmed = input.trim().replace(/\s/g, '');
  if (!trimmed) return null;
  const normalized = trimmed.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, frac = ''] = normalized.split('.');
  const fracPadded = (frac + '00').slice(0, 2);
  const minor = Number(whole) * 100 + Number(fracPadded);
  if (!Number.isFinite(minor)) return null;
  return String(minor);
}

export function formatMinorAsMajor(minor: string | undefined): string {
  if (!minor) return '';
  const n = Number(minor);
  if (!Number.isFinite(n)) return '';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const whole = Math.trunc(abs / 100);
  const frac = (abs % 100).toString().padStart(2, '0');
  return `${sign}${whole},${frac}`;
}

export function slugFromName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128);
}
