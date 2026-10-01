import { describe, expect, it } from 'vitest';

import {
  configuredPreviewUnitMinor,
  defaultModifierSelection,
  incompleteRequiredGroupNames,
  requiredSelectionsMet,
  selectedModifiersPayload,
  toggleModifierSelection,
  type ModifierGroup,
} from './modifiers';

const groups: ModifierGroup[] = [
  {
    id: 'g-patty',
    name: 'Köfte',
    selectionMin: 1,
    selectionMax: 1,
    modifiers: [
      { id: 'm-double', name: 'Çift', priceDeltaMinor: '0' },
      { id: 'm-triple', name: 'Üçlü', priceDeltaMinor: '9500' },
    ],
  },
  {
    id: 'g-extra',
    name: 'Ekstralar',
    selectionMin: 0,
    selectionMax: 2,
    modifiers: [
      { id: 'm-cheddar', name: 'Cheddar', priceDeltaMinor: '3000' },
      { id: 'm-bacon', name: 'Bacon', priceDeltaMinor: '4000' },
      { id: 'm-egg', name: 'Yumurta', priceDeltaMinor: '2500' },
    ],
  },
];

describe('defaultModifierSelection', () => {
  it('preselects the first option of required groups only', () => {
    expect(defaultModifierSelection(groups)).toEqual({ 'g-patty': ['m-double'] });
  });
});

describe('toggleModifierSelection', () => {
  it('replaces a required radio choice', () => {
    const next = toggleModifierSelection(groups, { 'g-patty': ['m-double'] }, 'g-patty', 'm-triple');
    expect(next['g-patty']).toEqual(['m-triple']);
  });

  it('caps optional groups at selectionMax', () => {
    let current = toggleModifierSelection(groups, {}, 'g-extra', 'm-cheddar');
    current = toggleModifierSelection(groups, current, 'g-extra', 'm-bacon');
    const blocked = toggleModifierSelection(groups, current, 'g-extra', 'm-egg');
    expect(blocked['g-extra']).toEqual(['m-cheddar', 'm-bacon']);
  });
});

describe('requiredSelectionsMet', () => {
  it('fails when a required group is empty', () => {
    expect(requiredSelectionsMet(groups, {}, [], null)).toBe(false);
  });

  it('fails when multiple variants exist without a choice', () => {
    const variants = [{ id: 'v1' }, { id: 'v2' }];
    expect(
      requiredSelectionsMet(groups, { 'g-patty': ['m-double'] }, variants, null),
    ).toBe(false);
  });

  it('passes when required radio is selected', () => {
    expect(requiredSelectionsMet(groups, { 'g-patty': ['m-double'] }, [], null)).toBe(true);
  });
});

describe('configuredPreviewUnitMinor', () => {
  it('adds modifier deltas onto the variant price', () => {
    const preview = configuredPreviewUnitMinor(
      '29500',
      [{ id: 'v-wagyu', priceMinor: '42500' }],
      'v-wagyu',
      groups,
      { 'g-patty': ['m-triple'], 'g-extra': ['m-cheddar'] },
    );
    expect(preview).toBe('55000');
  });
});

describe('selectedModifiersPayload', () => {
  it('emits modifier ids with their price snapshots', () => {
    expect(
      selectedModifiersPayload(groups, { 'g-patty': ['m-triple'], 'g-extra': ['m-bacon'] }),
    ).toEqual([
      { modifierId: 'm-triple', priceDeltaMinorSnapshot: '9500' },
      { modifierId: 'm-bacon', priceDeltaMinorSnapshot: '4000' },
    ]);
  });
});

describe('incompleteRequiredGroupNames', () => {
  it('names the incomplete required group', () => {
    expect(incompleteRequiredGroupNames(groups, {}, [], null)).toEqual(['Köfte']);
  });
});
