import { describe, expect, it } from 'vitest';

import { isA1Path, isA2Path, isOpsShellPath } from './admin-routes';
import {
  CATALOG_SCOPE,
  filterCatalogProducts,
  modifierBoundsValid,
  parseTryMajorToMinor,
  formatMinorAsMajor,
  slugFromName,
} from './catalog-ops';

describe('ops shell paths', () => {
  it('keeps A1 golden routes distinct from catalog', () => {
    expect(isA1Path('/')).toBe(true);
    expect(isA1Path('/catalog/products')).toBe(false);
    expect(isA2Path('/catalog')).toBe(true);
    expect(isA2Path('/catalog/products/abc')).toBe(true);
    expect(isA2Path('/couriers')).toBe(false);
    expect(isOpsShellPath('/catalog/media')).toBe(true);
    expect(isOpsShellPath('/branches')).toBe(true);
    expect(isOpsShellPath('/customers')).toBe(true);
  });
});

describe('catalog scope', () => {
  it('treats A2 catalog as global master data', () => {
    expect(CATALOG_SCOPE).toBe('GLOBAL_MASTER_DATA');
  });
});

describe('filterCatalogProducts', () => {
  const rows = [
    {
      id: '1',
      name: 'Classic Smash',
      slug: 'classic-smash',
      categoryId: 'burgers',
      isActive: true,
      basePriceMinor: '14990',
      displayOrder: 2,
    },
    {
      id: '2',
      name: 'Cola',
      slug: 'cola',
      categoryId: 'drinks',
      isActive: false,
      basePriceMinor: '4000',
      displayOrder: 1,
    },
  ];

  it('filters client-side by query, category, and active without inventing pagination', () => {
    expect(filterCatalogProducts(rows, { q: 'smash', categoryId: '', active: '', sort: 'name' })).toEqual([
      rows[0],
    ]);
    expect(
      filterCatalogProducts(rows, { q: '', categoryId: 'drinks', active: '', sort: 'order' }).map((r) => r.id),
    ).toEqual(['2']);
    expect(
      filterCatalogProducts(rows, { q: '', categoryId: '', active: 'inactive', sort: 'price' }).map((r) => r.id),
    ).toEqual(['2']);
  });

  it('sorts by display order by default-style order key', () => {
    expect(
      filterCatalogProducts(rows, { q: '', categoryId: '', active: '', sort: 'order' }).map((r) => r.id),
    ).toEqual(['2', '1']);
  });
});

describe('modifierBoundsValid', () => {
  it('requires min <= max and non-negative integers', () => {
    expect(modifierBoundsValid(0, 1)).toBe(true);
    expect(modifierBoundsValid(2, 2)).toBe(true);
    expect(modifierBoundsValid(3, 1)).toBe(false);
    expect(modifierBoundsValid(-1, 2)).toBe(false);
    expect(modifierBoundsValid(0.5, 1)).toBe(false);
  });
});

describe('parseTryMajorToMinor', () => {
  it('parses comma or dot majors into minor strings', () => {
    expect(parseTryMajorToMinor('99,90')).toBe('9990');
    expect(parseTryMajorToMinor('149.90')).toBe('14990');
    expect(parseTryMajorToMinor('0')).toBe('0');
    expect(parseTryMajorToMinor('abc')).toBeNull();
    expect(parseTryMajorToMinor('-1')).toBeNull();
    expect(formatMinorAsMajor('9990')).toBe('99,90');
    expect(formatMinorAsMajor('0')).toBe('0,00');
  });
});

describe('slugFromName', () => {
  it('builds a url-safe slug from a Turkish name', () => {
    expect(slugFromName('Çift Peynirli Smash')).toBe('cift-peynirli-smash');
  });
});
