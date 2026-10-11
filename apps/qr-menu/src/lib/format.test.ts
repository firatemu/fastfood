import { describe, expect, it } from 'vitest';

import {
  formatPriceRange,
  groupByCategory,
  normalizeSearchTerm,
  productMatchesQuery,
  resolvePriceBounds,
} from './format';

describe('resolvePriceBounds', () => {
  it('falls back to the base price when a product has no variants', () => {
    expect(resolvePriceBounds('8495', [])).toEqual({ min: '8495', max: '8495' });
  });

  it('spans base price and every variant', () => {
    expect(resolvePriceBounds('42995', ['42995', '46495'])).toEqual({
      min: '42995',
      max: '46495',
    });
  });

  it('handles a variant cheaper than the advertised base price', () => {
    expect(resolvePriceBounds('46495', ['42995'])).toEqual({ min: '42995', max: '46495' });
  });

  it('ignores non-positive prices instead of reporting 0 as the cheapest', () => {
    expect(resolvePriceBounds('8495', ['0'])).toEqual({ min: '8495', max: '8495' });
  });

  it('compares as BigInt so large minor units stay exact', () => {
    expect(resolvePriceBounds('90071992547409931', ['90071992547409933'])).toEqual({
      min: '90071992547409931',
      max: '90071992547409933',
    });
  });
});

describe('formatPriceRange', () => {
  it('renders a single price when min equals max', () => {
    expect(formatPriceRange('8495', '8495', 'TRY')).toBe('84.95 ₺');
  });

  it('renders a range when variants differ in price', () => {
    expect(formatPriceRange('42995', '46495', 'TRY')).toBe('429.95 ₺ – 464.95 ₺');
  });
});

describe('normalizeSearchTerm', () => {
  it('folds Turkish characters so "cocuk" finds "ÇOCUK"', () => {
    expect(normalizeSearchTerm('ÇOCUK')).toBe('cocuk');
    expect(normalizeSearchTerm('IŞIL')).toBe('isil');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeSearchTerm('  burger  ')).toBe('burger');
  });
});

describe('productMatchesQuery', () => {
  const classic = {
    name: 'HOME CLASSIC BURGER',
    categoryName: 'ET BURGERLER',
    description: '100% dana eti, akdeniz yeşillikleri',
  };

  it('matches everything for an empty query', () => {
    expect(productMatchesQuery(classic, '')).toBe(true);
  });

  it('matches on name, category and description', () => {
    expect(productMatchesQuery(classic, 'classic')).toBe(true);
    expect(productMatchesQuery(classic, 'et burger')).toBe(true);
    expect(productMatchesQuery(classic, 'akdeniz')).toBe(true);
  });

  it('rejects a non-matching query', () => {
    expect(productMatchesQuery(classic, 'pizza')).toBe(false);
  });

  it('handles a null description', () => {
    expect(productMatchesQuery({ ...classic, description: null }, 'classic')).toBe(true);
  });
});

describe('groupByCategory', () => {
  const categories = [
    { id: 'c1' },
    { id: 'c2' },
    { id: 'c3' },
  ];
  const products = [
    { categoryId: 'c2', name: 'b' },
    { categoryId: 'c1', name: 'a' },
    { categoryId: 'c2', name: 'c' },
  ];

  it('preserves category order regardless of product order', () => {
    expect(groupByCategory(categories, products)).toEqual([
      { categoryId: 'c1', items: [{ categoryId: 'c1', name: 'a' }] },
      {
        categoryId: 'c2',
        items: [
          { categoryId: 'c2', name: 'b' },
          { categoryId: 'c2', name: 'c' },
        ],
      },
    ]);
  });

  it('drops categories that have no products after filtering', () => {
    const filtered = products.filter((p) => p.categoryId === 'c1');
    expect(groupByCategory(categories, filtered).map((g) => g.categoryId)).toEqual(['c1']);
  });

  it('returns nothing when no category matches', () => {
    expect(groupByCategory(categories, [])).toEqual([]);
  });
});