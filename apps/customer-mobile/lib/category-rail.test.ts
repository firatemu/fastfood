import { describe, expect, it } from 'vitest';

import { isCategoryRailCollapsed, reconcileCategoryRail } from './category-rail';

type Category = { id: string; slug: string; name: string; productCount: number };

const category = (id: string, productCount = 3): Category => ({
  id,
  slug: id.toLowerCase(),
  name: id,
  productCount,
});

const FULL_RAIL: Category[] = [category('A'), category('B'), category('C'), category('D')];

describe('reconcileCategoryRail', () => {
  it('adopts the server list when no category filter is active', () => {
    expect(reconcileCategoryRail(null, FULL_RAIL, false)).toEqual(FULL_RAIL);
  });

  it('keeps the full rail when the filtered response returns only one category', () => {
    // This is the defect: the API derives `categories` from the already-filtered
    // products, so a filtered response carries just the selected category.
    const filtered = [category('B')];
    expect(reconcileCategoryRail(FULL_RAIL, filtered, true)).toEqual(FULL_RAIL);
  });

  it('never lets the rail shrink while a filter is active', () => {
    const shorter = FULL_RAIL.slice(0, 2);
    expect(reconcileCategoryRail(FULL_RAIL, shorter, true)).toHaveLength(FULL_RAIL.length);
  });

  it('accepts a larger list from the server even while filtering', () => {
    const grown = [...FULL_RAIL, category('E'), category('F')];
    expect(reconcileCategoryRail(FULL_RAIL, grown, true)).toHaveLength(6);
  });

  it('returns a copy so the caller cannot mutate the cached rail', () => {
    const result = reconcileCategoryRail(FULL_RAIL, FULL_RAIL, true);
    result.push(category('X'));
    expect(FULL_RAIL).toHaveLength(4);
  });

  it('survives an empty filtered response without emptying the rail', () => {
    expect(reconcileCategoryRail(FULL_RAIL, [], true)).toHaveLength(4);
  });

  it('falls back to the incoming list when nothing was cached yet', () => {
    // First render can already have a filter set from a deep link.
    expect(reconcileCategoryRail(null, [category('B')], true)).toEqual([category('B')]);
  });

  it('does not wipe a known rail when an unfiltered response comes back empty', () => {
    expect(reconcileCategoryRail(FULL_RAIL, [], false)).toHaveLength(4);
  });

  it('always returns a list the rail can render', () => {
    expect(reconcileCategoryRail(null, [], true)).toEqual([]);
    expect(reconcileCategoryRail(null, [], false)).toEqual([]);
  });
});

describe('isCategoryRailCollapsed', () => {
  it('detects the collapse the API causes under a filter', () => {
    expect(isCategoryRailCollapsed(FULL_RAIL, [category('B')], true)).toBe(true);
  });

  it('does not report a collapse for an unfiltered response', () => {
    expect(isCategoryRailCollapsed(FULL_RAIL, [category('B')], false)).toBe(false);
  });

  it('does not report a collapse when nothing was cached yet', () => {
    expect(isCategoryRailCollapsed(null, [category('B')], true)).toBe(false);
  });

  it('agrees with the reconciler about the surviving rail', () => {
    const incoming = [category('B')];
    if (isCategoryRailCollapsed(FULL_RAIL, incoming, true)) {
      expect(reconcileCategoryRail(FULL_RAIL, incoming, true)).toHaveLength(FULL_RAIL.length);
    }
  });
});