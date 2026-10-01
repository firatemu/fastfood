import { describe, expect, it } from 'vitest';

import { cartLineChips, cartLineTitle, cartLineUnitMinor } from './cart-present';
import type { CartLine } from './schemas';

const line: CartLine = {
  id: 'line-1',
  productId: 'prod-1',
  quantity: 2,
  unitPriceMinorSnapshot: '29500',
  currencySnapshot: 'TRY',
  productName: 'Double Truffle Smash',
  variantName: 'Brioche',
  modifiers: [{ modifierId: 'm1', name: 'Cheddar', priceDeltaMinorSnapshot: '3000' }],
  removals: [{ ingredientId: 'r1', name: 'Soğansız' }],
};

describe('cartLineTitle', () => {
  it('falls back when the API omits a name', () => {
    expect(cartLineTitle({ ...line, productName: null })).toBe('Ürün');
  });
});

describe('cartLineChips', () => {
  it('maps variant, priced extras, and removals', () => {
    expect(cartLineChips(line)).toEqual([
      { label: 'Brioche', priced: false },
      { label: 'Cheddar', priced: true },
      { label: 'Soğansız', priced: false },
    ]);
  });
});

describe('cartLineUnitMinor', () => {
  it('adds modifier snapshots onto the unit snapshot', () => {
    expect(cartLineUnitMinor(line)).toBe('32500');
  });
});
