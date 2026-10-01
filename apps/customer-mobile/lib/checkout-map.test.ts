import { describe, expect, it } from 'vitest';

import {
  buildCheckoutQuotePayload,
  liraToMinor,
  operationalPayMethod,
  paymentInitIdempotencyKey,
  tipMinorFromPreset,
} from './checkout-map';

describe('tipMinorFromPreset', () => {
  it('maps Stitch tip chips to minor units', () => {
    expect(tipMinorFromPreset('none', '')).toBe('0');
    expect(tipMinorFromPreset('15', '')).toBe('1500');
    expect(tipMinorFromPreset('25', '')).toBe('2500');
    expect(tipMinorFromPreset('50', '')).toBe('5000');
  });

  it('parses a custom lira amount', () => {
    expect(tipMinorFromPreset('custom', '12,5')).toBe('1250');
    expect(liraToMinor('-3')).toBe('0');
  });
});

describe('buildCheckoutQuotePayload', () => {
  it('sends lat/lng only for delivery and omits pickup branch', () => {
    const body = buildCheckoutQuotePayload({
      fulfillmentMode: 'DELIVERY',
      latitude: 41.036,
      longitude: 28.985,
      pickupBranchId: 'ignored',
      couponCode: 'LEZZET10',
      tipMinor: '2500',
      scheduledFor: '2026-09-20T18:00:00.000Z',
      scheduleMode: 'asap',
      ecoPackaging: true,
      contactless: true,
      deliveryNote: 'zile basma',
      buildingAccessCode: '12',
      guestName: 'Azem',
      guestPhone: '555',
      addressLabel: 'Evim',
    });
    expect(body.latitude).toBe(41.036);
    expect(body.pickupBranchId).toBeUndefined();
    expect(body.scheduledFor).toBeNull();
    expect(body.couponCode).toBe('LEZZET10');
    expect(body.contactless).toBe(true);
  });

  it('sends pickup branch and clears contactless for gel-al', () => {
    const body = buildCheckoutQuotePayload({
      fulfillmentMode: 'PICKUP',
      latitude: 41.036,
      longitude: 28.985,
      pickupBranchId: '01900000-0000-7000-8000-b10000000001',
      couponCode: '',
      tipMinor: '0',
      scheduledFor: '2026-09-20T18:00:00.000Z',
      scheduleMode: 'scheduled',
      ecoPackaging: false,
      contactless: true,
      deliveryNote: '',
      buildingAccessCode: '',
      guestName: '',
      guestPhone: '',
      addressLabel: '',
    });
    expect(body.latitude).toBeUndefined();
    expect(body.pickupBranchId).toBe('01900000-0000-7000-8000-b10000000001');
    expect(body.contactless).toBe(false);
    expect(body.scheduledFor).toBe('2026-09-20T18:00:00.000Z');
  });
});

describe('operationalPayMethod', () => {
  it('selects iyzico hosted when the backend marks it available', () => {
    expect(
      operationalPayMethod([
        { code: 'masterpass', available: false },
        { code: 'iyzico_hosted', available: true },
      ]),
    ).toBe('iyzico_hosted');
  });
});

describe('paymentInitIdempotencyKey', () => {
  it('is stable per checkout session', () => {
    expect(paymentInitIdempotencyKey('abc-def-ghi')).toBe('m3-abc-def-ghi');
  });
});
