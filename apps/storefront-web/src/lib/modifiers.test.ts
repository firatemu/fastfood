import { describe, expect, it } from 'vitest';

import {
  computeUnitPriceMinor,
  configuredPreviewUnitMinor,
  defaultModifierSelection,
  incompleteRequiredGroupNames,
  requiredSelectionsMet,
  toggleModifierSelection,
  type ModifierGroup,
} from './modifiers';

const groups: ModifierGroup[] = [
  {
    id: 'g1',
    name: 'Köfte',
    selectionMin: 1,
    selectionMax: 1,
    modifiers: [
      { id: 'm1', name: 'Çift', priceDeltaMinor: '0' },
      { id: 'm2', name: 'Üçlü', priceDeltaMinor: '9500' },
    ],
  },
  {
    id: 'g2',
    name: 'Ekstra',
    selectionMin: 0,
    selectionMax: 3,
    modifiers: [
      { id: 'e1', name: 'Bacon', priceDeltaMinor: '3000' },
      { id: 'e2', name: 'Trüf', priceDeltaMinor: '4500' },
    ],
  },
];

describe('modifier selection', () => {
  it('defaults required groups to the cheapest option, whatever the order', () => {
    expect(defaultModifierSelection(groups)).toEqual({ g1: ['m1'] });

    // Modifiers arrive ordered by name, so the paid upgrade can come first.
    const nameOrdered: ModifierGroup[] = [
      {
        id: 'g1',
        name: 'Köfte',
        selectionMin: 1,
        selectionMax: 1,
        modifiers: [
          { id: 'm2', name: 'Üçlü', priceDeltaMinor: '9500' },
          { id: 'm1', name: 'Çift', priceDeltaMinor: '0' },
        ],
      },
      {
        id: 'g2',
        name: 'Ekstra',
        selectionMin: 0,
        selectionMax: 3,
        modifiers: [{ id: 'e1', name: 'Bacon', priceDeltaMinor: '3000' }],
      },
    ];
    expect(defaultModifierSelection(nameOrdered)).toEqual({ g1: ['m1'] });
  });

  it('replaces radio selections and accumulates optional extras', () => {
    let selected = defaultModifierSelection(groups);
    selected = toggleModifierSelection(groups, selected, 'g1', 'm2');
    selected = toggleModifierSelection(groups, selected, 'g2', 'e1');
    expect(selected).toEqual({ g1: ['m2'], g2: ['e1'] });
    expect(computeUnitPriceMinor('29500', groups, selected)).toBe('42000');
  });

  it('requires a variant when more than one exists', () => {
    const selected = defaultModifierSelection(groups);
    expect(requiredSelectionsMet(groups, selected, [{ id: 'v1' }, { id: 'v2' }], null)).toBe(false);
    expect(requiredSelectionsMet(groups, selected, [{ id: 'v1' }, { id: 'v2' }], 'v1')).toBe(true);
  });

  it('names incomplete required groups for the customer', () => {
    expect(incompleteRequiredGroupNames(groups, {}, [], null)).toEqual(['Köfte']);
    expect(incompleteRequiredGroupNames(groups, { g1: ['m1'] }, [{ id: 'v1' }, { id: 'v2' }], null)).toEqual([
      'Boy / varyant',
    ]);
  });

  it('uses variant price as the configured base before modifier deltas', () => {
    const selected = { g1: ['m2'] };
    expect(
      configuredPreviewUnitMinor(
        '29500',
        [{ id: 'v1', priceMinor: '34000' }],
        'v1',
        groups,
        selected,
      ),
    ).toBe('43500');
  });
});
