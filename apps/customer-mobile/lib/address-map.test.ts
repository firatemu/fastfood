import { describe, expect, it } from 'vitest';

import { addressFormToWriteBody, addressToForm, emptyAddressForm } from './address-map';
import { isE164Phone, normalizePhoneInput } from './phone';

describe('address mapping', () => {
  it('requires E.164 phone and numeric coordinates', () => {
    const form = emptyAddressForm();
    form.recipientName = 'Ayşe';
    form.recipientPhone = '05321234567';
    form.label = 'Ev';
    form.street = 'Moda Cad.';
    form.provinceId = '34';
    form.districtId = '1708';
    form.neighborhoodId = '40778';
    form.city = 'İstanbul';
    form.district = 'Üsküdar';
    form.latitude = '41.036';
    form.longitude = '28.985';
    form.locationConfirmed = true;
    const mapped = addressFormToWriteBody(form);
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.body.recipientPhone).toBe('+905321234567');
      expect(mapped.body.countryCode).toBe('TR');
      expect(mapped.body.latitude).toBeCloseTo(41.036);
    }
  });

  it('rejects invalid phone', () => {
    const form = emptyAddressForm();
    form.recipientName = 'Ayşe';
    form.recipientPhone = '123';
    expect(addressFormToWriteBody(form).ok).toBe(false);
  });

  it('requires an allowed province and all three geographic choices', () => {
    const form = emptyAddressForm();
    form.label = 'Ev';
    form.recipientName = 'Ayşe';
    form.recipientPhone = '+905321234567';
    form.latitude = '41';
    form.longitude = '29';
    form.locationConfirmed = true;
    expect(addressFormToWriteBody(form).ok).toBe(false);
    form.provinceId = '6';
    form.districtId = '1';
    form.neighborhoodId = '1';
    expect(addressFormToWriteBody(form).ok).toBe(false);
  });

  it('round-trips a listed address', () => {
    const form = addressToForm({
      id: 'addr-1',
      label: 'Ev',
      recipientName: 'Ayşe',
      recipientPhone: '+905321234567',
      latitude: 41,
      longitude: 29,
      city: 'İstanbul',
      provinceId: 34,
      districtId: 1708,
      neighborhoodId: 40778,
      district: 'Kadıköy',
      street: 'Moda',
      isDefault: true,
    });
    expect(form.isDefault).toBe(true);
    expect(addressFormToWriteBody(form).ok).toBe(true);
  });
});

describe('phone normalize', () => {
  it('converts local TR mobiles to E.164', () => {
    expect(normalizePhoneInput('0532 123 45 67')).toBe('+905321234567');
    expect(isE164Phone('+905321234567')).toBe(true);
  });
});
