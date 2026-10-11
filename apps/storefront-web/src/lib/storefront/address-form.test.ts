import { describe, expect, it } from 'vitest';

import { composerFormFromAddress, emptyComposerForm } from './address-form';

describe('emptyComposerForm', () => {
  it('starts blank and offers the address as the default one', () => {
    const form = emptyComposerForm();
    expect(form.label).toBe('');
    expect(form.provinceId).toBe('');
    expect(form.neighborhoodId).toBe('');
    expect(form.isDefault).toBe(true);
  });

  it('returns a fresh object for every composer session', () => {
    expect(emptyComposerForm()).not.toBe(emptyComposerForm());
  });
});

describe('composerFormFromAddress', () => {
  it('maps a saved address into the composer form', () => {
    const form = composerFormFromAddress({
      label: 'Ev',
      provinceId: 34,
      districtId: 2004,
      neighborhoodId: 9001,
      avenue: 'Moda Caddesi',
      street: 'Caferağa Sokak',
      buildingNumber: 'No 12',
      floor: '3',
      apartmentNumber: '7',
      deliveryNote: 'Zil çalmıyor, kapıda bırak.',
      isDefault: true,
    });

    expect(form).toEqual({
      label: 'Ev',
      provinceId: '34',
      districtId: '2004',
      neighborhoodId: '9001',
      avenue: 'Moda Caddesi',
      street: 'Caferağa Sokak',
      buildingNumber: 'No 12',
      floor: '3',
      apartmentNumber: '7',
      deliveryNote: 'Zil çalmıyor, kapıda bırak.',
      isDefault: true,
    });
  });

  it('turns missing values into empty strings and never flags a default address', () => {
    const form = composerFormFromAddress({ label: null, provinceId: null, districtId: 0 });
    expect(form.label).toBe('');
    expect(form.provinceId).toBe('');
    expect(form.districtId).toBe('');
    expect(form.isDefault).toBe(false);
  });
});
